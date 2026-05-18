import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { sentinel } from '../services/securityService';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminCreds, setAdminCreds] = useState({ email: '', password: '' });

  const { signInWithGoogle, adminLogin, adminOverride } = useAuth();
  const navigate = useNavigate();

  // Rapid Access Protocol
  const [clickCount, setClickCount] = useState(0);
  const [showKeyConsole, setShowKeyConsole] = useState(false);
  const [accessKey, setAccessKey] = useState('');

  const triggerRapidAccess = async () => {
    // Hidden Master Protocol
    setLoading(true);
    setError('');
    try {
      const result = await adminOverride(accessKey.toUpperCase());
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message || 'Access Key Invalid.');
        setClickCount(0);
        setShowKeyConsole(false);
      }
    } catch (err) {
      setError('Neural link severed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 3) {
      setShowKeyConsole(true);
    }
    // Reset click count after 5 seconds of inactivity
    setTimeout(() => setClickCount(0), 5000);
  };

  // Keyboard Shortcut Protocol (Alt + Shift + A)
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.shiftKey && e.key.toUpperCase() === 'A') {
        e.preventDefault();
        setShowKeyConsole(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signInWithGoogle();
      if (result.success) {
        const storedUser = JSON.parse(localStorage.getItem('nexov_user'));
        const targetPath = (storedUser?.role === 'Admin' || storedUser?.role === 'Manager') ? '/' : '/employee/dashboard';
        navigate(targetPath);
      } else {
        sentinel.logActivity('AUTH_FAILURE_GOOGLE', { email: 'Unknown (Google)' }, 'failure');
        setError(result.message);
      }
    } catch (err) {
      setError('Connection to security grid disrupted.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await adminLogin(adminCreds.email, adminCreds.password);
      if (result.success) {
        const storedUser = JSON.parse(localStorage.getItem('nexov_user'));
        const targetPath = (storedUser?.role === 'Admin' || storedUser?.role === 'Manager') ? '/' : '/employee/dashboard';
        navigate(targetPath);
      } else {
        sentinel.logActivity('AUTH_FAILURE_ADMIN', { email: adminCreds.email }, 'failure');
        setError(result.message);
      }
    } catch (err) {
      setError('Admin authorization service unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-slate-900 selection:text-white bg-white">
      {/* ── CLASSIC OFFICE BACKGROUND ── */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-left"
          style={{ backgroundImage: "url('/assets/nexovtech-final-branded.png')", backgroundPosition: 'left center' }}
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Identity Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 relative z-10 md:translate-x-24"
      >
        <div
          onClick={handleLogoClick}
          className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center group bg-white p-1 cursor-pointer active:scale-95 transition-transform"
        >
          <img
            src="/assets/logo_nexo.jpeg"
            alt="Nexov"
            className="w-full h-full object-cover rounded-full transition-transform duration-700 group-hover:scale-110"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-[400px] md:translate-x-24"
      >
        <div className="bg-white/95 backdrop-blur-[20px] rounded-[40px] p-10 border border-slate-100 shadow-[0_40px_100px_rgba(0,0,0,0.12)]">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-1 italic">
              {isAdminMode ? 'SYSTEM' : 'SECURE'} <span className="text-slate-500">{isAdminMode ? 'ADMIN' : 'GATEWAY'}</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">NexovTech Management Platform</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-500 text-[9px] font-black uppercase tracking-widest mb-8"
            >
              <AlertTriangle size={16} /> {error}
            </motion.div>
          )}

          {!isAdminMode ? (
            <div className="space-y-6">
              {showKeyConsole && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-black p-6 rounded-3xl border border-white/10 shadow-2xl mb-4"
                >
                  <p className="text-white/50 text-[8px] font-black uppercase tracking-widest mb-3">Neural Override Active</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="ACCESS KEY"
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-xs font-mono focus:outline-none focus:border-white/30"
                      onKeyDown={(e) => e.key === 'Enter' && triggerRapidAccess()}
                      autoFocus
                    />
                    <button
                      onClick={triggerRapidAccess}
                      disabled={loading}
                      className="w-12 h-12 bg-white rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors"
                    >
                      <Zap size={18} className="text-black" />
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-center">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                  <ShieldCheck size={24} className="text-blue-500" />
                </div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider leading-relaxed">
                  Only authorized NexovTech employees with <br />
                  <span className="text-slate-900">name.nexovtech@gmail.com</span> <br />
                  can access this node.
                </p>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-[24px] flex items-center justify-between px-8 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl group"
              >
                <div className="flex items-center gap-4">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                  <span className="font-black text-[11px] uppercase tracking-[0.2em]">
                    {loading ? 'Authenticating...' : 'Sign in with Google'}
                  </span>
                </div>
                {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Admin Email</label>
                <input
                  required type="email" value={adminCreds.email}
                  onChange={(e) => setAdminCreds({ ...adminCreds, email: e.target.value })}
                  placeholder="admin@nexovtech.com"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-slate-900 focus:outline-none focus:border-slate-900 transition-all font-medium text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Access Key</label>
                <input
                  required type="password" value={adminCreds.password}
                  onChange={(e) => setAdminCreds({ ...adminCreds, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-slate-900 focus:outline-none focus:border-slate-900 transition-all font-medium text-sm"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] mt-4 hover:bg-slate-800 transition-all"
              >
                {loading ? 'Verifying...' : 'Authorize Access'}
              </button>
            </form>
          )}

          <div className="mt-10 pt-8 border-t border-slate-50 text-center">
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">
              Identity Verification Required
            </p>
          </div>
        </div>
      </motion.div>

      {/* Global Security Branding */}
      <div className="mt-12 opacity-30 text-center md:translate-x-24">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">NexovTech Defense Systems &copy; 2026</p>
      </div>
    </div>
  );
};

export default Login;
