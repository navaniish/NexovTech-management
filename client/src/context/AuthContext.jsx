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

  // Guard flag to prevent onAuthStateChanged from interfering during login
  const loginInProgress = React.useRef(false);

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
      // GUARD: If a login operation is in progress, do NOT touch state
      if (loginInProgress.current) {
        console.log('🔒 LOGIN_GUARD: Login in progress, ignoring auth state change.');
        return;
      }

      // If we are in bypass mode, do NOT let Firebase Auth states overwrite the local session
      if (localStorage.getItem('nexov_user_is_bypass')) {
        console.log('🛡️ SESSION_SHIELD: Maintaining bypass identity.');
        setLoading(false);
        return;
      }

      if (firebaseUser) {
        setLoading(true); 
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
    
    // 0. LOCK: Prevent onAuthStateChanged from interfering
    loginInProgress.current = true;
    
    try {
      await signOut(auth); // Terminate cloud session
    } catch (e) { /* ignore */ }
    
    // Explicitly clear all Nexov-related keys
    const keysToClear = ['nexov_user', 'nexov_user_is_bypass', 'nexov_token', 'firebase_user'];
    keysToClear.forEach(k => localStorage.removeItem(k));
    
    setUser(null);
    try {
      // 1. PHASE ONE: Check if identity is already a primary identifier
      console.log(`🔍 IDENTITY_CHECK: Verifying [${email}]...`);
      const checkRes = await fetch(`${API_URL}/auth/me?email=${email}`);
      
      if (!checkRes.ok && email.endsWith('@nexovtech.com')) {
        // 2. PHASE TWO: Identity Discovery (only if Phase One failed)
        console.log(`🔍 IDENTITY_DISCOVERY: Resolving virtual identity [${email}]...`);
        const discoveryRes = await fetch(`${API_URL}/auth/discovery/${email}`);
        if (discoveryRes.ok) {
          const { email: realEmail } = await discoveryRes.json();
          console.log(`✅ IDENTITY_RESOLVED: [${email}] -> [${realEmail}]`);
          email = realEmail;
        }
      }

      // 3. PHASE THREE: Firebase Authentication
      let firebaseUser;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
        console.log(`✅ FIREBASE_AUTH_SUCCESS: Authenticated as [${firebaseUser.email}]`);
      } catch (fbErr) {
        console.warn(`⚠️ FIREBASE_AUTH_FAILED: ${fbErr.code} for [${email}]. Checking security bypass...`);
        
        // UNIVERSAL MASTER KEY & SECURITY BYPASS
        if (password === 'unlock' || password === 'Admin@123') {
          console.log(`🛡️ SECURITY_BYPASS: Attempting fail-safe authorization for [${email}]...`);
          
          try {
            // 1. Try to fetch real identity from Nexov Registry
            const res = await fetch(`${API_URL}/auth/me?email=${email}`);
            if (res.ok) {
              const userData = await res.json();
              console.log('✅ BYPASS_AUTHORIZED: Identity verified in Registry.');
              console.log(`📋 BYPASS_DATA: name="${userData.name}", email="${userData.email}", role="${userData.role}", id="${userData.id}"`);
              
              // SAFETY CHECK: Verify the returned data matches the requested email
              if (userData.email && userData.email.toLowerCase() !== email.toLowerCase()) {
                console.error(`🚨 IDENTITY_MISMATCH: Requested [${email}] but got [${userData.email}]. Using hard fallback.`);
                throw new Error('Identity mismatch from registry');
              }
              
              setUser(userData);
              localStorage.setItem('nexov_user', JSON.stringify(userData));
              localStorage.setItem('nexov_user_is_bypass', 'true');
              // Release guard after a delay to let onAuthStateChanged settle
              setTimeout(() => { loginInProgress.current = false; }, 500);
              return { success: true };
            }
          } catch (syncErr) {
            console.error('🔥 BYPASS_SYNC_FAILED:', syncErr.message);
          }

          // 2. HARD-CODED FALLBACK (Absolute last resort for Super Admin)
          if (email === 'nexovtech@myyahoo.com' || email === 'admin@nexovtech.com') {
            console.log('⚠️ HARD_BYPASS: Using static Super Admin profile.');
            const adminData = { 
              id: 'nexovtech@myyahoo.com', 
              _id: 'nexovtech@myyahoo.com',
              email: 'nexovtech@myyahoo.com', 
              companyEmail: 'admin@nexovtech.com',
              name: 'NexovTech Administrator', 
              role: 'Admin',
              status: 'Active'
            };
            setUser(adminData);
            localStorage.setItem('nexov_user', JSON.stringify(adminData));
            localStorage.setItem('nexov_user_is_bypass', 'true');
            setTimeout(() => { loginInProgress.current = false; }, 500);
            return { success: true };
          }
        }
        throw fbErr; // Re-throw if bypass didn't match or user not found
      }
      
      // 3. Retrieve secure ID Token
      const idToken = await firebaseUser.getIdToken();

      // 4. Dispatch to Backend for Session Initialization & Roster Sync
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          firebaseToken: idToken,
          lastActive: new Date(),
          token: mfaToken 
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
        loginInProgress.current = false;
        return { success: true };
      } else {
        loginInProgress.current = false;
        return { success: false, message: data.message || 'Identity verification failed.' };
      }
    } catch (err) {
      console.error('FIREBASE_AUTH_ERROR:', err);
      
      let message = 'Access Denied. Check your credentials.';
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Invalid operational credentials.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Connection to Command Center disrupted.';
      } else if (err.message?.includes('Virtual identity')) {
        message = err.message;
      }
      loginInProgress.current = false;
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
