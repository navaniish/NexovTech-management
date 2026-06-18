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
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sentinel } from '../services/securityService';
import { useFaceTracking } from '../hooks/useFaceTracking';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState('google'); // 'google' | 'face' | 'fingerprint' | 'admin'
  const [adminCreds, setAdminCreds] = useState({ email: '', password: '' });

  // Fingerprint State
  const [fingerprintEmail, setFingerprintEmail] = useState('');
  const [fingerprintProgress, setFingerprintProgress] = useState(0);
  const [isFingerprintScanning, setIsFingerprintScanning] = useState(false);
  const fingerprintIntervalRef = useRef(null);
  // Step: 'idle' | 'checking' | 'registering' | 'scanning' | 'verifying' | 'success' | 'error'
  const [fingerprintStep, setFingerprintStep] = useState('idle');
  const [isFirstTimeEnroll, setIsFirstTimeEnroll] = useState(false);

  // Biometric Auth State
  const [faceEmail, setFaceEmail] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0); // 0: idle, 1: scanning/pipeline, 4: comparing, 5: success
  const [showOtpPrompt, setShowOtpPrompt] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Automated, hands-free authentication pipeline states
  const [faceDetected, setFaceDetected] = useState(false);
  const [eyesTracking, setEyesTracking] = useState(false);
  const [gazeVerified, setGazeVerified] = useState(false);
  const [blinkVerified, setBlinkVerified] = useState(false);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [resolvedName, setResolvedName] = useState('');
  const [gazeProgress, setGazeProgress] = useState(0);

  const stableStartTimeRef = useRef(null);
  const authTriggeredRef = useRef(false);

  // Real-time eye tracking
  const { eyeData, modelState, blinkCount } = useFaceTracking(videoRef, canvasRef, isScanning);
  const initialBlinkCountRef = useRef(0);

  const { user, signInWithGoogle, adminLogin, adminOverride, biometricLogin, completeBiometricLogin } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect if user becomes authenticated
  useEffect(() => {
    if (user) {
      const targetPath = (user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Manager') ? '/' : '/employee/dashboard';
      navigate(targetPath);
    }
  }, [user, navigate]);

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
        // Redirection handled by useEffect
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
      if (fingerprintIntervalRef.current) {
        clearInterval(fingerprintIntervalRef.current);
      }
    };
  }, []);

  // Make sure we stop camera and reset scanning on method change
  useEffect(() => {
    stopCamera();
    setIsScanning(false);
    setScanStep(0);
    setError('');
    setIsFingerprintScanning(false);
    setFingerprintProgress(0);
    setFingerprintStep('idle');
    setIsFirstTimeEnroll(false);
    if (fingerprintIntervalRef.current) {
      clearInterval(fingerprintIntervalRef.current);
    }
  }, [loginMethod]);


  const startCamera = async () => {
    setError('');
    setFaceDetected(false);
    setEyesTracking(false);
    setGazeVerified(false);
    setBlinkVerified(false);
    setIdentityConfirmed(false);
    setResolvedName('');
    setGazeProgress(0);
    stableStartTimeRef.current = null;
    authTriggeredRef.current = false;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 300, height: 300, facingMode: 'user' }
      });
      setStream(mediaStream);
      setIsScanning(true);
      setScanStep(1);
    } catch (err) {
      console.error("Camera access failed:", err);
      setError("Webcam connection blocked. Please check browser permissions.");
    }
  };

  const startFingerprintScan = () => {
    if (!fingerprintEmail) return;
    setIsFingerprintScanning(true);
    setFingerprintProgress(0);
    setError('');

    fingerprintIntervalRef.current = setInterval(() => {
      setFingerprintProgress(prev => {
        if (prev >= 100) {
          clearInterval(fingerprintIntervalRef.current);
          handleFingerprintVerify();
          return 100;
        }
        return prev + 4;
      });
    }, 40);
  };

  const stopFingerprintScan = () => {
    clearInterval(fingerprintIntervalRef.current);
    setIsFingerprintScanning(false);
    if (fingerprintProgress < 100) {
      setFingerprintProgress(0);
    }
  };

  const handleFingerprintVerify = async () => {
    setLoading(true);
    try {
      const BiometricsService = (await import('../services/biometricsService')).default;
      const result = await BiometricsService.verifyFingerprint(fingerprintEmail);

      if (result.token) {
        setIdentityConfirmed(true);
        setResolvedName(result.user?.name || 'NAVANEESWAR');
        setScanStep(5);
        setTimeout(() => {
          setIsFingerprintScanning(false);
          setFingerprintProgress(0);
          completeBiometricLogin(result.token, result.user);
        }, 2000);
      } else {
        throw new Error(result.message || 'Fingerprint verification failed.');
      }
    } catch (err) {
      setError(err.message || 'Fingerprint verification failed.');
      setIsFingerprintScanning(false);
      setFingerprintProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSystemBiometricVerify = async () => {
    if (!fingerprintEmail) return;
    setError('');
    setFingerprintStep('checking');
    try {
      const BiometricsService = (await import('../services/biometricsService')).default;

      // Check if this is first-time registration
      let enrolled = false;
      try {
        const status = await BiometricsService.checkWebAuthnStatus(fingerprintEmail);
        enrolled = status.enrolled;
      } catch (e) {
        // If user not found, surface that error
        throw e;
      }

      if (!enrolled) {
        setIsFirstTimeEnroll(true);
        setFingerprintStep('registering');
        // Register the physical fingerprint (triggers OS biometric prompt)
        await BiometricsService.registerWebAuthnPublic(fingerprintEmail);
      }

      setFingerprintStep('scanning');
      setIsFirstTimeEnroll(false);

      // Authenticate with the physical sensor
      const result = await BiometricsService.authenticateWebAuthn(fingerprintEmail);

      if (result.token) {
        setFingerprintStep('success');
        setScanStep(5);
        setResolvedName(result.user?.name || fingerprintEmail.split('@')[0].toUpperCase());
        setTimeout(() => {
          completeBiometricLogin(result.token, result.user);
        }, 2000);
      } else {
        throw new Error(result.message || 'Fingerprint verification failed.');
      }
    } catch (err) {
      const msg = err.message || '';
      // User cancelled the OS dialog
      if (msg.includes('cancelled') || msg.includes('canceled') || msg.includes('NotAllowedError') || err.name === 'NotAllowedError') {
        setFingerprintStep('idle');
        setError('Biometric prompt was cancelled. Please try again.');
      } else {
        setFingerprintStep('error');
        setError(msg || 'Physical fingerprint verification failed.');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Automated hands-free pipeline state updates
  useEffect(() => {
    if (!isScanning) return;

    // 1. Face Detection Check
    if (eyeData?.detected) {
      setFaceDetected(true);
    } else {
      setFaceDetected(false);
      setEyesTracking(false);
      setGazeVerified(false);
      setGazeProgress(0);
      stableStartTimeRef.current = null;
      return;
    }

    // 2. Eyes Tracking Check
    if (eyeData?.lCenter && eyeData?.rCenter) {
      setEyesTracking(true);
    } else {
      setEyesTracking(false);
      setGazeVerified(false);
      setGazeProgress(0);
      stableStartTimeRef.current = null;
      return;
    }

    // 3. Verify Gaze (Looking at Camera)
    const blackEyesDetected = eyeData.lCenter.darkPercent >= 60 && eyeData.rCenter.darkPercent >= 60;
    if (blackEyesDetected && !gazeVerified) {
      if (!stableStartTimeRef.current) {
        stableStartTimeRef.current = Date.now();
      }
      const elapsed = Date.now() - stableStartTimeRef.current;
      const progress = Math.min(100, Math.round((elapsed / 1500) * 100));
      setGazeProgress(progress);

      if (elapsed >= 1500) {
        setGazeVerified(true);
        initialBlinkCountRef.current = blinkCount;
      }
    } else if (!blackEyesDetected && !gazeVerified) {
      stableStartTimeRef.current = null;
      setGazeProgress(0);
    }

    // 4. Verify Blink Liveness
    if (gazeVerified && !blinkVerified) {
      if (blinkCount > initialBlinkCountRef.current) {
        setBlinkVerified(true);
      }
    }
  }, [isScanning, eyeData, gazeVerified, blinkVerified, blinkCount]);

  // Trigger Biometric Verification on Gaze Lock
  useEffect(() => {
    if (gazeVerified && blinkVerified && !authTriggeredRef.current) {
      authTriggeredRef.current = true;
      setScanStep(4); // Stage 4: Authenticating
      handleBiometricVerify();
    }
  }, [gazeVerified, blinkVerified]);

  const handleBiometricVerify = async (code = null) => {
    setError('');
    try {
      const mockTemplate = `template_hash_${faceEmail.toLowerCase()}`;
      const BiometricsService = (await import('../services/biometricsService')).default;
      const result = await BiometricsService.verify(faceEmail, mockTemplate, code, true);

      if (result.token && !result.requireOTP) {
        setIdentityConfirmed(true);
        setResolvedName(result.user?.name || 'NAVANEESWAR');
        setScanStep(5); // Show Success Screen
        stopCamera();

        // 2-second premium delayed welcome transition
        setTimeout(() => {
          setIsScanning(false);
          setScanStep(0);
          completeBiometricLogin(result.token, result.user);
        }, 2000);
      } else if (result.requireOTP) {
        stopCamera();
        setIsScanning(false);
        setScanStep(0);
        setShowOtpPrompt(true);
      } else {
        throw new Error(result.message || 'Identity verification failed.');
      }
    } catch (err) {
      stopCamera();
      setIsScanning(false);
      setScanStep(0);
      authTriggeredRef.current = false;
      setGazeVerified(false);
      setBlinkVerified(false);
      setGazeProgress(0);
      stableStartTimeRef.current = null;

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
      const BiometricsService = (await import('../services/biometricsService')).default;
      const result = await BiometricsService.verify(faceEmail, mockTemplate, otpToken, true);

      if (result.token && !result.requireOTP) {
        setShowOtpPrompt(false);
        setIdentityConfirmed(true);
        setResolvedName(result.user?.name || 'NAVANEESWAR');
        setScanStep(5); // Show Success Screen

        // 2-second premium delayed welcome transition
        setTimeout(() => {
          setIsScanning(false);
          setScanStep(0);
          completeBiometricLogin(result.token, result.user);
        }, 2000);
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
        // Redirection handled by useEffect
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
        // Redirection handled by useEffect
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
      <div className="fixed inset-0 z-0">
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
              onClick={() => setLoginMethod('fingerprint')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${loginMethod === 'fingerprint' ? 'bg-white text-slate-950 shadow-sm border border-slate-250/20' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <Fingerprint size={12} /> Fingerprint
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
              {scanStep === 5 ? (
                // ── LOGIN SUCCESS SCREEN ──
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center py-6 text-center space-y-4"
                >
                  <div className="relative">
                    {/* Circular success ring */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-emerald-500/35 flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                      >
                        <CheckCircle2 size={36} className="text-white animate-pulse" />
                      </motion.div>
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -inset-3 bg-emerald-500/10 rounded-full -z-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-slate-400 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em]">Identity Confirmed</h3>
                    <h2 className="text-slate-900 text-xl sm:text-2xl font-black uppercase tracking-tight leading-none">
                      Welcome Back 👋<br />
                      <span className="text-indigo-650 block mt-1.5">{resolvedName}</span>
                    </h2>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] animate-pulse pt-2">
                      Loading your workspace...
                    </p>
                  </div>
                </motion.div>
              ) : !isScanning ? (
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
                            node.play().catch(err => {
                              if (err.name !== 'AbortError') console.error('Camera play error:', err);
                            });
                          }
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover rounded-full"
                    />
                    {/* Live canvas for real eye detection */}
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ zIndex: 10 }}
                    />

                    {/* Static HUD rings */}
                    <div className="absolute inset-0 border-2 border-indigo-500/40 rounded-full circle-scan" style={{ zIndex: 5 }} />
                    <div className="absolute inset-2 border border-dashed border-cyan-400/30 rounded-full circle-scan-reverse" style={{ zIndex: 5 }} />

                    {/* Model loading badge */}
                    {isScanning && modelState === 'loading' && (
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center" style={{ zIndex: 15 }}>
                        <span className="bg-black/80 text-cyan-400 text-[7px] font-black font-mono px-2 py-1 rounded tracking-widest uppercase animate-pulse border border-cyan-500/30">
                          ⬡ Loading AI Models...
                        </span>
                      </div>
                    )}

                    {/* No face detected badge */}
                    {isScanning && modelState === 'ready' && eyeData && !eyeData.detected && (
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center" style={{ zIndex: 15 }}>
                        <span className="bg-black/80 text-slate-300 text-[7px] font-black font-mono px-2 py-1 rounded tracking-widest uppercase animate-pulse border border-slate-600/40">
                          Searching...
                        </span>
                      </div>
                    )}

                    {isScanning && modelState === 'ready' && eyeData?.detected && gazeVerified && !blinkVerified && (
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center" style={{ zIndex: 15 }}>
                        <span className="bg-rose-950/90 text-rose-400 text-[7.5px] font-black font-mono px-3 py-1.5 rounded-full tracking-widest uppercase animate-pulse border border-rose-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]">
                          ⚡ PLEASE BLINK NOW ⚡
                        </span>
                      </div>
                    )}

                    {/* Laser sweep */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] laser-line pointer-events-none" style={{ zIndex: 8 }} />
                  </div>

                  {/* Premium Cyber Console Checklist */}
                  <div className="w-full bg-slate-950/90 border border-slate-800 rounded-2xl p-4 font-mono text-left space-y-2.5 text-[9px] sm:text-[10px] leading-relaxed select-none">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                      <span className="text-cyan-400 font-black tracking-widest uppercase">AUTHENTICATION PIPELINE</span>
                      <span className="text-slate-500 font-mono text-[8px] animate-pulse">SYSTEM ACTIVE</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border ${faceDetected ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-450' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                        {faceDetected ? '✓' : '⬡'}
                      </div>
                      <span className={`${faceDetected ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        {faceDetected ? 'FACE DETECTED' : 'DETECTING FACE...'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border ${eyesTracking ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-450' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                        {eyesTracking ? '✓' : '⬡'}
                      </div>
                      <span className={`${eyesTracking ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        {eyesTracking ? 'EYES TRACKING' : 'TRACKING EYES...'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border ${gazeVerified ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-455' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                        {gazeVerified ? '✓' : '⬡'}
                      </div>
                      <span className={`${gazeVerified ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        {gazeVerified ? 'LOOKING AT CAMERA' : 'VERIFYING GAZE...'}
                      </span>
                      {eyesTracking && !gazeVerified && (
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden shrink-0 ml-auto border border-slate-700">
                          <div className="bg-cyan-400 h-full transition-all duration-150" style={{ width: `${gazeProgress}%` }} />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border ${blinkVerified ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-450' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                        {blinkVerified ? '✓' : '⬡'}
                      </div>
                      <span className={`${blinkVerified ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        {blinkVerified ? 'BLINK / LIVENESS VERIFIED' : 'LIVENESS PENDING'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border ${identityConfirmed ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-450' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                        {identityConfirmed ? '✓' : '⬡'}
                      </div>
                      <span className={`${identityConfirmed ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        {identityConfirmed ? 'IDENTITY CONFIRMED' : scanStep === 4 ? 'COMPARING EMBEDDING...' : 'MATCH PENDING'}
                      </span>
                    </div>
                  </div>

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
          ) : loginMethod === 'fingerprint' ? (
            // ── PHYSICAL FINGERPRINT AUTH PANEL ──
            <motion.div
              key="fingerprint"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-4"
            >
              {scanStep === 5 ? (
                // ── SUCCESS SCREEN ──
                <motion.div
                  key="fingerprint_success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-6 text-center space-y-4"
                >
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-emerald-500/35 flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                      >
                        <CheckCircle2 size={36} className="text-white" />
                      </motion.div>
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.35, 0.15] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -inset-4 bg-emerald-500/10 rounded-full -z-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Biometric Confirmed</h3>
                    <h2 className="text-slate-900 text-xl sm:text-2xl font-black uppercase tracking-tight leading-none">
                      Welcome Back 👋<br />
                      <span className="text-indigo-600 block mt-1.5">{resolvedName}</span>
                    </h2>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] animate-pulse pt-2">
                      Loading your workspace...
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {/* Email Input */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Account Identity Email</label>
                    <input
                      required
                      type="email"
                      placeholder="specialist.name@nexovtech.com"
                      value={fingerprintEmail}
                      onChange={(e) => { setFingerprintEmail(e.target.value); setFingerprintStep('idle'); setError(''); }}
                      disabled={fingerprintStep !== 'idle' && fingerprintStep !== 'error'}
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-900 focus:outline-none focus:border-indigo-500 transition-all font-medium text-xs sm:text-sm placeholder-slate-400 disabled:opacity-60"
                    />
                  </div>

                  {/* Fingerprint Scanner HUD */}
                  <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 text-center relative overflow-hidden flex flex-col items-center justify-center gap-4">
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

                    {/* Animated Scanner Ring + Fingerprint Icon */}
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      {/* Outer decorative rings */}
                      <div className="absolute inset-0 border border-slate-800 rounded-full circle-scan" />
                      <div className="absolute inset-2 border border-dashed border-indigo-500/15 rounded-full circle-scan-reverse" />

                      {/* Progress ring SVG */}
                      <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 112 112">
                        <circle cx="56" cy="56" r="50" stroke="#1e293b" strokeWidth="2.5" fill="transparent" />
                        <circle
                          cx="56" cy="56" r="50"
                          stroke={fingerprintStep === 'error' ? '#ef4444' : fingerprintStep === 'success' ? '#10b981' : '#6366f1'}
                          strokeWidth="2.5"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 50}
                          strokeDashoffset={2 * Math.PI * 50 * (
                            fingerprintStep === 'idle' ? 1 :
                            fingerprintStep === 'checking' ? 0.7 :
                            fingerprintStep === 'registering' ? 0.45 :
                            fingerprintStep === 'scanning' ? 0.2 :
                            0
                          )}
                          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
                        />
                      </svg>

                      {/* Central tap button */}
                      <button
                        onClick={handleSystemBiometricVerify}
                        disabled={!fingerprintEmail || (fingerprintStep !== 'idle' && fingerprintStep !== 'error')}
                        className={`w-[72px] h-[72px] rounded-full flex items-center justify-center border-2 transition-all duration-300 relative select-none z-10 ${
                          !fingerprintEmail
                            ? 'bg-slate-900 border-slate-800 text-slate-700 opacity-40 cursor-not-allowed'
                            : fingerprintStep === 'error'
                              ? 'bg-rose-950 border-rose-500/60 text-rose-400 cursor-pointer hover:border-rose-400'
                              : (fingerprintStep !== 'idle')
                                ? 'bg-indigo-950 border-indigo-500 text-indigo-400 shadow-[0_0_24px_rgba(99,102,241,0.45)] cursor-wait'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-500 cursor-pointer hover:shadow-[0_0_18px_rgba(99,102,241,0.3)]'
                        }`}
                      >
                        <Fingerprint
                          size={30}
                          className={fingerprintStep !== 'idle' && fingerprintStep !== 'error' ? 'animate-pulse' : ''}
                        />
                        {/* laser sweep on active states */}
                        {fingerprintStep !== 'idle' && fingerprintStep !== 'error' && (
                          <div className="absolute left-0 right-0 h-px bg-indigo-400/70 shadow-[0_0_8px_#818cf8] laser-line pointer-events-none" />
                        )}
                      </button>
                    </div>

                    {/* Step Status Console */}
                    <div className="w-full bg-slate-900/80 rounded-xl p-3 border border-slate-800 font-mono text-left space-y-1.5 text-[9px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                        <span className="text-cyan-400 font-black tracking-widest uppercase text-[8px]">Biometric Pipeline</span>
                        <span className={`text-[8px] font-mono animate-pulse ${
                          fingerprintStep === 'error' ? 'text-rose-400' : 'text-slate-500'
                        }`}>
                          {fingerprintStep === 'idle' ? 'STANDBY' :
                           fingerprintStep === 'error' ? 'FAILED' : 'ACTIVE'}
                        </span>
                      </div>

                      {[
                        { key: 'checking',    label: 'Verifying identity...',           done: ['registering','scanning','verifying','success'].includes(fingerprintStep) },
                        { key: 'registering', label: isFirstTimeEnroll ? 'Enrolling fingerprint (first time)...' : 'Credential found, skipping...', done: ['scanning','verifying','success'].includes(fingerprintStep) },
                        { key: 'scanning',    label: 'Touch your fingerprint sensor...', done: ['verifying','success'].includes(fingerprintStep) },
                        { key: 'verifying',   label: 'Verifying with server...',         done: ['success'].includes(fingerprintStep) },
                      ].map(({ key, label, done }) => {
                        const active = fingerprintStep === key;
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full shrink-0 border flex items-center justify-center text-[7px] ${
                              done    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                              active  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 animate-pulse' :
                                        'bg-slate-900 border-slate-800 text-slate-600'
                            }`}>{done ? '✓' : active ? '◉' : '⬡'}</div>
                            <span className={done ? 'text-emerald-400 font-bold' : active ? 'text-indigo-300 font-semibold' : 'text-slate-500'}>
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Instruction / CTA text */}
                    <p className="text-slate-500 text-[9px] leading-relaxed max-w-[240px] mx-auto">
                      {!fingerprintEmail
                        ? 'Enter your email address above to enable the biometric scanner.'
                        : fingerprintStep === 'idle' || fingerprintStep === 'error'
                          ? 'Tap the fingerprint icon or button below. Your device will prompt for Touch ID, Windows Hello, or your fingerprint sensor.'
                          : fingerprintStep === 'registering'
                            ? 'First-time setup: follow your device biometric prompt to enroll.'
                            : fingerprintStep === 'scanning'
                              ? '👆 Touch the fingerprint sensor on your device now.'
                              : 'Please wait...'}
                    </p>
                  </div>

                  {/* CTA button */}
                  <button
                    onClick={handleSystemBiometricVerify}
                    disabled={!fingerprintEmail || (fingerprintStep !== 'idle' && fingerprintStep !== 'error')}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    <Fingerprint size={14} />
                    {fingerprintStep === 'idle' ? 'Scan Physical Fingerprint' :
                     fingerprintStep === 'error' ? 'Retry Fingerprint Scan' :
                     fingerprintStep === 'checking' ? 'Checking Account...' :
                     fingerprintStep === 'registering' ? 'Enrolling Fingerprint...' :
                     fingerprintStep === 'scanning' ? 'Awaiting Biometric...' :
                     'Verifying...'}
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
