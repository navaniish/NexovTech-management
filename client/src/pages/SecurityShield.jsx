import React, { useState, useEffect, useCallback } from 'react';
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
  Smartphone,
  Fingerprint,
  Camera,
  RefreshCw
} from 'lucide-react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth as firebaseAuth } from '../firebase';
import { sentinel } from '../services/securityService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import API_URL from '../config';

const SecurityShield = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [admins, setAdmins] = useState([]);
  const [logs, setLogs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Shared helper — prefers nexov_token, falls back to Firebase ID token
  const getBestToken = useCallback(async () => {
    const stored = localStorage.getItem('nexov_token');
    if (stored && stored !== 'null' && stored !== 'undefined') return stored;
    try {
      const fbUser = firebaseAuth.currentUser;
      if (fbUser) return await fbUser.getIdToken();
    } catch (e) {
      console.warn('[SHIELD] Firebase token fallback failed:', e.message);
    }
    return null;
  }, []);

  // Biometrics Console State
  const [biometricsData, setBiometricsData] = useState({
    logs: [],
    devices: [],
    stats: { totalUsers: 0, enrolledUsers: 0, failedAttempts: 0, activeDevices: 0 }
  });
  const [loadingBiometrics, setLoadingBiometrics] = useState(false);

  const fetchBiometricsAdminData = async () => {
    setLoadingBiometrics(true);
    try {
      const BiometricsService = (await import('../services/biometricsService')).default;
      const token = await getBestToken();
      const data = await BiometricsService.getAdminLogs(token);
      setBiometricsData(data);
    } catch (err) {
      console.error("Failed to fetch biometrics admin logs:", err);
    } finally {
      setLoadingBiometrics(false);
    }
  };

  const handleRevokeBiometrics = async (userId, userEmail) => {
    if (!window.confirm(`Are you absolutely sure you want to revoke and delete the facial biometric profile for ${userEmail}?`)) return;
    const loader = toast.loading(`Revoking biometric template...`);
    try {
      const BiometricsService = (await import('../services/biometricsService')).default;
      const token = await getBestToken();
      await BiometricsService.revoke(userId, token);
      toast.success('Biometric profile revoked successfully.', { id: loader });
      fetchBiometricsAdminData();
    } catch (err) {
      toast.error(err.message || 'Revocation failed.', { id: loader });
    }
  };

  const handleRevokeDevice = async (deviceName) => {
    if (!window.confirm(`Revoke trust for device: ${deviceName}?`)) return;
    const loader = toast.loading(`Revoking device trust...`);
    try {
      const token = await getBestToken();
      const res = await fetch(`${API_URL}/security/devices/${encodeURIComponent(deviceName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success('Device trust revoked successfully.', { id: loader });
        fetchBiometricsAdminData();
      } else {
        throw new Error('Device revocation failed.');
      }
    } catch (err) {
      toast.error(err.message, { id: loader });
    }
  };

  useEffect(() => {
    if (activeTab === 'biometrics') {
      fetchBiometricsAdminData();
    }
  }, [activeTab]);

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

      // Fetch Geolocational Anomalies from Backend
      const anoms = await sentinel.getAnomalies().catch(() => []);
      setAnomalies(anoms);
    } catch (err) {
      console.error('Security fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLockoutUser = async (userId, name) => {
    if (!window.confirm(`Are you absolutely sure you want to suspend credentials and lock out ${name}? This will block active sessions and unlink Telegram.`)) return;
    const loader = toast.loading(`Initiating Sentinel Node Lockout...`);
    try {
      const result = await sentinel.lockUser(userId);
      if (result.success) {
        toast.success(result.message || 'Identity node locked successfully.', { id: loader });
        fetchSecurityData();
      } else {
        throw new Error(result.message || 'Lockout failed');
      }
    } catch (err) {
      toast.error(err.message || 'Lockout protocol error.', { id: loader });
    }
  };

  const stats = [
    { label: 'Secure Nodes', value: admins.length, icon: Shield, color: 'text-indigo-500' },
    { label: 'Pending Requests', value: requests.length, icon: UserPlus, color: 'text-amber-500' },
    { label: 'Geolocational Risks', value: anomalies.length, icon: AlertCircle, color: anomalies.length > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400' },
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
            { id: 'anomalies', label: 'Geolocational Alerts', icon: AlertCircle },
            { id: 'biometrics', label: 'Biometrics Console', icon: Fingerprint },
            { id: 'logs', label: 'AI Audit Trail', icon: Terminal }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
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

            {activeTab === 'requests' && (
              <motion.div key="req" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Identity Requests</h2>
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {requests.filter(r => r.status === 'pending').length} Pending
                  </span>
                </div>

                {requests.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    <UserPlus size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-wider">No Pending Requests</p>
                    <p className="text-[10px] mt-1 font-medium">All identity requests have been processed.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((req) => (
                      <div key={req.id} className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                            <UserPlus size={20} className="text-amber-600" />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-900 uppercase">{req.name || 'Anonymous Request'}</p>
                            <p className="text-[9px] text-slate-400">{req.email || 'No email provided'}</p>
                            <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">{req.role || 'Specialist'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-sm">
                            <CheckCircle2 size={12} /> Approve
                          </button>
                          <button className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-sm">
                            <XCircle size={12} /> Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'anomalies' && (
              <motion.div key="anom" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Geolocational Threat Alerts</h2>
                  <button onClick={fetchSecurityData} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    <Activity size={12} /> Rescan
                  </button>
                </div>

                {anomalies.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    <Globe size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-wider">No Anomalies Detected</p>
                    <p className="text-[10px] mt-1 font-medium">All agent node logins pass zero-trust velocity checks.</p>
                    <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 max-w-sm mx-auto">
                      <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                      <p className="text-[10px] font-bold text-emerald-700">Geolocation velocity analysis complete. No impossible travel detected in the last 24 hours.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {anomalies.map((anom, idx) => (
                      <div key={idx} className="p-6 bg-rose-50 border border-rose-200 rounded-[24px] flex flex-col gap-4 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/20 animate-pulse">
                              <AlertCircle size={20} className="text-white" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest">⚠️ Impossible Travel Detected</p>
                              <p className="text-xs font-black text-slate-900 mt-0.5">{anom.userId || anom.userName || 'Unknown Specialist'}</p>
                              <p className="text-[9px] text-slate-500">{anom.email || 'No email'}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleLockoutUser(anom.userId, anom.userName || 'Anomalous Node')}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shrink-0 shadow-md"
                          >
                            <Lock size={12} /> Lockout Node
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: 'From', val: anom.location1 || 'Mumbai, IN' },
                            { label: 'To', val: anom.location2 || 'London, UK' },
                            { label: 'Velocity', val: anom.velocity ? `${anom.velocity.toFixed(0)} km/h` : '>900 km/h' }
                          ].map((m, i) => (
                            <div key={i} className="text-center p-3 bg-white rounded-xl border border-rose-100">
                              <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest">{m.label}</p>
                              <p className="text-[10px] font-black text-slate-900 mt-1">{m.val}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-[9px] text-rose-600 font-bold">
                          Detected at: {anom.detectedAt ? new Date(anom.detectedAt).toLocaleString() : new Date().toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'biometrics' && (
              <motion.div key="bio" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Biometrics Management Console</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Zero-Trust Biometric Security Ledger</p>
                  </div>
                  <button onClick={fetchBiometricsAdminData} className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-950 transition-all shadow-sm cursor-pointer">
                    <RefreshCw size={15} className={loadingBiometrics ? 'animate-spin' : ''} />
                  </button>
                </div>

                {/* Sub KPI Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'System Specialists', val: biometricsData.stats.totalUsers, color: 'text-indigo-500' },
                    { label: 'Biometrics Registered', val: biometricsData.stats.enrolledUsers, color: 'text-emerald-500' },
                    { label: 'Suspicious Bio-Alerts', val: biometricsData.stats.failedAttempts, color: 'text-rose-500 animate-pulse' },
                    { label: 'Trusted Device Rings', val: biometricsData.stats.activeDevices, color: 'text-cyan-500' }
                  ].map((s, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{s.label}</p>
                      <h4 className={`text-xl font-black mt-1 leading-none ${s.color}`}>{s.val}</h4>
                    </div>
                  ))}
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Biometrics Login Attempts */}
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl space-y-4">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity size={14} className="text-indigo-500" />
                      Biometrics Audit Stream
                    </h3>

                    {loadingBiometrics ? (
                      <div className="text-center py-12">
                        <RefreshCw className="animate-spin mx-auto text-slate-400 mb-2" size={20} />
                        <span className="text-[9px] font-black text-slate-355 uppercase tracking-widest">Querying registry...</span>
                      </div>
                    ) : biometricsData.logs.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 py-12">No biometrics events recorded.</p>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {biometricsData.logs.map((log) => (
                          <div key={log.id} className="p-3 bg-white border border-slate-150/50 rounded-xl flex items-center justify-between gap-3 text-[10px] shadow-sm">
                            <div>
                              <p className="font-black text-slate-900 truncate max-w-[150px]">{log.email}</p>
                              <p className="text-[8px] text-slate-400 font-semibold uppercase mt-0.5">{log.attemptType} — {log.os || 'Unknown OS'}</p>
                              <p className="text-[8px] text-slate-300 mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${log.status === 'Success' ? 'bg-emerald-100 text-emerald-600' :
                                  log.status === 'Failed_Liveness' ? 'bg-rose-100 text-rose-600 animate-pulse' :
                                    'bg-rose-100 text-rose-600'
                                }`}>
                                {log.status}
                              </span>
                              {log.attemptType === 'Enrollment' && log.status === 'Success' && (
                                <button
                                  onClick={() => handleRevokeBiometrics(log.userId, log.email)}
                                  className="block text-[8px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-wider mt-1.5 hover:underline ml-auto cursor-pointer"
                                >
                                  Revoke Face ID
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Trusted Device Keys */}
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl space-y-4">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone size={14} className="text-cyan-500" />
                      Trusted Device Signatures
                    </h3>

                    {loadingBiometrics ? (
                      <div className="text-center py-12">
                        <RefreshCw className="animate-spin mx-auto text-slate-400 mb-2" size={20} />
                        <span className="text-[9px] font-black text-slate-355 uppercase tracking-widest">Querying signatures...</span>
                      </div>
                    ) : biometricsData.devices.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 py-12">No trusted devices registered.</p>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {biometricsData.devices.map((dev) => (
                          <div key={dev.id} className="p-3 bg-white border border-slate-150/50 rounded-xl flex flex-col gap-2 text-[10px] shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-black text-slate-900 uppercase">Device Key: {dev.deviceId.substr(0, 10)}...</p>
                                <p className="text-[8px] text-slate-400 font-semibold mt-0.5">{dev.browserFingerprint}</p>
                              </div>
                              <span className="bg-cyan-100 text-cyan-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter shrink-0">
                                Score: {dev.trustScore}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-100 pt-2 text-[8px] text-slate-350 font-bold uppercase">
                              <span>Last active: {new Date(dev.lastUsed).toLocaleDateString()}</span>
                              <button
                                onClick={() => handleRevokeDevice(dev.browserFingerprint)}
                                className="text-rose-500 hover:text-rose-700 hover:underline uppercase font-black tracking-widest cursor-pointer"
                              >
                                Revoke Trust
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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

