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
    setTimeout(() => setClickCount(0), 5000);
  };

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

  // Stagger variants for premium mobile cascade entrance
  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 90,
        damping: 14,
        delayChildren: 0.15,
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 15 },
    },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden font-sans selection:bg-indigo-650 selection:text-white bg-slate-900">
      
      {/* ── CINEMATIC OFFICE GRID BACKGROUND ── */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
          style={{ backgroundImage: "url('/assets/nexovtech-final-branded.png')" }}
        />
        {/* Crisp premium vignetted gradient overlay for clear, vibrant aesthetics */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/80 via-slate-950/30 to-transparent" />
        <div className="absolute inset-0 bg-slate-950/5 backdrop-blur-[0.5px]" />
      </div>

      {/* Cyber ambient halos */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none -z-10 animate-pulse" />

      {/* Identity Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: -30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14 }}
        className="mb-6 md:mb-8 relative z-10"
      >
        <div
          onClick={handleLogoClick}
          className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden flex items-center justify-center group bg-white p-1 cursor-pointer active:scale-95 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 shrink-0"
        >
          <img
            src="/assets/logo_nexo.jpeg"
            alt="Nexov"
            className="w-full h-full object-cover rounded-full transition-transform duration-700 group-hover:scale-110"
          />
        </div>
      </motion.div>

      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-[380px] md:max-w-[400px] bg-white/90 backdrop-blur-2xl rounded-[24px] sm:rounded-[40px] p-5 sm:p-10 border border-white/50 shadow-[0_30px_70px_rgba(15,23,42,0.15)]"
      >
        <motion.div variants={itemVariants} className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter uppercase mb-1 flex items-center justify-center gap-2 italic">
            {isAdminMode ? 'SYSTEM' : 'SECURE'} <span className="text-slate-500">{isAdminMode ? 'ADMIN' : 'GATEWAY'}</span>
          </h1>
          <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em]">NexovTech Management Platform</p>
        </motion.div>

        {error && (
          <motion.div
            variants={itemVariants}
            className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl flex items-center gap-3 text-rose-600 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-5"
          >
            <AlertTriangle size={15} className="shrink-0" /> {error}
          </motion.div>
        )}

        {!isAdminMode ? (
          <div className="space-y-5 sm:space-y-6">
            {showKeyConsole && (
              <motion.div
                variants={itemVariants}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-xl mb-3"
              >
                <p className="text-indigo-600 text-[8px] font-black uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                  Neural Override Active
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="ACCESS KEY"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    className="flex-1 h-10 sm:h-12 bg-white border border-slate-200 rounded-lg sm:rounded-xl px-3 text-slate-900 text-xs font-mono focus:outline-none focus:border-indigo-400 placeholder-slate-300"
                    onKeyDown={(e) => e.key === 'Enter' && triggerRapidAccess()}
                    autoFocus
                  />
                  <button
                    onClick={triggerRapidAccess}
                    disabled={loading}
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 text-white rounded-lg sm:rounded-xl flex items-center justify-center hover:bg-slate-800 transition-colors shrink-0"
                  >
                    <Zap size={16} className="text-white" />
                  </button>
                </div>
              </motion.div>
            )}

            <motion.div variants={itemVariants} className="bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-indigo-100 text-indigo-600 shrink-0">
                <ShieldCheck size={20} className="sm:size-[24px]" />
              </div>
              <p className="text-slate-600 text-[11px] sm:text-[13px] font-bold uppercase tracking-wider leading-relaxed">
                Only authorized NexovTech employees with{' '}
                <span className="text-slate-900 block mt-0.5 sm:inline font-black">name.nexovtech@gmail.com</span>{' '}
                can access this node.
              </p>
            </motion.div>

            <motion.div variants={itemVariants}>
              <motion.button
                onClick={handleGoogleLogin}
                disabled={loading}
                whileHover="hover"
                whileTap={{ scale: 0.98 }}
                className="relative overflow-hidden w-full h-14 sm:h-16 bg-slate-950 hover:bg-slate-900 text-white rounded-xl sm:rounded-[24px] flex items-center justify-between px-5 sm:px-8 transition-all disabled:opacity-50 shadow-md group border border-slate-800 cursor-pointer"
              >
                {/* Premium continuous metallic shine sweep animation */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{
                    repeat: Infinity,
                    repeatType: 'loop',
                    duration: 2.5,
                    ease: 'linear',
                  }}
                />

                <div className="flex items-center gap-3.5 min-w-0 relative z-10">
                  <motion.img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-5.5 h-5.5 shrink-0 bg-white rounded-full p-0.5"
                    variants={{
                      hover: { rotate: 15, scale: 1.05 }
                    }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  />
                  <span className="font-black text-[10px] sm:text-[12px] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-white truncate">
                    {loading ? 'Authenticating...' : 'Sign in with Google'}
                  </span>
                </div>
                {!loading && (
                  <motion.div
                    className="text-white shrink-0 relative z-10"
                    variants={{
                      hover: { x: 4 }
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <ArrowRight size={16} />
                  </motion.div>
                )}
              </motion.button>
            </motion.div>
          </div>
        ) : (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <motion.div variants={itemVariants} className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Admin Email</label>
              <input
                required type="email" value={adminCreds.email}
                onChange={(e) => setAdminCreds({ ...adminCreds, email: e.target.value })}
                placeholder="admin@nexovtech.com"
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-900 focus:outline-none focus:border-indigo-500 transition-all font-medium text-xs sm:text-sm placeholder-slate-400"
              />
            </motion.div>
            <motion.div variants={itemVariants} className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Access Key</label>
              <input
                required type="password" value={adminCreds.password}
                onChange={(e) => setAdminCreds({ ...adminCreds, password: e.target.value })}
                placeholder="••••••••"
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-900 focus:outline-none focus:border-indigo-500 transition-all font-medium text-xs sm:text-sm placeholder-slate-400"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <button
                type="submit" disabled={loading}
                className="w-full h-12 sm:h-14 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mt-3 transition-all shadow-md shadow-indigo-600/10"
              >
                {loading ? 'Verifying...' : 'Authorize Access'}
              </button>
            </motion.div>
          </form>
        )}

        <motion.div variants={itemVariants} className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100 text-center">
          <p className="text-[9px] sm:text-[10px] font-black text-slate-350 uppercase tracking-[0.4em]">
            Identity Verification Required
          </p>
        </motion.div>
      </motion.div>

      {/* Global Security Branding */}
      <div className="mt-8 md:mt-12 opacity-30 text-center">
        <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">NexovTech Defense Systems &copy; 2026</p>
      </div>
    </div>
  );
};

export default Login;
