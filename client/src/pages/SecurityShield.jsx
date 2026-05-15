import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Lock, 
  Users, 
  Activity, 
  AlertCircle, 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Eye,
  Terminal,
  Zap,
  Globe,
  Smartphone
} from 'lucide-react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { sentinel } from '../services/securityService';
import { useAuth } from '../context/AuthContext';

const SecurityShield = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [admins, setAdmins] = useState([]);
  const [logs, setLogs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      // Fetch Admins
      const adminsSnap = await getDocs(collection(db, 'admins'));
      setAdmins(adminsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch Recent Logs
      const logsQ = query(collection(db, 'admin_logs'), orderBy('timestamp', 'desc'), limit(20));
      const logsSnap = await getDocs(logsQ);
      setLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch Requests
      const requestsSnap = await getDocs(collection(db, 'admin_requests'));
      setRequests(requestsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Security fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Secure Nodes', value: admins.length, icon: Shield, color: 'text-indigo-500' },
    { label: 'Pending Requests', value: requests.length, icon: UserPlus, color: 'text-amber-500' },
    { label: 'AI Alerts (24h)', value: logs.filter(l => l.status === 'warning').length, icon: Zap, color: 'text-rose-500' },
    { label: 'Audit Trail', value: logs.length, icon: Terminal, color: 'text-slate-400' }
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
          <Shield size={200} strokeWidth={0.5} />
        </div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-20 h-20 bg-rose-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-600/40 animate-pulse">
            <Lock size={36} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Sentinel Shield</h1>
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.4em] mt-1">Enterprise Admin Management & Security Monitor</p>
          </div>
        </div>
        
        <div className="relative z-10 flex gap-3">
          <button className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Emergency Revoke</button>
          <button className="px-6 py-3 bg-rose-600 hover:bg-rose-700 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-600/30 transition-all">System Lockdown</button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass-card !p-6 flex items-center gap-5 border-slate-100/50">
            <div className={`w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center ${stat.color}`}>
              <stat.icon size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN CONSOLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* SIDEBAR NAVIGATION */}
        <div className="lg:col-span-3 space-y-2">
          {[
            { id: 'overview', label: 'Security Overview', icon: Globe },
            { id: 'admins', label: 'Admin Management', icon: Users },
            { id: 'requests', label: 'Identity Requests', icon: UserPlus },
            { id: 'logs', label: 'AI Audit Trail', icon: Terminal }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 translate-x-2' 
                : 'bg-white text-slate-400 border border-slate-50 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT AREA */}
        <div className="lg:col-span-9 glass-card !p-8 border-slate-100/50 min-h-[600px]">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="ov" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Security Pulse</h2>
                  <span className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" /> All Systems Nominal
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Threat Detection</h4>
                      <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 relative overflow-hidden group">
                         <Activity className="absolute top-4 right-4 text-slate-200 group-hover:text-indigo-500 transition-colors" size={40} />
                         <p className="text-sm font-bold text-slate-900 leading-relaxed">No unauthorized duplicate attempts detected in the last 72 hours.</p>
                         <button className="mt-4 text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Run Deep Scan</button>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Sessions</h4>
                      <div className="space-y-3">
                         {admins.slice(0, 3).map((a, i) => (
                           <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-50 rounded-xl shadow-sm">
                              <div className="flex items-center gap-3">
                                 <Smartphone size={14} className="text-slate-400" />
                                 <span className="text-[10px] font-black text-slate-700 uppercase">{a.name}</span>
                              </div>
                              <span className="text-[8px] font-black text-emerald-500 uppercase">Live</span>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'admins' && (
              <motion.div key="adm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Admin Management</h2>
                  <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">+ New Admin</button>
                </div>
                
                <div className="overflow-x-auto">
                   <table className="w-full">
                      <thead>
                        <tr className="text-left border-b border-slate-100">
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Node</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clearance</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {admins.map((adm) => (
                          <tr key={adm.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="py-4">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                     <Shield size={14} />
                                  </div>
                                  <div>
                                     <p className="text-[11px] font-black text-slate-900 uppercase">{adm.name}</p>
                                     <p className="text-[9px] text-slate-400">{adm.email}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="py-4"><span className="px-2 py-1 bg-slate-900 text-white text-[8px] font-black rounded uppercase tracking-tighter">{adm.role}</span></td>
                            <td className="py-4"><span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Active</span></td>
                            <td className="py-4 text-right">
                               <div className="flex items-center justify-end gap-2">
                                  <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-900 transition-all shadow-sm"><Eye size={14} /></button>
                                  {adm.role !== 'Super Admin' && (
                                    <button className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition-all"><Trash2 size={14} /></button>
                                  )}
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div key="log" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="bg-slate-900 rounded-[32px] p-6 font-mono text-[11px] text-slate-300 space-y-2 overflow-y-auto max-h-[500px] shadow-2xl border border-white/5">
                   <p className="text-rose-500 font-bold mb-4 uppercase tracking-[0.2em]">{'>'} SENTINEL_AI: LIVE AUDIT STREAMING</p>
                   {logs.map((log) => (
                     <div key={log.id} className="flex gap-4 py-1 hover:bg-white/5 px-2 rounded transition-colors group">
                        <span className="text-slate-500 shrink-0">[{new Date(log.timestamp?.toDate()).toLocaleTimeString()}]</span>
                        <span className={log.status === 'warning' ? 'text-rose-400' : 'text-emerald-400'}>[{log.action}]</span>
                        <span className="text-slate-400">IDENTITY: {log.performedBy}</span>
                        <span className="hidden md:inline text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">| DEVICE: {log.deviceInfo?.platform}</span>
                     </div>
                   ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SecurityShield;
