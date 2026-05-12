import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Fingerprint, 
  Key, 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Monitor, 
  Smartphone, 
  Globe, 
  Clock, 
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Trash2,
  Lock,
  Zap,
  History,
  Terminal,
  Cpu,
  CheckCircle2,
  X,
  QrCode,
  Download,
  Users as UsersIcon,
  Search,
  ArrowUpRight,
  Layers,
  Wind
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_URL from '../config';
import { useAuth } from '../context/AuthContext';

const SecurityShield = () => {
  const { user, updateUser } = useAuth();
  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager';
  
  const [activeTab, setActiveTab] = useState(isAdmin ? 'admin-dashboard' : 'personal');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [userStatuses, setUserStatuses] = useState([]);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [mfaModal, setMfaModal] = useState(null);
  const [mfaData, setMfaData] = useState({ qrCode: '', secret: '', token: '', backupCodes: [] });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchPersonalData();
    if (isAdmin) fetchAdminData();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const fetchPersonalData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [logsRes, devicesRes] = await Promise.all([
        fetch(`${API_URL}/security/logs`, { headers }),
        fetch(`${API_URL}/security/devices`, { headers })
      ]);
      
      if (logsRes.ok) setLogs(await logsRes.json());
      if (devicesRes.ok) setTrustedDevices(await devicesRes.json());
    } catch (err) {
      console.error('Personal security uplink failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      const headers = getAuthHeaders();
      const [logsRes, statusRes] = await Promise.all([
        fetch(`${API_URL}/security/admin/logs`, { headers }),
        fetch(`${API_URL}/security/admin/users-status`, { headers })
      ]);
      
      if (logsRes.ok) setAdminLogs(await logsRes.json());
      if (statusRes.ok) setUserStatuses(await statusRes.json());
    } catch (err) {
      console.error('Admin intelligence link failed');
    }
  };

  const verify2FA = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/security/2fa/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ token: mfaData.token })
      });
      const data = await res.json();
      if (res.ok) {
        setMfaData({ ...mfaData, backupCodes: data.backupCodes });
        setMfaModal('backup');
        updateUser({ ...user, twoFactorEnabled: true });
        showToast('Shield Deployed');
        fetchPersonalData();
      } else {
        showToast(data.message || 'Verification failed', 'error');
      }
    } catch (err) {
      showToast('Audit link failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 p-4 md:p-10 font-sans selection:bg-rose-500 selection:text-white overflow-y-auto custom-scrollbar">
      
      {/* ── AMBIENT BACKGROUND ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-rose-600/10 blur-[150px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full" />
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] scale-150" />
         <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505]" />
      </div>

      {/* ── TACTICAL COMMAND HEADER ── */}
      <header className="relative z-10 mb-12 overflow-hidden rounded-[48px] bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-8 md:p-12 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">
         <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />
         
         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="space-y-6">
               <div className="flex items-center gap-5">
                  <motion.div 
                    initial={{ rotate: -10, scale: 0.9 }}
                    animate={{ rotate: 0, scale: 1 }}
                    className="w-16 h-16 bg-gradient-to-br from-rose-600 to-rose-700 rounded-[24px] flex items-center justify-center text-white shadow-[0_15px_40px_-10px_rgba(225,29,72,0.5)] border border-white/20"
                  >
                     <ShieldCheck size={36} />
                  </motion.div>
                  <div>
                     <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-white leading-none">Security Shield</h1>
                     <div className="flex items-center gap-3 mt-3">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        <p className="text-[11px] font-black text-rose-500 uppercase tracking-[0.6em] leading-none">Command & Intelligence Unit</p>
                     </div>
                  </div>
               </div>
               <p className="text-slate-400 text-sm md:text-base font-medium max-w-2xl leading-relaxed">
                  Real-time identity defense matrix. Orchestrating specialist access, monitoring behavioral nodes, and enforcing global integrity protocols across the NexovTech ecosystem.
               </p>
            </div>

            {isAdmin && (
              <div className="flex bg-white/5 p-2 rounded-[32px] border border-white/5 backdrop-blur-xl shadow-2xl">
                 <button 
                   onClick={() => setActiveTab('admin-dashboard')} 
                   className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === 'admin-dashboard' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}
                 >
                    Global Intelligence
                 </button>
                 <button 
                   onClick={() => setActiveTab('personal')} 
                   className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === 'personal' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}
                 >
                    Personal Node
                 </button>
              </div>
            )}
         </div>
      </header>

      {isAdmin && activeTab === 'admin-dashboard' ? (
        /* ── ADMINISTRATIVE INTELLIGENCE VIEW ── */
        <div className="relative z-10 space-y-10">
           
           {/* GLOBAL TELEMETRY STATS */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Specialists', value: userStatuses.length, icon: UsersIcon, color: 'from-white/10 to-white/5', iconColor: 'text-white' },
                { label: 'MFA Adoption', value: `${Math.round((userStatuses.filter(u => u.twoFactorEnabled).length / (userStatuses.length || 1)) * 100)}%`, icon: Fingerprint, color: 'from-emerald-600/20 to-emerald-900/5', iconColor: 'text-emerald-500' },
                { label: 'Blocked Incidents', value: adminLogs.filter(l => l.status === 'Blocked').length, icon: AlertTriangle, color: 'from-rose-600/20 to-rose-900/5', iconColor: 'text-rose-500' },
                { label: 'Matrix Integrity', value: 'Nominal', icon: Activity, color: 'from-indigo-600/20 to-indigo-900/5', iconColor: 'text-indigo-400' }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`bg-gradient-to-br ${stat.color} p-8 rounded-[40px] border border-white/10 shadow-2xl group hover:border-white/20 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden`}
                >
                   <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-700">
                      <stat.icon size={120} />
                   </div>
                   <div className="flex items-center justify-between mb-6 relative z-10">
                      <div className={`p-4 rounded-2xl bg-white/5 ${stat.iconColor} shadow-inner`}>
                         <stat.icon size={24} />
                      </div>
                      <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-slate-500 group-hover:text-white transition-colors">
                         <ArrowUpRight size={18} />
                      </div>
                   </div>
                   <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1 relative z-10">{stat.label}</p>
                   <p className={`text-4xl font-black tracking-tighter ${stat.iconColor} relative z-10`}>{stat.value}</p>
                </motion.div>
              ))}
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* PROTECTION ROSTER (USER LIST) */}
              <section className="lg:col-span-8 bg-white/[0.02] backdrop-blur-2xl rounded-[48px] border border-white/10 overflow-hidden shadow-2xl relative">
                 <div className="p-10 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                       <h3 className="text-2xl font-black text-white tracking-tight uppercase italic leading-none">Protection Roster</h3>
                       <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3 italic">Authorized Specialist Nodes</p>
                    </div>
                    <div className="relative group">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-rose-500 transition-colors" size={18} />
                       <input 
                         placeholder="Filter nodes..." 
                         className="h-14 pl-12 pr-6 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black text-white outline-none focus:border-rose-600/50 focus:bg-white/[0.08] transition-all w-full md:w-64" 
                       />
                    </div>
                 </div>
                 
                 <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                             <th className="p-8">Specialist</th>
                             <th className="p-8">MFA Defense</th>
                             <th className="p-8">Node Role</th>
                             <th className="p-8 text-right">Integrity</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {userStatuses.map((u, i) => (
                            <motion.tr 
                              key={i} 
                              initial={{ opacity: 0 }} 
                              animate={{ opacity: 1 }} 
                              transition={{ delay: i * 0.05 }}
                              className="hover:bg-white/[0.03] transition-all group"
                            >
                               <td className="p-8">
                                  <div className="flex items-center gap-5">
                                     <div className="relative">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-white font-black text-sm shadow-xl">
                                           {u.name[0]}
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#050505] ${u.twoFactorEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                     </div>
                                     <div>
                                        <p className="text-[15px] font-black text-white leading-tight group-hover:text-rose-500 transition-colors">{u.name}</p>
                                        <p className="text-[11px] font-bold text-slate-500 mt-1">{u.email}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="p-8">
                                  <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${u.twoFactorEnabled ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                     {u.twoFactorEnabled ? 'Fortified' : 'Vulnerable'}
                                  </div>
                               </td>
                               <td className="p-8">
                                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">{u.role}</span>
                               </td>
                               <td className="p-8 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                     {[1,2,3,4,5].map(dot => (
                                       <div key={dot} className={`w-3 h-1.5 rounded-full transition-all duration-700 ${dot <= (u.twoFactorEnabled ? 5 : 3) ? 'bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.5)]' : 'bg-white/10'}`} />
                                     ))}
                                  </div>
                               </td>
                            </motion.tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
                 {userStatuses.length === 0 && (
                   <div className="py-32 text-center opacity-20">
                      <Layers size={64} className="mx-auto mb-6" />
                      <p className="text-sm font-black uppercase tracking-[0.5em]">No active specialist nodes detected</p>
                   </div>
                 )}
              </section>

              {/* GLOBAL BEHAVIORAL FEED */}
              <section className="lg:col-span-4 space-y-8">
                 <div className="bg-[#0a0a0a] rounded-[48px] border border-white/10 overflow-hidden flex flex-col shadow-2xl relative h-[780px]">
                    <div className="p-10 border-b border-white/10 flex items-center justify-between">
                       <div>
                          <h3 className="text-xl font-black text-white tracking-tight uppercase italic leading-none">Global Feed</h3>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3">Identity Audit Stream</p>
                       </div>
                       <div className="p-3 bg-rose-600/10 rounded-xl border border-rose-600/20">
                          <Activity size={20} className="text-rose-500 animate-pulse" />
                       </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-8 space-y-5 custom-scrollbar">
                       {adminLogs.map((log, i) => (
                         <motion.div 
                           key={i} 
                           initial={{ opacity: 0, x: 20 }}
                           animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: i * 0.05 }}
                           className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl group hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
                         >
                            <div className="flex items-center justify-between mb-3">
                               <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${log.status === 'Blocked' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                  {log.action.replace('_', ' ')}
                               </span>
                               <span className="text-[9px] font-bold text-slate-600 flex items-center gap-1.5 uppercase">
                                  <Clock size={10} /> {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-white shadow-inner">
                                  {log.userId?.slice(-2).toUpperCase() || 'UN'}
                               </div>
                               <div>
                                  <p className="text-[10px] font-bold text-slate-300 leading-tight">Node: Specialist-{log.userId?.slice(-6)}</p>
                                  <p className="text-[9px] font-medium text-slate-600 mt-0.5">{log.ipAddress} • {log.location?.city || 'Terminal'}</p>
                               </div>
                            </div>
                         </motion.div>
                       ))}
                       {adminLogs.length === 0 && (
                         <div className="py-32 text-center opacity-10">
                            <Wind size={48} className="mx-auto mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Feed is currently silent</p>
                         </div>
                       )}
                    </div>
                    
                    <div className="p-8 border-t border-white/5">
                       <button className="w-full py-5 bg-white/[0.05] hover:bg-white text-slate-400 hover:text-slate-900 rounded-[28px] text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 flex items-center justify-center gap-4 border border-white/10 shadow-2xl">
                          Download Intelligence Report <Download size={20} />
                       </button>
                    </div>
                 </div>
              </section>
           </div>
        </div>
      ) : (
        /* ── PERSONAL NODE VIEW ── */
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start animate-in slide-in-from-bottom duration-700">
           
           <div className="lg:col-span-4 space-y-8">
              <section className="bg-gradient-to-br from-slate-900 to-[#050505] rounded-[48px] p-10 border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                    <Fingerprint size={160} className="text-rose-600" />
                 </div>
                 
                 <div className="relative z-10">
                    <div className="flex items-center justify-between mb-10">
                       <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">Personal Node</h3>
                       <div className={`p-3 rounded-2xl ${user?.twoFactorEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {user?.twoFactorEnabled ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
                       </div>
                    </div>

                    <div className={`p-8 rounded-[36px] border ${user?.twoFactorEnabled ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'} mb-10`}>
                       <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Security Node</span>
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${user?.twoFactorEnabled ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                             {user?.twoFactorEnabled ? 'Protected' : 'Risk Detected'}
                          </span>
                       </div>
                       <p className="text-sm font-bold text-slate-300 leading-relaxed">
                          {user?.twoFactorEnabled 
                            ? "Encryption keys and temporal tokens are guarding your specialist gateway. Your digital identity is fortified." 
                            : "Your node is currently operating on a single-layer protocol. Activate the Shield to enforce identity integrity."
                          }
                       </p>
                    </div>

                    <button 
                      onClick={user?.twoFactorEnabled ? null : () => setMfaModal('setup')}
                      className={`w-full h-16 rounded-[24px] font-black text-[11px] uppercase tracking-[0.4em] transition-all duration-500 flex items-center justify-center gap-4 shadow-2xl ${
                        user?.twoFactorEnabled 
                        ? 'bg-white/5 text-emerald-500 cursor-default border border-emerald-500/20' 
                        : 'bg-rose-600 text-white hover:bg-rose-500 hover:-translate-y-1 shadow-rose-600/30'
                      }`}
                    >
                       {user?.twoFactorEnabled ? <><CheckCircle2 size={24} /> Shield Deployed</> : <><Zap size={24} className="fill-white" /> Activate Shield</>}
                    </button>
                 </div>
              </section>

              {/* PROTECTION OVERVIEW */}
              <div className="bg-white/[0.02] p-10 rounded-[48px] border border-white/10 shadow-2xl relative overflow-hidden">
                 <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em] mb-8 italic">Node Protocols</h4>
                 <div className="space-y-5">
                    {[
                      { label: 'Cloud Encryption', status: 'AES-256', color: 'text-indigo-400' },
                      { label: 'Identity Sync', status: 'Optimal', color: 'text-emerald-500' },
                      { label: 'Brute-Force Shield', status: 'Active', color: 'text-rose-500' },
                      { label: 'Geo-Fencing', status: 'Bypassed', color: 'text-slate-600' }
                    ].map((mod, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/[0.08] transition-all group">
                         <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{mod.label}</span>
                         <span className={`text-[10px] font-black uppercase tracking-widest ${mod.color}`}>{mod.status}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="lg:col-span-8 space-y-10">
              {/* TRUSTED DEVICES SECTION */}
              <section className="bg-white/[0.02] rounded-[48px] border border-white/10 overflow-hidden shadow-2xl">
                 <div className="p-10 border-b border-white/10 flex items-center justify-between">
                    <div>
                       <h3 className="text-2xl font-black text-white tracking-tight uppercase italic leading-none">Trusted Nodes</h3>
                       <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3 italic">Persistent Authenticated Access</p>
                    </div>
                    <button onClick={fetchPersonalData} className="p-4 bg-white/5 hover:bg-white text-slate-400 hover:text-slate-900 rounded-[20px] transition-all duration-500">
                       <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
                    </button>
                 </div>
                 
                 <div className="p-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {trustedDevices.map((device, i) => (
                         <motion.div 
                           key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                           className="flex items-center justify-between p-8 bg-white/[0.02] border border-white/5 rounded-[36px] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-500 group"
                         >
                            <div className="flex items-center gap-6">
                               <div className="w-14 h-14 bg-slate-900 rounded-[22px] flex items-center justify-center text-slate-500 group-hover:text-rose-500 transition-all duration-500 shadow-inner border border-white/5">
                                  {device.deviceType === 'Mobile' ? <Smartphone size={28} /> : <Monitor size={28} />}
                               </div>
                               <div>
                                  <h5 className="text-[17px] font-black text-white tracking-tight">{device.deviceName || 'Node Station'}</h5>
                                  <div className="flex items-center gap-2 mt-2">
                                     <Globe size={12} className="text-slate-600" />
                                     <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{device.lastIp}</span>
                                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] ml-2" />
                                  </div>
                               </div>
                            </div>
                            <button className="p-4 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all duration-300">
                               <Trash2 size={22} />
                            </button>
                         </motion.div>
                       ))}
                       {trustedDevices.length === 0 && (
                         <div className="col-span-2 py-24 text-center opacity-10">
                            <Monitor size={80} className="mx-auto mb-6" />
                            <p className="text-sm font-black uppercase tracking-[0.6em]">No persistent nodes established</p>
                         </div>
                       )}
                    </div>
                 </div>
              </section>

              {/* PERSONAL AUDIT TRAIL */}
              <section className="bg-white/[0.02] rounded-[48px] border border-white/10 overflow-hidden shadow-2xl">
                 <div className="p-10 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                       <div className="w-14 h-14 bg-rose-600/10 rounded-[22px] flex items-center justify-center text-rose-500 shadow-inner border border-rose-600/20">
                          <Terminal size={28} />
                       </div>
                       <div>
                          <h3 className="text-2xl font-black text-white tracking-tight uppercase italic leading-none">Activity Log</h3>
                          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3 italic">Personal Behavioral Intelligence</p>
                       </div>
                    </div>
                 </div>
                 
                 <div className="p-8 md:p-10">
                    <div className="space-y-3">
                       {logs.slice(0, 8).map((log, i) => (
                         <motion.div 
                           key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                           className="flex items-center justify-between p-6 bg-white/[0.01] border border-white/5 rounded-[28px] hover:bg-white/[0.04] transition-all duration-300"
                         >
                            <div className="flex items-center gap-6">
                               <div className={`w-3 h-3 rounded-full ${log.status === 'Blocked' ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]' : 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'}`} />
                               <div>
                                  <p className="text-[13px] font-black text-white tracking-tight uppercase">{log.action.replace('_', ' ')}</p>
                                  <div className="flex items-center gap-3 mt-1.5 opacity-50">
                                     <span className="text-[10px] font-bold uppercase tracking-widest">{log.location?.city || 'Terminal Node'}</span>
                                     <span className="text-[10px] font-bold tracking-tighter">{log.ipAddress}</span>
                                  </div>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Authenticated</p>
                               <p className="text-[11px] font-bold text-slate-400">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                         </motion.div>
                       ))}
                    </div>
                 </div>
              </section>
           </div>
        </div>
      )}

      {/* ── FOOTER SIGNATURE ── */}
      <footer className="relative z-10 mt-24 flex flex-col md:flex-row items-center justify-between gap-8 opacity-20 px-8 pb-16 border-t border-white/5 pt-16">
         <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
               <Cpu size={18} />
               <span className="text-[11px] font-black uppercase tracking-[0.3em]">Neural Defense v4.2</span>
            </div>
            <div className="flex items-center gap-3">
               <ShieldCheck size={18} />
               <span className="text-[11px] font-black uppercase tracking-[0.3em]">Quantum GCM Encryption</span>
            </div>
         </div>
         <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em]">NexovTech Defense Intelligence Unit © 2026</p>
      </footer>

      {/* ── MFA MODALS ── */}
      <AnimatePresence>
        {mfaModal === 'setup' && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMfaModal(null)} className="absolute inset-0 bg-[#050505]/95 backdrop-blur-3xl" />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }}
               className="relative w-full max-w-lg bg-[#0c0c0c] border border-white/10 rounded-[64px] p-12 md:p-16 shadow-[0_0_150px_-20px_rgba(225,29,72,0.3)] text-center overflow-hidden"
             >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
                
                <div className="inline-flex w-24 h-24 bg-rose-600/10 rounded-[32px] items-center justify-center text-rose-500 mb-10 border border-rose-500/20 shadow-inner">
                   <QrCode size={48} />
                </div>
                <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic mb-4 leading-none">Identity Fortification</h3>
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-12">Scan Node Synchronization Code</p>

                <div className="bg-white p-6 rounded-[48px] w-72 h-72 mx-auto mb-12 shadow-[0_30px_60px_-15px_rgba(225,29,72,0.4)]">
                   <img src={mfaData.qrCode} alt="QR" className="w-full h-full" />
                </div>

                <div className="space-y-6">
                   <div className="relative group">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-rose-500 transition-colors" size={24} />
                      <input 
                        value={mfaData.token} onChange={e => setMfaData({ ...mfaData, token: e.target.value })} maxLength="6"
                        placeholder="TOKEN-000000" 
                        className="w-full h-20 bg-white/5 border border-white/10 rounded-3xl text-center text-4xl font-black tracking-[0.5em] text-rose-500 focus:border-rose-600 focus:bg-white/[0.08] outline-none transition-all" 
                      />
                   </div>
                   <button onClick={verify2FA} disabled={loading || mfaData.token.length < 6} className="w-full h-20 bg-rose-600 text-white rounded-[28px] font-black text-[13px] uppercase tracking-[0.5em] shadow-[0_20px_40px_-10px_rgba(225,29,72,0.5)] hover:bg-rose-500 hover:-translate-y-1 transition-all disabled:opacity-20 flex items-center justify-center gap-4">
                      {loading ? <Loader2 size={32} className="animate-spin" /> : <><ShieldCheck size={32} /> Authorize Deployment</>}
                   </button>
                </div>
                
                <button onClick={() => setMfaModal(null)} className="absolute top-10 right-10 text-slate-600 hover:text-white transition-all"><X size={36} /></button>
             </motion.div>
          </div>
        )}

        {mfaModal === 'backup' && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMfaModal(null)} className="absolute inset-0 bg-[#050505]/95 backdrop-blur-3xl" />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }}
               className="relative w-full max-w-lg bg-[#0c0c0c] border border-white/10 rounded-[64px] p-12 md:p-16 shadow-[0_0_150px_-20px_rgba(16,185,129,0.3)]"
             >
                <div className="text-center mb-12">
                   <div className="w-24 h-24 bg-emerald-500/10 rounded-[32px] flex items-center justify-center text-emerald-500 mx-auto mb-8 border border-emerald-500/20 shadow-inner">
                      <ShieldCheck size={48} />
                   </div>
                   <h3 className="text-4xl font-black text-emerald-500 tracking-tighter uppercase italic mb-3 leading-none">Node Fortified</h3>
                   <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Save Your Emergency Manifest</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-12">
                   {mfaData.backupCodes.map((code, idx) => (
                     <div key={idx} className="p-5 bg-white/5 border border-white/5 rounded-3xl text-sm font-black text-center text-slate-300 tracking-[0.2em] shadow-inner">
                        {code}
                     </div>
                   ))}
                </div>

                <button onClick={() => setMfaModal(null)} className="w-full h-20 bg-emerald-600 text-white rounded-[28px] font-black text-[12px] uppercase tracking-[0.5em] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.5)] hover:bg-emerald-500 hover:-translate-y-1 transition-all">
                   Synchronize All Nodes
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SecurityShield;
