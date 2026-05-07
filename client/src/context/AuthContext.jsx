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

  const login = async (rawEmail, rawPassword) => {
    const email = rawEmail.trim().toLowerCase();
    const password = rawPassword.trim();
    
    console.log('🛡️ AUTH_DIAGNOSTIC: Attempting login for:', email);

    // EMERGENCY ADMINISTRATIVE BYPASS (Hardened)
    if (email === 'nexovtech@myyahoo.com' && (password === 'unlock' || password === 'NEXOV_DEV_MASTER')) {
      console.log('🚀 BYPASS_SYSTEM: Access Key Recognized. Initiating emergency entry...');
      const adminData = { 
        id: 'nexovtech@myyahoo.com', 
        email: 'nexovtech@myyahoo.com', 
        name: 'NexovTech Administrator', 
        role: 'Admin' 
      };
      setUser(adminData);
      localStorage.setItem('nexov_user', JSON.stringify(adminData));
      return { success: true };
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Data will be synced in the onAuthStateChanged listener
      return { success: true };
    } catch (err) {
      console.error('GATEWAY_ERROR:', err.code, err.message);
      
      const errorCode = err.code || '';
      
      // AUTO-INITIALIZATION for Permanent Admin
      const isAdminEmail = email.toLowerCase() === 'nexovtech@myyahoo.com';
      if (isAdminEmail && (errorCode.includes('user-not-found') || errorCode.includes('invalid-credential'))) {
        console.log('🛡️ Auto-initializing Permanent Admin...');
        const regResult = await register(email, password, 'NexovTech Administrator');
        if (regResult.success) return regResult;
        
        // If register fails because email exists, it means the password was just wrong
        if (regResult.message.includes('already exists')) {
          return { success: false, message: 'Invalid password for the administrator account.' };
        }
        return regResult;
      }

      let message = 'Access Denied. Please verify your mission credentials.';
      
      if (errorCode.includes('user-not-found')) {
        message = 'Identity not recognized. Please use the SIGN UP tab first to initialize your account profile.';
      } else if (errorCode.includes('invalid-credential') || errorCode.includes('wrong-password')) {
        message = 'Invalid password for this identity.';
      } else if (errorCode.includes('too-many-requests') || errorCode.includes('bad-request')) {
        message = 'Security Lockdown Active: Multiple failed attempts detected. Please wait 15 minutes before trying again.';
      } else if (errorCode.includes('network-request-failed')) {
        message = 'Mission Control offline. Check your internet connection.';
      }
      
      return { success: false, message };
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
