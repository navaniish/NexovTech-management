import React, { useState, useEffect } from 'react';
import {
  User, Lock, Bell, Shield, Globe, Palette, Database, Cloud,
  ChevronRight, Save, UserPlus, Mail, Key, Briefcase, Trash2,
  CheckCircle2, AlertCircle, Loader2, RefreshCw, Crown, X,
  Plus, Users, ShieldCheck,
  CreditCard, Building2, Hash, Smartphone,
  Search, Filter, Contact, Zap
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

const roleColor = (role) => ROLES.find(r => r.value === role)?.color || '#64748b';

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.95 }}
    className="fixed bottom-8 right-8 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border"
    style={{
      background: type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
      borderColor: type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
      backdropFilter: 'blur(20px)',
      color: 'var(--text-primary)',
    }}
  >
    {type === 'success'
      ? <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
      : <AlertCircle size={18} className="text-rose-400 flex-shrink-0" />
    }
    <p className="text-sm font-bold">{message}</p>
    <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
      <X size={14} />
    </button>
  </motion.div>
);

// ─── Settings ─────────────────────────────────────────────────────────────────
const Settings = () => {
  const { user, updateUser } = useAuth();
  const { theme } = useTheme();
  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  // State for active section
  const [activeTab, setActiveTab] = useState('profile'); // profile, security, team, directory, appearance

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || ''
  });

  // Access grant form
  const [accessForm, setAccessForm] = useState({ 
    email: '', 
    name: '', 
    role: 'Employee', 
    tempPassword: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: ''
  });
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [isEditingFinancials, setIsEditingFinancials] = useState(false);
  const [editFinancialsForm, setEditFinancialsForm] = useState({ bankName: '', accountNumber: '', ifscCode: '', upiId: '' });
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const res = await fetch(`${API_URL}/auth/team-access?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        // Force refresh by ensuring a new array reference
        const unique = [...data].reduce((acc, curr) => {
          const email = curr.email?.toLowerCase();
          if (email && !acc.find(item => item.email?.toLowerCase() === email)) {
            acc.push({ ...curr, email, avatar: curr.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}` });
          }
          return acc;
        }, []);
        setTeamMembers(unique);
      }
      else throw new Error();
    } catch {
      showToast('Connection to Registry failed. Displaying cached roster.', 'error');
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchTeam();
  }, [isAdmin]);

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    updateUser({ name: profileForm.name, email: profileForm.email });
    showToast('Profile updated successfully', 'success');
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!accessForm.email.endsWith('@gmail.com')) {
      showToast('Only @gmail.com addresses are allowed', 'error');
      return;
    }
    if (teamMembers.find(m => m.email.toLowerCase() === accessForm.email.toLowerCase())) {
      showToast('This identity already has workspace access.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/grant-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accessForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Access granted!', 'success');
        setAccessForm({ email: '', name: '', role: 'Employee', tempPassword: '', bankName: '', accountNumber: '', ifscCode: '', upiId: '' });
        
        // Atomic update: Use the fresh list from the server immediately
        if (data.updatedRoster) {
          const unique = data.updatedRoster.reduce((acc, curr) => {
            const email = curr.email?.toLowerCase();
            if (email && !acc.find(item => item.email?.toLowerCase() === email)) {
              acc.push({ ...curr, email, avatar: curr.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}` });
            }
            return acc;
          }, []);
          setTeamMembers(unique);
        } else {
          fetchTeam();
        }
      } else {
        showToast(data.message || 'Error granting access', 'error');
      }
    } catch {
      showToast('Mission control offline. Profile not synchronized.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFinancials = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/update-financials/${selectedMember._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFinancialsForm),
      });
      if (res.ok) {
        showToast('Financial profile updated', 'success');
        setTeamMembers(prev => prev.map(m => m._id === selectedMember._id ? { ...m, ...editFinancialsForm } : m));
        setSelectedMember(prev => ({ ...prev, ...editFinancialsForm }));
        setIsEditingFinancials(false);
      }
    } catch {
      showToast('Financial update failed. Server unreachable.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (member) => {
    setRevokingId(member._id);
    try {
      const res = await fetch(`${API_URL}/auth/revoke-access/${member._id}`, { method: 'DELETE' });
      if (res.ok) {
        setTeamMembers(prev => prev.filter(m => m._id !== member._id));
        showToast('Access revoked', 'success');
      }
    } catch {
      showToast('Error revoking access', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image too large (Max 5MB)', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    try {
      const res = await fetch(`${API_URL}/auth/upload-avatar/${user._id || user.id || user.firebaseUid}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        updateUser({ avatar: data.avatar });
        showToast('Profile photo updated', 'success');
      } else {
        showToast(data.message || 'Upload failed', 'error');
      }
    } catch (err) {
      showToast('Connection to gateway lost', 'error');
    } finally {
      setUploading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    ...(isAdmin ? [{ id: 'team', label: 'Team Access', icon: Crown }, { id: 'directory', label: 'Team Directory', icon: Users }] : []),
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Settings</h1>
          <p className="mt-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Manage your account settings and preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-sm transition-all ${
                activeTab === tab.id
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                : 'theme-text-secondary hover:theme-text-primary hover:bg-white/5'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="theme-card rounded-[32px] p-8 min-h-[500px]"
            >
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-6 pb-8 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="w-24 h-24 rounded-3xl bg-brand-600 p-[3px]">
                      <div className="w-full h-full rounded-[21px] overflow-hidden theme-bg">
                        <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt="Avatar" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-black theme-text-primary">{user?.name}</h3>
                      <p className="text-brand-500 font-bold uppercase tracking-widest text-xs mt-1">{user?.role}</p>
                      
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="mt-4 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold theme-text-secondary hover:theme-text-primary transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {uploading ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>Change Photo</>
                        )}
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest theme-text-secondary ml-1">Full Name</label>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                          className="w-full px-5 py-3.5 rounded-2xl theme-bg border theme-text-primary outline-none focus:ring-2 focus:ring-brand-500/20"
                          style={{ borderColor: 'var(--border-default)' }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest theme-text-secondary ml-1">Email Address</label>
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                          className="w-full px-5 py-3.5 rounded-2xl theme-bg border theme-text-primary outline-none focus:ring-2 focus:ring-brand-500/20"
                          style={{ borderColor: 'var(--border-default)' }}
                        />
                      </div>
                    </div>
                    <button type="submit" className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-600/20 hover:bg-brand-700 transition-all flex items-center gap-2">
                      <Save size={18} /> Update Profile
                    </button>
                  </form>
                </div>
              )}



              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-black theme-text-primary mb-2">Security & Access</h3>
                    <p className="text-sm theme-text-secondary">Update your credentials and manage login security.</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { icon: Key, label: 'Change Password', desc: 'Secure your account with a unique password.' },
                      { icon: Shield, label: 'Two-Factor Authentication', desc: 'Add an extra layer of security.', badge: 'Recommended' },
                      { icon: Globe, label: 'Login History', desc: 'Monitor your account for unusual activity.' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-6 rounded-2xl theme-bg border" style={{ borderColor: 'var(--border-default)' }}>
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/5 rounded-xl theme-text-secondary">
                            <item.icon size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-sm theme-text-primary">{item.label}</p>
                              {item.badge && <span className="px-2 py-0.5 bg-brand-500/10 text-brand-500 text-[8px] font-black uppercase rounded-md">{item.badge}</span>}
                            </div>
                            <p className="text-xs theme-text-secondary mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest theme-text-secondary hover:theme-text-primary transition-all">Manage</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Tab */}
              {activeTab === 'team' && (
                <div className="space-y-8">
                  <div className="p-10 rounded-[40px] bg-brand-600/5 border border-brand-500/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <UserPlus size={120} className="text-brand-500" />
                    </div>
                    
                    <div className="relative z-10">
                      <h4 className="text-2xl font-black theme-text-primary tracking-tight mb-2">Register New Specialist</h4>
                      <p className="text-sm theme-text-secondary mb-10">Initialize secure workspace credentials and financial synchronization.</p>
                      
                      <form onSubmit={handleGrantAccess} className="space-y-8">
                        {/* Section 1: Identity */}
                        <div className="space-y-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500 ml-1">Identity & Credentials</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative group">
                              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500 group-focus-within:text-brand-500 transition-colors" size={18} />
                              <input
                                placeholder="Full Name"
                                value={accessForm.name}
                                onChange={e => setAccessForm({ ...accessForm, name: e.target.value })}
                                className="w-full pl-12 pr-5 py-4 rounded-2xl theme-bg border theme-text-primary outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                                style={{ borderColor: 'var(--border-default)' }}
                              />
                            </div>
                            <div className="relative group">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500 group-focus-within:text-brand-500 transition-colors" size={18} />
                              <input
                                placeholder="gmail@gmail.com"
                                value={accessForm.email}
                                onChange={e => setAccessForm({ ...accessForm, email: e.target.value })}
                                className="w-full pl-12 pr-5 py-4 rounded-2xl theme-bg border theme-text-primary outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                                style={{ borderColor: 'var(--border-default)' }}
                              />
                            </div>
                            <div className="md:col-span-2 space-y-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500 ml-1">Assign Operational Role</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                {ROLES.map((r) => (
                                  <button
                                    key={r.value}
                                    type="button"
                                    onClick={() => setAccessForm({ ...accessForm, role: r.value })}
                                    className={`py-3 px-2 rounded-2xl border transition-all flex flex-col items-center gap-2 group ${accessForm.role === r.value ? 'bg-brand-600 border-brand-500 shadow-xl shadow-brand-600/20' : 'theme-bg border-white/5 hover:border-brand-500/30'}`}
                                  >
                                    <div className={`p-2 rounded-xl ${accessForm.role === r.value ? 'bg-white/10' : 'bg-surface-800 group-hover:bg-brand-500/10'}`}>
                                      <Zap size={14} style={{ color: accessForm.role === r.value ? '#fff' : r.color }} />
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-tighter ${accessForm.role === r.value ? 'text-white' : 'theme-text-secondary'}`}>{r.label}</span>
                                  </button>
                                ))}
                              </div>
                              
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => setAccessForm({ ...accessForm, role: 'Admin' })}
                                  className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 border ${accessForm.role === 'Admin' ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20' : 'theme-bg border-white/5 theme-text-secondary hover:theme-text-primary'}`}
                                >
                                  <ShieldCheck size={16} /> Administrative Access
                                </button>
                              </div>
                            </div>
                            <div className="md:col-span-2 relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500 group-focus-within:text-brand-500 transition-colors" size={18} />
                                <input
                                  type="password"
                                  placeholder="Initial Workspace Password"
                                  value={accessForm.tempPassword}
                                  onChange={e => setAccessForm({ ...accessForm, tempPassword: e.target.value })}
                                  className="w-full pl-12 pr-5 py-4 rounded-2xl theme-bg border theme-text-primary outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                                  style={{ borderColor: 'var(--border-default)' }}
                                />
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Financials */}
                        <div className="space-y-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 ml-1">Financial Roster Details</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative group">
                              <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                              <input
                                placeholder="Bank Name"
                                value={accessForm.bankName}
                                onChange={e => setAccessForm({ ...accessForm, bankName: e.target.value })}
                                className="w-full pl-12 pr-5 py-4 rounded-2xl theme-bg border theme-text-primary outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                style={{ borderColor: 'var(--border-default)' }}
                              />
                            </div>
                            <div className="relative group">
                              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                              <input
                                placeholder="Account Number"
                                value={accessForm.accountNumber}
                                onChange={e => setAccessForm({ ...accessForm, accountNumber: e.target.value })}
                                className="w-full pl-12 pr-5 py-4 rounded-2xl theme-bg border theme-text-primary outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                style={{ borderColor: 'var(--border-default)' }}
                              />
                            </div>
                            <input
                              placeholder="IFSC Code"
                              value={accessForm.ifscCode}
                              onChange={e => setAccessForm({ ...accessForm, ifscCode: e.target.value })}
                              className="px-5 py-4 rounded-2xl theme-bg border theme-text-primary outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                              style={{ borderColor: 'var(--border-default)' }}
                            />
                            <input
                              placeholder="UPI ID (e.g. name@bank)"
                              value={accessForm.upiId}
                              onChange={e => setAccessForm({ ...accessForm, upiId: e.target.value })}
                              className="px-5 py-4 rounded-2xl theme-bg border theme-text-primary outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                              style={{ borderColor: 'var(--border-default)' }}
                            />
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={loading} 
                          className="w-full py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-brand-600/30 flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:translate-y-0"
                        >
                          {loading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />} 
                          Complete Registration
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest theme-text-secondary ml-1">Team Roster</h5>
                    <div className="space-y-2">
                      {teamMembers.map((member, index) => (
                        <div key={member.id || member._id || member.email || index} className="flex items-center justify-between p-4 rounded-2xl theme-bg border" style={{ borderColor: 'var(--border-default)' }}>
                          <div className="flex items-center gap-3">
                            <img src={member.avatar} className="w-10 h-10 rounded-xl" alt="" />
                            <div>
                              <p className="text-sm font-black theme-text-primary">{member.name}</p>
                              <p className="text-[10px] theme-text-secondary">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[9px] font-black px-2 py-1 rounded-md" style={{ background: `${roleColor(member.role)}15`, color: roleColor(member.role) }}>{member.role}</span>
                            <button
                              onClick={() => setSelectedMember(member)}
                              className="p-2 theme-text-secondary hover:bg-white/5 rounded-lg transition-all"
                            >
                              <CreditCard size={16} />
                            </button>
                            <button
                              onClick={() => handleRevoke(member)}
                              className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                            >
                              {revokingId === member._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Directory Tab */}
              {activeTab === 'directory' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-xl font-black theme-text-primary">Team Directory</h3>
                      <p className="text-xs theme-text-secondary mt-1">Enterprise personnel registry and operational profiles.</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-secondary" size={14} />
                        <input 
                          placeholder="Search directory..." 
                          className="pl-9 pr-4 py-2 rounded-xl theme-bg border theme-text-primary text-xs outline-none focus:ring-1 focus:ring-brand-500/20"
                          style={{ borderColor: 'var(--border-default)' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {teamMembers.map((member, index) => (
                      <motion.div 
                        key={member.id || member._id || index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-5 rounded-[24px] theme-bg border group hover:border-brand-500/30 transition-all"
                        style={{ borderColor: 'var(--border-default)' }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img src={member.avatar} className="w-12 h-12 rounded-2xl" alt="" />
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-surface-900 rounded-full" />
                          </div>
                          <div>
                            <p className="font-black theme-text-primary text-sm">{member.name}</p>
                            <p className="text-[10px] theme-text-secondary">{member.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="hidden md:block">
                            <p className="text-[8px] font-black uppercase tracking-widest theme-text-secondary mb-1">Role</p>
                            <span className="text-[9px] font-black px-2 py-1 rounded-md" style={{ background: `${roleColor(member.role)}15`, color: roleColor(member.role) }}>
                              {member.role}
                            </span>
                          </div>

                          <div className="hidden lg:block">
                            <p className="text-[8px] font-black uppercase tracking-widest theme-text-secondary mb-1">Financial Status</p>
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <CheckCircle2 size={10} />
                              <span className="text-[9px] font-bold">Verified</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setEditFinancialsForm({
                                  bankName: member.bankName || '',
                                  accountNumber: member.accountNumber || '',
                                  ifscCode: member.ifscCode || '',
                                  upiId: member.upiId || ''
                                });
                                setSelectedMember(member);
                              }}
                              className="p-2.5 bg-white/5 rounded-xl theme-text-secondary hover:theme-text-primary hover:bg-white/10 transition-all"
                              title="Financial Profile"
                            >
                              <CreditCard size={16} />
                            </button>
                            <button className="p-2.5 bg-white/5 rounded-xl theme-text-secondary hover:theme-text-primary hover:bg-white/10 transition-all">
                              <Search size={16} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {teamMembers.length === 0 && (
                      <div className="py-20 text-center border-2 border-dashed rounded-[32px]" style={{ borderColor: 'var(--border-default)' }}>
                        <Users size={40} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-bold theme-text-secondary">No personnel found in Registry.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-[32px] p-8 shadow-2xl z-10 overflow-hidden" 
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              
              <div className="absolute top-0 right-0 p-8">
                <button onClick={() => setSelectedMember(null)} className="p-2 rounded-full hover:bg-white/5 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <img src={selectedMember.avatar} className="w-16 h-16 rounded-2xl" alt="" />
                <div>
                  <h3 className="text-xl font-black theme-text-primary">{selectedMember.name}</h3>
                  <p className="text-xs theme-text-secondary">{selectedMember.role} • Financial Profile</p>
                </div>
              </div>

              <div className="space-y-4">
                {isEditingFinancials ? (
                  <form onSubmit={handleUpdateFinancials} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-surface-500 ml-1">Bank Name</label>
                      <input 
                        value={editFinancialsForm.bankName}
                        onChange={e => setEditFinancialsForm({ ...editFinancialsForm, bankName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl theme-bg border theme-text-primary text-sm outline-none focus:ring-1 focus:ring-brand-500/20"
                        style={{ borderColor: 'var(--border-default)' }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-surface-500 ml-1">Account Number</label>
                      <input 
                        value={editFinancialsForm.accountNumber}
                        onChange={e => setEditFinancialsForm({ ...editFinancialsForm, accountNumber: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl theme-bg border theme-text-primary text-sm outline-none focus:ring-1 focus:ring-brand-500/20"
                        style={{ borderColor: 'var(--border-default)' }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-surface-500 ml-1">IFSC Code</label>
                      <input 
                        value={editFinancialsForm.ifscCode}
                        onChange={e => setEditFinancialsForm({ ...editFinancialsForm, ifscCode: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl theme-bg border theme-text-primary text-sm outline-none focus:ring-1 focus:ring-brand-500/20"
                        style={{ borderColor: 'var(--border-default)' }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-surface-500 ml-1">UPI ID</label>
                      <input 
                        value={editFinancialsForm.upiId}
                        onChange={e => setEditFinancialsForm({ ...editFinancialsForm, upiId: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl theme-bg border theme-text-primary text-sm outline-none focus:ring-1 focus:ring-brand-500/20"
                        style={{ borderColor: 'var(--border-default)' }}
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <button 
                        type="button" 
                        onClick={() => setIsEditingFinancials(false)}
                        className="flex-1 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest theme-text-secondary"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="flex-1 py-3 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-600/20"
                      >
                        {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-surface-500">Bank Name</p>
                          <p className="text-sm font-bold theme-text-primary">{selectedMember.bankName || 'Not Synchronized'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                          <Hash size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-surface-500">Account Number</p>
                          <p className="text-sm font-bold theme-text-primary font-mono tracking-wider">
                            {selectedMember.accountNumber ? `•••• •••• ${selectedMember.accountNumber.slice(-4)}` : 'No Record Found'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                          <Zap size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-surface-500">IFSC Code</p>
                          <p className="text-sm font-bold theme-text-primary uppercase tracking-widest">{selectedMember.ifscCode || 'NXVT0001234'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                          <Smartphone size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-surface-500">UPI ID</p>
                          <p className="text-sm font-bold theme-text-primary">{selectedMember.upiId || 'notset@upi'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-brand-600/5 border border-brand-600/10 flex items-center gap-3">
                      <ShieldCheck size={16} className="text-brand-500" />
                      <p className="text-[10px] font-bold text-brand-500/80">This financial data is encrypted and cloud-synced.</p>
                    </div>

                    <button 
                      onClick={() => {
                        setEditFinancialsForm({
                          bankName: selectedMember.bankName || '',
                          accountNumber: selectedMember.accountNumber || '',
                          ifscCode: selectedMember.ifscCode || '',
                          upiId: selectedMember.upiId || ''
                        });
                        setIsEditingFinancials(true);
                      }}
                      className="w-full mt-4 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black uppercase tracking-widest theme-text-primary transition-all"
                    >
                      Edit Financial Info
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
