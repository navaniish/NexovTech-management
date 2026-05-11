import React, { useState, useEffect } from 'react';
import {
  User, Lock, Shield, Globe, Mail, Key, Trash2,
  CheckCircle2, AlertCircle, Loader2, RefreshCw, Crown, X,
  ShieldCheck, Contact, Zap,
  Settings as SettingsIcon,
  UserX, Monitor, Smartphone as Phone, UserPlus, Cpu,
  LogOut, Activity, Fingerprint, Cog, Terminal,
  ChevronRight, ArrowRight, ShieldAlert,
  Camera, Briefcase, ExternalLink, Rocket,
  CreditCard, Landmark, Hash, Smartphone
} from 'lucide-react';
import API_URL from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { value: 'Developer', label: 'Developer', color: '#3b82f6' },
  { value: 'Editor', label: 'Editor', color: '#8b5cf6' },
  { value: 'AI Specialist', label: 'AI Specialist', color: '#f59e0b' },
  { value: 'Security Analyst', label: 'Security Analyst', color: '#ef4444' },
  { value: 'Manager', label: 'Manager', color: '#10b981' },
];

const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  const [activeTab, setActiveTab] = useState('profile');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Profile State
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.companyEmail || user?.email || '' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  // Security States
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  // 2FA State
  const [twoFactorModal, setTwoFactorModal] = useState(null);
  const [twoFactorData, setTwoFactorData] = useState({ qrCode: '', secret: '', token: '' });
  const [backupCodes, setBackupCodes] = useState([]);

  // Admin Team State
  const [accessForm, setAccessForm] = useState({
    email: '', name: '', role: 'Developer',
    tempPassword: '', phoneNo: '',
    bankName: '', accountNumber: '', ifscCode: '', upiId: ''
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (activeTab === 'team') fetchTeam();
  }, [activeTab]);

  const fetchTeam = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/team-access?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
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
          tempPassword: '', phoneNo: '',
          bankName: '', accountNumber: '', ifscCode: '', upiId: ''
        });
        fetchTeam();
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
    if (!window.confirm(`Are you sure you want to revoke access for ${name}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/revoke-access/${id}`, { method: 'DELETE' });
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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await fetch(`${API_URL}/auth/upload-avatar/${user?._id || user?.id}`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        updateUser({ avatar: data.avatar });
        showToast('Profile photo updated', 'success');
      } else {
        showToast('Upload failed', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    updateUser({ name: profileForm.name, email: profileForm.email });
    showToast('Profile updated', 'success');
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
        showToast('Password updated');
        setPasswordForm({ current: '', new: '', confirm: '' });
      } else {
        const data = await res.json();
        showToast(data.message || 'Update failed', 'error');
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
      showToast('2FA service down', 'error');
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
      showToast('Verification error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Identity', icon: User, color: 'text-brand-500' },
    { id: 'security', label: 'Security', icon: Shield, color: 'text-amber-500' },
    ...(isAdmin ? [{ id: 'team', label: 'Team Access', icon: Crown, color: 'text-indigo-500' }] : []),
  ];

  return (
    <div className="w-full flex flex-col space-y-6 animate-in fade-in duration-1000 overflow-y-auto custom-scrollbar">
      
      {/* 1. HIGH-FIDELITY OFFICE HEADER */}
      <section className="relative w-full overflow-hidden rounded-[24px] md:rounded-[40px] bg-white shadow-2xl border border-white flex flex-col min-h-[180px] md:min-h-[220px] group mb-6">
         {/* Background Image Layer */}
         <div 
           className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
           style={{ backgroundImage: "url('/assets/office-bg.png')" }}
         />
         {/* Glass Overlay */}
         <div className="absolute inset-0 bg-white/70 backdrop-blur-[4px]" />
         
         <div className="relative z-10 flex-1 p-6 md:p-12 flex flex-col justify-center">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
               <div className="space-y-2">
                  <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none flex items-center gap-3">
                     Command Interface <span className="animate-bounce-slow">⚙️</span>
                  </h1>
                  <p className="text-slate-500 text-[13px] md:text-[15px] font-medium">
                     Manage your operational protocols and security nodes.
                  </p>
               </div>

               <button 
                 onClick={() => window.confirm('Terminate secure session and return to gateway?') && logout()}
                 className="px-6 md:px-8 py-3.5 md:py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] shadow-2xl hover:bg-rose-600 transition-all group/btn"
               >
                  <span className="flex items-center justify-center gap-3">
                     <LogOut size={16} className="group-hover/btn:-translate-x-1 transition-transform" />
                     Terminate Session
                  </span>
               </button>
            </div>
         </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* 2. SLIM NAVIGATION */}
        <div className="lg:col-span-3 space-y-4">
           <div className="flex lg:flex-col gap-2 p-2 bg-white/40 border border-slate-100 rounded-[32px] shadow-lg backdrop-blur-xl">
             {tabs.map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`flex items-center gap-4 px-6 h-12 rounded-2xl font-black text-[10px] transition-all uppercase tracking-widest lg:w-full group ${
                     activeTab === tab.id
                     ? 'bg-slate-900 text-white shadow-xl translate-x-1'
                     : 'text-slate-400 hover:text-slate-900 hover:bg-white'
                   }`}
               >
                 <tab.icon size={16} className={activeTab === tab.id ? 'text-brand-400' : `${tab.color} opacity-40 group-hover:opacity-100`} />
                 {tab.label}
               </button>
             ))}
           </div>
           
           <div className="hidden lg:block glass-card rounded-[32px] border-slate-100 bg-gradient-to-br from-indigo-50/30 to-white/30 !p-6">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white mb-4 shadow-md">
                 <Terminal size={20} />
              </div>
              <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1.5">Audit Registry</h4>
              <p className="text-[10px] font-medium text-slate-500 leading-relaxed italic opacity-70">"Modifications are indexed in the secure enterprise ledger."</p>
           </div>
        </div>

        {/* 3. CORE CONTENT */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card !p-6 md:!p-10 min-h-[500px] md:min-h-[600px] border-slate-100 rounded-[32px] md:rounded-[40px] shadow-2xl shadow-slate-200/50"
            >
              {activeTab === 'profile' && (
                <div className="space-y-12">
                   <div className="flex flex-col md:flex-row items-center gap-8 pb-10 border-b border-slate-50">
                      <div className="relative group">
                         <div className="w-32 h-32 md:w-36 md:h-36 rounded-[36px] bg-white p-1 shadow-xl relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                            <div className="w-full h-full rounded-[32px] overflow-hidden bg-slate-50 flex items-center justify-center">
                               {uploading ? (
                                 <Loader2 className="animate-spin text-brand-500" size={32} />
                               ) : (
                                 <img 
                                   src={user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} 
                                   alt="Avatar" 
                                   className="w-full h-full object-cover" 
                                 />
                               )}
                            </div>
                         </div>
                         <button 
                           onClick={() => fileInputRef.current.click()}
                           className="absolute -bottom-2 -right-2 w-11 h-11 bg-slate-900 text-white rounded-xl shadow-xl flex items-center justify-center hover:bg-brand-600 transition-all active:scale-90 duration-300"
                         >
                            <Camera size={18} />
                         </button>
                         <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                      </div>
                      <div className="text-center md:text-left space-y-3">
                         <div className="space-y-0.5">
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{user?.name}</h3>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Verified Security Specialist</p>
                         </div>
                         <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                            <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg">{user?.role}</span>
                            <span className="px-3 py-1 bg-white border border-slate-100 text-slate-400 rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-sm">{user?.companyEmail || user?.email}</span>
                         </div>
                      </div>
                   </div>

                   <form onSubmit={handleUpdateProfile} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Identity Label</label>
                            <div className="relative group">
                               <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors" size={18} />
                               <input 
                                 type="text" 
                                 value={profileForm.name} 
                                 onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} 
                                 className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 text-[14px] font-black focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/20 transition-all outline-none" 
                               />
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Gateway Email</label>
                            <div className="relative group">
                               <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors" size={18} />
                               <input 
                                 type="email" 
                                 value={profileForm.email} 
                                 onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} 
                                 className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 text-[14px] font-black focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/20 transition-all outline-none" 
                               />
                            </div>
                         </div>
                      </div>
                      <button type="submit" className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-brand-600 transition-all">
                         Update Identity Protocol
                      </button>
                   </form>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-12">
                   <div className="pb-6 border-b border-slate-50">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1 italic leading-none">Security Node</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Access & Integrity Management</p>
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-1 gap-8">
                      <div className="p-8 rounded-[32px] bg-slate-50/50 border border-slate-100 relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 blur-[80px] -mr-24 -mt-24" />
                         <div className="flex items-center gap-5 mb-8 relative z-10">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-xl border border-slate-50">
                               <Key size={24} />
                            </div>
                            <div>
                               <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">Key Rotation</h4>
                               <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">Periodic credential synchronization</p>
                            </div>
                         </div>
                         <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <input 
                              type="password" 
                              placeholder="Current Auth Key" 
                              className="w-full h-14 px-6 rounded-xl bg-white border border-slate-100 text-[13px] font-bold outline-none focus:ring-4 focus:ring-brand-500/10 transition-all" 
                            />
                            <input 
                              type="password" 
                              placeholder="New Mission Key" 
                              className="w-full h-14 px-6 rounded-xl bg-white border border-slate-100 text-[13px] font-bold outline-none focus:ring-4 focus:ring-brand-500/10 transition-all" 
                            />
                            <button type="submit" disabled={loading} className="md:col-span-2 h-14 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-600 transition-all flex items-center justify-center gap-3 shadow-lg">
                               {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={16} className="text-amber-400 fill-amber-400" />}
                               {loading ? 'Rotating Keys...' : 'Sync New Keys'}
                            </button>
                         </form>
                      </div>

                      <div className="p-8 rounded-[32px] bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl relative overflow-hidden">
                         <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 to-transparent" />
                         <div className="flex items-center gap-6 relative z-10">
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-lg">
                               <Fingerprint size={32} className="text-brand-400" />
                            </div>
                            <div>
                               <div className="flex items-center gap-3 mb-1">
                                  <h4 className="text-xl font-black text-white uppercase tracking-tight leading-none">Shield (2FA)</h4>
                                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${user?.twoFactorEnabled ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                     {user?.twoFactorEnabled ? 'ACTIVE' : 'INACTIVE'}
                                  </span>
                               </div>
                               <p className="text-[11px] font-medium text-slate-400 max-w-sm">Secondary identity verification protocol.</p>
                            </div>
                         </div>
                         <button onClick={start2FASetup} className="relative z-10 px-8 py-4 bg-white text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-brand-400 hover:text-white transition-all">
                            {user?.twoFactorEnabled ? 'RECONFIGURE' : 'INITIALIZE'}
                         </button>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'team' && (
                <div className="space-y-12">
                   {/* COMPACT RECRUITMENT HUB */}
                   <div className="relative group overflow-hidden rounded-[32px] md:rounded-[40px] border border-slate-100 bg-white shadow-xl p-6 md:p-10">
                      <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-900" />
                      <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                         <Activity size={300} className="translate-x-1/4 -translate-y-1/4 text-white" />
                      </div>

                      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                         <div className="space-y-6 pt-4">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                     <UserPlus size={20} />
                                  </div>
                                  <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Deployment Hub</h3>
                               </div>
                               <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">Recruit Specialist</h2>
                               <p className="text-slate-500 text-[13px] font-medium leading-relaxed max-w-md">Initialize a new secure node for incoming enterprise talent. Automatic credential generation enabled.</p>
                               
                               <div className="grid grid-cols-1 gap-3 pt-4">
                                  <div className="flex items-center gap-3 text-slate-400">
                                     <ShieldCheck size={16} className="text-emerald-500" />
                                     <span className="text-[9px] font-black uppercase tracking-widest">Phone & Identity Sync</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-slate-400">
                                     <ShieldCheck size={16} className="text-emerald-500" />
                                     <span className="text-[9px] font-black uppercase tracking-widest">Bank Node Integration</span>
                                  </div>
                               </div>
                         </div>

                         <form className="space-y-4" onSubmit={handleRegisterSpecialist}>
                             <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                   <input 
                                     type="text" required placeholder="FULL NAME"
                                     value={accessForm.name} 
                                     onChange={e => setAccessForm({ ...accessForm, name: e.target.value })}
                                     className="w-full h-14 px-6 bg-white/10 border border-white/20 rounded-xl text-[14px] font-black text-white placeholder:text-white/20 focus:bg-white/20 focus:border-indigo-400 transition-all outline-none" 
                                   />
                                   <input 
                                     type="text" required placeholder="PHONE NUMBER"
                                     value={accessForm.phoneNo} 
                                     onChange={e => setAccessForm({ ...accessForm, phoneNo: e.target.value })}
                                     className="w-full h-14 px-6 bg-white/10 border border-white/20 rounded-xl text-[14px] font-black text-white placeholder:text-white/20 focus:bg-white/20 focus:border-indigo-400 transition-all outline-none" 
                                   />
                                </div>
                                <input 
                                  type="email" required placeholder="OFFICIAL EMAIL"
                                  value={accessForm.email} 
                                  onChange={e => setAccessForm({ ...accessForm, email: e.target.value })}
                                  className="w-full h-14 px-6 bg-white/10 border border-white/20 rounded-xl text-[14px] font-black text-white placeholder:text-white/20 focus:bg-white/20 focus:border-indigo-400 transition-all outline-none" 
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                   <input 
                                      type="password" required placeholder="AUTH KEY"
                                      value={accessForm.tempPassword} 
                                      onChange={e => setAccessForm({ ...accessForm, tempPassword: e.target.value })}
                                      className="w-full h-14 px-6 bg-white/10 border border-white/20 rounded-xl text-[14px] font-black text-white placeholder:text-white/20 focus:bg-white/20 focus:border-indigo-400 transition-all outline-none" 
                                    />
                                    <select
                                      value={accessForm.role}
                                      onChange={e => setAccessForm({ ...accessForm, role: e.target.value })}
                                      className="w-full h-14 px-6 bg-white/10 border border-white/20 rounded-xl text-[10px] font-black text-white focus:bg-white/20 focus:border-indigo-400 transition-all outline-none appearance-none cursor-pointer uppercase tracking-widest"
                                    >
                                      {ROLES.map(role => <option key={role.value} value={role.value} className="bg-slate-900">{role.label}</option>)}
                                    </select>
                                </div>
                                
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                   <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Financial Node Details</p>
                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <input 
                                        type="text" placeholder="BANK NAME"
                                        value={accessForm.bankName} 
                                        onChange={e => setAccessForm({ ...accessForm, bankName: e.target.value })}
                                        className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white placeholder:text-white/20 focus:border-indigo-400 transition-all outline-none" 
                                      />
                                      <input 
                                        type="text" placeholder="IFSC CODE"
                                        value={accessForm.ifscCode} 
                                        onChange={e => setAccessForm({ ...accessForm, ifscCode: e.target.value })}
                                        className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white placeholder:text-white/20 focus:border-indigo-400 transition-all outline-none" 
                                      />
                                      <input 
                                        type="text" placeholder="ACCOUNT NUMBER"
                                        value={accessForm.accountNumber} 
                                        onChange={e => setAccessForm({ ...accessForm, accountNumber: e.target.value })}
                                        className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white placeholder:text-white/20 focus:border-indigo-400 transition-all outline-none" 
                                      />
                                      <input 
                                        type="text" placeholder="UPI ID"
                                        value={accessForm.upiId} 
                                        onChange={e => setAccessForm({ ...accessForm, upiId: e.target.value })}
                                        className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white placeholder:text-white/20 focus:border-indigo-400 transition-all outline-none" 
                                      />
                                   </div>
                                </div>
                             </div>
                             <button type="submit" disabled={loading} className="w-full h-14 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-[0.4em] shadow-xl hover:bg-indigo-400 hover:text-white transition-all flex items-center justify-center gap-3">
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Rocket size={18} />} Grant Access
                             </button>
                         </form>
                      </div>
                   </div>

                   {/* COMPACT ROSTER LIST */}
                   <div className="space-y-6">
                      <div className="flex items-center justify-between px-4">
                         <div className="flex items-center gap-3">
                            <Contact size={18} className="text-slate-400" />
                            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Active Specialist Grid</h4>
                         </div>
                         <span className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-slate-100">{teamMembers.length} UNITS</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {teamMembers.map((member, i) => (
                           <motion.div 
                             key={member.id || member._id}
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             transition={{ delay: i * 0.05 }}
                             onClick={() => setSelectedMember(member)}
                             className="p-6 bg-white rounded-[32px] border border-slate-50 flex items-center justify-between gap-4 hover:shadow-xl hover:border-brand-500/20 transition-all group cursor-pointer"
                           >
                              <div className="flex items-center gap-4">
                                 <div className="w-14 h-14 rounded-2xl bg-slate-900 p-0.5 shadow-md">
                                    <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-800">
                                       <img 
                                         src={member.avatar ? (member.avatar.startsWith('http') ? member.avatar : `${API_URL.replace('/api', '')}${member.avatar}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} 
                                         alt="" 
                                         className="w-full h-full object-cover" 
                                       />
                                    </div>
                                 </div>
                                 <div className="min-w-0">
                                    <h5 className="text-[15px] font-black text-slate-900 tracking-tighter uppercase leading-none mb-1.5 truncate">{member.name}</h5>
                                    <span className="px-2 py-0.5 bg-brand-50 text-brand-600 rounded-md text-[7px] font-black uppercase tracking-widest border border-brand-100">{member.role}</span>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); setSelectedMember(member); }} 
                                   className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
                                 >
                                    <ArrowRight size={20} />
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleRevokeAccess(member.id || member._id, member.name); }} 
                                   className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-rose-300 hover:text-white hover:bg-rose-500 transition-all shadow-sm shrink-0"
                                 >
                                    <UserX size={20} />
                                 </button>
                              </div>
                           </motion.div>
                         ))}
                      </div>
                   </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 4. REFINED MODALS */}
      <AnimatePresence>
        {/* TEAM MEMBER DETAIL MODAL */}
        {selectedMember && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedMember(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-lg glass-card !p-0 shadow-2xl overflow-hidden rounded-[48px] border-none"
             >
                <div className="p-10 bg-slate-900 text-white relative overflow-hidden">

                   <div className="relative z-10 flex items-center gap-6">
                      <div className="w-20 h-20 rounded-[28px] bg-white p-1 shadow-2xl">
                         <div className="w-full h-full rounded-[24px] overflow-hidden bg-slate-100">
                            <img 
                              src={selectedMember.avatar ? (selectedMember.avatar.startsWith('http') ? selectedMember.avatar : `${API_URL.replace('/api', '')}${selectedMember.avatar}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedMember.name}`} 
                              className="w-full h-full object-cover" 
                            />
                         </div>
                      </div>
                      <div>
                         <h3 className="text-2xl font-black tracking-tighter uppercase leading-none mb-2 italic">{selectedMember.name}</h3>
                         <span className="px-3 py-1 bg-brand-600 rounded-lg text-[9px] font-black uppercase tracking-widest">{selectedMember.role}</span>
                      </div>
                      <button onClick={() => setSelectedMember(null)} className="ml-auto w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all">
                         <X size={24} />
                      </button>
                   </div>
                </div>
                
                <div className="p-10 bg-white space-y-8">
                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-1">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gateway Email</p>
                         <p className="text-sm font-black text-slate-900 truncate">{selectedMember.email}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Secure Phone</p>
                         <p className="text-sm font-black text-slate-900">{selectedMember.phoneNo || 'NOT LINKED'}</p>
                      </div>
                   </div>

                   <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 space-y-6">
                      <div className="flex items-center gap-3">
                         <Landmark size={20} className="text-brand-600" />
                         <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Financial Node Details</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                         <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Bank Institution</p>
                            <p className="text-xs font-black text-slate-900 uppercase">{selectedMember.bankName || '---'}</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">IFSC Protocol</p>
                            <p className="text-xs font-black text-slate-900 uppercase">{selectedMember.ifscCode || '---'}</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Account Identifier</p>
                            <p className="text-xs font-black text-slate-900">{selectedMember.accountNumber || '---'}</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Unified Payload ID</p>
                            <p className="text-xs font-black text-brand-600">{selectedMember.upiId || '---'}</p>
                         </div>
                      </div>
                   </div>

                   <button className="w-full h-16 bg-slate-900 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:bg-brand-600 transition-all flex items-center justify-center gap-4">
                      Open Mission Registry <ArrowRight size={18} />
                   </button>
                </div>
             </motion.div>
          </div>
        )}

        {twoFactorModal === 'setup' && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTwoFactorModal(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-md glass-card !p-10 text-center shadow-2xl border-none rounded-[48px]"
            >
              <div className="w-20 h-20 bg-brand-600 rounded-[28px] flex items-center justify-center text-white mx-auto mb-8 shadow-xl animate-pulse">
                 <Shield size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-3 italic">Shield Init</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-10">Scan QR Node with Authenticator</p>
              
              <div className="p-6 bg-white rounded-[40px] w-64 h-64 mx-auto shadow-2xl border border-slate-50 mb-10 flex items-center justify-center">
                <img src={twoFactorData.qrCode} className="w-full h-full" alt="QR" />
              </div>

              <div className="space-y-4">
                 <input 
                   value={twoFactorData.token} 
                   onChange={e => setTwoFactorData({ ...twoFactorData, token: e.target.value })}
                   placeholder="CODE-000" 
                   className="w-full h-16 text-center bg-slate-50 border-2 border-transparent focus:border-brand-500/20 rounded-[24px] text-3xl font-black tracking-[0.4em] text-slate-900 outline-none transition-all placeholder:text-slate-100" 
                 />
                 <button onClick={verify2FA} className="w-full h-16 bg-slate-900 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.4em] shadow-xl hover:bg-brand-600 transition-all flex items-center justify-center gap-3">
                   <ShieldCheck size={20} /> AUTHORIZE
                 </button>
              </div>
            </motion.div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-10 right-10 z-[300]">
            <motion.div 
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className={`px-8 py-5 rounded-[28px] shadow-2xl flex items-center gap-5 border backdrop-blur-2xl ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-600'}`}
            >
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                  {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
               </div>
               <p className="text-[12px] font-black uppercase tracking-widest">{toast.message}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
