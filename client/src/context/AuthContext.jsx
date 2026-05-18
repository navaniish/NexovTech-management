import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, doc, getDoc, onSnapshot, query, where, getDocs, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import API_BASE from '../config';
import { sentinel } from '../services/securityService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nexov_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });

  const verifyingEmail = useRef(null);

  // Helper to check legacy bridge
  const checkLegacyBridge = async (email, isRootEmail) => {
    try {
      const legacyRes = await fetch(`${API_BASE}/team`);
      if (legacyRes.ok) {
        const legacyTeam = await legacyRes.json();
        const legacyUser = legacyTeam.find(e => e.email?.toLowerCase() === email.toLowerCase());
        
        if (legacyUser) {
          console.log("[AUTH] Original account identified in legacy bridge.");
          return { 
            authorized: true, 
            data: { 
              ...legacyUser, 
              name: legacyUser.name || legacyUser.username,
              role: legacyUser.role || 'Admin',
              status: 'active',
              isRoot: isRootEmail 
            } 
          };
        }
      }
    } catch (legacyErr) {
      console.error("[AUTH] Legacy bridge synchronization failed:", legacyErr);
    }

    if (isRootEmail) {
      return { 
        authorized: true, 
        data: { 
          name: 'NEXOVTECH ADMINISTRATION', // Matches database default
          role: 'Super Admin', 
          status: 'Active', 
          isRoot: true,
          department: 'Executive',
          avatar: '/assets/logo_nexo.jpeg'
        } 
      };
    }
    return null;
  };

  // Helper to verify employee in Firestore
  const verifyEmployee = async (email) => {
    const isRootEmail = email.toLowerCase() === 'nexovtech@myyahoo.com';
    console.log(`[AUTH] Verifying Identity: ${email} (isRoot: ${isRootEmail})`);
    
    if (!isRootEmail && !email.toLowerCase().endsWith('.nexovtech@gmail.com')) {
      return { authorized: false, message: "Invalid format. Use name.nexovtech@gmail.com" };
    }

    try {
      // 1. Direct Identity Sync (Check Legacy Bridge First)
      const legacyResult = await checkLegacyBridge(email, isRootEmail);
      if (legacyResult) return legacyResult;

      // 2. Standard Registry Check (Firestore)
      const q = query(collection(db, 'employees'), where('email', '==', email.toLowerCase()));
      const querySnap = await getDocs(q);
      
      if (!querySnap.empty) {
        const docSnap = querySnap.docs[0];
        const employeeData = docSnap.data();
        return { authorized: true, data: { ...employeeData, docId: docSnap.id, isRoot: isRootEmail } };
      }

      // 4. Fallback for Nexovtech Corporate Gmail Format (Auto-Authorize)
      if (email.toLowerCase().endsWith('.nexovtech@gmail.com')) {
        const namePart = email.toLowerCase().split('.nexovtech@gmail.com')[0];
        // Capitalize each part of the name (e.g. john.doe -> John Doe)
        const formattedName = namePart.split('.')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
          
        console.log(`[AUTH] Auto-authorizing new employee: ${formattedName}`);
        return { 
          authorized: true, 
          data: { 
            name: formattedName, 
            role: 'Employee', 
            status: 'active',
            department: 'General',
            email: email.toLowerCase()
          } 
        };
      }

      return { authorized: false, message: "Access Denied — You are not an authorized Nexovtech employee." };
    } catch (error) {
      console.error("[AUTH] Firestore Permission/Query Error:", error);
      if (isRootEmail) {
        return { 
          authorized: true, 
          data: { name: 'Nexov Admin', role: 'Admin', status: 'active', isRoot: true } 
        };
      }
      return { authorized: false, message: "Security check failed. Please try again." };
    }
  };

  useEffect(() => {
    // 2. Auth State Listener
    let unsubscribeSnapshot = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // SYNCHRONOUS SHIELD: Block any duplicate triggers within the same 500ms window
      if (firebaseUser && verifyingEmail.current === firebaseUser.email) return;
      
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        verifyingEmail.current = firebaseUser.email; // Lock immediately
        setLoading(true);
        const verification = await verifyEmployee(firebaseUser.email);
        
        if (verification.authorized) {
          // Record successful login in Sentinel Audit Trail
          sentinel.logActivity('IDENTITY_VERIFIED', { email: firebaseUser.email, uid: firebaseUser.uid });
          
          // Check for security anomalies
          sentinel.runAIScan({ email: firebaseUser.email, uid: firebaseUser.uid });
          try {
            // 2.5 Sync with Backend (Provisioning)
            let idToken;
            try {
              idToken = await firebaseUser.getIdToken(true); // Force refresh to clear 400 error
            } catch (tokenErr) {
              console.error("[AUTH] Token link broken. Clearing ghost session.");
              logout();
              return;
            }

            const syncRes = await fetch(`${API_BASE}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ firebaseToken: idToken })
            });

            let backendData = {};
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              backendData = syncData.user || {};
              if (syncData.token) {
                localStorage.setItem('nexov_token', syncData.token);
              }
            }

            const userData = {
              ...verification.data,
              ...backendData,
              // Normalize ID: Firestore DocID (docId) should be prioritized as 'id'
              id: backendData.id || verification.data.docId,
              // Prioritize Google Display Name, then Backend Name, then Verification Name
              name: backendData.name || verification.data.name || firebaseUser.displayName,
              displayName: firebaseUser.displayName || backendData.name || verification.data.name,
              photoURL: firebaseUser.photoURL || verification.data.avatar || backendData.avatar,
              email: firebaseUser.email,
              firebaseUid: firebaseUser.uid,
              isRoot: firebaseUser.email === 'nexovtech@myyahoo.com'
            };
            setUser(userData);
            localStorage.setItem('nexov_user', JSON.stringify(userData));

            if (!userData.isRoot && (verification.data.docId || backendData.id)) {
              const docId = verification.data.docId || backendData.id;
              const docRef = doc(db, 'employees', docId);
              unsubscribeSnapshot = onSnapshot(docRef, (doc) => {
                if (doc.exists()) {
                  if (doc.data().status === 'inactive') {
                    logout();
                    toast.error("Session Revoked — Access privileges updated.", { id: 'session-revoked' });
                  } else {
                    const newData = doc.data();
                    setUser(prev => ({ ...prev, ...newData }));
                  }
                }
              });
            }
          } catch (syncErr) {
            console.error("[AUTH] Backend synchronization failed:", syncErr);
            // Fallback to frontend-only data if backend fails
            const userData = {
              ...verification.data,
              id: verification.data.docId, // Critical: Maintain ID even on sync failure
              displayName: firebaseUser.displayName || verification.data.name,
              photoURL: firebaseUser.photoURL || verification.data.avatar,
              email: firebaseUser.email,
              firebaseUid: firebaseUser.uid,
              isRoot: firebaseUser.email === 'nexovtech@myyahoo.com'
            };
            setUser(userData);
            localStorage.setItem('nexov_user', JSON.stringify(userData));
          }
        } else {
          await logout();
          toast.error(verification.message, { id: 'auth-denied' });
        }
      } else {
        // IMPORTANT: Only clear if not a root admin session
        // This prevents the Firebase listener from wiping the manual admin bypass
        setUser(prev => {
          if (prev?.isRoot) {
            console.warn("[AUTH] Firebase session lost. Root bypass active.");
            return prev; 
          }
          localStorage.removeItem('nexov_user');
          return null;
        });
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const verification = await verifyEmployee(result.user.email);
          if (!verification.authorized) {
            await logout();
            toast.error(verification.message, { id: 'auth-denied' });
          } else {
            toast.success('Access Granted — Welcome to NexovTech');
          }
        }
      } catch (err) {
        console.error("[AUTH] Redirect Result Error:", err);
      }
    };
    handleRedirectResult();
  }, []);

  const signInWithGoogle = async () => {
    try {
      let result;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupErr) {
        if (
          popupErr.code === 'auth/popup-blocked' || 
          popupErr.code === 'auth/cancelled-popup-request' ||
          popupErr.code === 'auth/popup-closed-by-user'
        ) {
          console.warn("[AUTH] Google Sign-In Popup blocked or interrupted. Transitioning to Redirect mode...");
          toast.loading('Redirecting to secure login...', { id: 'auth-redirect-loading', duration: 3000 });
          await signInWithRedirect(auth, googleProvider);
          return { success: true, redirecting: true };
        } else {
          throw popupErr;
        }
      }

      if (result) {
        const verification = await verifyEmployee(result.user.email);
        if (!verification.authorized) {
          await logout();
          toast.error(verification.message, { id: 'auth-denied' });
          return { success: false, message: verification.message };
        }
        toast.success('Access Granted — Welcome to NexovTech');
        return { success: true };
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      try {
        console.warn("[AUTH] Triggering absolute redirect fallback.");
        await signInWithRedirect(auth, googleProvider);
        return { success: true, redirecting: true };
      } catch (redirectErr) {
        console.error("[AUTH] Google Redirect fallback failed completely:", redirectErr);
      }
      return { success: false, message: "Authentication failed. Redirect initiated." };
    }
  };

  const adminLogin = async (email, password) => {
    setLoading(true);
    try {
      // 1. Authenticate with Firebase Email/Password
      await signInWithEmailAndPassword(auth, email.toLowerCase(), password);
      
      // The onAuthStateChanged listener will handle the verifyEmployee and setUser calls
      // ensuring only ONE unified identity is created.
      
      toast.success('Root Access Granted', {
        style: { background: '#000', color: '#fff', fontSize: '10px', fontWeight: '900' }
      });
      return { success: true };
    } catch (err) {
      console.error("Admin Login Error:", err);
      return { success: false, message: "Invalid credentials or authorization failure." };
    } finally {
      setLoading(false);
    }
  };

  const adminOverride = async (masterKey) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/admin-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterKey })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Override Rejected');

      // Manual Session Set (Bypasses Firebase Auth State for this session)
      localStorage.setItem('nexov_token', data.token);
      localStorage.setItem('nexov_user', JSON.stringify(data.user));
      setUser(data.user);

      toast.success('Neural Link Established: Admin Override Active', {
        style: { background: '#000', color: '#fff', fontSize: '10px', fontWeight: '900' }
      });
      return { success: true };
    } catch (err) {
      console.error("Override Error:", err);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (newData) => {
    setUser(prev => {
      const updated = { ...prev, ...newData };
      localStorage.setItem('nexov_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = async () => {
    try {
      await signOut(auth);
      verifyingEmail.current = null; // RESET IDENTITY LOCK
      setUser(null);
      localStorage.removeItem('nexov_user');
      localStorage.removeItem('nexov_token');
    } catch (err) {
      console.error('Logout failed');
    }
  };

  return (
    <AuthContext.Provider value={{ user, signInWithGoogle, adminLogin, adminOverride, logout, updateUser, loading }}>
      {loading ? (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden">
          {/* Subtle Background Asset */}
          <div className="absolute inset-0 z-0 opacity-40">
             <div 
               className="absolute inset-0 bg-cover bg-center grayscale-[0.5] contrast-[1.1]"
               style={{ backgroundImage: "url('/assets/nexovtech-final-branded.png')" }}
             />
             <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px]" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-10">
            <div className="relative">
              {/* Logo with pulsing shadow, enlarged and perfectly circular */}
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center justify-center p-1 border border-slate-100 overflow-hidden shrink-0">
                <img src="/assets/logo_nexo.jpeg" alt="Nexov" className="w-full h-full object-cover rounded-full" />
              </div>
              <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="absolute -inset-4 bg-indigo-500/10 rounded-full -z-10"
              />
            </div>

            <div className="text-center space-y-4">
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.5em] leading-none">
                  Nexov<span className="text-indigo-600">Tech</span> Management
                </h2>
                <div className="w-40 h-1 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="w-1/2 h-full bg-indigo-600 rounded-full"
                  />
                </div>
              </div>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] animate-pulse">
                Synchronizing Secure Workspace...
              </p>
            </div>
          </div>

          {/* Legal Footer */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center opacity-40">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">
                Enterprise Grade Authentication &copy; 2026
             </p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
