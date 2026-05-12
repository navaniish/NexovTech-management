import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  User as UserIcon,
  Sparkles,
  AlertTriangle,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  Zap,
  Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);

  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password, require2FA ? otpToken : null);
      if (result.success) {
        if (result.require2FA) {
          setRequire2FA(true);
        } else {
          navigate('/');
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Connection to security grid disrupted. Attempting reconnection...');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setRequire2FA(false);
    setOtpToken('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-rose-500 selection:text-white">
      {/* ── CYBERSECURITY BACKGROUND ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Deep Red Ambient Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-rose-900/20 blur-[160px] rounded-full animate-drift-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-slate-900/40 blur-[180px] rounded-full animate-drift-reverse" />
        <div className="absolute top-[30%] right-[-10%] w-[40%] h-[40%] bg-rose-600/5 blur-[120px] rounded-full animate-pulse-slow" />

        {/* Tactical Scanlines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[size:100%_4px,3px_100%] pointer-events-none" />
        
        {/* Hexagonal Grid Overlay (Faint) */}
        <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] scale-150" />
      </div>

      {/* Security Logo Branding */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-8 relative z-10 flex flex-col items-center"
      >
        <div className="w-32 h-32 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] p-1 flex items-center justify-center shadow-2xl relative group overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-tr from-rose-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
           <img 
            src="/assets/logo_nexo.jpeg" 
            alt="Nexov" 
            className="w-full h-full object-cover rounded-[30px] relative z-10 brightness-110 grayscale group-hover:grayscale-0 transition-all duration-700" 
          />
        </div>
        <div className="mt-4 text-center">
           <h2 className="text-xl font-black text-white tracking-[0.4em] uppercase">NEXOV<span className="text-rose-600">TECH</span></h2>
           <p className="text-[9px] font-bold text-rose-600/60 uppercase tracking-[0.5em] mt-1">Security Shield Active</p>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="relative z-10 w-full max-w-[450px]"
      >
        {/* Red Glow Pulse Behind Card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-rose-600 to-rose-900 rounded-[40px] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse-slow" />
        
        <div className="bg-[#0c0c0c]/80 backdrop-blur-[60px] rounded-[40px] p-8 sm:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
           {/* Card Glare Effect */}
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-rose-600/50 to-transparent" />

           <AnimatePresence mode="wait">
            {!require2FA ? (
              <motion.div key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <div className="mb-10">
                   <h3 className="text-2xl font-black text-white tracking-tighter uppercase mb-1">Identity <span className="text-rose-600">Gateway</span></h3>
                   <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Authorize secure session</p>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase tracking-widest mb-8"
                  >
                    <AlertTriangle size={16} className="shrink-0" />
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Terminal ID (Email)</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-5 flex items-center text-slate-600 group-focus-within/input:text-rose-600 transition-colors">
                        <Mail size={16} />
                      </div>
                      <input 
                        required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nexus@nexov.tech"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white placeholder:text-slate-700 focus:outline-none focus:bg-white/[0.05] focus:border-rose-600/50 transition-all duration-300 font-medium text-sm" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Access Cipher (Password)</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-5 flex items-center text-slate-600 group-focus-within/input:text-rose-600 transition-colors">
                        <Lock size={16} />
                      </div>
                      <input 
                        required type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-14 pr-14 text-white placeholder:text-slate-700 focus:outline-none focus:bg-white/[0.05] focus:border-rose-600/50 transition-all duration-300 font-medium text-sm" 
                      />
                      <button 
                        type="button" onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" disabled={loading} 
                    className="w-full relative overflow-hidden bg-rose-600 hover:bg-rose-500 group/btn h-14 rounded-2xl transition-all shadow-2xl shadow-rose-600/20 active:scale-95 disabled:opacity-50 mt-4"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-3 text-white font-black text-[11px] uppercase tracking-[0.3em]">
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Establish Connection <Zap size={16} className="group-hover/btn:scale-125 transition-transform fill-current" /></>
                      )}
                    </div>
                    {/* Shimmer Effect */}
                    <div className="absolute top-0 -inset-full h-full w-1/2 z-20 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/20 opacity-40 group-hover/btn:animate-shimmer" />
                  </button>
                </form>

                <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                   <button onClick={() => resetPassword(email)} className="text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-rose-600 transition-colors">Reset Encryption</button>
                   <div className="flex items-center gap-2 text-[9px] font-black text-rose-600/40 uppercase tracking-widest">
                      <ShieldCheck size={12} /> Encrypted Session
                   </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="2fa" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <button onClick={handleBackToLogin} className="mb-8 flex items-center gap-2 text-slate-600 hover:text-white transition-colors text-[9px] font-black uppercase tracking-[0.2em]">
                  <ChevronLeft size={16} /> Re-verify Identity
                </button>

                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-rose-600/10 rounded-3xl flex items-center justify-center text-rose-600 mx-auto mb-6 shadow-2xl border border-rose-600/20">
                    <Fingerprint size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tighter uppercase mb-1">MFA <span className="text-rose-600">Auth</span></h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Security Matrix Synchronization Required</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4 text-center">
                    <input 
                       required type="text" maxLength="6" value={otpToken} onChange={(e) => setOtpToken(e.target.value)} placeholder="0 0 0 0 0 0"
                       className="w-full bg-white/[0.03] border border-rose-600/20 rounded-[28px] py-6 text-center text-3xl font-black tracking-[0.5em] text-rose-600 placeholder:text-slate-800 focus:outline-none focus:border-rose-600 focus:bg-rose-600/5 transition-all" 
                    />
                    <div className="flex items-center justify-center gap-2 text-[9px] font-black text-rose-600/60 uppercase tracking-[0.2em]">
                       <div className="w-1 h-1 rounded-full bg-rose-600 animate-pulse" />
                       Temporal Token Valid: 30s
                    </div>
                  </div>

                  <button type="submit" disabled={loading || otpToken.length < 6} className="w-full h-14 bg-white text-black font-black text-[11px] uppercase tracking-[0.3em] rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-xl disabled:opacity-20 flex items-center justify-center gap-2">
                    {loading ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <>Finalize Access <CheckCircle2 size={16} /></>}
                  </button>
                </form>
              </motion.div>
            )}
           </AnimatePresence>
        </div>

        {/* Footer Branding */}
        <div className="mt-12 flex flex-col items-center gap-4 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000">
           <div className="flex items-center gap-6">
              <span className="text-[10px] font-black text-white tracking-[0.3em] uppercase">FIDO2</span>
              <span className="text-[10px] font-black text-white tracking-[0.3em] uppercase">W3C</span>
              <span className="text-[10px] font-black text-white tracking-[0.3em] uppercase">SAML</span>
           </div>
           <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.4em]">NexovTech Digital Defense Layer v4.0.2</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
