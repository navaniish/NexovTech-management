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
import { db } from '../firebase';
import { doc, deleteDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';

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
      // 1. Fetch from Legacy Backend
      const legacyRes = await fetch(`${API_URL}/auth/team-access?t=${Date.now()}`);
      let legacyData = [];
      if (legacyRes.ok) {
        legacyData = await legacyRes.json();
      }

      // 2. Fetch from Firestore
      const fsSnap = await getDocs(collection(db, 'employees'));
      const fsData = fsSnap.docs.map(d => ({ ...d.data(), id: d.id, _id: d.id }));

      // 3. Merge: Prioritize Firestore, filter out revoked users
      const merged = fsData.filter(m => m.status !== 'revoked');
      
      legacyData.forEach(lUser => {
        const lEmail = lUser.email?.toLowerCase();
        // Only add legacy user if they are NOT in Firestore (prevents re-adding revoked users)
        if (lEmail && !fsData.find(m => m.email?.toLowerCase() === lEmail)) {
          merged.push(lUser);
        }
      });

      setTeamMembers(merged);
    } catch (err) {
      console.error('Roster fetch failed', err);
    }
  };

  const handleRegisterSpecialist = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Legacy Backend Registration
      const res = await fetch(`${API_URL}/auth/grant-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accessForm),
      });
      const data = await res.json();
      
      if (res.ok) {
        // 2. Firestore Cloud Sync
        try {
          const userRef = doc(db, 'employees', accessForm.email.toLowerCase());
          await setDoc(userRef, {
            name: accessForm.name,
            email: accessForm.email.toLowerCase(),
            role: accessForm.role,
            phone: accessForm.phoneNo,
            bankName: accessForm.bankName,
            accountNumber: accessForm.accountNumber,
            ifscCode: accessForm.ifscCode,
            status: 'active',
            joinedAt: new Date().toISOString()
          });
        } catch (fsErr) {
          console.error("Firestore sync failed:", fsErr);
        }

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

  const handleRevokeAccess = async (id, name, email) => {
    if (!window.confirm(`Are you sure you want to revoke access for ${name}?`)) return;
    setLoading(true);
    try {
      // 1. Mark as 'revoked' in Firestore (The Blacklist)
      try {
        if (email) {
          const userRef = doc(db, 'employees', email.toLowerCase());
          await setDoc(userRef, { 
            name, 
            email: email.toLowerCase(), 
            status: 'revoked',
            revokedAt: new Date().toISOString() 
          }, { merge: true });
        }
      } catch (fsErr) {
        console.error("Firestore blacklisting failed:", fsErr);
      }

      // 2. UI Update (Immediate removal)
      setTeamMembers(prev => prev.filter(m => (m.email?.toLowerCase() !== email?.toLowerCase()) && (m.id !== id && m._id !== id)));
      
      showToast('Access revoked and cloud registry blacklisted');
    } catch (err) {
      console.error(err);
      showToast('Network disruption', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Avatar = reader.result;
      try {
        const res = await fetch(`${API_URL}/auth/update-profile/${user?._id || user?.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: base64Avatar })
        });
        if (res.ok) {
          updateUser({ avatar: base64Avatar });
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
         <div 
           className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
           style={{ backgroundImage: "url('/assets/office-bg.png')" }}
         />
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
           <div className="flex lg:flex-col gap-2 p-2 bg-white/40 border border-slate-100 rounded-[32px] shadow-lg backdrop-blur-xl overflow-x-auto no-scrollbar">
             {tabs.map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`flex items-center gap-4 px-6 h-12 rounded-2xl font-black text-[10px] transition-all uppercase tracking-widest lg:w-full group shrink-0 ${
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
        </div>

        {/* 3. CORE CONTENT */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card !p-4 md:!p-10 min-h-[500px] md:min-h-[600px] border-slate-100 rounded-[32px] md:rounded-[40px] shadow-2xl shadow-slate-200/50"
            >
              {activeTab === 'profile' && (
                <div className="space-y-12 p-4 md:p-0">
                   <div className="flex flex-col md:flex-row items-center gap-8 pb-10 border-b border-slate-50">
                      <div className="relative group">
                         <div className="w-28 h-28 md:w-36 md:h-36 rounded-[36px] bg-white p-1 shadow-xl relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                            <div className="w-full h-full rounded-[32px] overflow-hidden bg-slate-50 flex items-center justify-center">
                               {uploading ? (
                                 <Loader2 className="animate-spin text-brand-500" size={32} />
                               ) : (
                                 <img 
                                   src={user?.avatar ? (user.avatar.startsWith('http') || user.avatar.startsWith('data:') ? user.avatar : `${API_URL.replace('/api', '')}${user.avatar}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} 
                                   alt="Avatar" 
                                   className="w-full h-full object-cover" 
                                 />
                               )}
                            </div>
                         </div>
                         <button 
                           onClick={() => fileInputRef.current.click()}
                           className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-900 text-white rounded-xl shadow-xl flex items-center justify-center hover:bg-brand-600 transition-all"
                         >
                            <Camera size={18} />
                         </button>
                         <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                      </div>
                      <div className="text-center md:text-left space-y-3">
                         <div className="space-y-0.5">
                            <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{user?.name}</h3>
                            <p className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Verified Security Specialist</p>
                         </div>
                         <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                            <span className="px-2 py-0.5 bg-slate-900 text-white rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-lg">{user?.role}</span>
                            <span className="px-2 py-0.5 bg-white border border-slate-100 text-slate-400 rounded-lg text-[8px] md:text-[9px] font-bold uppercase tracking-widest shadow-sm">{user?.companyEmail || user?.email}</span>
                         </div>
                      </div>
                   </div>

                   <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Identity Label</label>
                            <div className="relative group">
                               <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors" size={18} />
                               <input 
                                 type="text" 
                                 value={profileForm.name} 
                                 onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} 
                                 className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 text-[14px] font-black focus:bg-white transition-all outline-none" 
                               />
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Gateway Email</label>
                            <div className="relative group">
                               <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors" size={18} />
                               <input 
                                 type="email" 
                                 value={profileForm.email} 
                                 onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} 
                                 className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 text-[14px] font-black focus:bg-white transition-all outline-none" 
                               />
                            </div>
                         </div>
                      </div>
                      <button type="submit" className="w-full md:w-auto h-14 px-10 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-brand-600 transition-all">
                         Update Identity Protocol
                      </button>
                   </form>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-10 p-4 md:p-0">
                   <div className="pb-6 border-b border-slate-50">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Security Node</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Access & Integrity Management</p>
                   </div>
                   
                   <div className="space-y-6">
                      <div className="p-6 md:p-8 rounded-[32px] bg-slate-50 border border-slate-100 relative overflow-hidden group">
                         <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-lg">
                               <Key size={20} />
                            </div>
                            <div>
                               <h4 className="text-md font-black text-slate-900 uppercase tracking-tight">Key Rotation</h4>
                               <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Periodic credential synchronization</p>
                            </div>
                         </div>
                         <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input 
                              type="password" 
                              placeholder="Current Auth Key" 
                              className="w-full h-12 px-5 rounded-xl bg-white border border-slate-200 text-[13px] font-bold outline-none focus:border-indigo-500 transition-all" 
                            />
                            <input 
                              type="password" 
                              placeholder="New Mission Key" 
                              className="w-full h-12 px-5 rounded-xl bg-white border border-slate-200 text-[13px] font-bold outline-none focus:border-indigo-500 transition-all" 
                            />
                            <button type="submit" disabled={loading} className="md:col-span-2 h-12 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2">
                               {loading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={14} className="text-amber-400 fill-amber-400" />}
                               Sync New Keys
                            </button>
                         </form>
                      </div>

                      <div className="p-6 md:p-8 rounded-[32px] bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                         <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-transparent" />
                         <div className="flex items-center gap-5 relative z-10">
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                               <Fingerprint size={28} className="text-brand-400" />
                            </div>
                            <div>
                               <div className="flex items-center gap-3 mb-1">
                                  <h4 className="text-lg font-black text-white uppercase tracking-tight leading-none">Shield (2FA)</h4>
                                  <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${user?.twoFactorEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                     {user?.twoFactorEnabled ? 'ACTIVE' : 'INACTIVE'}
                                  </span>
                               </div>
                               <p className="text-[10px] font-medium text-slate-400">Secondary identity verification protocol.</p>
                            </div>
                         </div>
                         <button onClick={start2FASetup} className="relative z-10 w-full md:w-auto px-8 py-3.5 bg-white text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-brand-400 hover:text-white transition-all">
                            {user?.twoFactorEnabled ? 'RECONFIGURE' : 'INITIALIZE'}
                         </button>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'team' && (
                <div className="space-y-12">
                   <div className="relative group overflow-hidden rounded-[32px] md:rounded-[40px] border border-slate-100 bg-white shadow-xl p-4 md:p-10">
                      {/* Desktop Background Split */}
                      <div className="hidden lg:block absolute top-0 right-0 w-1/2 h-full bg-slate-900" />
                      <div className="hidden lg:block absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                         <Activity size={300} className="translate-x-1/4 -translate-y-1/4 text-white" />
                      </div>

                      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                         <div className="space-y-4 md:space-y-6 pt-2">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                     <UserPlus size={20} />
                                  </div>
                                  <h3 className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Deployment Hub</h3>
                               </div>
                               <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-tight italic">Recruit Specialist</h2>
                               <p className="text-slate-500 text-[12px] md:text-[13px] font-medium leading-relaxed max-w-md">Initialize a new secure node for incoming enterprise talent.</p>
                               
                               <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 pt-2 lg:pt-4">
                                  <div className="flex items-center gap-2 text-slate-400">
                                     <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                                     <span className="text-[8px] font-black uppercase tracking-widest truncate">Phone & Identity Sync</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-400">
                                     <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                                     <span className="text-[8px] font-black uppercase tracking-widest truncate">Bank Node Integration</span>
                                  </div>
                               </div>
                         </div>

                         <form className="space-y-4 pt-4 lg:pt-0" onSubmit={handleRegisterSpecialist}>
                              <div className="space-y-3">
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Name</label>
                                       <input 
                                         type="text" required placeholder="FULL NAME"
                                         value={accessForm.name} 
                                         onChange={e => setAccessForm({ ...accessForm, name: e.target.value })}
                                         className="w-full h-12 px-5 bg-slate-50 lg:bg-white/10 border border-slate-100 lg:border-white/20 rounded-xl text-[13px] font-bold text-slate-900 lg:text-white placeholder:text-slate-300 lg:placeholder:text-white/30 focus:bg-white lg:focus:bg-white/20 transition-all outline-none" 
                                       />
                                    </div>
                                    <div className="space-y-1">
                                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Node</label>
                                       <input 
                                         type="text" required placeholder="PHONE NUMBER"
                                         value={accessForm.phoneNo} 
                                         onChange={e => setAccessForm({ ...accessForm, phoneNo: e.target.value })}
                                         className="w-full h-12 px-5 bg-slate-50 lg:bg-white/10 border border-slate-100 lg:border-white/20 rounded-xl text-[13px] font-bold text-slate-900 lg:text-white placeholder:text-slate-300 lg:placeholder:text-white/30 focus:bg-white lg:focus:bg-white/20 transition-all outline-none" 
                                       />
                                    </div>
                                 </div>
                                 
                                 <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Registry Email</label>
                                    <input 
                                      type="email" required placeholder="OFFICIAL EMAIL"
                                      value={accessForm.email} 
                                      onChange={e => setAccessForm({ ...accessForm, email: e.target.value })}
                                      className="w-full h-12 px-5 bg-slate-50 lg:bg-white/10 border border-slate-100 lg:border-white/20 rounded-xl text-[13px] font-bold text-slate-900 lg:text-white placeholder:text-slate-300 lg:placeholder:text-white/30 focus:bg-white lg:focus:bg-white/20 transition-all outline-none" 
                                    />
                                 </div>

                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Cipher</label>
                                       <input 
                                          type="password" required placeholder="AUTH KEY"
                                          value={accessForm.tempPassword} 
                                          onChange={e => setAccessForm({ ...accessForm, tempPassword: e.target.value })}
                                          className="w-full h-12 px-5 bg-slate-50 lg:bg-white/10 border border-slate-100 lg:border-white/20 rounded-xl text-[13px] font-bold text-slate-900 lg:text-white placeholder:text-slate-300 lg:placeholder:text-white/30 focus:bg-white lg:focus:bg-white/20 transition-all outline-none" 
                                       />
                                    </div>
                                    <div className="space-y-1">
                                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Operational Role</label>
                                       <select
                                          value={accessForm.role}
                                          onChange={e => setAccessForm({ ...accessForm, role: e.target.value })}
                                          className="w-full h-12 px-5 bg-slate-50 lg:bg-white/10 border border-slate-100 lg:border-white/20 rounded-xl text-[10px] font-black text-slate-900 lg:text-white focus:bg-white lg:focus:bg-white/20 outline-none appearance-none cursor-pointer uppercase tracking-widest"
                                       >
                                          {ROLES.map(role => <option key={role.value} value={role.value} className="bg-white lg:bg-slate-800 text-slate-900 lg:text-white">{role.label}</option>)}
                                       </select>
                                    </div>
                                 </div>
                                 
                                 <div className="p-5 bg-slate-50 lg:bg-white/5 rounded-2xl border border-slate-200 lg:border-white/5 space-y-4">
                                    <p className="text-[9px] font-black text-indigo-500 lg:text-indigo-400 uppercase tracking-[0.2em] mb-2">Financial Node Details</p>
                                    <div className="grid grid-cols-2 gap-3">
                                       <div className="space-y-1 col-span-1">
                                          <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Institution</label>
                                          <input 
                                            type="text" placeholder="BANK NAME"
                                            value={accessForm.bankName} 
                                            onChange={e => setAccessForm({ ...accessForm, bankName: e.target.value })}
                                            className="w-full h-10 px-3 bg-white lg:bg-white/5 border border-slate-200 lg:border-white/10 rounded-lg text-[10px] font-bold text-slate-900 lg:text-white placeholder:text-slate-300 lg:placeholder:text-white/30 focus:border-indigo-400 transition-all outline-none" 
                                          />
                                       </div>
                                       <div className="space-y-1 col-span-1">
                                          <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Protocol (IFSC)</label>
                                          <input 
                                            type="text" placeholder="IFSC CODE"
                                            value={accessForm.ifscCode} 
                                            onChange={e => setAccessForm({ ...accessForm, ifscCode: e.target.value })}
                                            className="w-full h-10 px-3 bg-white lg:bg-white/5 border border-slate-200 lg:border-white/10 rounded-lg text-[10px] font-bold text-slate-900 lg:text-white placeholder:text-slate-300 lg:placeholder:text-white/30 focus:border-indigo-400 transition-all outline-none" 
                                          />
                                       </div>
                                       <div className="space-y-1 col-span-2">
                                          <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Identifier (A/C No)</label>
                                          <input 
                                            type="text" placeholder="ACCOUNT NUMBER"
                                            value={accessForm.accountNumber} 
                                            onChange={e => setAccessForm({ ...accessForm, accountNumber: e.target.value })}
                                            className="w-full h-10 px-3 bg-white lg:bg-white/5 border border-slate-200 lg:border-white/10 rounded-lg text-[10px] font-bold text-slate-900 lg:text-white placeholder:text-slate-300 lg:placeholder:text-white/30 focus:border-indigo-400 transition-all outline-none" 
                                          />
                                       </div>
                                    </div>
                                 </div>
                              </div>
                              <button type="submit" disabled={loading} className="w-full h-14 bg-slate-900 lg:bg-white text-white lg:text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-[0.4em] shadow-xl hover:bg-indigo-600 lg:hover:bg-indigo-400 transition-all flex items-center justify-center gap-3">
                                 {loading ? <Loader2 className="animate-spin" size={18} /> : <Rocket size={18} />} Grant Access
                              </button>
                          </form>
                      </div>
                   </div>

                   {/* COMPACT ROSTER LIST */}
                   <div className="space-y-6">
                      <div className="flex items-center justify-between px-2 md:px-4">
                         <div className="flex items-center gap-2 md:gap-3">
                            <Contact size={18} className="text-slate-400" />
                            <h4 className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase tracking-widest">Active Specialist Grid</h4>
                         </div>
                         <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-slate-100">{teamMembers.length} UNITS</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {teamMembers.map((member, i) => (
                           <motion.div 
                             key={member.id || member._id}
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             transition={{ delay: i * 0.05 }}
                             onClick={() => setSelectedMember(member)}
                             className="p-4 bg-white rounded-[24px] md:rounded-[32px] border border-slate-50 flex items-center justify-between gap-3 hover:shadow-xl hover:border-brand-500/20 transition-all group cursor-pointer shadow-sm"
                           >
                              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                 <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-900 p-0.5 shadow-md shrink-0">
                                    <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-800">
                                       <img 
                                         src={member.avatar ? (member.avatar.startsWith('http') || member.avatar.startsWith('data:') ? member.avatar : `${API_URL.replace('/api', '')}${member.avatar}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} 
                                         alt="" 
                                         className="w-full h-full object-cover" 
                                       />
                                    </div>
                                 </div>
                                 <div className="min-w-0">
                                    <h5 className="text-[14px] md:text-[15px] font-black text-slate-900 tracking-tighter uppercase leading-none mb-1 md:mb-1.5 truncate">{member.name}</h5>
                                    <span className="px-2 py-0.5 bg-brand-50 text-brand-600 rounded-md text-[7px] font-black uppercase tracking-widest border border-brand-100">{member.role}</span>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleRevokeAccess(member.id || member._id, member.name, member.email); }} 
                                   className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-rose-300 hover:text-white hover:bg-rose-500 transition-all"
                                 >
                                    <UserX size={18} />
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
        {selectedMember && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedMember(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-lg glass-card !p-0 shadow-2xl overflow-hidden rounded-[32px] md:rounded-[48px] border-none"
             >
                <div className="p-6 md:p-10 bg-slate-900 text-white relative overflow-hidden">
                   <div className="relative z-10 flex items-center gap-4 md:gap-6">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-[24px] md:rounded-[28px] bg-white p-1 shadow-2xl">
                         <div className="w-full h-full rounded-[20px] md:rounded-[24px] overflow-hidden bg-slate-100">
                            <img 
                              src={selectedMember.avatar ? (selectedMember.avatar.startsWith('http') || selectedMember.avatar.startsWith('data:') ? selectedMember.avatar : `${API_URL.replace('/api', '')}${selectedMember.avatar}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedMember.name}`} 
                              className="w-full h-full object-cover" 
                            />
                         </div>
                      </div>
                      <div>
                         <h3 className="text-xl md:text-2xl font-black tracking-tighter uppercase leading-none mb-1 md:mb-2 italic">{selectedMember.name}</h3>
                         <span className="px-3 py-1 bg-brand-600 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest">{selectedMember.role}</span>
                      </div>
                      <button onClick={() => setSelectedMember(null)} className="ml-auto w-10 h-10 md:w-12 md:h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all">
                         <X size={20} md:size={24} />
                      </button>
                   </div>
                </div>
                
                <div className="p-6 md:p-10 bg-white space-y-6 md:space-y-8">
                   <div className="grid grid-cols-2 gap-6 md:gap-8">
                      <div className="space-y-1">
                         <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Gateway Email</p>
                         <p className="text-xs md:text-sm font-black text-slate-900 truncate">{selectedMember.email}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Secure Phone</p>
                         <p className="text-xs md:text-sm font-black text-slate-900">{selectedMember.phoneNo || 'NOT LINKED'}</p>
                      </div>
                   </div>

                   <div className="p-6 md:p-8 bg-slate-50 rounded-[28px] md:rounded-[32px] border border-slate-100 space-y-4 md:space-y-6">
                      <div className="flex items-center gap-3">
                         <Landmark size={18} className="text-brand-600" />
                         <h4 className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase tracking-widest">Financial Node Details</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-y-4 md:gap-y-6 gap-x-6 md:gap-x-8">
                         <div className="space-y-1">
                            <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Institution</p>
                            <p className="text-[10px] md:text-xs font-black text-slate-900 uppercase">{selectedMember.bankName || '---'}</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Protocol (IFSC)</p>
                            <p className="text-[10px] md:text-xs font-black text-slate-900 uppercase">{selectedMember.ifscCode || '---'}</p>
                         </div>
                         <div className="space-y-1 col-span-2">
                            <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Identifier (A/C No)</p>
                            <p className="text-[10px] md:text-xs font-black text-slate-900">{selectedMember.accountNumber || '---'}</p>
                         </div>
                      </div>
                   </div>

                   <button className="w-full h-14 md:h-16 bg-slate-900 text-white rounded-[20px] md:rounded-[24px] font-black text-[10px] md:text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:bg-brand-600 transition-all flex items-center justify-center gap-3 md:gap-4">
                      Open Mission Registry <ArrowRight size={18} />
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOASTS */}
      <AnimatePresence>
        {toast && (
          <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[300]">
            <motion.div 
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className={`px-6 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 border backdrop-blur-2xl ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-600'}`}
            >
               <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                  {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
               </div>
               <p className="text-[10px] font-black uppercase tracking-widest">{toast.message}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
