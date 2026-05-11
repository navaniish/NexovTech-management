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
  ChevronLeft
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
      setError('Connection to mission control failed. Try again.');
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* ── CINEMATIC AMBIENT BACKGROUND ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Base Office Texture */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] scale-110 motion-safe:animate-pulse-slow"
          style={{ backgroundImage: "url('/assets/office-bg.png')" }}
        />
        
        {/* Dark Tactical Overlay */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[3px]" />

        {/* Dynamic Animated Glows (Cyber-Minimalist Mesh) */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full animate-drift-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-500/10 blur-[150px] rounded-full animate-drift-reverse" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-600/10 blur-[100px] rounded-full animate-pulse-slow" />

        {/* Tactical Grid Overlay (Subtle) */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Premium Circular Login Logo */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 relative z-10">
        <motion.div
          animate={{
            boxShadow: ["0 0 50px rgba(139,92,246,0.2)", "0 0 100px rgba(139,92,246,0.4)", "0 0 50px rgba(139,92,246,0.2)"],
            borderColor: ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="w-48 h-48 bg-white/5 backdrop-blur-[30px] border border-white/20 rounded-full p-0 flex items-center justify-center shadow-2xl overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-500/10 to-transparent opacity-50" />
          <img 
            src="/assets/logo_nexo.jpeg" 
            alt="Nexov" 
            className="w-full h-full object-cover relative z-10 filter brightness-110" 
          />
        </motion.div>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-[480px]">
        {/* Soft Glow Behind Card */}
        <div className="absolute inset-0 bg-brand-500/20 blur-[100px] rounded-[40px] -z-10" />
        
        <div className="bg-white/5 backdrop-blur-[40px] rounded-[32px] sm:rounded-[48px] p-6 sm:p-10 md:p-14 border border-white/10 shadow-2xl relative overflow-hidden group">


          <AnimatePresence mode="wait">
            {!require2FA ? (
              <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-10">
                  <h2 className="text-4xl font-black text-white tracking-tighter mb-3 uppercase italic">Access Portal</h2>
                  <p className="text-slate-400 text-[13px] font-bold uppercase tracking-[0.2em] opacity-60">Identity & Security Node</p>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl flex items-center gap-4 text-rose-400 text-[11px] font-black uppercase tracking-widest mb-8"
                  >
                    <AlertTriangle size={18} className="shrink-0" />
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Email Identifier</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-5 flex items-center text-slate-500 group-focus-within/input:text-brand-400 transition-colors">
                        <Mail size={18} />
                      </div>
                      <input 
                        required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@nexov.tech"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4.5 pl-14 pr-6 text-white placeholder:text-slate-600 focus:outline-none focus:bg-white/10 focus:border-brand-500/50 transition-all duration-300" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Auth Key</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-5 flex items-center text-slate-500 group-focus-within/input:text-brand-400 transition-colors">
                        <Lock size={18} />
                      </div>
                      <input 
                        required type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4.5 pl-14 pr-14 text-white placeholder:text-slate-600 focus:outline-none focus:bg-white/10 focus:border-brand-500/50 transition-all duration-300" 
                      />
                      <button 
                        type="button" onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" disabled={loading} 
                    className="w-full relative overflow-hidden bg-slate-900 group/btn h-16 rounded-2xl transition-all shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-600 to-indigo-600 opacity-90 group-hover/btn:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                    <div className="relative z-10 flex items-center justify-center gap-4 text-white font-black text-[12px] uppercase tracking-[0.4em]">
                      {loading ? (
                        <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Initiate Access <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" /></>
                      )}
                    </div>
                    {/* Shimmer Effect */}
                    <div className="absolute top-0 -inset-full h-full w-1/2 z-20 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/10 opacity-40 group-hover/btn:animate-shimmer" />
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="2fa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <button onClick={handleBackToLogin} className="mb-10 flex items-center gap-3 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.3em]">
                  <ChevronLeft size={18} /> Return to Gateway
                </button>

                <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-brand-500/10 rounded-[28px] flex items-center justify-center text-brand-500 mx-auto mb-6 shadow-2xl border border-brand-500/20 animate-pulse">
                    <ShieldCheck size={40} />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase italic">2FA Shield</h2>
                  <p className="text-slate-400 text-[13px] font-medium px-4">Synchronizing temporal auth node. Enter your secure key.</p>
                </div>

                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-500 text-xs font-bold mb-6">
                    <AlertTriangle size={16} />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4 text-center">
                    <input required type="text" maxLength="6" value={otpToken} onChange={(e) => setOtpToken(e.target.value)} placeholder="0 0 0 0 0 0"
                      className="w-full bg-[#181824] border border-white/5 rounded-2xl py-6 text-center text-3xl font-black tracking-[0.5em] text-brand-400 placeholder:text-surface-800 focus:outline-none focus:border-brand-500/50 transition-all" />
                    <p className="text-[10px] text-surface-700 font-bold uppercase tracking-widest">Identity Shield Active</p>
                  </div>

                  <button type="submit" disabled={loading || otpToken.length < 6} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-600/10 flex items-center justify-center gap-3 disabled:opacity-20">
                    {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <>Verify Identity <CheckCircle2 size={18} /></>}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
    </div>
  );
};

export default Login;


