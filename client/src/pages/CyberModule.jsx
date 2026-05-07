import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Key, 
  Activity, 
  AlertTriangle, 
  RefreshCcw, 
  Download,
  Eye,
  Terminal,
  Zap,
  Globe,
  Database
} from 'lucide-react';

const CyberModule = () => {
  return (
    <div className="space-y-12 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Security Command</h1>
          <p className="text-surface-500 mt-2 font-medium">Monitor threats and enforce zero-trust policies.</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-brand-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/30 flex items-center gap-3">
            <RefreshCcw size={18} /> Deep Scan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Risk Level Cards */}
        {[
          { label: 'System Integrity', value: 'Secure', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Active Threats', value: '0 Detected', icon: ShieldAlert, color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20' },
          { label: 'Risk Factor', value: 'Minimal', icon: AlertTriangle, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-light p-8 rounded-[32px] border ${stat.border} relative overflow-hidden group`}
          >
            <div className={`absolute -right-8 -top-8 w-24 h-24 ${stat.bg} blur-3xl opacity-20`}></div>
            <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl w-fit mb-6 shadow-xl`}>
               <stat.icon size={26} />
            </div>
            <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-white tracking-tight">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Security Checklist */}
        <div className="glass-light p-10 rounded-[40px] border border-white/5 shadow-2xl">
           <h2 className="text-2xl font-black text-white tracking-tight mb-10 flex items-center gap-4">
              <Lock size={24} className="text-brand-500" /> Compliance Checklist
           </h2>
           <div className="space-y-4">
              {[
                { title: 'SSL/TLS Certificates', status: 'Valid', type: 'System' },
                { title: 'Multi-Factor Auth', status: 'Enabled', type: 'Auth' },
                { title: 'Database Encryption', status: 'Active', type: 'Data' },
                { title: 'API Rate Limiting', status: 'Active', type: 'Network' },
                { title: 'Firewall Config', status: 'Optimal', type: 'System' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-brand-500/30 transition-all group">
                   <div className="flex items-center gap-5">
                      <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                         <ShieldCheck size={20} />
                      </div>
                      <div>
                         <p className="font-bold text-white text-base">{item.title}</p>
                         <p className="text-[10px] text-surface-600 font-black uppercase tracking-widest mt-1">{item.type}</p>
                      </div>
                   </div>
                   <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">{item.status}</span>
                </div>
              ))}
           </div>
        </div>

        {/* Live Attack Map Simulation */}
        <div className="glass-light p-10 rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col">
           <h2 className="text-2xl font-black text-white tracking-tight mb-10 flex items-center gap-4">
              <Globe size={24} className="text-neon-blue" /> Traffic Matrix
           </h2>
           <div className="flex-1 flex flex-col items-center justify-center relative">
              <div className="w-full aspect-square max-w-[300px] border-2 border-white/5 rounded-full flex items-center justify-center relative">
                 <div className="w-[80%] h-[80%] border border-white/5 rounded-full flex items-center justify-center relative">
                    <div className="w-[60%] h-[60%] border border-white/10 rounded-full flex items-center justify-center">
                       <Zap size={40} className="text-brand-500 animate-pulse" />
                    </div>
                    {/* Simulated Pulse Rings */}
                    <div className="absolute inset-0 border border-brand-500/20 rounded-full animate-ping"></div>
                 </div>
                 {/* Attack Vectors */}
                 <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                   className="absolute inset-0"
                 >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-rose-500 rounded-full shadow-[0_0_20px_#f43f5e] blur-[2px]"></div>
                 </motion.div>
              </div>
              <div className="mt-12 w-full space-y-4">
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-white/5 pb-2">
                    <span>Source</span>
                    <span>Method</span>
                    <span>Status</span>
                 </div>
                 {[
                   { ip: '192.168.1.1', method: 'HTTPS', status: 'Blocked' },
                   { ip: '45.2.14.99', method: 'SSH', status: 'Blocked' },
                 ].map((t, i) => (
                   <div key={i} className="flex justify-between text-xs font-bold text-surface-400">
                      <span>{t.ip}</span>
                      <span className="text-brand-400">{t.method}</span>
                      <span className="text-rose-500">{t.status}</span>
                   </div>
                 ))}
              </div>
           </div>
           <button className="w-full mt-10 py-4 bg-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-surface-500 hover:text-white transition-all flex items-center justify-center gap-3 border border-white/5">
              Generate Report <Download size={14} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default CyberModule;
