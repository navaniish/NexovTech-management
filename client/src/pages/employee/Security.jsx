import React, { useState, useEffect, useRef } from 'react';
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
  Search,
  Camera,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_URL from '../../config';
import { useAuth } from '../../context/AuthContext';
import BiometricsService from '../../services/biometricsService';

const EmployeeSecurity = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [mfaModal, setMfaModal] = useState(null);
  const [mfaData, setMfaData] = useState({ qrCode: '', secret: '', token: '', backupCodes: [] });
  const [toast, setToast] = useState(null);

  // Biometrics States
  const [biometricsStatus, setBiometricsStatus] = useState({ enrolled: false, enrolledAt: null });
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollStep, setEnrollStep] = useState(0); // 0: idle, 1: center, 2: left, 3: right, 4: ready
  const [consentChecked, setConsentChecked] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [enrollStream, setEnrollStream] = useState(null);
  const enrollVideoRef = useRef(null);

  useEffect(() => {
    fetchSecurityData();
    if (user) {
      fetchBiometricsStatus();
    }
  }, [user]);

  // Monitor step changes during enrollment
  useEffect(() => {
    if (!isEnrolling) return;
    let timer;
    if (enrollStep === 1 && enrollStream) {
      timer = setTimeout(() => setEnrollStep(2), 3000);
    }
    return () => clearTimeout(timer);
  }, [isEnrolling, enrollStep, enrollStream]);

  const enrollStreamRef = useRef(null);

  useEffect(() => {
    enrollStreamRef.current = enrollStream;
  }, [enrollStream]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (enrollStreamRef.current) {
        enrollStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3050);
  };

  const getGreeting = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const totalMinutes = hour * 60 + minute;
    if (totalMinutes < 750) return 'Good morning';
    if (totalMinutes < 1020) return 'Good afternoon';
    return 'Good evening';
  };

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('nexov_token') || localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const fetchBiometricsStatus = async () => {
    try {
      const data = await BiometricsService.getStatus(user?.id || user?._id);
      setBiometricsStatus(data);
    } catch (err) {
      console.error("Failed to fetch biometrics status:", err);
    }
  };

  const startEnrollCamera = async () => {
    setEnrollError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 300, height: 300, facingMode: 'user' }
      });
      setEnrollStream(mediaStream);
      setIsEnrolling(true);
      setEnrollStep(1);
    } catch (err) {
      console.error("Camera access failed:", err);
      setEnrollError("Camera connection failed. Check permissions.");
      showToast("Camera connection failed. Check permissions.", "error");
    }
  };

  const stopEnrollCamera = () => {
    if (enrollStream) {
      enrollStream.getTracks().forEach(track => track.stop());
      setEnrollStream(null);
    }
  };

  const handleEnrollBiometricsSubmit = async () => {
    if (!consentChecked) {
      return showToast("You must consent to biometric enrollment", "error");
    }
    setLoading(true);
    setEnrollError('');
    try {
      const mockTemplate = `template_hash_${user?.email?.toLowerCase()}`;
      await BiometricsService.enroll(user?.id || user?._id, user?.email, mockTemplate, consentChecked);
      showToast("Facial biometric signature catalogued successfully!", "success");
      stopEnrollCamera();
      setIsEnrolling(false);
      setEnrollStep(0);
      setConsentChecked(false);
      fetchBiometricsStatus();
    } catch (err) {
      setEnrollError(err.message || 'Biometric enrollment failed');
      showToast(err.message || 'Biometric enrollment failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBiometrics = async () => {
    if (!window.confirm("Permanently purge facial biometric profile? You will lose face login capability.")) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('nexov_token') || localStorage.getItem('token');
      await BiometricsService.delete(token);
      showToast("Biometric profile successfully purged", "success");
      fetchBiometricsStatus();
    } catch (err) {
      showToast(err.message || 'Purge failed', 'error');
    } finally {
      setLoading(false);
    }
  };

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

  const handleRevokeDevice = async (deviceName) => {
    if (!window.confirm(`Are you sure you want to revoke access for ${deviceName}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/security/devices/${encodeURIComponent(deviceName)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setTrustedDevices(prev => prev.filter(d => d.deviceName !== deviceName));
        showToast('Device node access revoked successfully', 'success');
        fetchSecurityData();
      } else {
        const data = await res.json();
        showToast(data.message || 'Revocation failed', 'error');
      }
    } catch (err) {
      showToast('Network error during revocation', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-full bg-[#050505] text-slate-100 p-4 md:p-8 font-sans rounded-[32px] relative overflow-hidden">
      
      {/* ── AMBIENT OFFICE DEPTH ── */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
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

            {/* BIOMETRIC ENROLLMENT STATUS CARD */}
            <section className="bg-white/[0.02] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Biometric Passkey</h3>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${biometricsStatus.enrolled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                     <Fingerprint size={24} />
                  </div>
               </div>
               <div className="mb-6">
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest inline-block mb-2 ${biometricsStatus.enrolled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                     {biometricsStatus.enrolled ? 'ENROLLED' : 'NOT CONFIGURED'}
                  </span>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed italic">
                     {biometricsStatus.enrolled 
                        ? `Signature active in Sentinel Ledger. Registered on: ${new Date(biometricsStatus.enrolledAt).toLocaleDateString()}` 
                        : 'Link your facial biometric signature for rapid bypass entry.'
                     }
                  </p>
               </div>
               <div className="flex gap-2 w-full">
                  {biometricsStatus.enrolled && (
                     <button
                        onClick={handleDeleteBiometrics}
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                     >
                        <Trash2 size={14} /> Purge Signature
                     </button>
                  )}
                  <button
                     onClick={startEnrollCamera}
                     className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                     <Camera size={14} /> {biometricsStatus.enrolled ? 'RE-ENROLL' : 'ENROLL FACE'}
                  </button>
               </div>
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
                       <Trash2 size={16} className="text-slate-700 hover:text-rose-500 cursor-pointer transition-colors" onClick={() => handleRevokeDevice(device.deviceName)} />
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

        {/* ── BIOMETRICS ENROLLMENT MODAL OVERLAY ── */}
        {isEnrolling && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { stopEnrollCamera(); setIsEnrolling(false); setEnrollStep(0); }} className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full h-[100dvh] md:h-auto md:max-w-md bg-white text-slate-900 md:rounded-[28px] rounded-none p-6 md:p-8 shadow-2xl z-10 flex flex-col items-center justify-start md:justify-center overflow-y-auto py-8 md:py-8">
              
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic mb-1.5 flex items-center gap-1.5">
                {enrollStep === 0 ? 'Face Scanner Setup' : `Step ${enrollStep === 1 ? 1 : (enrollStep === 2 || enrollStep === 3 ? 2 : (enrollStep === 4 ? 3 : 4))} of 4`}
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                {enrollStep === 1 && 'Position your face inside the frame.'}
                {enrollStep === 2 && 'Look left and keep face aligned.'}
                {enrollStep === 3 && 'Look right and keep face aligned.'}
                {enrollStep === 4 && 'Registry Validation.'}
              </p>

              <div className="relative w-56 h-56 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-slate-950 shadow-[0_0_25px_rgba(99,102,241,0.4)] mb-8 flex items-center justify-center bg-slate-50">
                {enrollStream ? (
                  <video
                    ref={(node) => {
                      if (node) {
                        enrollVideoRef.current = node;
                        if (enrollStream && node.srcObject !== enrollStream) {
                          node.srcObject = enrollStream;
                          node.play().catch(err => console.error('Enroll camera play error:', err));
                        }
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <Camera size={38} className="text-slate-300 animate-pulse" />
                )}
                {/* Visual scan HUD overlay elements */}
                <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-full circle-scan animate-spin" style={{ animationDuration: '15s' }} />
                <div className="absolute inset-2 border border-dashed border-cyan-400/20 rounded-full circle-scan animate-spin" style={{ animationDuration: '22s', animationDirection: 'reverse' }} />
                <div className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee] laser-line pointer-events-none animate-pulse" style={{ animation: 'laser-sweep 2s ease-in-out infinite' }} />
              </div>

              {/* Capture steps & progress */}
              <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6 font-sans text-left space-y-3 shadow-inner">
                <p className="text-[10px] text-slate-900 uppercase font-black tracking-wider border-b border-slate-200/60 pb-1.5">Capture Steps</p>
                <div className="grid grid-cols-2 gap-3 text-[9px] font-bold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className={enrollStep > 1 ? "text-emerald-500 font-bold" : "text-slate-300"}>✓</span>
                    <span className={enrollStep > 1 ? "text-slate-700 font-bold" : ""}>Front Face</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={enrollStep > 2 ? "text-emerald-500 font-bold" : "text-slate-300"}>✓</span>
                    <span className={enrollStep > 2 ? "text-slate-700 font-bold" : ""}>Look Left</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={enrollStep > 3 ? "text-emerald-500 font-bold" : "text-slate-300"}>✓</span>
                    <span className={enrollStep > 3 ? "text-slate-700 font-bold" : ""}>Look Right</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={enrollStep > 4 ? "text-emerald-500 font-bold" : "text-slate-300"}>✓</span>
                    <span className={enrollStep > 4 ? "text-slate-700 font-bold" : ""}>Consent & Registry</span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200/60 flex justify-between items-center text-[9px] font-black uppercase text-indigo-600">
                  <span>Enrollment Progress:</span>
                  <span>{Math.round(Math.min((enrollStep / 4) * 100, 100))}%</span>
                </div>
              </div>

              {/* Next buttons */}
              {enrollStream && (enrollStep === 2 || enrollStep === 3) && (
                <button
                  onClick={() => setEnrollStep(prev => prev + 1)}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer mb-2"
                >
                  ✓ Done — Next Step
                </button>
              )}

              {enrollStep === 4 && (
                <div className="w-full space-y-3 pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-0.5 cursor-pointer text-indigo-600"
                    />
                    <span className="text-[8.5px] text-slate-505 font-bold uppercase tracking-wider leading-relaxed">
                      I consent to storing my encrypted biometric template for passwordless authentication.
                    </span>
                  </label>

                  <button
                    onClick={handleEnrollBiometricsSubmit}
                    disabled={loading || !consentChecked}
                    className="w-full h-12 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-lg"
                  >
                    {loading ? 'Saving Signature...' : 'Submit Biometric Signature'}
                  </button>
                </div>
              )}

              <button
                onClick={() => { stopEnrollCamera(); setIsEnrolling(false); setEnrollStep(0); }}
                className="w-full h-10 mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer"
              >
                Cancel Enrollment
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[300]">
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} className={`px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border backdrop-blur-2xl ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-600'}`}>
              <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{toast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}</div>
              <p className="text-[9px] font-black uppercase tracking-widest">{toast.message}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeSecurity;
