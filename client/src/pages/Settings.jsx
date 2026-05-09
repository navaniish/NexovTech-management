import React, { useState, useEffect } from 'react';
import {
  User, Lock, Bell, Shield, Globe, Palette, Database, Cloud,
  ChevronRight, Save, UserPlus, Mail, Key, Briefcase, Trash2,
  CheckCircle2, AlertCircle, Loader2, RefreshCw, Crown, X,
  Plus, Users, ShieldCheck, CreditCard, Building2, Hash, 
  Smartphone, Search, Filter, Contact, Zap, ChevronDown,
  Settings as SettingsIcon,
  UserX, Monitor, Tablet, Smartphone as Phone, Eye, EyeOff
} from 'lucide-react';
import API_URL from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const ROLES = [
  { value: 'Developer',        label: 'Developer',        color: '#3b82f6' },
  { value: 'Editor',           label: 'Editor',           color: '#8b5cf6' },
  { value: 'AI Specialist',    label: 'AI Specialist',    color: '#f59e0b' },
  { value: 'Security Analyst', label: 'Security Analyst', color: '#ef4444' },
  { value: 'Manager',          label: 'Manager',          color: '#10b981' },
];

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.95 }}
    className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border"
    style={{
      background: type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
      borderColor: type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
      backdropFilter: 'blur(20px)',
      color: '#fff',
    }}
  >
    {type === 'success'
      ? <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
      : <AlertCircle size={18} className="text-rose-400 flex-shrink-0" />
    }
    <p className="text-[10px] font-black uppercase tracking-widest">{message}</p>
    <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
      <X size={14} />
    </button>
  </motion.div>
);

