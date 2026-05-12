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
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_URL from '../../config';
import { useAuth } from '../../context/AuthContext';

const EmployeeSecurity = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [mfaModal, setMfaModal] = useState(null); // 'setup', 'backup', 'disable'
  const [mfaData, setMfaData] = useState({ qrCode: '', secret: '', token: '', backupCodes: [] });
  const [toast, setToast] = useState(null);

  // Security Score Calculation
  const calculateScore = () => {
    let score = 30; // Base score
    if (user?.twoFactorEnabled) score += 40;
    if (trustedDevices.length > 0) score += 10;
    if (logs.length > 0 && !logs.find(l => l.status === 'Blocked')) score += 20;
    return Math.min(score, 100);
  };

  const securityScore = calculateScore();

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const fetchSecurityData = async () => {
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
      console.error('Security uplink failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const start2FASetup = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/security/2fa/setup`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        setMfaData({ ...mfaData, qrCode: data.qrCode, secret: data.secret, token: '' });
        setMfaModal('setup');
      } else {
        showToast(data.message || '2FA setup failed', 'error');
      }
    } catch (err) {
      showToast('Connection to security grid lost', 'error');
    } finally {
      setLoading(false);
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
        showToast('Account Shield Activated');
        fetchSecurityData();
      } else {
        showToast(data.message || 'Verification failed', 'error');
      }
    } catch (err) {
      showToast('Audit link failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/security/2fa/disable`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ token: mfaData.token })
      });
      if (res.ok) {
        updateUser({ ...user, twoFactorEnabled: false });
        setMfaModal(null);
        showToast('2FA Disabled - Security reduced', 'warning');
        fetchSecurityData();
      } else {
        const data = await res.json();
        showToast(data.message || 'Disable failed', 'error');
      }
    } catch (err) {
      showToast('Network disruption', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    try {
      const res = await fetch(`${API_URL}/security/devices/${deviceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showToast('Session terminated');
        fetchSecurityData();
      }
    } catch (err) {
      showToast('Revocation protocol failed', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans selection:bg-rose-500 selection:text-white overflow-y-auto custom-scrollbar">
      
      {/* ── EMPLOYEE SECURITY HEADER ── */}
      <header className="relative mb-10 overflow-hidden rounded-[40px] bg-gradient-to-br from-slate-900 to-[#020617] border border-white/5 p-8 md:p-12 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)]">
         {/* Ambient Background Visuals */}
         <div className="absolute inset-0 z-0">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] -mr-40 -mt-40 rounded-full animate-drift" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-rose-600/5 blur-[100px] -ml-32 -mb-32 rounded-full" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] scale-150" />
         </div>

         <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="space-y-4">
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-600 rounded-[22px] flex items-center justify-center text-white shadow-[0_10px_30px_-5px_rgba(79,70,229,0.5)]">
                     <ShieldCheck size={32} />
                  </div>
                  <div>
                     <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic text-white leading-none">SafeGuard</h1>
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em] mt-2 ml-1">Personal Defense Interface</p>
                  </div>
               </div>
               <p className="text-slate-400 text-sm md:text-base font-medium max-w-xl leading-relaxed">
                  Managing your digital perimeter and identity integrity. Monitor active sessions and maintain mission-critical security protocols.
               </p>
            </div>

            {/* SECURITY SCORE WIDGET */}
            <div className="flex items-center gap-6 bg-white/[0.03] backdrop-blur-3xl p-6 rounded-[36px] border border-white/10 shadow-inner">
               <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                     <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                     <motion.circle 
                       cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2}
                       initial={{ strokeDashoffset: 251.2 }}
                       animate={{ strokeDashoffset: 251.2 - (251.2 * securityScore) / 100 }}
                       transition={{ duration: 1.5, ease: "easeOut" }}
                       className={securityScore > 80 ? 'text-emerald-500' : securityScore > 50 ? 'text-amber-500' : 'text-rose-500'} 
                     />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-2xl font-black text-white">{securityScore}</span>
                     <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Score</span>
                  </div>
               </div>
               <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight mb-1">Defense Status</h4>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${securityScore > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                     {securityScore > 80 ? 'Highly Resilient' : 'Optimization Required'}
                  </p>
                  <div className="flex gap-1 mt-3">
                     {[1,2,3,4,5].map(i => (
                       <div key={i} className={`w-3 h-1 rounded-full ${i <= (securityScore / 20) ? 'bg-indigo-500' : 'bg-white/10'}`} />
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
         
         {/* ── COLUMN 1: MFA & ACCOUNT INTEGRITY ── */}
         <div className="lg:col-span-4 space-y-8">
            
            {/* 2FA CONTROL CENTER */}
            <section className="bg-[#0f172a] rounded-[40px] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <Fingerprint size={120} className="text-indigo-500" />
               </div>
               
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                     <Lock size={20} className="text-indigo-400" />
                     Multi-Factor
                  </h3>
                  <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${user?.twoFactorEnabled ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/20 text-rose-500 border border-rose-500/20'}`}>
                     {user?.twoFactorEnabled ? 'Shield Active' : 'Shield Offline'}
                  </div>
               </div>

               <p className="text-xs font-bold text-slate-400 mb-8 leading-relaxed">
                  Protect your identity with a secondary temporal token. Even if your password is compromised, your account remains secure.
               </p>

               {user?.twoFactorEnabled ? (
                 <div className="space-y-4">
                    <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 flex items-center gap-4">
                       <CheckCircle2 size={20} className="text-emerald-500" />
                       <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Biometric Link Verified</div>
                    </div>
                    <button 
                      onClick={() => setMfaModal('disable')}
                      className="w-full h-14 bg-white/[0.05] text-rose-400 hover:bg-rose-500/10 border border-white/5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all"
                    >
                       Deactivate Shield
                    </button>
                 </div>
               ) : (
                 <button 
                   onClick={start2FASetup}
                   className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-[0_15px_30px_-5px_rgba(79,70,229,0.4)] hover:bg-indigo-500 hover:-translate-y-1 transition-all"
                 >
                    Initialize Setup <Zap size={16} className="ml-2 fill-white" />
                 </button>
               )}
            </section>

            {/* PASSWORD ROTATION STATUS */}
            <section className="bg-[#0c0c0c] rounded-[40px] p-8 border border-white/5">
               <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 italic">Password Integrity</h4>
               <div className="flex items-center gap-6 mb-8">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400">
                     <Key size={24} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Last Rotation</p>
                     <p className="text-lg font-black text-white">42 Days Ago</p>
                  </div>
               </div>
               <button onClick={() => window.location.href = '#/employee/settings'} className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all border border-white/5">
                  Rotate Access Cipher
               </button>
            </section>

            {/* SECURITY TIP */}
            <div className="p-8 rounded-[40px] bg-indigo-600/10 border border-indigo-500/20">
               <div className="flex items-center gap-3 mb-4">
                  <ShieldAlert size={18} className="text-indigo-400" />
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Security Advisory</span>
               </div>
               <p className="text-xs font-medium text-indigo-200/60 leading-relaxed">
                  Never share your recovery codes. Our personnel will never ask for your temporal token or mission keys.
               </p>
            </div>
         </div>

         {/* ── COLUMN 2: ACTIVE SESSIONS & AUDIT TRAIL ── */}
         <div className="lg:col-span-8 space-y-8">
            
            {/* ACTIVE NODES / TRUSTED DEVICES */}
            <section className="bg-[#0c0c0c] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl">
               <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <div>
                     <h3 className="text-xl font-black text-white tracking-tight uppercase italic leading-none">Active Nodes</h3>
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Authenticated Device Registry</p>
                  </div>
                  <button onClick={fetchSecurityData} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                     <RefreshCw size={18} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                  </button>
               </div>
               
               <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {trustedDevices.length === 0 ? (
                       <div className="col-span-2 py-16 flex flex-col items-center justify-center opacity-20">
                          <Monitor size={48} className="mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-[0.4em]">No persistent nodes established</p>
                       </div>
                     ) : (
                       trustedDevices.map((device, idx) => (
                         <motion.div 
                           key={device._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                           className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-[32px] hover:bg-white/[0.04] transition-all group"
                         >
                            <div className="flex items-center gap-5">
                               <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-all shadow-inner">
                                  {device.deviceType === 'Mobile' ? <Smartphone size={24} /> : <Monitor size={24} />}
                               </div>
                               <div className="min-w-0">
                                  <h5 className="text-sm font-black text-white truncate">{device.deviceName || 'Authorized Station'}</h5>
                                  <div className="flex items-center gap-2 mt-1.5">
                                     <Globe size={10} className="text-slate-600" />
                                     <span className="text-[9px] font-bold text-slate-600 uppercase">{device.lastIp || '---.---.---'}</span>
                                     <span className="text-emerald-500/50 text-[10px] font-black">• LIVE</span>
                                  </div>
                               </div>
                            </div>
                            <button onClick={() => handleRevokeDevice(device._id)} className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                               <Trash2 size={18} />
                            </button>
                         </motion.div>
                       ))
                     )}
                  </div>
               </div>
            </section>

            {/* HISTORICAL AUDIT TRAIL */}
            <section className="bg-[#0c0c0c] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl">
               <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 shadow-inner">
                        <Terminal size={24} />
                     </div>
                     <div>
                        <h3 className="text-xl font-black text-white tracking-tight uppercase italic leading-none">Security Audit</h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Behavioral Intelligence Feed</p>
                     </div>
                  </div>
                  <div className="px-4 py-2 bg-indigo-600/5 border border-indigo-600/20 rounded-full flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                     <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Cloud Sync Active</span>
                  </div>
               </div>

               <div className="p-8">
                  <div className="space-y-3">
                     {logs.length === 0 ? (
                       <div className="py-20 text-center opacity-10">
                          <History size={60} className="mx-auto mb-4" />
                          <p className="text-xs font-black uppercase tracking-[0.5em]">No activity indexed</p>
                       </div>
                     ) : (
                       logs.slice(0, 10).map((log, i) => (
                         <motion.div 
                           key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                           className="flex items-center justify-between p-5 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.03] transition-all"
                         >
                            <div className="flex items-center gap-5">
                               <div className={`w-2.5 h-2.5 rounded-full ${
                                 log.status === 'Blocked' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 
                                 log.action.includes('fail') ? 'bg-amber-500' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                               }`} />
                               <div>
                                  <p className="text-xs font-black text-white tracking-tight uppercase">{log.action.replace('_', ' ')}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                     <span className="text-[9px] font-bold text-slate-500 uppercase">{log.location?.city || 'Terminal Node'}</span>
                                     <span className="text-slate-800 text-[10px]">•</span>
                                     <span className="text-[9px] font-bold text-slate-600 tracking-tighter">{log.ipAddress}</span>
                                  </div>
                               </div>
                            </div>
                            <div className="text-right">
                               <div className="flex items-center gap-2 mb-1 justify-end">
                                  <Clock size={10} className="text-slate-700" />
                                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Indexed</p>
                               </div>
                               <p className="text-[10px] font-bold text-slate-400">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                         </motion.div>
                       ))
                     )}
                  </div>
                  
                  {logs.length > 0 && (
                    <button className="w-full mt-10 py-5 bg-white/[0.02] hover:bg-white/[0.05] text-slate-500 hover:text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 border border-white/5">
                       Request Full Audit Manifest <Download size={18} />
                    </button>
                  )}
               </div>
            </section>
         </div>
      </div>

      {/* ── MODALS: SECURITY PROTOCOLS ── */}
      <AnimatePresence>
        {mfaModal === 'setup' && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMfaModal(null)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl" />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative w-full max-w-md bg-[#0c0c0c] border border-white/10 rounded-[48px] p-8 md:p-12 shadow-[0_0_100px_-20px_rgba(79,70,229,0.3)] text-center"
             >
                <div className="inline-flex w-20 h-20 bg-indigo-600/10 rounded-[28px] items-center justify-center text-indigo-500 mb-8 border border-indigo-500/20">
                   <QrCode size={40} />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic mb-3">Shield Init</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-10">Scan Registry QR Code</p>

                <div className="bg-white p-5 rounded-[40px] w-64 h-64 mx-auto mb-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                   <img src={mfaData.qrCode} alt="QR" className="w-full h-full" />
                </div>

                <div className="space-y-4">
                   <input 
                     value={mfaData.token} onChange={e => setMfaData({ ...mfaData, token: e.target.value })} maxLength="6"
                     placeholder="0 0 0 0 0 0" 
                     className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl text-center text-3xl font-black tracking-[0.5em] text-indigo-400 focus:border-indigo-500 outline-none transition-all" 
                   />
                   <button onClick={verify2FA} disabled={loading || mfaData.token.length < 6} className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] shadow-xl hover:bg-indigo-500 transition-all disabled:opacity-20 flex items-center justify-center gap-3">
                      {loading ? <Loader2 size={24} className="animate-spin" /> : <><ShieldCheck size={24} /> Deploy Shield</>}
                   </button>
                </div>
                <button onClick={() => setMfaModal(null)} className="absolute top-8 right-8 text-slate-600 hover:text-white transition-colors"><X size={28} /></button>
             </motion.div>
          </div>
        )}

        {mfaModal === 'backup' && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMfaModal(null)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl" />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative w-full max-w-md bg-[#0c0c0c] border border-white/10 rounded-[48px] p-8 md:p-12 shadow-[0_0_100px_-20px_rgba(16,185,129,0.3)]"
             >
                <div className="text-center mb-10">
                   <div className="w-20 h-20 bg-emerald-500/10 rounded-[28px] flex items-center justify-center text-emerald-500 mx-auto mb-6 border border-emerald-500/20">
                      <ShieldCheck size={40} />
                   </div>
                   <h3 className="text-3xl font-black text-emerald-500 tracking-tighter uppercase italic mb-2">Shield Active</h3>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Save Your Backup Manifest</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-10">
                   {mfaData.backupCodes.map((code, idx) => (
                     <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-[11px] font-black text-center text-slate-300 tracking-[0.2em] shadow-inner">
                        {code}
                     </div>
                   ))}
                </div>

                <button onClick={() => setMfaModal(null)} className="w-full h-16 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] shadow-xl hover:bg-emerald-500 transition-all">
                   Synchronize Identity
                </button>
             </motion.div>
          </div>
        )}

        {mfaModal === 'disable' && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMfaModal(null)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl" />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative w-full max-w-md bg-[#0c0c0c] border border-rose-900/30 rounded-[48px] p-8 md:p-12 shadow-[0_0_100px_-20px_rgba(244,63,94,0.2)] text-center"
             >
                <div className="inline-flex w-20 h-20 bg-rose-600/10 rounded-[28px] items-center justify-center text-rose-500 mb-8 border border-rose-500/20">
                   <AlertTriangle size={40} />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic mb-3">Deactivate Shield?</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-10 leading-relaxed">Identity risk level will increase. Confirm with current token.</p>

                <div className="space-y-6">
                   <input 
                     value={mfaData.token} onChange={e => setMfaData({ ...mfaData, token: e.target.value })} maxLength="6"
                     placeholder="0 0 0 0 0 0" 
                     className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl text-center text-3xl font-black tracking-[0.5em] text-rose-500 focus:border-rose-600 outline-none transition-all" 
                   />
                   <div className="flex gap-4">
                      <button onClick={() => setMfaModal(null)} className="flex-1 h-14 bg-white/5 text-white rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10">Cancel</button>
                      <button onClick={disable2FA} disabled={loading || mfaData.token.length < 6} className="flex-1 h-14 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-rose-500 transition-all">Confirm</button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-10 right-10 z-[600]">
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
              className={`px-8 py-5 rounded-[28px] shadow-2xl flex items-center gap-5 border backdrop-blur-2xl ${
                toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                toast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
              }`}
            >
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                 toast.type === 'success' ? 'bg-emerald-500 text-white' : 
                 toast.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
               }`}>
                  {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
               </div>
               <p className="text-[12px] font-black uppercase tracking-widest">{toast.message}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FOOTER INTEL ── */}
      <footer className="mt-20 flex flex-col md:flex-row items-center justify-between gap-6 opacity-30 px-4 pb-12 border-t border-white/5 pt-12">
         <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
               <Cpu size={16} />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">Neural Defense v4.2.1</span>
            </div>
            <div className="flex items-center gap-3">
               <ShieldCheck size={16} />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">FIDO2/WebAuthn Ready</span>
            </div>
         </div>
         <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em]">NexovTech Global Intelligence © 2026</p>
      </footer>
    </div>
  );
};

const AlertCircle = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

export default EmployeeSecurity;
