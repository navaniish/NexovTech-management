import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Lock, 
  Smartphone, 
  Key, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Globe, 
  Smartphone as DeviceIcon,
  X,
  Copy,
  Download,
  AlertTriangle,
  RefreshCw,
  LogOut,
  MapPin,
  Eye,
  Settings,
  ChevronRight,
  Fingerprint
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';

const SecurityShield = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [logs, setLogs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [qrCode, setQrCode] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    const token = localStorage.getItem('nexov_token');
    try {
      const [logsRes, devicesRes] = await Promise.all([
        fetch(`${API_URL}/security/logs`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/security/devices`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (logsRes.ok) setLogs(await logsRes.json());
      if (devicesRes.ok) setDevices(await devicesRes.json());
    } catch (err) {
      console.error('Security fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    const token = localStorage.getItem('nexov_token');
    try {
      const res = await fetch(`${API_URL}/security/2fa/setup`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setQrCode(data.qrCode);
        setSetupStep(2);
      }
    } catch (err) {
      setError('Failed to initiate 2FA setup');
    }
  };

  const verify2FA = async () => {
    const token = localStorage.getItem('nexov_token');
    try {
      const res = await fetch(`${API_URL}/security/2fa/verify`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: otpToken })
      });
      const data = await res.json();
      if (res.ok) {
        setBackupCodes(data.backupCodes);
        setSetupStep(3);
        updateUser({ twoFactorEnabled: true });
        fetchSecurityData();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Verification failed');
    }
  };

  const disable2FA = async () => {
    if (!window.confirm('WARNING: Disabling 2FA reduces account security. Proceed?')) return;
    const token = localStorage.getItem('nexov_token');
    const otp = prompt('Enter 2FA Code to disable:');
    if (!otp) return;

    try {
      const res = await fetch(`${API_URL}/security/2fa/disable`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: otp })
      });
      if (res.ok) {
        updateUser({ twoFactorEnabled: false });
        fetchSecurityData();
        alert('2FA disabled successfully');
      } else {
        alert('Failed to disable 2FA. Invalid code.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen theme-bg p-4 md:p-10 text-white overflow-y-auto scrollbar-hide">
      {/* 1. CYBER-MODERN HEADER */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-600 rounded-2xl shadow-xl shadow-rose-600/20">
               <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase">
               Security <span className="text-rose-600">Shield</span>
            </h1>
          </div>
          <p className="text-slate-400 text-sm font-bold tracking-widest uppercase ml-1">
             NexovTech Enterprise Identity Protection
          </p>
        </div>

        <div className="flex items-center gap-4">
           <div className="glass-card flex flex-col items-end px-6 py-3 border-rose-600/10">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Security Score</span>
              <span className="text-2xl font-black text-rose-500">98%</span>
           </div>
           <button onClick={fetchSecurityData} className="p-4 bg-slate-900 rounded-2xl border border-white/5 hover:bg-slate-800 transition-all group">
              <RefreshCw size={20} className={`text-slate-400 group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </header>

      {/* 2. TAB NAVIGATION */}
      <nav className="flex gap-2 mb-10 overflow-x-auto no-scrollbar bg-slate-900/50 p-2 rounded-[28px] border border-white/5 w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: Eye },
          { id: '2fa', label: '2FA Auth', icon: Smartphone },
          { id: 'devices', label: 'Devices', icon: DeviceIcon },
          { id: 'logs', label: 'Audit Logs', icon: Clock },
          { id: 'recovery', label: 'Recovery', icon: Key }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-6 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id ? 'bg-rose-600 text-white shadow-xl shadow-rose-600/20' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <tab.icon size={18} />
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <main className="lg:col-span-8 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <SecurityStatCard title="Total Login Attempts" value={logs.length} icon={ShieldCheck} color="text-indigo-500" />
                   <SecurityStatCard title="Active Sessions" value={devices.length} icon={Fingerprint} color="text-rose-500" />
                </div>

                <div className="glass-card p-8 border-rose-600/5 bg-slate-900/40 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/5 blur-[100px] -mr-20 -mt-20" />
                   <h3 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
                      <ShieldAlert size={24} className="text-rose-600" />
                      Critical Threats
                   </h3>
                   <div className="space-y-4">
                      {logs.filter(l => l.status === 'Failure').length === 0 ? (
                        <div className="py-10 text-center text-slate-500 border-2 border-dashed border-white/5 rounded-3xl">
                           No critical threats detected in current cycle.
                        </div>
                      ) : (
                        logs.filter(l => l.status === 'Failure').slice(0, 5).map((log, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-rose-600/5 border border-rose-600/10 rounded-2xl">
                             <div className="flex items-center gap-4">
                                <AlertTriangle className="text-rose-600" size={20} />
                                <div>
                                   <p className="text-sm font-black uppercase tracking-widest">Unauthorized Access Attempt</p>
                                   <p className="text-[10px] text-slate-500 font-bold uppercase">{log.ipAddress} • {new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                             </div>
                             <span className="text-[10px] font-black text-rose-600 bg-rose-600/10 px-3 py-1 rounded-full uppercase">Blocked</span>
                          </div>
                        ))
                      )}
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === '2fa' && (
              <motion.div 
                key="2fa"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-card p-10 border-rose-600/10 bg-slate-900/40"
              >
                <div className="flex items-center justify-between mb-10">
                   <div>
                      <h2 className="text-3xl font-black uppercase tracking-tighter">Two-Factor Authentication</h2>
                      <p className="text-slate-400 text-sm mt-1">Multi-layered protocol for account integrity.</p>
                   </div>
                   <div className={`w-4 h-4 rounded-full ${user?.twoFactorEnabled ? 'bg-emerald-500' : 'bg-rose-600'} shadow-[0_0_12px_rgba(244,63,94,0.3)]`} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <div className={`p-6 rounded-3xl border ${user?.twoFactorEnabled ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-600/20 bg-rose-600/5'}`}>
                         <h4 className="font-black text-lg mb-2 uppercase tracking-tight">App Authenticator</h4>
                         <p className="text-xs text-slate-400 leading-relaxed">Secure codes via Google Authenticator or Authy. Recommended for high-security environments.</p>
                         <button 
                           onClick={() => user?.twoFactorEnabled ? disable2FA() : setShow2FASetup(true)}
                           className={`mt-6 w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                             user?.twoFactorEnabled ? 'bg-slate-800 text-slate-400' : 'bg-rose-600 text-white hover:bg-rose-500 shadow-xl shadow-rose-600/20'
                           }`}
                         >
                            {user?.twoFactorEnabled ? 'Disable Protocol' : 'Initialize Setup'}
                         </button>
                      </div>

                      <div className="p-6 rounded-3xl border border-white/5 bg-white/5 opacity-50 cursor-not-allowed">
                         <h4 className="font-black text-lg mb-2 uppercase tracking-tight">Security Keys (FIDO2)</h4>
                         <p className="text-xs text-slate-400 leading-relaxed">Hardware-based authentication via USB or NFC keys. Deployment pending for specialist roster.</p>
                      </div>
                   </div>

                   <div className="flex flex-col items-center justify-center p-8 bg-slate-950 rounded-3xl border border-white/5">
                      <div className="w-20 h-20 bg-rose-600/10 rounded-[24px] flex items-center justify-center mb-6">
                         <Smartphone size={32} className="text-rose-600" />
                      </div>
                      <h5 className="text-center font-black uppercase tracking-widest text-sm mb-2">Protocol Status</h5>
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${user?.twoFactorEnabled ? 'text-emerald-500' : 'text-rose-600'}`}>
                         {user?.twoFactorEnabled ? 'ENCRYPTED' : 'VULNERABLE'}
                      </p>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'devices' && (
              <motion.div 
                key="devices"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between px-2">
                   <h2 className="text-2xl font-black uppercase tracking-tighter">Trusted Terminals</h2>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{devices.length} Active Nodes</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {devices.map((device) => (
                      <div key={device._id} className="glass-card p-6 border-white/5 hover:border-rose-600/20 transition-all group">
                         <div className="flex items-start justify-between mb-6">
                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center group-hover:text-rose-600 transition-colors">
                               <DeviceIcon size={24} />
                            </div>
                            <button 
                              onClick={() => {
                                 if (window.confirm('Revoke access for this terminal?')) {
                                    fetch(`${API_URL}/security/devices/${device._id}`, {
                                       method: 'DELETE',
                                       headers: { 'Authorization': `Bearer ${localStorage.getItem('nexov_token')}` }
                                    }).then(() => fetchSecurityData());
                                 }
                              }}
                              className="p-2 text-slate-500 hover:text-rose-600 transition-colors"
                            >
                               <LogOut size={18} />
                            </button>
                         </div>
                         <h4 className="font-black uppercase tracking-tight text-lg mb-1">{device.deviceName || 'Unknown Terminal'}</h4>
                         <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                               <Globe size={12} /> {device.lastIp}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                               <Clock size={12} /> {new Date(device.lastUsedAt).toLocaleDateString()}
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div 
                key="logs"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-card p-8 border-white/5"
              >
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-2xl font-black uppercase tracking-tighter">Identity Audit Trail</h2>
                   <div className="flex gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
                      <span className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/30" />
                   </div>
                </div>
                
                <div className="space-y-4 max-h-[600px] overflow-y-auto no-scrollbar pr-2">
                   {logs.map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                         <div className="flex items-center gap-4">
                            <div className={`w-2 h-2 rounded-full ${log.status === 'Success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <div>
                               <p className="text-xs font-black uppercase tracking-widest">{log.action.replace(/_/g, ' ')}</p>
                               <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{log.ipAddress} • {log.browser}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase">{new Date(log.timestamp).toLocaleDateString()}</p>
                            <p className="text-[10px] font-bold text-slate-600 uppercase">{new Date(log.timestamp).toLocaleTimeString()}</p>
                         </div>
                      </div>
                   ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <aside className="lg:col-span-4 space-y-8">
           <div className="glass-card p-8 border-rose-600/10 bg-gradient-to-br from-slate-900 to-slate-950">
              <h3 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
                 <ShieldCheck size={20} className="text-rose-600" />
                 Identity Integrity
              </h3>
              <div className="space-y-6">
                 <IntegrityItem label="Password Rotation" status="Optimal" value="12 Days" />
                 <IntegrityItem label="2FA Protocol" status={user?.twoFactorEnabled ? 'Secure' : 'Critical'} value={user?.twoFactorEnabled ? 'Active' : 'Missing'} />
                 <IntegrityItem label="Terminal Trust" status="Active" value={`${devices.length} Devices`} />
              </div>
              <button className="w-full mt-10 py-4 border border-rose-600/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-600 hover:text-white transition-all">
                 Trigger Global Lockdown
              </button>
           </div>

           <div className="glass-card p-8 border-white/5 bg-slate-900/40">
              <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Security Intelligence</h3>
              <div className="flex flex-col gap-4">
                 <p className="text-xs text-slate-400 leading-relaxed italic">
                    "AI-driven anomaly detection is monitoring your identity trail. Any impossible travel or unrecognized terminal access will trigger immediate protocol suspension."
                 </p>
                 <div className="flex items-center gap-3 text-rose-500 font-black text-[10px] uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" /> 
                    Live Monitoring Active
                 </div>
              </div>
           </div>
        </aside>
      </div>

      {/* 2FA SETUP MODAL */}
      <AnimatePresence>
        {show2FASetup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShow2FASetup(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass-card !p-8 md:!p-10 border-rose-600/20 bg-slate-900 shadow-2xl z-10 rounded-[40px]"
            >
               <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Security Protocol</h2>
                  <button onClick={() => { setShow2FASetup(false); setSetupStep(1); }} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
               </div>

               {setupStep === 1 && (
                  <div className="space-y-8 text-center">
                     <div className="w-20 h-20 bg-rose-600/10 rounded-[30px] flex items-center justify-center mx-auto">
                        <Lock size={32} className="text-rose-600" />
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-xl font-black uppercase tracking-tight">Enable 2FA Auth</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">NexovTech Security Shield uses TOTP encryption. Please ensure you have an authenticator app ready on your mobile device.</p>
                     </div>
                     <button onClick={handleSetup2FA} className="w-full py-5 bg-rose-600 text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-rose-500 transition-all shadow-2xl shadow-rose-600/20">
                        Begin Initialization
                     </button>
                  </div>
               )}

               {setupStep === 2 && (
                  <div className="space-y-8">
                     <div className="flex flex-col items-center">
                        <div className="p-4 bg-white rounded-3xl mb-6 relative group overflow-hidden">
                           {!qrCode ? (
                              <div className="w-48 h-48 flex items-center justify-center bg-slate-100 rounded-2xl animate-pulse">
                                 <RefreshCw size={24} className="text-slate-300 animate-spin" />
                              </div>
                           ) : (
                              <img 
                                src={qrCode} 
                                alt="QR Code" 
                                className="w-48 h-48 object-contain" 
                                onError={() => setError('Security matrix rendering failed. Please retry.')}
                              />
                           )}
                        </div>
                        <p className="text-center text-[11px] text-slate-400 font-bold leading-relaxed">
                           Scan this identity matrix with your authenticator app to sync protocol.
                        </p>
                     </div>
                     <div className="space-y-4">
                        <input 
                          type="text" 
                          placeholder="Enter 6-digit Sync Code" 
                          maxLength={6}
                          value={otpToken}
                          onChange={(e) => setOtpToken(e.target.value)}
                          className="w-full h-16 bg-slate-950 border border-white/10 rounded-[22px] text-center text-2xl font-black tracking-[0.5em] text-rose-500 focus:outline-none focus:border-rose-600"
                        />
                        {error && <p className="text-rose-600 text-[10px] font-black uppercase text-center">{error}</p>}
                        <button onClick={verify2FA} className="w-full py-5 bg-rose-600 text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-rose-500 transition-all">
                           Verify Protocol
                        </button>
                     </div>
                  </div>
               )}

               {setupStep === 3 && (
                  <div className="space-y-8">
                     <div className="w-20 h-20 bg-emerald-500/10 rounded-[30px] flex items-center justify-center mx-auto">
                        <ShieldCheck size={32} className="text-emerald-500" />
                     </div>
                     <div className="space-y-2 text-center">
                        <h3 className="text-xl font-black uppercase tracking-tight text-emerald-500">Security Active</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">Identity protection is now fully deployed. Store these emergency recovery codes in a physical secure location.</p>
                     </div>
                     <div className="grid grid-cols-2 gap-3 p-6 bg-slate-950 rounded-3xl border border-white/5">
                        {backupCodes.map((code, i) => (
                           <span key={i} className="text-[10px] font-black text-slate-300 font-mono tracking-widest text-center">{code}</span>
                        ))}
                     </div>
                     <div className="flex gap-4">
                        <button className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                           <Download size={14} /> Download
                        </button>
                        <button onClick={() => setShow2FASetup(false)} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all">
                           Finish Setup
                        </button>
                     </div>
                  </div>
               )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SecurityStatCard = ({ title, value, icon: Icon, color }) => (
  <div className="glass-card p-6 border-white/5 bg-slate-900/40 group hover:border-white/10 transition-all">
     <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</span>
        <div className={`p-3 rounded-xl bg-slate-950 ${color}`}>
           <Icon size={20} />
        </div>
     </div>
     <h4 className="text-4xl font-black text-white">{value}</h4>
  </div>
);

const IntegrityItem = ({ label, status, value }) => (
  <div className="flex items-center justify-between">
     <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <div className="flex items-center gap-2">
           <div className={`w-1.5 h-1.5 rounded-full ${status === 'Secure' || status === 'Optimal' || status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
           <span className="text-xs font-black uppercase">{status}</span>
        </div>
     </div>
     <span className="text-[10px] font-black text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg uppercase tracking-widest">{value}</span>
  </div>
);

export default SecurityShield;