// ─── Settings ─────────────────────────────────────────────────────────────────
const Settings = () => {
  const { user, updateUser } = useAuth();
  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  const [activeTab, setActiveTab] = useState('profile'); 
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Profile State
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  // ─── Security States ────────────────────────────────────────────────────────
  const [activeSecuritySection, setActiveSecuritySection] = useState('password'); 
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);

  // 2FA State
  const [twoFactorModal, setTwoFactorModal] = useState(null); 
  const [twoFactorData, setTwoFactorData] = useState({ qrCode: '', secret: '', token: '' });
  const [backupCodes, setBackupCodes] = useState([]);

  // History State
  const [loginHistory, setLoginHistory] = useState([]);
  const [historyModal, setHistoryModal] = useState(false);

  // Admin Team State
  const [accessForm, setAccessForm] = useState({ 
    email: '', name: '', role: 'Developer', 
    tempPassword: '', 
    bankName: '', accountNumber: '', ifscCode: '', upiId: '' 
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (activeTab === 'security') fetchLoginHistory();
    if (activeTab === 'team') fetchTeam();
  }, [activeTab]);

  const fetchLoginHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/security/login-history/${user?._id || user?.id}`);
      if (res.ok) {
        const data = await res.json();
        setLoginHistory(data);
      }
    } catch (err) {
      console.error('History fetch failed');
    }
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/team-access?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        // De-duplicate members by email or ID
        const unique = (data || []).reduce((acc, curr) => {
          const email = curr.email?.toLowerCase();
          if (email && !acc.find(item => item.email?.toLowerCase() === email)) {
            acc.push({ ...curr, email });
          } else if (!email && !acc.find(item => (item.id === curr.id || item._id === curr._id))) {
            acc.push(curr);
          }
          return acc;
        }, []);
        setTeamMembers(unique);
      }
    } catch (err) {
      console.error('Roster fetch failed');
    }
  };

  const handleRegisterSpecialist = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/grant-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accessForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Specialist registered successfully');
        setAccessForm({ 
          email: '', name: '', role: 'Developer', 
          tempPassword: '', 
          bankName: '', accountNumber: '', ifscCode: '', upiId: '' 
        });
        fetchTeam(); // Refresh roster
      } else {
        showToast(data.message || 'Failed to grant access', 'error');
      }
    } catch {
      showToast('Deployment sync failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (id, name) => {
    if (!window.confirm(`Are you sure you want to revoke access for ${name}? This action is permanent.`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/revoke-access/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Access revoked successfully');
        fetchTeam();
      } else {
        showToast('Failed to revoke access', 'error');
      }
    } catch {
      showToast('Network disruption', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    updateUser({ name: profileForm.name, email: profileForm.email });
    showToast('Profile updated successfully', 'success');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) return showToast('Passwords do not match', 'error');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/security/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?._id || user?.id, currentPassword: passwordForm.current, newPassword: passwordForm.new }),
      });
      if (res.ok) {
        showToast('Password changed successfully');
        setPasswordForm({ current: '', new: '', confirm: '' });
      } else {
        const data = await res.json();
        showToast(data.message || 'Error changing password', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const start2FASetup = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/security/2fa/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?._id || user?.id }),
      });
      const data = await res.json();
      setTwoFactorData({ qrCode: data.qrCodeUrl, secret: data.secret, token: '' });
      setTwoFactorModal('setup');
    } catch {
      showToast('2FA service unavailable', 'error');
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/security/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?._id || user?.id, token: twoFactorData.token }),
      });
      const data = await res.json();
      if (res.ok) {
        setBackupCodes(data.backupCodes);
        setTwoFactorModal('success');
        updateUser({ twoFactorEnabled: true });
      } else {
        showToast(data.message, 'error');
      }
    } catch {
      showToast('Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    ...(isAdmin ? [
      { id: 'team', label: 'Access', icon: Crown }
    ] : []),
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-24 md:pb-12 px-1 md:px-0">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#020617]/40 p-4 md:p-8 rounded-[32px] md:rounded-[48px] border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-500 shadow-lg shadow-brand-500/10">
            <SettingsIcon size={28} />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black tracking-tight text-white leading-none">Settings</h1>
            <p className="mt-1.5 text-[10px] md:text-xs font-bold text-white/40 uppercase tracking-widest">Security & Account Configuration</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation */}
        <div className="lg:col-span-3">
          <div className="flex lg:flex-col gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl md:rounded-[32px] overflow-x-auto no-scrollbar lg:overflow-visible">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-sm transition-all whitespace-nowrap lg:w-full ${
                  activeTab === tab.id
                  ? 'bg-brand-600 text-white shadow-xl shadow-brand-600/20'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon size={18} className="md:size-20" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="theme-card rounded-[32px] p-4 md:p-8 min-h-[500px]"
            >
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-8">
                   {/* Profile UI (Existing but kept clean) */}
                   <div className="flex flex-col md:flex-row items-center gap-6 pb-8 border-b border-white/5">
                    <div className="relative group">
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-[32px] bg-brand-600 p-[3px] shadow-2xl shadow-brand-600/20 transition-transform">
                        <div className="w-full h-full rounded-[29px] overflow-hidden bg-[#020617]">
                          <img src={user?.avatar} alt="" className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <button className="absolute -bottom-2 -right-2 p-2 bg-brand-500 text-white rounded-xl shadow-xl hover:scale-110 transition-all"><RefreshCw size={14}/></button>
                    </div>
                    <div className="text-center md:text-left">
                      <h3 className="text-xl md:text-2xl font-black text-white">{user?.name}</h3>
                      <p className="text-brand-400 font-black uppercase tracking-widest text-[10px] mt-1">{user?.role}</p>
                    </div>
                  </div>
                  <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Full Name</label>
                      <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-brand-500/20" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Email Address</label>
                      <input type="email" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-brand-500/20" />
                    </div>
                    <button type="submit" className="md:col-span-2 px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-brand-500 transition-all">Save Changes</button>
                  </form>
                </div>
              )}

              {/* Security Tab - FULL FEATURED */}
              {activeTab === 'security' && (
                <div className="space-y-12">
                  {/* Security Suite Header */}
                  <div className="pb-6 border-b border-white/5">
                    <h3 className="text-2xl font-black text-white tracking-tight">Security Suite</h3>
                    <p className="text-xs text-white/30 font-bold uppercase tracking-widest mt-1">ACCESS & IDENTITY MANAGEMENT</p>
                  </div>

                  {/* Feature Cards */}
                  <div className="grid grid-cols-1 gap-6">
                    {/* Password Card */}
                    <motion.div 
                      layout
                      onClick={() => setActiveSecuritySection(activeSecuritySection === 'password' ? null : 'password')}
                      className={`p-6 md:p-8 rounded-[32px] bg-white/[0.02] border transition-all relative overflow-hidden cursor-pointer ${activeSecuritySection === 'password' ? 'border-brand-500/30' : 'border-white/5 hover:bg-white/[0.03]'}`}
                    >
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-[#1e1b4b] flex items-center justify-center text-brand-400"><Key size={24} /></div>
                            <div>
                               <p className="font-black text-lg text-white">Change Password</p>
                               <p className="text-xs text-white/40 font-bold mt-1">Regularly updating your password enhances protection.</p>
                            </div>
                          </div>
                          <ChevronDown size={20} className={`text-white/20 transition-transform duration-500 ${activeSecuritySection === 'password' ? 'rotate-180' : ''}`} />
                       </div>
                       
                       <AnimatePresence>
                         {activeSecuritySection === 'password' && (
                           <motion.div 
                             initial={{ height: 0, opacity: 0 }}
                             animate={{ height: 'auto', opacity: 1 }}
                             exit={{ height: 0, opacity: 0 }}
                             onClick={(e) => e.stopPropagation()}
                             className="overflow-hidden"
                           >
                             <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mt-8 pt-8 border-t border-white/5">
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black uppercase text-white/20 ml-1">Current Auth Key</label>
                                  <input required type={showPass ? 'text' : 'password'} value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                                    className="w-full px-5 py-3.5 rounded-xl bg-black/40 border border-white/5 text-white text-xs outline-none focus:ring-1 focus:ring-brand-500/20" />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black uppercase text-white/20 ml-1">New Deployment Key</label>
                                  <input required type={showPass ? 'text' : 'password'} value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                                    className="w-full px-5 py-3.5 rounded-xl bg-black/40 border border-white/5 text-white text-xs outline-none focus:ring-1 focus:ring-brand-500/20" />
                                </div>
                                <button type="submit" disabled={loading} className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all">
                                  {loading ? <Loader2 className="animate-spin mx-auto" size={16}/> : 'Sync New Key'}
                                </button>
                             </form>
                           </motion.div>
                         )}
                       </AnimatePresence>
                    </motion.div>

                    {/* 2FA Card */}
                    <motion.div 
                      layout
                      onClick={() => setActiveSecuritySection(activeSecuritySection === '2fa' ? null : '2fa')}
                      className={`p-6 md:p-8 rounded-[32px] bg-white/[0.02] border transition-all cursor-pointer ${activeSecuritySection === '2fa' ? 'border-brand-500/30' : 'border-white/5 hover:bg-white/[0.03]'}`}
                    >
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-[#1e1b4b] flex items-center justify-center text-brand-400"><Shield size={24} /></div>
                            <div>
                               <div className="flex items-center gap-3">
                                 <p className="font-black text-lg text-white">Two-Factor Auth</p>
                                 <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase rounded-md border border-emerald-500/20">Recommended</span>
                               </div>
                               <p className="text-xs text-white/40 font-bold mt-1">Multi-factor identity verification via TOTP.</p>
                            </div>
                          </div>
                          <ChevronDown size={20} className={`text-white/20 transition-transform duration-500 ${activeSecuritySection === '2fa' ? 'rotate-180' : ''}`} />
                       </div>

                       <AnimatePresence>
                         {activeSecuritySection === '2fa' && (
                           <motion.div 
                             initial={{ height: 0, opacity: 0 }}
                             animate={{ height: 'auto', opacity: 1 }}
                             exit={{ height: 0, opacity: 0 }}
                             onClick={(e) => e.stopPropagation()}
                             className="overflow-hidden"
                           >
                             <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                   <p className="text-xs font-black text-white/40 uppercase tracking-widest">Operational Status</p>
                                   <p className={`text-sm font-bold mt-1 ${user?.twoFactorEnabled ? 'text-emerald-500' : 'text-rose-500'}`}>
                                      {user?.twoFactorEnabled ? 'SHIELD_ACTIVE' : 'IDENTITY_UNPROTECTED'}
                                   </p>
                                </div>
                                {user?.twoFactorEnabled ? (
                                  <button onClick={() => setTwoFactorModal('disable')} className="w-full sm:w-auto px-10 py-3 bg-rose-500/10 text-rose-500 rounded-2xl text-[10px] font-black uppercase border border-rose-500/20">Disable Security</button>
                                ) : (
                                  <button onClick={start2FASetup} className="w-full sm:w-auto px-10 py-3 bg-brand-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-brand-500/20">Initialize Sync</button>
                                )}
                             </div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                    </motion.div>

                    {/* Login History Preview */}
                    <motion.div 
                      layout
                      onClick={() => setActiveSecuritySection(activeSecuritySection === 'history' ? null : 'history')}
                      className={`p-6 md:p-8 rounded-[32px] bg-white/[0.02] border transition-all cursor-pointer ${activeSecuritySection === 'history' ? 'border-brand-500/30' : 'border-white/5 hover:bg-white/[0.03]'}`}
                    >
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-[#1e1b4b] flex items-center justify-center text-brand-400"><Globe size={24} /></div>
                            <div>
                               <p className="font-black text-lg text-white">Login History</p>
                               <p className="text-xs text-white/40 font-bold mt-1">Review active and historical sessions.</p>
                            </div>
                          </div>
                          <ChevronDown size={20} className={`text-white/20 transition-transform duration-500 ${activeSecuritySection === 'history' ? 'rotate-180' : ''}`} />
                       </div>
                       
                       <AnimatePresence>
                         {activeSecuritySection === 'history' && (
                           <motion.div 
                             initial={{ height: 0, opacity: 0 }}
                             animate={{ height: 'auto', opacity: 1 }}
                             exit={{ height: 0, opacity: 0 }}
                             onClick={(e) => e.stopPropagation()}
                             className="overflow-hidden"
                           >
                             <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                   <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Recent Activity Log</p>
                                   <button onClick={() => setHistoryModal(true)} className="text-[10px] font-black text-brand-500 hover:text-brand-400 uppercase tracking-widest">Open Full Dossier</button>
                                </div>
                                <div className="space-y-3">
                                   {loginHistory.slice(0, 3).map((h, i) => (
                                     <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5">
                                        <div className="flex items-center gap-3">
                                           {h.device?.toLowerCase().includes('phone') ? <Phone size={14} className="text-white/20"/> : <Monitor size={14} className="text-white/20"/>}
                                           <div>
                                              <p className="text-[10px] font-black text-white">{h.browser} on {h.os}</p>
                                              <p className="text-[8px] font-bold text-white/20">{new Date(h.timestamp).toLocaleString()}</p>
                                           </div>
                                        </div>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${h.loginStatus === 'Success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{h.loginStatus}</span>
                                     </div>
                                   ))}
                                </div>
                             </div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                    </motion.div>
                  </div>
                </div>
              )}

              {/* Access (Team) Tab */}
              {activeTab === 'team' && (
                <div className="space-y-8 md:space-y-12">
                  {/* Registration Form */}
                  <div className="p-6 md:p-12 rounded-[32px] md:rounded-[40px] bg-white/[0.02] border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 hidden md:block">
                       <UserPlus size={120} />
                    </div>
                    
                    <div className="relative z-10">
                       <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">Register New Specialist</h3>
                       <p className="text-[10px] md:text-xs text-white/30 font-bold uppercase tracking-widest mt-2">Initialize secure workspace credentials and financial synchronization.</p>
                       
                       <form className="mt-8 md:mt-12 space-y-8 md:space-y-10" onSubmit={handleRegisterSpecialist}>
                          {/* Identity & Credentials */}
                          <div className="space-y-4 md:space-y-6">
                             <p className="text-[9px] md:text-[10px] font-black text-brand-500 uppercase tracking-[0.2em]">Identity & Credentials</p>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                <div className="relative">
                                   <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                   <input value={accessForm.name} onChange={e => setAccessForm({...accessForm, name: e.target.value})}
                                     type="text" placeholder="Full Name" className="w-full pl-11 pr-4 py-3.5 md:py-4 bg-black/40 border border-white/5 rounded-xl md:rounded-2xl text-xs md:text-sm text-white outline-none focus:ring-1 focus:ring-brand-500/20" />
                                </div>
                                <div className="relative">
                                   <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                   <input value={accessForm.email} onChange={e => setAccessForm({...accessForm, email: e.target.value})}
                                     type="email" placeholder="gmail@gmail.com" className="w-full pl-11 pr-4 py-3.5 md:py-4 bg-black/40 border border-white/5 rounded-xl md:rounded-2xl text-xs md:text-sm text-white outline-none focus:ring-1 focus:ring-brand-500/20" />
                                </div>
                             </div>
                          </div>

                          {/* Role Selection */}
                          <div className="space-y-4 md:space-y-6">
                             <p className="text-[9px] md:text-[10px] font-black text-brand-500 uppercase tracking-[0.2em]">Assign Operational Role</p>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                                {ROLES.map(role => (
                                  <button 
                                    key={role.value}
                                    type="button"
                                    onClick={() => setAccessForm({...accessForm, role: role.value})}
                                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all flex flex-col items-center gap-2 md:gap-3 ${accessForm.role === role.value ? 'bg-brand-500/10 border-brand-500/50 shadow-lg shadow-brand-500/10' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'}`}
                                  >
                                    <Zap size={14} className="md:size-16" style={{ color: role.color }} />
                                    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/60">{role.label}</span>
                                  </button>
                                ))}
                             </div>
                          </div>

                          {/* Admin Access */}
                          <div className="space-y-4 md:space-y-6">
                             <div className="flex items-center gap-2">
                                <ShieldCheck size={12} className="text-brand-500" />
                                <p className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Administrative Access</p>
                             </div>
                             <div className="relative">
                                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                <input value={accessForm.tempPassword} onChange={e => setAccessForm({...accessForm, tempPassword: e.target.value})}
                                  type="password" placeholder="Initial Workspace Password" className="w-full pl-11 pr-4 py-3.5 md:py-4 bg-black/40 border border-white/5 rounded-xl md:rounded-2xl text-xs md:text-sm text-white outline-none focus:ring-1 focus:ring-brand-500/20" />
                             </div>
                          </div>

                          {/* Financial Details */}
                          <div className="space-y-4 md:space-y-6">
                             <p className="text-[9px] md:text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Financial Roster Details</p>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                <div className="relative">
                                   <Building2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                   <input value={accessForm.bankName} onChange={e => setAccessForm({...accessForm, bankName: e.target.value})}
                                     type="text" placeholder="Bank Name" className="w-full pl-11 pr-4 py-3.5 md:py-4 bg-black/40 border border-white/5 rounded-xl md:rounded-2xl text-xs md:text-sm text-white outline-none focus:ring-1 focus:ring-brand-500/20" />
                                </div>
                                <div className="relative">
                                   <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                   <input value={accessForm.accountNumber} onChange={e => setAccessForm({...accessForm, accountNumber: e.target.value})}
                                     type="text" placeholder="Account Number" className="w-full pl-11 pr-4 py-3.5 md:py-4 bg-black/40 border border-white/5 rounded-xl md:rounded-2xl text-xs md:text-sm text-white outline-none focus:ring-1 focus:ring-brand-500/20" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 md:col-span-2">
                                  <input value={accessForm.ifscCode} onChange={e => setAccessForm({...accessForm, ifscCode: e.target.value})}
                                    type="text" placeholder="IFSC Code" className="w-full px-5 py-3.5 md:py-4 bg-black/40 border border-white/5 rounded-xl md:rounded-2xl text-xs md:text-sm text-white outline-none focus:ring-1 focus:ring-brand-500/20" />
                                  <input value={accessForm.upiId} onChange={e => setAccessForm({...accessForm, upiId: e.target.value})}
                                    type="text" placeholder="UPI ID (e.g. name@bank)" className="w-full px-5 py-3.5 md:py-4 bg-black/40 border border-white/5 rounded-xl md:rounded-2xl text-xs md:text-sm text-white outline-none focus:ring-1 focus:ring-brand-500/20" />
                                </div>
                             </div>
                          </div>

                          <button type="submit" disabled={loading} className="w-full py-4 md:py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl md:rounded-[24px] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] shadow-2xl shadow-brand-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                             {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={16} md:size={18} />}
                             {loading ? 'Initializing Sync...' : 'Complete Registration'}
                          </button>
                       </form>
                    </div>
                  </div>

                  {/* Team Roster */}
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex items-center justify-between px-2">
                       <p className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Team Roster</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                       {teamMembers.map(member => (
                         <div key={member.id || member._id} className="p-4 md:p-6 rounded-2xl md:rounded-[28px] bg-white/[0.02] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-brand-500/30 transition-all relative overflow-hidden">
                            <div className="flex items-center gap-3 md:gap-4 relative z-10">
                               <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-tr from-brand-600 to-neon-blue p-[1.5px] md:p-[2px] shadow-lg">
                                  <div className="w-full h-full rounded-[7px] md:rounded-[10px] bg-[#020617] overflow-hidden">
                                     <img src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} alt="" className="w-full h-full object-cover" />
                                  </div>
                               </div>
                               <div className="min-w-0">
                                  <p className="font-black text-white text-xs md:text-sm tracking-tight truncate">{member.name}</p>
                                  <p className="text-[8px] md:text-[10px] font-bold text-white/20 uppercase tracking-widest truncate">{member.email}</p>
                               </div>
                            </div>
                            
                            <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4 relative z-10">
                               <div className="flex flex-col items-start md:items-end">
                                  <span className="px-2 md:px-3 py-1 bg-white/5 rounded-lg text-[8px] md:text-[9px] font-black uppercase text-white/40 tracking-widest border border-white/5">{member.role}</span>
                               </div>
                               <div className="flex items-center gap-2">
                                  <button className="p-2.5 md:p-3 bg-white/5 rounded-lg md:rounded-xl text-white/20 hover:text-brand-400 transition-all">
                                     <CreditCard size={14} md:size={16} />
                                  </button>
                                  <button onClick={() => handleRevokeAccess(member.id || member._id, member.name)} className="p-2.5 md:p-3 bg-white/5 rounded-lg md:rounded-xl text-rose-500/50 hover:bg-rose-500 hover:text-white transition-all">
                                     <Trash2 size={14} md:size={16} />
                                  </button>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 2FA SETUP MODAL */}
      <AnimatePresence>
        {twoFactorModal === 'setup' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTwoFactorModal(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-[#020617] border border-white/10 rounded-[40px] p-8 shadow-2xl overflow-hidden"
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-brand-500/10 rounded-3xl flex items-center justify-center text-brand-500 mx-auto border border-brand-500/20 shadow-2xl">
                   <Shield size={32} />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-white">Secure Identity Sync</h3>
                   <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-black">Scanning Operational QR</p>
                </div>

                <div className="p-4 bg-white rounded-[32px] w-56 h-56 mx-auto shadow-inner">
                   <img src={twoFactorData.qrCode} className="w-full h-full" alt="QR" />
                </div>

                <div className="space-y-4">
                   <p className="text-[10px] text-white/30 font-bold px-8">Enter the 6-digit verification code generated by your authenticator app to authorize deployment.</p>
                   <input value={twoFactorData.token} onChange={e => setTwoFactorData({ ...twoFactorData, token: e.target.value })}
                     placeholder="0 0 0 0 0 0" className="w-full text-center py-4 bg-black/40 border border-white/5 rounded-2xl text-2xl font-black tracking-[0.5em] text-brand-400 outline-none focus:ring-2 focus:ring-brand-500/20" />
                   
                   <button onClick={verify2FA} disabled={loading || twoFactorData.token.length < 6}
                     className="w-full py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all disabled:opacity-20">
                     {loading ? <Loader2 className="animate-spin mx-auto" size={20}/> : 'Finalize Sync'}
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {twoFactorModal === 'success' && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-emerald-500/10 backdrop-blur-xl" />
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md bg-[#020617] border border-emerald-500/20 rounded-[40px] p-8 text-center shadow-2xl">
                <CheckCircle2 size={64} className="text-emerald-500 mx-auto mb-6" />
                <h3 className="text-2xl font-black text-white">2FA Shield Active</h3>
                <p className="text-xs text-white/40 mt-2">Authentication hardening completed. Store these backup codes securely.</p>
                
                <div className="my-8 grid grid-cols-1 gap-2">
                   {backupCodes.map((code, i) => (
                     <div key={i} className="py-2 bg-white/5 border border-white/5 rounded-xl font-mono text-brand-400 text-sm tracking-widest">{code}</div>
                   ))}
                </div>
                
                <button onClick={() => setTwoFactorModal(null)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Acknowledge</button>
             </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Login History Modal */}
      <AnimatePresence>
        {historyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHistoryModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              className="relative w-full max-w-4xl bg-[#020617] border border-white/10 rounded-[40px] p-8 shadow-2xl max-h-[80vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-2xl font-black text-white">Operational Log</h3>
                    <p className="text-xs text-white/30 font-bold mt-1">REAL-TIME AUTHENTICATION AUDIT</p>
                 </div>
                 <button onClick={() => setHistoryModal(false)} className="p-3 bg-white/5 rounded-2xl text-white/20 hover:text-white transition-all"><X size={24}/></button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="py-4 text-[10px] font-black uppercase text-white/20 tracking-widest">Device / Session</th>
                      <th className="py-4 text-[10px] font-black uppercase text-white/20 tracking-widest">IP Address</th>
                      <th className="py-4 text-[10px] font-black uppercase text-white/20 tracking-widest">Location</th>
                      <th className="py-4 text-[10px] font-black uppercase text-white/20 tracking-widest text-right">Status / Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loginHistory.map((h, i) => (
                      <tr key={i} className="group hover:bg-white/[0.01] transition-all">
                        <td className="py-6">
                           <div className="flex items-center gap-4">
                              <div className="p-3 bg-brand-500/10 rounded-xl text-brand-400">
                                 {h.device.toLowerCase().includes('phone') ? <Phone size={18}/> : <Monitor size={18}/>}
                              </div>
                              <div>
                                 <p className="text-sm font-black text-white">{h.browser}</p>
                                 <p className="text-[10px] font-bold text-white/30">{h.os}</p>
                              </div>
                           </div>
                        </td>
                        <td className="py-6 font-mono text-xs text-white/40">{h.ipAddress}</td>
                        <td className="py-6">
                           <div className="flex items-center gap-2">
                              <Globe size={12} className="text-brand-500" />
                              <span className="text-xs font-bold text-white/60">{h.location}</span>
                           </div>
                        </td>
                        <td className="py-6 text-right">
                           <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${h.loginStatus === 'Success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                             {h.loginStatus}
                           </span>
                           <p className="text-[10px] font-bold text-white/20 mt-1.5">{new Date(h.timestamp).toLocaleString()}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
