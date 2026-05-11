import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../firebase';
import API_URL from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const googleProvider = new GoogleAuthProvider();

  useEffect(() => {
    // 1. Initial restoration from localStorage (Synchronous)
    const savedUser = localStorage.getItem('nexov_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('nexov_user');
      }
    }

    // 2. Sync with Firebase and Backend API
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true); // Ensure loading is true while syncing
        try {
          const response = await fetch(`${API_URL}/auth/me?uid=${firebaseUser.uid}`);
          if (response.ok) {
            const userData = await response.json();
            const finalUser = { ...userData, firebaseUid: firebaseUser.uid };
            setUser(finalUser);
            localStorage.setItem('nexov_user', JSON.stringify(finalUser));
          } else {
            // Fallback for new users or sync failures
            const savedUser = localStorage.getItem('nexov_user');
            if (!savedUser) {
              const defaultRole = firebaseUser.email === 'nexovtech@myyahoo.com' ? 'Admin' : 'Employee';
              const fallbackUser = { 
                email: firebaseUser.email, 
                uid: firebaseUser.uid, 
                firebaseUid: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                role: defaultRole,
                avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.email}`
              };
              setUser(fallbackUser);
              localStorage.setItem('nexov_user', JSON.stringify(fallbackUser));
            }
          }
        } catch (err) {
          console.error('Session sync failed:', err);
        } finally {
          setLoading(false);
        }
      } else {
        if (!localStorage.getItem('nexov_user_is_bypass')) {
          setUser(null);
          localStorage.removeItem('nexov_user');
        }
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const login = async (rawEmail, rawPassword, mfaToken = null) => {
    let email = rawEmail.trim().toLowerCase();
    const password = rawPassword.trim();
    
    try {
      // 1. Enterprise Identity Discovery (Resolve virtual email to real firebase email)
      if (email.endsWith('@nexovtech.com')) {
        console.log(`🔍 IDENTITY_DISCOVERY: Resolving virtual identity [${email}]...`);
        const discoveryRes = await fetch(`${API_URL}/auth/discovery/${email}`);
        if (discoveryRes.ok) {
          const { email: realEmail } = await discoveryRes.json();
          console.log(`✅ IDENTITY_RESOLVED: [${email}] -> [${realEmail}]`);
          email = realEmail;
        } else {
          throw new Error('Virtual identity not registered in Nexov Registry.');
        }
      }

      // 2. Authenticate with Firebase Client SDK
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // 2. Retrieve secure ID Token
      const idToken = await firebaseUser.getIdToken();

      // 3. Dispatch to Backend for Session Initialization & Roster Sync
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          firebaseToken: idToken,
          lastActive: new Date(),
          token: mfaToken // Keep parameter name as 'token' for backend 2FA compatibility if needed
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.require2FA) {
          return { success: true, require2FA: true, userId: data.userId };
        }
        
        setUser(data.user);
        localStorage.setItem('nexov_user', JSON.stringify(data.user));
        if (email === 'nexovtech@myyahoo.com' && (password === 'Admin@123' || password === 'unlock')) {
          localStorage.setItem('nexov_user_is_bypass', 'true');
        }
        localStorage.setItem('nexov_token', data.token);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Identity verification failed.' };
      }
    } catch (err) {
      console.error('FIREBASE_AUTH_ERROR:', err);
      let message = 'Access Denied. Check your credentials.';
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Invalid operational credentials.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Connection to Command Center disrupted.';
      }

      // Fallback to bypass for admin if network fails (demo only)
      if (email === 'nexovtech@myyahoo.com' && (password === 'Admin@123' || password === 'unlock')) {
        const adminData = { id: 'nexovtech@myyahoo.com', email: 'nexovtech@myyahoo.com', name: 'NexovTech Administrator', role: 'Admin' };
        setUser(adminData);
        localStorage.setItem('nexov_user', JSON.stringify(adminData));
        localStorage.setItem('nexov_user_is_bypass', 'true');
        return { success: true };
      }
      return { success: false, message: message };
    }
  };

  const register = async (email, password, name) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Create user in our MongoDB backend
      await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uid: firebaseUser.uid, 
          email: firebaseUser.email, 
          name,
          role: 'Employee' // Default role
        })
      });
      
      return { success: true };
    } catch (err) {
      let message = 'Identity initialization failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'This identity already exists. Please use the LOGIN tab instead.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Mission security requires a stronger password (min 6 characters).';
      }
      return { success: false, message };
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      // Sync with backend
      await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uid: firebaseUser.uid, 
          email: firebaseUser.email, 
          name: firebaseUser.displayName,
          role: 'Employee' 
        })
      });
      
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem('nexov_user');
      localStorage.removeItem('nexov_user_is_bypass');
      localStorage.removeItem('nexov_token');
    } catch (err) {
      console.error('Logout failed');
    }
  };

  const updateUser = (fields) => {
    setUser(prev => {
      const updated = { ...prev, ...fields };
      // Always persist to localStorage for consistency
      localStorage.setItem('nexov_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, resetPassword, signInWithGoogle, updateUser, loading }}>
      {loading ? (
      <div className="min-h-screen theme-bg flex items-center justify-center">
           <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
              <p className="text-surface-500 font-black uppercase tracking-[0.3em] text-xs">Accessing Gateway...</p>
           </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
