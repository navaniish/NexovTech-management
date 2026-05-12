import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleBack = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-rose-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-slate-900/50 backdrop-blur-2xl border border-slate-800 p-10 rounded-[40px] shadow-2xl text-center">
          <div className="relative mb-8 flex justify-center">
            <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20">
              <ShieldAlert size={48} className="text-rose-500" />
            </div>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 w-24 h-24 border-2 border-dashed border-rose-500/20 rounded-full left-1/2 -translate-x-1/2"
            />
          </div>

          <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">
            Security <span className="text-rose-500">Restriction</span>
          </h1>
          
          <div className="space-y-4 mb-10">
            <p className="text-slate-400 text-sm leading-relaxed">
              Your identity has been authenticated, but you do not have the required clearance level to access this sector.
            </p>
            <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800 inline-block">
              <div className="flex items-center gap-3 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <Lock size={12} className="text-rose-500" />
                Access Level: Unauthorized
              </div>
            </div>
          </div>

          <button 
            onClick={handleBack}
            className="w-full h-14 bg-white hover:bg-slate-100 text-slate-950 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em] transition-all group active:scale-95"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Return to Gateway
          </button>

          <p className="mt-8 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">
            NexovTech Infrastructure Control
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Unauthorized;
