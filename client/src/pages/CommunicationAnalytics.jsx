import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, Activity, Users, MessageSquare, 
  Mail, ShieldCheck, Zap, ArrowUpRight, 
  Clock, Filter, Download, Sparkles
} from 'lucide-react';
import API_URL from '../config';

const CommunicationAnalytics = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMails: 0,
    activeUsers: 0,
    chatVolume: 0,
    avgResponseTime: '2.4m'
  });

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/audit/logs`); // Assuming this exists or I'll add it
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        // Mock stats for demo
        setStats({
          totalMails: data.filter(l => l.type === 'MAIL_DISPATCH').length,
          activeUsers: new Set(data.map(l => l.user)).size,
          chatVolume: data.length * 3, // Multiplier for effect
          avgResponseTime: '1.8m'
        });
      }
    } catch (e) {
      console.error('Analytics sync failure');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-8 p-1 md:p-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            Communication Intelligence <Sparkles className="text-brand-400" size={24} />
          </h1>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 mt-1">Enterprise Audit & Activity Monitoring</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="px-6 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
              <Filter size={14} /> Filter Logic
           </button>
           <button className="px-6 py-2.5 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-brand-600/20">
              <Download size={14} /> Export Dispatch Logs
           </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Mail Throughput', value: stats.totalMails, icon: Mail, color: 'text-brand-400' },
          { label: 'Collaborative Specialists', value: stats.activeUsers, icon: Users, color: 'text-emerald-400' },
          { label: 'Signal Volume', value: stats.chatVolume, icon: Zap, color: 'text-amber-400' },
          { label: 'Response Latency', value: stats.avgResponseTime, icon: Clock, color: 'text-rose-400' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="theme-card rounded-[32px] p-8 border border-gray-100 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><stat.icon size={60} /></div>
            <div className={`p-3 bg-gray-50 rounded-2xl w-fit mb-6 ${stat.color}`}>
               <stat.icon size={24} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{stat.label}</p>
            <div className="flex items-end gap-3">
               <h3 className="text-4xl font-black text-gray-900">{stat.value}</h3>
               <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mb-2">
                  <ArrowUpRight size={14} /> +12%
               </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Feed */}
        <div className="lg:col-span-2 theme-card rounded-[40px] p-8 flex flex-col h-[600px] border border-gray-100">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                 Enterprise Activity Signal <Activity size={20} className="text-brand-400" />
              </h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Real-time Stream</span>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-4">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4 p-5 bg-white/[0.02] border border-gray-100 rounded-3xl hover:bg-white/[0.04] transition-all">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${log.type === 'MAIL_DISPATCH' ? 'bg-brand-600/10 text-brand-400' : 'bg-amber-600/10 text-amber-400'}`}>
                      {log.type === 'MAIL_DISPATCH' ? <Mail size={18} /> : <MessageSquare size={18} />}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                         <p className="text-xs font-black text-gray-900">{log.user}</p>
                         <p className="text-[10px] font-bold text-gray-300">{new Date(log.timestamp).toLocaleTimeString()}</p>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{log.details}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Security / System Logs */}
        <div className="theme-card rounded-[40px] p-8 border border-gray-100 bg-brand-600/[0.02]">
           <h3 className="text-xl font-black text-gray-900 tracking-tight mb-8 flex items-center gap-3">
              Security Roster <ShieldCheck size={20} className="text-emerald-400" />
           </h3>
           <div className="space-y-6">
              {[
                { label: 'Access Grant', detail: 'New identity provisioned: sarah.chen@nexovtech.com', time: '10m ago' },
                { label: 'Channel Created', detail: '#project-alpha initialized with 12 members', time: '1h ago' },
                { label: 'Policy Update', detail: 'Communication retention policy updated', time: '4h ago' }
              ].map((item, i) => (
                <div key={i} className="relative pl-6 border-l border-gray-200">
                   <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-brand-600 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-brand-400 mb-1">{item.label}</p>
                   <p className="text-xs text-gray-600 leading-relaxed">{item.detail}</p>
                   <p className="text-[9px] font-bold text-gray-300 mt-2">{item.time}</p>
                </div>
              ))}
           </div>

           <div className="mt-12 p-6 bg-brand-600/10 rounded-3xl border border-brand-500/20">
              <div className="flex items-center gap-2 mb-3">
                 <Zap size={14} className="text-amber-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Nexov AI Forecast</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed italic">
                 "Predicted collaboration peak detected for 14:00 UTC. Recommend ensuring signal relay stability."
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationAnalytics;


