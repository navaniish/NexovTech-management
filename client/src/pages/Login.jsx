import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Zap,
  Bot,
  Camera,
  Fingerprint,
  KeyRound,
  Lock,
  RefreshCw,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sentinel } from '../services/securityService';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState('google'); // 'google' | 'face' | 'admin'
  const [adminCreds, setAdminCreds] = useState({ email: '', password: '' });
  
  // Biometric Auth State
  const [faceEmail, setFaceEmail] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0); // 0: idle, 1: center face, 2: blink check, 3: head tilt, 4: template match
  const [showOtpPrompt, setShowOtpPrompt] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);

  const { signInWithGoogle, adminLogin, adminOverride, biometricLogin } = useAuth();
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

  const streamRef = useRef(null);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.shiftKey && e.key.toUpperCase() === 'A') {
        e.preventDefault();
        setShowKeyConsole(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Make sure we stop camera on method change
  useEffect(() => {
    stopCamera();
    setIsScanning(false);
    setScanStep(0);
    setError('');
  }, [loginMethod]);

  const startCamera = async () => {
    setError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 300, height: 300, facingMode: 'user' } 
      });
      // Note: do NOT set videoRef.current.srcObject here — the video element isn't
      // rendered yet (guarded by isScanning). The useEffect above handles binding.
      setStream(mediaStream);
      setIsScanning(true);
      setScanStep(1);
    } catch (err) {
      console.error("Camera access failed:", err);
      setError("Webcam connection blocked. Please check browser permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Handle Scan Steps Simulation
  // Stage 1 auto-advances. Stages 2 and 3 require manual confirmation via "Done" button.
  useEffect(() => {
    if (!isScanning) return;

    let timer;
    if (scanStep === 1 && stream) {
      timer = setTimeout(() => setScanStep(2), 2000);
    } else if (scanStep === 4) {
      // Guard: only verify if camera stream is actually live
      const tracks = streamRef.current?.getVideoTracks() || [];
      const cameraLive = tracks.length > 0 && tracks[0].readyState === 'live';
      if (!cameraLive) {
        setError('Camera feed lost. Please restart the scan.');
        stopCamera();
        setIsScanning(false);
        setScanStep(0);
      } else {
        handleBiometricVerify();
      }
    }

    return () => clearTimeout(timer);
  }, [isScanning, scanStep, stream]);

  const handleBiometricVerify = async (code = null) => {
    setError('');
    try {
      const mockTemplate = `template_hash_${faceEmail.toLowerCase()}`;
      const result = await biometricLogin(faceEmail, mockTemplate, code, true);
      
      if (result.success) {
        stopCamera();
        setIsScanning(false);
        setScanStep(0);
        if (result.requireOTP) {
          setShowOtpPrompt(true);
        } else {
          const storedUser = JSON.parse(localStorage.getItem('nexov_user'));
          const targetPath = (storedUser?.role === 'Admin' || storedUser?.role === 'Manager') ? '/' : '/employee/dashboard';
          navigate(targetPath);
        }
      } else {
        stopCamera();
        setIsScanning(false);
        setScanStep(0);
        const msg = result.message || '';
        if (msg.toLowerCase().includes('no biometrics registered')) {
          setError('No face profile found. Log in via Google or Admin first, then enroll your face in Security Settings.');
        } else {
          setError(msg);
        }
      }
    } catch (err) {
      stopCamera();
      setIsScanning(false);
      setScanStep(0);
      const rawMsg = err.message || '';
      if (rawMsg.toLowerCase().includes('no biometrics registered')) {
        setError('No face profile found. Log in via Google or Admin first, then enroll your face in Security Settings.');
      } else {
        setError(rawMsg || 'Identity verification protocol failed.');
      }
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const mockTemplate = `template_hash_${faceEmail.toLowerCase()}`;
      const result = await biometricLogin(faceEmail, mockTemplate, otpToken, true);
      
      if (result.success && !result.requireOTP) {
        setShowOtpPrompt(false);
        const storedUser = JSON.parse(localStorage.getItem('nexov_user'));
        const targetPath = (storedUser?.role === 'Admin' || storedUser?.role === 'Manager') ? '/' : '/employee/dashboard';
        navigate(targetPath);
      } else {
        setError(result.message || 'Verification code invalid or expired.');
      }
    } catch (err) {
      setError(err.message || 'Verification code invalid.');
    } finally {
      setLoading(false);
    }
  };

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

  // Stagger variants
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
    <div className="min-h-screen flex flex-col items-center justify-start sm:justify-center p-3 sm:p-6 relative overflow-y-auto font-sans selection:bg-indigo-650 selection:text-white bg-slate-900 py-8">
      
      {/* Dynamic Laser sweeping styles */}
      <style>{`
        @keyframes laser-sweep {
          0%, 100% { top: 0%; opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          50% { top: 100%; opacity: 0.8; }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes scan-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        .laser-line {
          animation: laser-sweep 2s ease-in-out infinite;
        }
        .circle-scan {
          animation: spin-slow 15s linear infinite;
        }
        .circle-scan-reverse {
          animation: spin-slow 22s linear infinite reverse;
        }
        .scan-glow-dots {
          animation: scan-glow 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* ── CINEMATIC OFFICE GRID BACKGROUND ── */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
          style={{ backgroundImage: "url('/assets/nexovtech-final-branded.png')" }}
        />
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
        className="mb-4 md:mb-6 relative z-10"
      >
        <div
          onClick={handleLogoClick}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex items-center justify-center group bg-white p-1 cursor-pointer active:scale-95 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 shrink-0"
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
        className="relative z-10 w-full max-w-[420px] bg-white/90 backdrop-blur-2xl rounded-[24px] sm:rounded-[36px] p-5 sm:p-8 border border-white/50 shadow-[0_30px_70px_rgba(15,23,42,0.15)]"
      >
        <motion.div variants={itemVariants} className="text-center mb-5">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter uppercase mb-0.5 flex items-center justify-center gap-2 italic">
            SECURE <span className="text-slate-500">GATEWAY</span>
          </h1>
          <p className="text-slate-400 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.25em]">NexovTech Defense Node</p>
        </motion.div>

        {error && (
          <motion.div
            variants={itemVariants}
            className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl flex items-center gap-3 text-rose-600 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-4"
          >
            <AlertTriangle size={14} className="shrink-0" /> {error}
          </motion.div>
        )}

        {/* Rapid Access Key Console */}
        {showKeyConsole && (
          <motion.div
            variants={itemVariants}
            className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-xl mb-4"
          >
            <p className="text-indigo-600 text-[8px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
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
                <Zap size={15} className="text-white" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── SECURITY MODE TAB BAR ── */}
        {!showOtpPrompt && (
          <div className="flex bg-slate-100 p-1 rounded-xl sm:rounded-2xl mb-5 border border-slate-200">
            <button
              onClick={() => setLoginMethod('google')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${loginMethod === 'google' ? 'bg-white text-slate-950 shadow-sm border border-slate-250/20' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <ShieldCheck size={12} /> Google
            </button>
            <button
              onClick={() => setLoginMethod('face')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${loginMethod === 'face' ? 'bg-white text-slate-950 shadow-sm border border-slate-250/20' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <Camera size={12} /> Face ID
            </button>
            <button
              onClick={() => setLoginMethod('admin')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${loginMethod === 'admin' ? 'bg-white text-slate-950 shadow-sm border border-slate-250/20' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <KeyRound size={12} /> Admin
            </button>
          </div>
        )}

        {/* ── INTERACTIVE PANELS ── */}
        <AnimatePresence mode="wait">
          {showOtpPrompt ? (
            // ── LAYER 4 MFA OTP CARD ──
            <motion.form
              key="otp"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleOtpSubmit}
              className="space-y-4"
            >
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-center mb-2">
                <Lock size={22} className="text-amber-600 mx-auto mb-2 animate-bounce" />
                <h3 className="text-slate-900 text-xs font-black uppercase tracking-wider mb-1">Layer 4 Verification Active</h3>
                <p className="text-slate-500 text-[10px] font-medium leading-relaxed">
                  Unrecognized browser fingerprint. We've dispatched a security access code to <strong className="text-slate-900">{faceEmail}</strong>.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">MFA Security Code</label>
                <input
                  required
                  type="text"
                  maxLength={6}
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="000000"
                  className="w-full h-12 bg-slate-50 border border-slate-250 rounded-xl px-4 text-center text-lg font-mono tracking-[0.5em] text-slate-900 focus:outline-none focus:border-amber-500 transition-all"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpPrompt(false);
                    setOtpToken('');
                    setError('');
                  }}
                  className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || otpToken.length !== 6}
                  className="flex-1 h-12 bg-slate-950 hover:bg-slate-900 text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all shadow-md"
                >
                  {loading ? 'Authorizing...' : 'Verify Access'}
                </button>
              </div>
            </motion.form>
          ) : loginMethod === 'google' ? (
            // ── GOOGLE METHOD PANEL ──
            <motion.div
              key="google"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-5"
            >
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 sm:p-5 text-center">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-2.5 border border-indigo-100 text-indigo-600 shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <p className="text-slate-600 text-[10px] sm:text-[12px] font-bold uppercase tracking-wider leading-relaxed">
                  Only authorized NexovTech employees with{' '}
                  <span className="text-slate-900 block mt-0.5 sm:inline font-black">name.nexovtech@gmail.com</span>{' '}
                  can access this gateway.
                </p>
              </div>

              <motion.button
                onClick={handleGoogleLogin}
                disabled={loading}
                whileHover="hover"
                whileTap={{ scale: 0.98 }}
                className="relative overflow-hidden w-full h-14 bg-slate-950 hover:bg-slate-900 text-white rounded-xl sm:rounded-[20px] flex items-center justify-between px-5 transition-all disabled:opacity-50 shadow-md group border border-slate-800 cursor-pointer"
              >
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
                  <span className="font-black text-[9px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-white truncate">
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
                    <ArrowRight size={14} />
                  </motion.div>
                )}
              </motion.button>

              {/* AGENTIC AI DIRECT AUTH ACCESS */}
              <motion.button
                onClick={async () => {
                  setLoading(true);
                  setError('');
                  try {
                    const result = await adminOverride('NEXOV-PRIME-2026');
                    if (result.success) {
                      navigate('/');
                    } else {
                      setError(result.message || 'Direct Access Refused.');
                    }
                  } catch (err) {
                    setError('Neural link severed.');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                whileHover="hover"
                whileTap={{ scale: 0.98 }}
                className="relative overflow-hidden w-full h-14 bg-gradient-to-r from-brand-600 to-indigo-650 hover:from-brand-500 hover:to-indigo-550 text-white rounded-xl sm:rounded-[20px] flex items-center justify-between px-5 transition-all disabled:opacity-50 shadow-xl group border border-indigo-500/20 cursor-pointer"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{
                    repeat: Infinity,
                    repeatType: 'loop',
                    duration: 3,
                    ease: 'linear',
                  }}
                />

                <div className="flex items-center gap-3.5 min-w-0 relative z-10">
                  <Bot size={18} className="shrink-0 text-white animate-pulse" />
                  <span className="font-black text-[9px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-white truncate">
                    {loading ? 'Initializing Direct Access...' : 'Agentic AI Direct Access'}
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
                    <ArrowRight size={14} />
                  </motion.div>
                )}
              </motion.button>
            </motion.div>
          ) : loginMethod === 'face' ? (
            // ── HIGH-SECURITY FACE ID METHOD PANEL ──
            <motion.div
              key="face"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-4"
            >
              {!isScanning ? (
                // Setup / Launch Camera Screen
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Account Identity Email</label>
                    <input
                      required
                      type="email"
                      placeholder="specialist.name@nexovtech.com"
                      value={faceEmail}
                      onChange={(e) => setFaceEmail(e.target.value)}
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-900 focus:outline-none focus:border-indigo-500 transition-all font-medium text-xs sm:text-sm placeholder-slate-450"
                    />
                  </div>

                  <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-5 text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3 border border-indigo-100 text-indigo-600 shadow-[0_4px_12px_rgba(99,102,241,0.15)]">
                      <Fingerprint size={28} className="animate-pulse" />
                    </div>
                    <h3 className="text-slate-800 text-[11px] font-black uppercase tracking-wider mb-1">Bio-Metric Recognition</h3>
                    <p className="text-slate-500 text-[9px] sm:text-[10px] leading-relaxed">
                      Facial templates will match against encrypted signatures stored securely inside the NexovTech Sentinel Node.
                    </p>
                  </div>

                  <button
                    onClick={startCamera}
                    disabled={!faceEmail}
                    className="w-full h-12 sm:h-14 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] transition-all shadow-md shadow-indigo-600/15 flex items-center justify-center gap-2"
                  >
                    <Camera size={14} /> Activate Biometric Camera
                  </button>
                </div>
              ) : (
                // Active Webcam Scanning View
                <div className="flex flex-col items-center space-y-4">
                  {/* Camera stream wrap */}
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-slate-900 shadow-[0_0_30px_rgba(99,102,241,0.4)] flex items-center justify-center">
                     <video
                      ref={(node) => {
                        if (node) {
                          videoRef.current = node;
                          if (stream && node.srcObject !== stream) {
                            node.srcObject = stream;
                            node.play().catch(err => console.error('Camera play error:', err));
                          }
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover rounded-full"
                    />
                    
                    {/* Glowing blue laser circle HUD */}
                    <div className="absolute inset-0 border-2 border-indigo-500/40 rounded-full circle-scan" />
                    <div className="absolute inset-2 border border-dashed border-cyan-400/30 rounded-full circle-scan-reverse" />
                    
                    {/* Glowing mesh targets */}
                    {scanStep >= 1 && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Circular Scanning Matrix Grid lines */}
                        <div className="absolute top-[30%] left-[25%] w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] scan-glow-dots" />
                        <div className="absolute top-[30%] right-[25%] w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] scan-glow-dots" />
                        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] scan-glow-dots" />
                        <div className="absolute bottom-[35%] left-[30%] w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] scan-glow-dots" />
                        <div className="absolute bottom-[35%] right-[30%] w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] scan-glow-dots" />
                        
                        {/* Connected lines simulation */}
                        <svg className="absolute inset-0 w-full h-full opacity-40 text-emerald-400" viewBox="0 0 100 100">
                          <line x1="30" y1="35" x2="50" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1" />
                          <line x1="70" y1="35" x2="50" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1" />
                          <line x1="35" y1="65" x2="50" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1" />
                          <line x1="65" y1="65" x2="50" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1" />
                          <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2" fill="none" />
                        </svg>
                      </div>
                    )}

                    {/* Laser scanning sweep animation */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] laser-line pointer-events-none" />
                  </div>

                  {/* Liveness Challenges UI */}
                  <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center font-mono">
                    <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-black flex items-center justify-center gap-1.5 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      {scanStep === 1 && 'STAGE 1: IDENTITY DISCOVERY'}
                      {scanStep === 2 && 'STAGE 2: LIVENESS VERIFICATION'}
                      {scanStep === 3 && 'STAGE 3: ANGULAR FACIAL RESOLUTION'}
                      {scanStep === 4 && 'STAGE 4: MATRIX TEMPLATE DECRYPTION'}
                    </p>
                    <p className="text-slate-300 text-[10px] uppercase font-bold tracking-wider leading-relaxed">
                      {scanStep === 1 && 'Align and center your face inside the glowing matrix frame.'}
                      {scanStep === 2 && 'Challenge: [BLINK TWICE SLOWLY] to verify authentic liveness. Tap Done when completed.'}
                      {scanStep === 3 && 'Challenge: [TILT HEAD SLIGHTLY LEFT] to map facial depth vectors. Tap Done when completed.'}
                      {scanStep === 4 && 'Rasterizing face geometry... matching credentials...'}
                    </p>
                  </div>

                  {/* Manual confirm button for login face steps */}
                  {(scanStep === 2 || scanStep === 3) && (
                    <button
                      onClick={() => setScanStep(prev => prev + 1)}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                    >
                      <CheckCircle2 size={15} />
                      Done — Next Step
                    </button>
                  )}

                  <button
                    onClick={() => {
                      stopCamera();
                      setIsScanning(false);
                      setScanStep(0);
                    }}
                    className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all"
                  >
                    Cancel Scan
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            // ── ADMIN METHOD PANEL (Credential Sign-in Form) ──
            <motion.form
              key="admin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              onSubmit={handleAdminSubmit}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Admin Email</label>
                <input
                  required
                  type="email"
                  value={adminCreds.email}
                  onChange={(e) => setAdminCreds({ ...adminCreds, email: e.target.value })}
                  placeholder="admin@nexovtech.com"
                  className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-900 focus:outline-none focus:border-indigo-500 transition-all font-medium text-xs sm:text-sm placeholder-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Access Key</label>
                <input
                  required
                  type="password"
                  value={adminCreds.password}
                  onChange={(e) => setAdminCreds({ ...adminCreds, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-900 focus:outline-none focus:border-indigo-500 transition-all font-medium text-xs sm:text-sm placeholder-slate-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 sm:h-14 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mt-3 transition-all shadow-md shadow-indigo-600/10"
              >
                {loading ? 'Verifying...' : 'Authorize Access'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <motion.div variants={itemVariants} className="mt-5 pt-4 border-t border-slate-100 text-center">
          <p className="text-[8px] sm:text-[9px] font-black text-slate-350 uppercase tracking-[0.4em]">
            Identity Verification Required
          </p>
        </motion.div>
      </motion.div>

      {/* Global Security Branding */}
      <div className="mt-6 md:mt-8 opacity-30 text-center">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">NexovTech Defense Systems &copy; 2026</p>
      </div>
    </div>
  );
};

export default Login;
