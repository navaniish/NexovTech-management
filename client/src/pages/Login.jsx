import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  Code, 
  Globe, 
  User as UserIcon,
  ChevronRight,
  Sparkles,
  Swords,
  Gamepad2,
  Zap,
  AlertTriangle,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await login(email, password);
      if (result.success) navigate('/');
      else setError(result.message);
    } catch (err) {
      setError('Connection to mission control failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first, then click Forgot.');
      return;
    }
    setError('');
    setSuccessMsg('');
    try {
      const result = await resetPassword(email.trim().toLowerCase());
      if (result.success) {
        setSuccessMsg('Password reset link sent! Check your email inbox (and spam folder).');
      } else {
        setError(result.message || 'Failed to send reset email. Please try again.');
      }
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen theme-bg flex flex-col md:flex-row font-sans selection:bg-brand-500/30">
      {/* Left Side: Cinematic Branding */}
      <div className="hidden md:flex md:w-[55%] relative overflow-hidden items-center justify-center p-12 lg:p-20">
        <div 
          className="absolute inset-0 bg-cover bg-center z-0 scale-105"
          style={{ backgroundImage: `url('/auth_background_mountains_1776872573538.png')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-bg-base via-transparent to-bg-base/40"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-base/20 to-bg-base"></div>
        </div>

        <div className="relative z-10 w-full max-w-xl space-y-16">
          <div className="flex items-center gap-3 theme-text-primary mb-20">
            <div className="p-2 bg-brand-600 rounded-lg shadow-lg shadow-brand-600/20">
              <Swords size={24} />
            </div>
            <span className="text-xl font-black tracking-tight uppercase">NexovTech Platform</span>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group max-w-sm"
          >
            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
              <Gamepad2 size={64} className="rotate-12" />
            </div>

            <div className="flex items-center gap-5 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-xl">
                <UserIcon size={32} />
              </div>
              <div>
                <h3 className="theme-text-primary font-black text-xl tracking-tight">{name || 'New Explorer'}</h3>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-brand-400 text-[10px] font-black uppercase tracking-[0.2em]">Level 1</span>
                   <div className="w-1 h-1 rounded-full bg-white/20"></div>
                   <span className="text-surface-500 text-[10px] font-bold uppercase tracking-widest">Active Ops</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] text-surface-400 font-black uppercase tracking-widest px-1">
                <span className="flex items-center gap-1.5"><Zap size={10} className="text-amber-500" /> Mission Sync</span>
                <span>Ready</span>
              </div>
              <div className="w-full h-2.5 bg-white/5 rounded-full p-[2px] border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-full bg-gradient-to-r from-brand-500 to-blue-400 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.6)]"
                ></motion.div>
              </div>
            </div>
          </motion.div>

          <div className="space-y-6">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-6xl lg:text-7xl font-black theme-text-primary leading-[1.1] tracking-tighter"
            >
              Enterprise <br />
              <span className="text-brand-500">Management.</span>
            </motion.h1>
            <motion.p className="text-surface-400 text-xl leading-relaxed max-w-md font-medium">
              Synchronize your missions, track earnings, and forge documents in the unified NexovTech ecosystem.
            </motion.p>
          </div>
        </div>
      </div>

      {/* Right Side: Authentication Form */}
      <div className="w-full md:w-[45%] flex items-center justify-center p-8 md:p-12 lg:p-20 theme-bg relative">
        <div className="w-full max-w-[440px] space-y-12">
          <div className="space-y-3">
            <h2 className="text-5xl font-black theme-text-primary tracking-tighter">
              Mission Access
            </h2>
            <p className="text-surface-500 text-lg font-medium">
              Provide credentials to enter the realm.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-500 text-sm font-bold"
              >
                <AlertTriangle size={18} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm font-bold"
              >
                <Mail size={18} />
                {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-surface-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-surface-600 group-focus-within:text-brand-500 transition-colors pointer-events-none">
                  <Mail size={20} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nexus@nexovtech.com" 
                  className="w-full bg-black/[0.03] border border-black/10 rounded-2xl py-5 pl-14 pr-6 theme-text-primary text-lg placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <label className="text-[11px] font-black text-surface-400 uppercase tracking-[0.2em]">Password</label>
                <button type="button" onClick={handleForgotPassword} className="text-[10px] font-black text-brand-500 hover:text-brand-400 uppercase tracking-widest transition-colors">Forgot?</button>
              </div>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-surface-600 group-focus-within:text-brand-500 transition-colors pointer-events-none">
                  <Lock size={20} />
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-black/[0.03] border border-black/10 rounded-2xl py-5 pl-14 pr-14 theme-text-primary text-lg placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40 transition-all font-medium"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-surface-600 hover:text-brand-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black py-5 rounded-2xl transition-all shadow-2xl shadow-brand-600/30 flex items-center justify-center gap-3 group text-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Enter Realm 
                  <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Admin Context Helper */}
          {email === 'nexovtech@myyahoo.com' && (
            <div className="p-4 bg-brand-500/5 border border-brand-500/10 rounded-xl flex items-center gap-3">
              <Sparkles size={16} className="text-brand-500" />
              <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest">Permanent Admin Credentials Detected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
