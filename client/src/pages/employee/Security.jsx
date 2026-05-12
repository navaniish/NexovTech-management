import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Fingerprint, 
  ShieldCheck, 
  ShieldAlert, 
  Smartphone, 
  Monitor, 
  Globe, 
  Clock, 
  RefreshCw, 
  Loader2, 
  Trash2, 
  Zap, 
  Terminal, 
  CheckCircle2, 
  X, 
  QrCode, 
  Download, 
  Lock,
  ShieldPlus,
  AlertTriangle,
  History,
  Cpu,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_URL from '../../config';
import { useAuth } from '../../context/AuthContext';

const EmployeeSecurity = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [mfaModal, setMfaModal] = useState(null);
  const [mfaData, setMfaData] = useState({ qrCode: '', secret: '', token: '', backupCodes: [] });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getGreeting = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const totalMinutes = hour * 60 + minute;
    if (totalMinutes < 750) return 'Good morning'; // Before 12:30 PM
    if (totalMinutes < 1020) return 'Good afternoon'; // 12:30 PM to 5:00 PM
    return 'Good evening'; // After 5:00 PM
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
      console.error('Security uplink failed');
    } finally {
      setLoading(false);
    }
  };

  const start2FASetup = async () => {
    console.log('🛡️ SECURITY_BRIDGE: Initializing MFA setup sequence...');
    showToast('Initializing Security Node...', 'success');
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
      showToast('Network error during activation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async () => {
    if (!mfaData.token || mfaData.token.length < 6) return;
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
        showToast('Shield Activated');
        fetchSecurityData();
      } else {
        showToast(data.message || 'Invalid token', 'error');
      }
    } catch (err) {
      showToast('Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 p-4 md:p-8 font-sans overflow-y-auto custom-scrollbar">
      
      {/* ── AMBIENT OFFICE DEPTH ── */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
         <div className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-30" style={{ backgroundImage: "url('/assets/office-bg.png')" }} />
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 mb-8 rounded-[32px] bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 md:p-8 shadow-2xl">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl border border-white/20">
                  <ShieldCheck size={28} />
               </div>
               <div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic text-white leading-none">
                     {getGreeting()}, NexovTech!
                  </h1>
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.4em] mt-2">Specialist Node</p>
               </div>
            </div>
            <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
               <p className={`text-xl font-black ${user?.twoFactorEnabled ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {user?.twoFactorEnabled ? 'FORTIFIED' : 'ACTION REQUIRED'}
               </p>
            </div>
         </div>
      </header>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
         <div className="lg:col-span-4 space-y-6">
            <section className="bg-gradient-to-br from-slate-900 to-[#050505] rounded-[32px] p-8 border border-white/10 shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                  <Fingerprint size={100} className="text-indigo-600" />
               </div>
               <h3 className="text-lg font-black text-white uppercase tracking-tight italic mb-6">Identity Node</h3>
               <div className={`p-6 rounded-[24px] border ${user?.twoFactorEnabled ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'} mb-6`}>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed italic">
                     {user?.twoFactorEnabled ? "Node is fortified." : "Initialize MFA to secure your specialist node."}
                  </p>
               </div>
               {!user?.twoFactorEnabled && (
                 <button onClick={start2FASetup} className="w-full h-12 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.3em] transition-all hover:bg-indigo-500 shadow-lg relative z-20">
                    Deploy Shield <Zap size={16} className="ml-2 fill-white" />
                 </button>
               )}
            </section>

            {/* BIOMETRIC ENROLLMENT CARD */}
            <section className="bg-white/[0.02] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Biometric Passkey</h3>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                     <Fingerprint size={24} />
                  </div>
               </div>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 leading-relaxed italic">
                  Link your hardware security node for rapid biometric entry.
               </p>
               <button onClick={() => showToast('Syncing Biometric Hardware...', 'success')} className="w-full h-12 bg-indigo-600/10 border border-indigo-600/20 text-indigo-500 rounded-xl font-black text-[9px] uppercase tracking-[0.3em] transition-all hover:bg-indigo-600/20 flex items-center justify-center gap-3">
                  Activate Biometric <Smartphone size={16} />
               </button>
            </section>
         </div>

         <div className="lg:col-span-8 space-y-6">
            <section className="bg-white/[0.01] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
               <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tight leading-none">Trusted Nodes</h3>
                  <button onClick={fetchSecurityData} className="p-3 bg-white/5 hover:bg-white text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                     <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                  </button>
               </div>
               <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trustedDevices.map((device, i) => (
                    <div key={i} className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-500 border border-white/5">
                             {device.deviceType === 'Mobile' ? <Smartphone size={20} /> : <Monitor size={20} />}
                          </div>
                          <div>
                             <p className="text-sm font-black text-white leading-none mb-1.5">{device.deviceName || 'Node'}</p>
                             <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{device.lastIp}</p>
                          </div>
                       </div>
                       <Trash2 size={16} className="text-slate-700 hover:text-rose-500 cursor-pointer transition-colors" />
                    </div>
                  ))}
                  {trustedDevices.length === 0 && (
                    <div className="col-span-2 py-16 text-center opacity-10">
                       <Monitor size={48} className="mx-auto mb-4" />
                       <p className="text-[9px] font-black uppercase tracking-[0.5em]">No nodes established</p>
                    </div>
                  )}
               </div>
            </section>

            <section className="bg-white/[0.01] rounded-[32px] border border-white/5 overflow-hidden">
               <div className="p-6 border-b border-white/5 flex items-center gap-4">
                  <Terminal size={18} className="text-indigo-500" />
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tight leading-none">Security Stream</h3>
               </div>
               <div className="p-6 space-y-2">
                  {logs.slice(0, 5).map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
                       <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${log.status === 'Blocked' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                          <p className="text-[11px] font-black text-white uppercase leading-none">{log.action.replace('_', ' ')}</p>
                       </div>
                       <p className="text-[9px] font-bold text-slate-500">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  ))}
               </div>
            </section>
         </div>
      </div>

      <AnimatePresence>
        {mfaModal === 'setup' && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMfaModal(null)} className="absolute inset-0 bg-[#050505]/95 backdrop-blur-3xl overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center mix-blend-soft-light opacity-20 blur-[2px]" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop')` }} />
             </motion.div>

             <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }}
               className="relative w-full max-w-md bg-[#0c0c0c] border border-white/10 rounded-[48px] p-8 md:p-12 shadow-2xl text-center overflow-hidden"
             >
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                <div className="inline-flex w-16 h-16 bg-indigo-600/10 rounded-2xl items-center justify-center text-indigo-500 mb-8 border border-indigo-500/20">
                   <ShieldPlus size={32} />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic mb-2 leading-none">Fortification</h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-10 italic">Scan Sync Code</p>

                <div className="bg-white p-4 rounded-[40px] w-56 h-56 mx-auto mb-10 shadow-2xl flex items-center justify-center border-[6px] border-white relative">
                   {mfaData.qrCode ? <img src={mfaData.qrCode} alt="QR" className="w-full h-full" /> : <Loader2 size={32} className="animate-spin text-slate-400" />}
                </div>

                <div className="space-y-6">
                   <input 
                     value={mfaData.token} onChange={e => setMfaData({ ...mfaData, token: e.target.value })} maxLength="6"
                     placeholder="TOKEN-000000" 
                     className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl text-center text-3xl font-black tracking-[0.3em] text-indigo-500 focus:border-indigo-600 outline-none transition-all placeholder:text-indigo-900/10 shadow-inner" 
                   />
                   <button onClick={verify2FA} disabled={loading || mfaData.token.length < 6} className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] shadow-xl hover:bg-indigo-500 transition-all disabled:opacity-20 flex items-center justify-center gap-4">
                      {loading ? <Loader2 size={24} className="animate-spin" /> : <><ShieldCheck size={24} /> Deploy Shield</>}
                   </button>
                </div>
                <button onClick={() => setMfaModal(null)} className="absolute top-8 right-8 text-slate-700 hover:text-white transition-all"><X size={28} /></button>
             </motion.div>
          </div>
        )}

        {mfaModal === 'backup' && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMfaModal(null)} className="absolute inset-0 bg-[#050505]/98 backdrop-blur-3xl" />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }}
               className="relative w-full max-w-md bg-[#0c0c0c] border border-white/10 rounded-[48px] p-10 md:p-14 shadow-2xl text-center"
             >
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-8 border border-emerald-500/20">
                   <ShieldCheck size={32} />
                </div>
                <h3 className="text-3xl font-black text-emerald-500 tracking-tighter uppercase italic mb-2 leading-none">Secured</h3>
                <div className="grid grid-cols-2 gap-3 mb-10">
                   {mfaData.backupCodes.map((code, idx) => (
                     <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black text-center text-slate-300 tracking-[0.1em]">{code}</div>
                   ))}
                </div>
                <button onClick={() => setMfaModal(null)} className="w-full h-16 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] shadow-xl hover:bg-emerald-500 transition-all">Synchronize Nodes</button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeSecurity;
