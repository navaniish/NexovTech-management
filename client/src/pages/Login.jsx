import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertTriangle,
  Fingerprint,
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
      setError('Connection to security grid disrupted.');
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-slate-900 selection:text-white bg-white">
      {/* ── CLASSIC OFFICE BACKGROUND ── */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-left"
          style={{ backgroundImage: "url('/assets/nexovtech-final-branded.png')", backgroundPosition: 'left center' }}
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Identity Logo - INCREASED SIZE */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-10 relative z-10 md:translate-x-24"
      >
        <div className="w-40 h-40 rounded-full overflow-hidden flex items-center justify-center group">
           <img 
            src="/assets/logo_nexo.jpeg" 
            alt="Nexov" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="relative z-10 w-full max-w-[380px] md:translate-x-24"
      >
        <div className="bg-white/95 backdrop-blur-[20px] rounded-[40px] p-8 md:p-10 border border-slate-100 shadow-[0_40px_100px_rgba(0,0,0,0.12)] relative">
           
           <AnimatePresence mode="wait">
            {!require2FA ? (
              <motion.div key="login" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="text-center mb-8">
                   <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-0.5 italic">ACCESS <span className="text-slate-500">PORTAL</span></h1>
                   <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Identity & Security Node</p>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-500 text-[9px] font-black uppercase tracking-widest mb-8"
                  >
                    <AlertTriangle size={16} /> {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Email Identifier</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-5 flex items-center text-slate-400 group-focus-within:text-slate-900 transition-colors">
                        <Mail size={16} />
                      </div>
                      <input 
                        required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nexus@nexovtech.com"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-14 pr-6 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:bg-white focus:border-slate-900 transition-all font-medium text-sm shadow-inner" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Auth Key</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-5 flex items-center text-slate-400 group-focus-within:text-slate-900 transition-colors">
                        <Lock size={16} />
                      </div>
                      <input 
                        required type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-14 pr-14 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:bg-white focus:border-slate-900 transition-all font-medium text-sm shadow-inner" 
                      />
                      <button 
                        type="button" onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-900 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" disabled={loading} 
                    className="w-full relative overflow-hidden bg-slate-900 hover:bg-slate-800 text-white group h-12 rounded-2xl transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 mt-4"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-[0.3em]">
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Initiate Access <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                      )}
                    </div>
                  </button>
                </form>

                <div className="mt-8 flex items-center justify-center">
                   <button onClick={() => resetPassword(email)} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Lost Access Key?</button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="2fa" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <button onClick={handleBackToLogin} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-[9px] font-black uppercase tracking-[0.2em]">
                  <ChevronLeft size={16} /> Back
                </button>

                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-900 mx-auto mb-6 border border-slate-200 shadow-xl">
                    <Fingerprint size={40} />
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1 italic">MFA <span className="text-slate-500">AUTH</span></h1>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Identity Sync Required</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <input 
                       required type="text" maxLength="6" value={otpToken} onChange={(e) => setOtpToken(e.target.value)} placeholder="0 0 0 0 0 0"
                       className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-6 text-center text-3xl font-black tracking-[0.5em] text-slate-900 placeholder:text-slate-200 focus:outline-none focus:border-slate-900 focus:bg-white transition-all shadow-inner" 
                    />
                  </div>

                  <button type="submit" disabled={loading || otpToken.length < 6} className="w-full h-12 bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-2xl hover:bg-slate-800 transition-all shadow-xl disabled:opacity-20 flex items-center justify-center gap-2">
                    {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <>Finalize Access <CheckCircle2 size={16} /></>}
                  </button>
                </form>
              </motion.div>
            )}
           </AnimatePresence>
        </div>
      </motion.div>

      {/* Global Security Branding */}
      <div className="mt-12 opacity-30 text-center">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">NexovTech Global Defense Layer</p>
      </div>
    </div>
  );
};

export default Login;
