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
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-brand-600/20 blur-[120px] rounded-full -translate-y-1/2 pointer-events-none" />

      {/* Desktop View Logo (Top) */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <motion.div 
          animate={{ 
            boxShadow: ["0 0 30px rgba(139,92,246,0.1)", "0 0 60px rgba(139,92,246,0.3)", "0 0 30px rgba(139,92,246,0.1)"],
            borderColor: ["rgba(139,92,246,0.1)", "rgba(139,92,246,0.4)", "rgba(139,92,246,0.1)"]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="w-40 h-28 bg-black border rounded-[32px] p-5 flex items-center justify-center shadow-2xl"
        >
          <img src="/logo.jpg" alt="NexovGen SaaS" className="w-full h-auto object-contain" />
        </motion.div>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-[480px]">
        <div className="bg-[#12121a] rounded-[40px] p-8 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            {!require2FA ? (
              <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-black text-white tracking-tight mb-2">Access Portal</h2>
                  <p className="text-surface-500 text-sm font-medium">Verify your operational credentials.</p>
                </div>

                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-500 text-xs font-bold mb-6">
                    <AlertTriangle size={16} />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/70 ml-1">Email Identifier</label>
                    <div className="relative group">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-600 group-focus-within:text-brand-500 transition-colors" />
                      <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sarah@nexov.tech"
                        className="w-full bg-[#181824] border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white placeholder:text-surface-700 focus:outline-none focus:border-brand-500/50 transition-all" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/70 ml-1">Auth Key</label>
                    <div className="relative group">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-600 group-focus-within:text-brand-500 transition-colors" />
                      <input required type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                        className="w-full bg-[#181824] border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-surface-700 focus:outline-none focus:border-brand-500/50 transition-all" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-600 hover:text-brand-500">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-brand-600/10 flex items-center justify-center gap-3 disabled:opacity-50">
                    {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <>Initiate Access <ArrowRight size={18} /></>}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="2fa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <button onClick={handleBackToLogin} className="mb-6 flex items-center gap-2 text-surface-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">
                  <ChevronLeft size={16} /> Back to Login
                </button>
                
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-500 mx-auto mb-4 shadow-2xl border border-brand-500/20">
                     <ShieldCheck size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight mb-2">2FA Verification</h2>
                  <p className="text-surface-500 text-sm font-medium px-4">Enter the synchronization code from your authenticator device.</p>
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
