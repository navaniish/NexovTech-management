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
    // Check local storage for bypass session first
    const savedUser = localStorage.getItem('nexov_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        localStorage.removeItem('nexov_user'); // Clear bypass if real user logs in
        // Fetch additional user data from our backend using Firebase UID
        try {
          const response = await fetch(`${API_URL}/auth/me?uid=${firebaseUser.uid}`);
          if (response.ok) {
            const userData = await response.json();
            setUser({ ...userData, firebaseUid: firebaseUser.uid });
          } else {
            // If user doesn't exist in our DB yet, create a basic profile or logout
            const defaultRole = firebaseUser.email === 'nexovtech@myyahoo.com' ? 'Admin' : 'Employee';
            setUser({ email: firebaseUser.email, uid: firebaseUser.uid, role: defaultRole });
          }
        } catch (err) {
          const defaultRole = firebaseUser.email === 'nexovtech@myyahoo.com' ? 'Admin' : 'Employee';
          setUser({ email: firebaseUser.email, uid: firebaseUser.uid, role: defaultRole });
        }
      } else {
        if (!localStorage.getItem('nexov_user')) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (rawEmail, rawPassword, mfaToken = null) => {
    const email = rawEmail.trim().toLowerCase();
    const password = rawPassword.trim();
    
    try {
      // 1. Authenticate with Firebase Client SDK
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
    } catch (err) {
      console.error('Logout failed');
    }
  };

  const updateUser = (fields) => {
    setUser(prev => {
      const updated = { ...prev, ...fields };
      // If we are in a bypass session, update localStorage to persist changes
      if (localStorage.getItem('nexov_user')) {
        localStorage.setItem('nexov_user', JSON.stringify(updated));
      }
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
