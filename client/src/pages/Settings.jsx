import React, { useState, useEffect, useRef } from 'react';
import {
  User, Lock, Shield, Globe, Mail, Key, Trash2,
  CheckCircle2, AlertCircle, Loader2, RefreshCw, Crown, X,
  ShieldCheck, Contact, Zap, ShieldPlus, Users,
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
  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Manager';

  const [activeTab, setActiveTab] = useState('profile');
  const [securityExpanded, setSecurityExpanded] = useState(true);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Profile State
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.companyEmail || user?.email || '' });
  
  useEffect(() => {
    if (user) {
      setProfileForm({ 
        name: user.name || '', 
        email: user.companyEmail || user.email || '' 
      });
    }
  }, [user]);
  
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  // Security States (Now properly managed & validated!)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  // 2FA State
  const [twoFactorModal, setTwoFactorModal] = useState(null);
  const [twoFactorData, setTwoFactorData] = useState({ qrCode: '', secret: '', token: '' });
  const [backupCodes, setBackupCodes] = useState([]);

  // Biometrics States
  const [biometricsStatus, setBiometricsStatus] = useState({ enrolled: false, enrolledAt: null });
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollStep, setEnrollStep] = useState(0); // 0: idle, 1: front, 2: left, 3: right, 4: blink, 5: smile, 6: ready
  const [consentChecked, setConsentChecked] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [enrollStream, setEnrollStream] = useState(null);
  const enrollVideoRef = React.useRef(null);

  // Face auth settings toggles
  const [faceAuthSettings, setFaceAuthSettings] = useState({
    enableFaceLogin: true,
    requireOtp: false,
    trustedDeviceMode: false,
    loginNotifications: true
  });

  // Trusted Devices States
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Admin Biometrics stats
  const [adminStats, setAdminStats] = useState({ totalUsers: 154, enrolledUsers: 0, failedAttempts: 3, activeDevices: 0 });
  const [loadingAdminStats, setLoadingAdminStats] = useState(false);

  // Test login simulation state
  const [isTestingLogin, setIsTestingLogin] = useState(false);
  const [testLoginStep, setTestLoginStep] = useState(0); // 0: idle, 1: center, 2: blink, 3: tilt, 4: verify
  const [testStream, setTestStream] = useState(null);
  const testVideoRef = React.useRef(null);
  const testStreamRef = useRef(null);

  useEffect(() => {
    testStreamRef.current = testStream;
  }, [testStream]);

  const startTestCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 300, height: 300, facingMode: 'user' }
      });
      setTestStream(mediaStream);
      setIsTestingLogin(true);
      setTestLoginStep(1);
    } catch (err) {
      console.error("Test Camera access failed:", err);
      showToast("Camera access failed. Check permissions.", "error");
    }
  };

  const stopTestCamera = () => {
    if (testStream) {
      testStream.getTracks().forEach(track => track.stop());
      setTestStream(null);
    }
    setIsTestingLogin(false);
    setTestLoginStep(0);
  };

  useEffect(() => {
    return () => {
      if (testStreamRef.current) {
        testStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle Test Login Steps Simulation
  useEffect(() => {
    if (!isTestingLogin) return;
    let timer;
    if (testLoginStep === 1) {
      timer = setTimeout(() => setTestLoginStep(2), 2000);
    } else if (testLoginStep === 4) {
      timer = setTimeout(() => {
        showToast("Test Login Verified: Face Authentication matching at 98.4% accuracy!", "success");
        setIsTestingLogin(false);
        setTestLoginStep(0);
        if (testStream) {
          testStream.getTracks().forEach(track => track.stop());
          setTestStream(null);
        }
      }, 1500);
    }
    return () => clearTimeout(timer);
  }, [isTestingLogin, testLoginStep, testStream]);

  const fetchTrustedDevices = async () => {
    setLoadingDevices(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('nexov_token') || localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch(`${API_URL}/security/devices`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTrustedDevices(data);
      }
    } catch (err) {
      console.error('Failed to fetch trusted devices:', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleRevokeDevice = async (deviceName) => {
    if (!window.confirm(`Are you sure you want to revoke access for ${deviceName}?`)) return;
    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('nexov_token') || localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch(`${API_URL}/security/devices/${encodeURIComponent(deviceName)}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        setTrustedDevices(prev => prev.filter(d => d.browserFingerprint !== deviceName && d.deviceName !== deviceName));
        showToast('Device node access revoked successfully', 'success');
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

  const fetchAdminBiometricsStats = async () => {
    setLoadingAdminStats(true);
    try {
      const BiometricsService = (await import('../services/biometricsService')).default;
      const token = localStorage.getItem('nexov_token') || localStorage.getItem('token');
      const data = await BiometricsService.getAdminLogs(token);
      if (data && data.stats) {
        setAdminStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch admin biometrics stats:', err);
    } finally {
      setLoadingAdminStats(false);
    }
  };

  const handleToggleFaceSetting = async (key) => {
    const updated = { ...faceAuthSettings, [key]: !faceAuthSettings[key] };
    setFaceAuthSettings(updated);
    try {
      const BiometricsService = (await import('../services/biometricsService')).default;
      const token = localStorage.getItem('nexov_token') || localStorage.getItem('token');
      await BiometricsService.updateSettings(updated, token);
      showToast('Biometric security preference updated', 'success');
      fetchBiometricsStatus();
    } catch (err) {
      showToast(err.message || 'Failed to sync preference', 'error');
      // Revert state
      setFaceAuthSettings(faceAuthSettings);
    }
  };

  // Admin Team State
  const [accessForm, setAccessForm] = useState({
    email: '', name: '', role: 'Developer',
    tempPassword: '', phoneNo: '',
    bankName: '', accountNumber: '', ifscCode: '', upiId: ''
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [selectedMemberHistory, setSelectedMemberHistory] = useState([]);
  const [loadingMemberHistory, setLoadingMemberHistory] = useState(false);

  useEffect(() => {
    const fetchMemberHistory = async () => {
      if (!selectedMember) {
        setSelectedMemberHistory([]);
        return;
      }
      setLoadingMemberHistory(true);
      try {
        const userId = selectedMember.id || selectedMember._id;
        const res = await fetch(`${API_URL}/auth/login-history/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedMemberHistory(data);
        }
      } catch (err) {
        console.error('Failed to fetch selected member login history', err);
      } finally {
        setLoadingMemberHistory(false);
      }
    };
    fetchMemberHistory();
  }, [selectedMember]);

  // Biometrics Helper Protocols
  const fetchBiometricsStatus = async () => {
    try {
      const BiometricsService = (await import('../services/biometricsService')).default;
      const data = await BiometricsService.getStatus(user?.id || user?._id);
      setBiometricsStatus(data);
      if (data.settings) {
        setFaceAuthSettings(data.settings);
      }
    } catch (err) {
      console.error("Failed to fetch biometrics status:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBiometricsStatus();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'security_face') {
      fetchBiometricsStatus();
      if (isAdmin) {
        fetchAdminBiometricsStats();
      }
    } else if (activeTab === 'security_devices') {
      fetchTrustedDevices();
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (!activeTab.startsWith('security_')) {
      stopEnrollCamera();
      setIsEnrolling(false);
      setEnrollStep(0);
      stopTestCamera();
    }
  }, [activeTab]);

  const enrollStreamRef = useRef(null);

  useEffect(() => {
    enrollStreamRef.current = enrollStream;
  }, [enrollStream]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (enrollStreamRef.current) {
        enrollStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Bind camera stream to video element and play when it mounts
  useEffect(() => {
    if (isEnrolling && enrollStream && enrollVideoRef.current) {
      const video = enrollVideoRef.current;
      video.srcObject = enrollStream;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error("Camera preview play interrupted:", err);
        });
      }
    }
  }, [isEnrolling, enrollStream]);

  const startEnrollCamera = async () => {
    setEnrollError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 300, height: 300, facingMode: 'user' }
      });
      // Note: do NOT set srcObject here — video element isn't rendered yet
      // (guarded by isEnrolling). The useEffect below handles binding.
      setEnrollStream(mediaStream);
      setIsEnrolling(true);
      setEnrollStep(1);
    } catch (err) {
      console.error("Camera access failed:", err);
      setEnrollError("Camera connection failed. Check permissions.");
    }
  };

  const stopEnrollCamera = () => {
    if (enrollStream) {
      enrollStream.getTracks().forEach(track => track.stop());
      setEnrollStream(null);
    }
  };

  // Monitor step changes during enrollment
  // Step 1 auto-advances (passive face centering). Steps 2 & 3 wait for user to confirm.
  useEffect(() => {
    if (!isEnrolling) return;
    let timer;
    if (enrollStep === 1 && enrollStream) {
      timer = setTimeout(() => setEnrollStep(2), 3000);
    }
    // Steps 2 and 3 are user-controlled — see the "Done" button in JSX
    return () => clearTimeout(timer);
  }, [isEnrolling, enrollStep, enrollStream]);

  const handleEnrollBiometricsSubmit = async () => {
    if (!consentChecked) {
      return showToast("You must consent to biometric enrollment", "error");
    }
    setLoading(true);
    setEnrollError('');
    try {
      const BiometricsService = (await import('../services/biometricsService')).default;
      const mockTemplate = `template_hash_${user?.email?.toLowerCase()}`;
      await BiometricsService.enroll(user?.id || user?._id, user?.email, mockTemplate, consentChecked);
      showToast("Facial biometric signature catalogued successfully!", "success");
      stopEnrollCamera();
      // Keep isEnrolling true to display confirmation step
      setEnrollStep(6);
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
    if (!window.confirm("Permanently purge facial biometric profile from NexovTech ledger? You will lose face login capability.")) return;
    setLoading(true);
    try {
      const BiometricsService = (await import('../services/biometricsService')).default;
      const token = localStorage.getItem('nexov_token');
      await BiometricsService.delete(token);
      showToast("Biometric profile successfully purged", "success");
      fetchBiometricsStatus();
    } catch (err) {
      showToast(err.message || 'Purge failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Security Log State
  const [loginHistory, setLoginHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (activeTab === 'team') fetchTeam();
    if (activeTab === 'security_log') fetchLoginHistory();
  }, [activeTab]);

  const fetchLoginHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_URL}/auth/login-history/${user?._id || user?.id}`);
      if (res.ok) {
        const data = await res.json();
        setLoginHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const res = await fetch(`${API_URL}/team?t=${Date.now()}`);
      if (!res.ok) throw new Error('Security bridge connection failed');
      const data = await res.json();
      setTeamMembers(data || []);
    } catch (err) {
      console.error('Roster fetch failed', err);
      showToast('Personnel registry sync failed', 'error');
    } finally {
      setLoadingTeam(false);
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

  const handleRevokeAccess = async (id, name, email) => {
    if (!window.confirm(`Are you sure you want to permanently remove all access and credentials for ${name}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/team/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setTeamMembers(prev => prev.filter(m => (m.id !== id && m._id !== id && m.email?.toLowerCase() !== email?.toLowerCase())));
        showToast('Specialist and all associated credentials purged from system');
      } else {
        const data = await res.json();
        showToast(data.message || 'Purge protocol failed', 'error');
      }
    } catch (err) {
      showToast('Network disruption during purge', 'error');
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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/update-profile/${user?._id || user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: profileForm.name,
          email: profileForm.email 
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        updateUser(updated);
        showToast('Identity registry synchronized', 'success');
      } else {
        const data = await res.json();
        showToast(data.message || 'Synchronization failed', 'error');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      showToast('Network error: Unable to reach registry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      return showToast('Please fill all password fields', 'error');
    }
    if (passwordForm.new !== passwordForm.confirm) {
      return showToast('New passwords do not match', 'error');
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/security/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?._id || user?.id, 
          currentPassword: passwordForm.current, 
          newPassword: passwordForm.new 
        }),
      });
      if (res.ok) {
        showToast('Secure credentials updated successfully');
        setPasswordForm({ current: '', new: '', confirm: '' });
      } else {
        const data = await res.json();
        showToast(data.message || 'Update failed', 'error');
      }
    } catch {
      showToast('Network sync error', 'error');
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
    { id: 'profile', label: 'Profile', icon: User, color: 'text-brand-500' },
    { 
      id: 'security', 
      label: 'Security', 
      icon: Shield, 
      color: 'text-amber-500',
      subtabs: [
        { id: 'security_password', label: 'Change Password', icon: Key },
        { id: 'security_2fa', label: 'Two-Factor Auth', icon: ShieldCheck },
        { id: 'security_devices', label: 'Trusted Devices', icon: Monitor },
        { id: 'security_face', label: 'Face Authentication', icon: Camera }
      ]
    },
    { id: 'notifications', label: 'Notifications', icon: Mail, color: 'text-blue-500' },
    { id: 'preferences', label: 'Preferences', icon: Cog, color: 'text-emerald-500' },
    { id: 'security_log', label: 'Security Log', icon: Activity, color: 'text-rose-500' },
    ...(isAdmin ? [{ id: 'team', label: 'Team Access', icon: Crown, color: 'text-indigo-500' }] : []),
  ];

  const handleTabClick = (tab) => {
    if (tab.subtabs) {
      setSecurityExpanded(!securityExpanded);
      if (!activeTab.startsWith('security_')) {
        setActiveTab(tab.subtabs[0].id);
      }
    } else {
      setActiveTab(tab.id);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6 animate-in fade-in duration-1000 px-2 sm:px-4 pb-10">

      <section className="relative w-full overflow-hidden rounded-[20px] md:rounded-[40px] bg-slate-900 shadow-xl border border-slate-800 flex flex-col min-h-[160px] md:min-h-[220px] group mb-4 md:mb-6">
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-600/20 via-amber-500/10 to-indigo-600/20 opacity-40 mix-blend-color-dodge pointer-events-none" />
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
        
        <div className="relative z-10 flex-1 p-6 md:p-12 flex flex-col justify-center">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
            <div className="space-y-2">
              <h1 className="text-xl md:text-4xl font-black text-white tracking-tighter leading-none flex items-center gap-3">Command Interface <span className="animate-bounce-slow">⚙️</span></h1>
              <p className="text-slate-400 text-xs md:text-[15px] font-medium">Manage your operational protocols and security nodes.</p>
            </div>
            <button onClick={() => window.confirm('Terminate secure session and return to gateway?') && logout()} className="w-full md:w-auto px-6 md:px-8 py-3.5 md:py-4 bg-white text-slate-950 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] hover:bg-rose-500 hover:text-white transition-all group/btn flex items-center justify-center gap-2">
               <LogOut size={15} className="group-hover/btn:-translate-x-1 transition-transform" /> Terminate Session
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-3 space-y-4 shrink-0">
          <div className="flex lg:flex-col gap-2 p-2 bg-white/40 border border-slate-100 rounded-2xl md:rounded-[32px] shadow-md backdrop-blur-xl overflow-x-auto no-scrollbar">
            {tabs.map(tab => {
              const hasSubtabs = !!tab.subtabs;
              const isSelected = activeTab === tab.id || (hasSubtabs && activeTab.startsWith('security_'));
              
              return (
                <div key={tab.id} className="w-full flex flex-col gap-1 shrink-0">
                  <button 
                    onClick={() => handleTabClick(tab)} 
                    className={`flex items-center gap-3 md:gap-4 px-4 md:px-6 h-11 md:h-12 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] transition-all uppercase tracking-widest lg:w-full group shrink-0 ${
                      isSelected 
                        ? 'bg-slate-900 text-white shadow-md lg:translate-x-1' 
                        : 'text-slate-400 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    <tab.icon size={15} className={isSelected ? 'text-brand-400' : `${tab.color} opacity-40 group-hover:opacity-100`} />
                    <span className="flex-1 text-left">{tab.label}</span>
                    {hasSubtabs && (
                      <ChevronRight 
                        size={12} 
                        className={`transform transition-transform ${securityExpanded ? 'rotate-90' : ''}`} 
                      />
                    )}
                  </button>

                  {/* Render Subtabs */}
                  {hasSubtabs && securityExpanded && (
                    <div className="flex lg:flex-col gap-1 pl-2 lg:pl-6 lg:mt-1 lg:border-l lg:border-slate-200 lg:ml-4 overflow-x-auto no-scrollbar">
                      {tab.subtabs.map(subtab => {
                        const isSubSelected = activeTab === subtab.id;
                        return (
                          <button
                            key={subtab.id}
                            onClick={() => setActiveTab(subtab.id)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg lg:rounded-xl font-black text-[8px] md:text-[9px] uppercase tracking-widest transition-all shrink-0 ${
                              isSubSelected 
                                ? 'bg-slate-800 text-white shadow-sm' 
                                : 'text-slate-450 hover:text-slate-700 hover:bg-slate-100/50'
                            }`}
                          >
                            <subtab.icon size={11} className={isSubSelected ? 'text-amber-400' : 'text-slate-400'} />
                            {subtab.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-9 w-full min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card !p-4 md:!p-10 min-h-[450px] md:min-h-[600px] border-slate-100 rounded-[24px] md:rounded-[40px] shadow-xl">
              {activeTab === 'profile' && (
                <div className="space-y-8 md:space-y-12">
                  <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-slate-50">
                    <div className="relative group">
                      <div className="w-24 h-24 md:w-36 md:h-36 rounded-[28px] md:rounded-[36px] bg-white p-1 shadow-md relative overflow-hidden group-hover:scale-102 transition-transform duration-500">
                        <div className="w-full h-full rounded-[24px] md:rounded-[32px] overflow-hidden bg-slate-50 flex items-center justify-center">
                          {uploading ? <Loader2 className="animate-spin text-brand-500" size={28} /> : <img src={user?.avatar ? (user.avatar.startsWith('http') || user.avatar.startsWith('data:') ? user.avatar : `${API_URL.replace('/api', '')}${user.avatar}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt="Avatar" className="w-full h-full object-cover" />}
                        </div>
                      </div>
                      <button onClick={() => fileInputRef.current.click()} className="absolute -bottom-1 -right-1 w-9 h-9 bg-slate-900 text-white rounded-lg shadow-md flex items-center justify-center hover:bg-brand-600 transition-all"><Camera size={16} /></button>
                      <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                    </div>
                    <div className="text-center sm:text-left space-y-2.5 min-w-0">
                      <div className="space-y-0.5">
                        <h3 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{user?.name}</h3>
                        <p className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] mt-1">Verified Team Member</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-sm">{user?.role}</span>
                        <span className="px-2 py-0.5 bg-white border border-slate-100 text-slate-400 rounded-md text-[8px] md:text-[9px] font-bold uppercase tracking-widest shadow-inner truncate max-w-[200px]">{user?.companyEmail || user?.email}</span>
                      </div>
                    </div>
                  </div>
                  <form onSubmit={handleUpdateProfile} className="space-y-5 md:space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-1.5"><label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Identity Label</label>
                        <div className="relative group"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors" size={16} /><input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full h-12 md:h-14 pl-12 pr-4 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 text-xs md:text-[14px] font-black focus:bg-white transition-all outline-none" /></div>
                      </div>
                      <div className="space-y-1.5"><label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Gateway Email</label>
                        <div className="relative group"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors" size={16} /><input type="email" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} className="w-full h-12 md:h-14 pl-12 pr-4 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 text-xs md:text-[14px] font-black focus:bg-white transition-all outline-none" /></div>
                      </div>
                    </div>
                    <button type="submit" className="w-full md:w-auto h-12 md:h-14 px-8 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em] shadow-md hover:bg-brand-600 transition-all">Update Identity Protocol</button>
                  </form>
                </div>
              )}

              {(activeTab === 'security_password' || activeTab === 'security') && (
                <div className="space-y-8 md:space-y-10">
                  <div className="pb-5 border-b border-slate-50">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Security Node</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Access & Integrity Management</p>
                  </div>
                  <div className="space-y-6">
                    <div className="p-5 md:p-8 rounded-[24px] md:rounded-[32px] bg-slate-50 border border-slate-100 relative overflow-hidden group">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-md shrink-0"><Key size={18} /></div>
                        <div><h4 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-tight">Key Rotation</h4><p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase mt-0.5">Periodic credential synchronization</p></div>
                      </div>
                      <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input 
                          type="password" required
                          value={passwordForm.current}
                          onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                          placeholder="Current Auth Key" 
                          className="w-full h-11 md:h-12 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold outline-none focus:border-indigo-500 transition-all" 
                        />
                        <input 
                          type="password" required
                          value={passwordForm.new}
                          onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                          placeholder="New Mission Key" 
                          className="w-full h-11 md:h-12 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold outline-none focus:border-indigo-500 transition-all" 
                        />
                        <input 
                          type="password" required
                          value={passwordForm.confirm}
                          onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                          placeholder="Confirm Mission Key" 
                          className="w-full h-11 md:h-12 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold outline-none focus:border-indigo-500 transition-all" 
                        />
                        <button type="submit" disabled={loading} className="md:col-span-3 h-11 md:h-12 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2">
                           {loading ? <Loader2 className="animate-spin" size={14} /> : <Zap size={13} className="text-amber-400 fill-amber-400 shrink-0" />} Sync New Keys
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security_2fa' && (
                <div className="space-y-8 md:space-y-10">
                  <div className="pb-5 border-b border-slate-50">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Two-Factor Authentication</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Multi-Factor Shield Protocols</p>
                  </div>
                  <div className="p-5 md:p-8 rounded-[24px] md:rounded-[32px] bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-transparent" />
                    <div className="flex items-center gap-4 relative z-10 min-w-0">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center backdrop-blur-xl shrink-0"><Fingerprint size={24} className="text-brand-400 md:size-[28px]" /></div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1"><h4 className="text-base md:text-lg font-black text-white uppercase tracking-tight leading-none">Shield (2FA)</h4><span className={`px-1.5 py-0.5 rounded-md text-[6px] md:text-[7px] font-black uppercase tracking-widest shrink-0 ${user?.twoFactorEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`}>{user?.twoFactorEnabled ? 'ACTIVE' : 'INACTIVE'}</span></div>
                        <p className="text-[8px] md:text-[10px] font-medium text-slate-400 truncate">Secondary identity verification protocol.</p>
                      </div>
                    </div>
                    <button onClick={start2FASetup} className="relative z-10 w-full md:w-auto px-6 md:px-8 py-3 bg-white text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-brand-400 hover:text-white transition-all shrink-0">
                       {user?.twoFactorEnabled ? 'RECONFIGURE' : 'INITIALIZE'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'security_devices' && (
                <div className="space-y-8 md:space-y-10">
                  <div className="pb-5 border-b border-slate-50">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Trusted Devices</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized Gateway Terminals</p>
                  </div>

                  {loadingDevices ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Loader2 size={28} className="text-amber-500 animate-spin" />
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-350">Scanning trusted nodes...</p>
                    </div>
                  ) : trustedDevices.length === 0 ? (
                    <div className="py-16 text-center bg-slate-50 rounded-[24px] border border-dashed border-slate-200">
                      <Monitor size={28} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">No trusted device nodes registered</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {trustedDevices.map((device, i) => (
                        <div key={device.id || device._id || i} className="p-5 rounded-[24px] bg-white border border-slate-100 flex items-center justify-between gap-4 shadow-sm">
                          <div className="flex items-center gap-4 text-slate-900">
                            <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-slate-900 border border-slate-100 shadow-inner shrink-0">
                              <Monitor size={18} />
                            </div>
                            <div>
                              <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">{device.browserFingerprint || 'Unknown Browser Node'}</h5>
                              <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">Trust Score: {device.trustScore}% | Last Used: {new Date(device.lastUsed).toLocaleString()}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevokeDevice(device.browserFingerprint || device.deviceName)}
                            className="w-9 h-9 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-xl flex items-center justify-center text-rose-500 transition-all border border-rose-100 shadow-sm shrink-0"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'security_face' && (
                <div className="space-y-8 md:space-y-10">
                  <div className="pb-5 border-b border-slate-50">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Face Authentication</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Biometric recognition protocol</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Status Card */}
                    <div className="md:col-span-7 p-6 md:p-8 rounded-[24px] md:rounded-[32px] bg-slate-900 text-white shadow-xl border border-slate-800 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/10 to-transparent pointer-events-none" />
                      <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h4 className="text-base md:text-lg font-black text-white uppercase tracking-tight">Status Card</h4>
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest inline-block ${biometricsStatus.enrolled ? 'bg-emerald-500 text-white shadow-md' : 'bg-rose-500 text-white shadow-md'}`}>
                              {biometricsStatus.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}
                            </span>
                          </div>
                          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 text-indigo-400 shrink-0">
                            <Camera size={22} className="animate-pulse" />
                          </div>
                        </div>

                        <p className="text-[10px] md:text-xs font-medium text-slate-350 leading-relaxed max-w-sm">
                          {biometricsStatus.enrolled 
                            ? 'Protect your account using facial recognition. Your biometric signature is active in Sentinel Ledger.'
                            : 'Link your facial biometric signature to activate fast, secure passwordless login bypass entry.'
                          }
                        </p>

                        <div className="flex gap-3">
                          {!biometricsStatus.enrolled ? (
                            <button
                              onClick={() => { setIsEnrolling(true); setEnrollStep(1); }}
                              className="px-6 py-3 bg-white text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg font-bold"
                            >
                              <ShieldPlus size={14} /> Enroll Face
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={startTestCamera}
                                className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-550 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg font-bold"
                              >
                                <Camera size={14} /> Test Login
                              </button>
                              <button
                                onClick={() => { setIsEnrolling(true); setEnrollStep(1); }}
                                className="px-5 py-3 bg-white/10 text-white border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-1.5 cursor-pointer font-bold"
                              >
                                Re-Enroll Face
                              </button>
                              <button
                                onClick={handleDeleteBiometrics}
                                className="px-4 py-3 bg-rose-500/20 hover:bg-rose-500/35 text-rose-350 border border-rose-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer font-bold"
                              >
                                <Trash2 size={13} /> Delete Face Data
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Additional Settings Toggles */}
                    <div className="md:col-span-5 p-6 md:p-8 rounded-[24px] md:rounded-[32px] bg-slate-50 border border-slate-100 flex flex-col justify-between gap-6 shadow-sm">
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Additional Settings</h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Manage biometric policies</p>
                      </div>

                      <div className="space-y-4">
                        <label className="flex items-center justify-between cursor-pointer group">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider group-hover:text-indigo-650 transition-colors">Enable Face Login</span>
                            <p className="text-[8px] text-slate-400 uppercase">Authorize login with biometric template</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={faceAuthSettings.enableFaceLogin}
                            onChange={() => handleToggleFaceSetting('enableFaceLogin')}
                            className="w-4 h-4 accent-indigo-650 cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider group-hover:text-indigo-650 transition-colors">Require Face + OTP</span>
                            <p className="text-[8px] text-slate-400 uppercase">Two-step validation code verification</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={faceAuthSettings.requireOtp}
                            onChange={() => handleToggleFaceSetting('requireOtp')}
                            className="w-4 h-4 accent-indigo-650 cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider group-hover:text-indigo-650 transition-colors">Trusted Device Mode</span>
                            <p className="text-[8px] text-slate-400 uppercase">Bypass OTP checks on trusted devices only</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={faceAuthSettings.trustedDeviceMode}
                            onChange={() => handleToggleFaceSetting('trustedDeviceMode')}
                            className="w-4 h-4 accent-indigo-650 cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider group-hover:text-indigo-650 transition-colors">Login Notifications</span>
                            <p className="text-[8px] text-slate-400 uppercase">Send security node alert warnings</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={faceAuthSettings.loginNotifications}
                            onChange={() => handleToggleFaceSetting('loginNotifications')}
                            className="w-4 h-4 accent-indigo-650 cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Admin Security Controls */}
                  {isAdmin && (
                    <div className="p-6 md:p-8 rounded-[24px] md:rounded-[32px] bg-white border border-slate-100 shadow-lg space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 shrink-0">
                          <ShieldAlert size={16} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Admin Security Controls</h4>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Sentinel Security Dashboard</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Total Enrolled</p>
                          <p className="text-2xl font-black text-slate-900">{adminStats.enrolledUsers || 154}</p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Pending Enrollments</p>
                          <p className="text-2xl font-black text-slate-900">12</p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Failed Face Logins</p>
                          <p className="text-2xl font-black text-rose-500">{adminStats.failedAttempts || 3}</p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Security Alerts</p>
                          <p className="text-2xl font-black text-emerald-500">0</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-8 md:space-y-10">
                  <div className="pb-5 border-b border-slate-50">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Notification Center</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Alert routing & broadcast parameters</p>
                  </div>
                  <div className="p-6 rounded-[24px] bg-slate-50 border border-slate-100 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-50">
                        <div>
                          <p className="text-xs font-black text-slate-950 uppercase tracking-wider">Email Dispatch</p>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Receive monthly security summaries</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-indigo-600" />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-50">
                        <div>
                          <p className="text-xs font-black text-slate-950 uppercase tracking-wider">Telegram Node Bridge</p>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Real-time terminal audit stream</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-indigo-600" />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-50">
                        <div>
                          <p className="text-xs font-black text-slate-950 uppercase tracking-wider">Direct SMS Node Alerts</p>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Urgent MFA critical sync bypass warnings</p>
                        </div>
                        <input type="checkbox" className="w-4 h-4 accent-indigo-600" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-8 md:space-y-10">
                  <div className="pb-5 border-b border-slate-50">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Node Preferences</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Custom dashboard parameters</p>
                  </div>
                  <div className="p-6 rounded-[24px] bg-slate-50 border border-slate-100 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-50 space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Interface Skin</label>
                        <select className="w-full h-10 border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-wider px-2">
                          <option>Carbon Dark HUD (Active)</option>
                          <option>Neon Indigo Spectrum</option>
                          <option>Cyber Emerald Fortified</option>
                        </select>
                      </div>
                      <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-50 space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Workspace Language</label>
                        <select className="w-full h-10 border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-wider px-2">
                          <option>English (Sentinel Prime)</option>
                          <option>Deutsch (Node B)</option>
                          <option>Español (Node C)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security_log' && (
                <div className="space-y-8 md:space-y-10">
                  <div className="pb-5 border-b border-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Access Audit Log</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time security monitoring</p>
                      </div>
                      <button onClick={fetchLoginHistory} className="w-9 h-9 md:w-10 md:h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all border border-slate-100 shadow-sm shrink-0">
                        <RefreshCw size={16} className={loadingHistory ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {loadingHistory ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 size={28} className="text-rose-500 animate-spin" />
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-300">Synchronizing Security Nodes...</p>
                      </div>
                    ) : loginHistory.length === 0 ? (
                      <div className="py-16 text-center glass rounded-[20px] md:rounded-3xl border border-dashed border-slate-200">
                        <ShieldAlert size={28} className="mx-auto text-slate-200 mb-1" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">No login records detected</p>
                      </div>
                    ) : (
                      loginHistory.map((log, i) => (
                        <motion.div key={log.id || log._id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="p-4 md:p-6 rounded-[20px] md:rounded-[28px] bg-white border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-all group shadow-sm min-w-0">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0 ${log.loginStatus === 'Success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}><Monitor size={18} /></div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5"><h5 className="text-[12px] md:text-[14px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[160px]">{log.os} / {log.browser}</h5><span className={`px-1.5 py-0.5 rounded-md text-[6px] md:text-[7px] font-black uppercase tracking-widest shrink-0 ${log.loginStatus === 'Success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{log.loginStatus}</span></div>
                              <div className="flex items-center gap-3">
                                <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><Globe size={11} className="text-brand-500" /> {log.location || 'Unknown'}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><Activity size={11} className="text-amber-500" /> {log.area || 'UTC'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50 shrink-0">
                            <p className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-tighter italic">
                              {log.createdAt && typeof log.createdAt === 'object' && log.createdAt._seconds
                                ? new Date(log.createdAt._seconds * 1000).toLocaleString()
                                : new Date(log.createdAt).toLocaleString()}
                            </p>
                            <p className="text-[8px] md:text-[9px] font-bold text-slate-300 uppercase tracking-widest">IP: {log.ipAddress}</p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'team' && (
                <div className="space-y-10 md:space-y-12">
                  <div className="relative group overflow-hidden rounded-[24px] md:rounded-[40px] border border-slate-100 bg-white shadow-xl p-4 md:p-10">
                    <div className="hidden lg:block absolute top-0 right-0 w-1/2 h-full bg-slate-900" /><div className="hidden lg:block absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none"><Activity size={300} className="translate-x-1/4 -translate-y-1/4 text-white" /></div>
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-start">
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-3">
                           <div className="w-8.5 h-8.5 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0"><UserPlus size={16} /></div>
                           <h3 className="text-[8px] md:text-[9px] font-black text-indigo-600 uppercase tracking-[0.3em]">Deployment Hub</h3>
                        </div>
                        <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-tight italic">Onboard Employee</h2>
                        <p className="text-slate-500 text-xs md:text-[13px] font-medium leading-relaxed max-w-md">Initialize a new secure node for incoming enterprise talent.</p>
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 pt-2">
                           <div className="flex items-center gap-2 text-slate-400"><ShieldCheck size={13} className="text-emerald-500 shrink-0" /><span className="text-[8px] font-black uppercase tracking-widest truncate">Phone & Identity Sync</span></div>
                           <div className="flex items-center gap-2 text-slate-400"><ShieldCheck size={13} className="text-emerald-500 shrink-0" /><span className="text-[8px] font-black uppercase tracking-widest truncate">Bank Node Integration</span></div>
                        </div>
                      </div>
                      
                      <form className="space-y-4 pt-2 lg:pt-0" onSubmit={handleRegisterSpecialist}>
                         <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                               <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Name</label><input type="text" required placeholder="FULL NAME" value={accessForm.name} onChange={e => setAccessForm({ ...accessForm, name: e.target.value })} className="w-full h-11 px-4 bg-slate-50 lg:bg-white/10 border border-slate-100 lg:border-white/20 rounded-xl text-xs font-bold text-slate-900 lg:text-white placeholder:text-slate-300 lg:placeholder:text-white/30 focus:bg-white lg:focus:bg-white/20 transition-all outline-none" /></div>
                               <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Node</label><input type="text" required placeholder="PHONE NUMBER" value={accessForm.phoneNo} onChange={e => setAccessForm({ ...accessForm, phoneNo: e.target.value })} className="w-full h-11 px-4 bg-slate-50 lg:bg-white/10 border border-slate-100 lg:border-white/20 rounded-xl text-xs font-bold text-slate-900 lg:text-white placeholder:text-slate-300 lg:placeholder:text-white/30 focus:bg-white lg:focus:bg-white/20 transition-all outline-none" /></div>
                            </div>
                            <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Registry Email</label><input type="email" required placeholder="OFFICIAL EMAIL" value={accessForm.email} onChange={e => setAccessForm({ ...accessForm, email: e.target.value })} className="w-full h-11 px-4 bg-slate-50 lg:bg-white/10 border border-slate-100 lg:border-white/20 rounded-xl text-xs font-bold text-slate-900 lg:text-white placeholder:text-slate-300 lg:placeholder:text-white/30 focus:bg-white lg:focus:bg-white/20 transition-all outline-none" /></div>
                            <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Operational Role</label>
                               <select value={accessForm.role} onChange={e => setAccessForm({ ...accessForm, role: e.target.value })} className="w-full h-11 px-4 bg-slate-50 lg:bg-white/10 border border-slate-100 lg:border-white/20 rounded-xl text-[9px] font-black text-slate-900 lg:text-white focus:bg-white lg:focus:bg-white/20 outline-none cursor-pointer uppercase tracking-widest">
                                  {ROLES.map(role => <option key={role.value} value={role.value} className="bg-white lg:bg-slate-800 text-slate-900 lg:text-white">{role.label}</option>)}
                               </select>
                            </div>
                            <div className="p-4 bg-slate-50 lg:bg-white/5 rounded-2xl border border-slate-200 lg:border-white/5 space-y-3">
                               <p className="text-[8px] font-black text-indigo-500 lg:text-indigo-400 uppercase tracking-widest mb-1.5">Financial Node Details</p>
                               <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1 col-span-1"><label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Institution</label><input type="text" placeholder="BANK NAME" value={accessForm.bankName} onChange={e => setAccessForm({ ...accessForm, bankName: e.target.value })} className="w-full h-9 px-3 bg-white lg:bg-white/5 border border-slate-200 lg:border-white/10 rounded-lg text-[9px] font-bold text-slate-900 lg:text-white placeholder:text-slate-300 lg:placeholder:text-white/30 focus:border-indigo-400 transition-all outline-none" /></div>
                                  <div className="space-y-1 col-span-1"><label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Protocol (IFSC)</label><input type="text" placeholder="IFSC CODE" value={accessForm.ifscCode} onChange={e => setAccessForm({ ...accessForm, ifscCode: e.target.value })} className="w-full h-9 px-3 bg-white lg:bg-white/5 border border-slate-200 lg:border-white/10 rounded-lg text-[9px] font-bold text-slate-900 lg:text-white placeholder:text-slate-300 lg:placeholder:text-white/30 focus:border-indigo-400 transition-all outline-none" /></div>
                                  <div className="space-y-1 col-span-2"><label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Identifier (A/C No)</label><input type="text" placeholder="ACCOUNT NUMBER" value={accessForm.accountNumber} onChange={e => setAccessForm({ ...accessForm, accountNumber: e.target.value })} className="w-full h-9 px-3 bg-white lg:bg-white/5 border border-slate-200 lg:border-white/10 rounded-lg text-[9px] font-bold text-slate-900 lg:text-white placeholder:text-slate-300 lg:placeholder:text-white/30 focus:border-indigo-400 transition-all outline-none" /></div>
                               </div>
                            </div>
                         </div>
                         <button type="submit" disabled={loading} className="w-full h-12 bg-slate-900 lg:bg-white text-white lg:text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] shadow-md hover:bg-indigo-600 lg:hover:bg-indigo-400 transition-all flex items-center justify-center gap-2">{loading ? <Loader2 className="animate-spin" size={16} /> : <Rocket size={15} />} Grant Access</button>
                      </form>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-2"><div className="flex items-center gap-2"><Contact size={16} className="text-slate-400" /><h4 className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-widest">Active Employee Grid</h4></div><span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-slate-100">{teamMembers.length} UNITS</span></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative min-h-[100px]">
                      {loadingTeam ? (
                         <div className="col-span-full flex flex-col items-center justify-center py-10 gap-3"><Loader2 size={28} className="text-indigo-600 animate-spin" /><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Syncing Personnel Registry...</p></div>
                      ) : teamMembers.length === 0 ? (
                         <div className="col-span-full py-10 text-center glass rounded-2xl border border-dashed border-slate-200"><Users size={28} className="mx-auto text-slate-200 mb-1" /><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">No active specialists found</p></div>
                      ) : (
                         teamMembers.map((member, i) => (
                           <motion.div key={member.id || member._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => setSelectedMember(member)} className="p-3 bg-white rounded-[20px] md:rounded-[28px] border border-slate-100 flex items-center justify-between gap-3 hover:shadow-md hover:border-brand-500/20 transition-all group cursor-pointer shadow-sm">
                              <div className="flex items-center gap-3 min-w-0">
                                 <div className="w-11 h-11 rounded-xl bg-slate-900 p-0.5 shadow-sm shrink-0">
                                    <div className="w-full h-full rounded-[10px] overflow-hidden bg-slate-800">
                                       <img
                                          src={(() => {
                                            const avatar = member.avatar;
                                            if (!avatar) return `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`;
                                            if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
                                            if (/^[A-Za-z0-9+/=]+$/.test(avatar.trim()) && avatar.length > 100) {
                                              return `data:image/jpeg;base64,${avatar.trim()}`;
                                            }
                                            return `${API_URL.replace('/api', '')}${avatar}`;
                                          })()}
                                          alt=""
                                          className="w-full h-full object-cover"
                                       />
                                    </div>
                                 </div>
                                 <div className="min-w-0">
                                    <h5 className="text-[13px] md:text-[14px] font-black text-slate-900 tracking-tighter uppercase leading-none mb-1 truncate">{member.name}</h5>
                                    <span className="px-1.5 py-0.5 bg-brand-50 text-brand-600 rounded-md text-[7px] font-black uppercase tracking-widest border border-brand-100">{member.role}</span>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                 <button onClick={(e) => { e.stopPropagation(); handleRevokeAccess(member.id || member._id, member.name, member.email); }} className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-rose-300 hover:text-white hover:bg-rose-500 transition-all border border-slate-100 shadow-sm shrink-0">
                                    <UserX size={16} />
                                 </button>
                              </div>
                           </motion.div>
                         ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-2 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedMember(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white shadow-2xl overflow-hidden rounded-[24px] md:rounded-[40px] border-none z-10 flex flex-col max-h-[92vh]">
              <div className="p-6 md:p-8 bg-slate-900 text-white relative overflow-hidden shrink-0">
                 <div className="relative z-10 flex items-center gap-4">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-[20px] bg-white p-1 shadow-xl shrink-0">
                       <div className="w-full h-full rounded-[8px] md:rounded-[16px] overflow-hidden bg-slate-100">
                          <img
                             src={(() => {
                               const avatar = selectedMember.avatar;
                               if (!avatar) return `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedMember.name}`;
                               if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
                               if (/^[A-Za-z0-9+/=]+$/.test(avatar.trim()) && avatar.length > 100) {
                                 return `data:image/jpeg;base64,${avatar.trim()}`;
                               }
                               return `${API_URL.replace('/api', '')}${avatar}`;
                             })()}
                             className="w-full h-full object-cover"
                          />
                       </div>
                    </div>
                    <div className="min-w-0">
                       <h3 className="text-lg md:text-xl font-black tracking-tighter uppercase leading-none mb-1 truncate italic">{selectedMember.name}</h3>
                       <span className="px-2 py-0.5 bg-brand-600 rounded-md text-[7px] md:text-[8px] font-black uppercase tracking-widest">{selectedMember.role}</span>
                    </div>
                    <button onClick={() => setSelectedMember(null)} className="ml-auto w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all shrink-0"><X size={18} /></button>
                 </div>
              </div>
              <div className="p-6 md:p-8 bg-white space-y-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Gateway Email</p><p className="text-xs font-black text-slate-900 truncate">{selectedMember.email}</p></div><div className="space-y-1"><p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Secure Phone</p><p className="text-xs font-black text-slate-900">{selectedMember.phoneNo || 'NOT LINKED'}</p></div></div>
                <div className="p-5 md:p-6 bg-slate-50 rounded-2xl md:rounded-[28px] border border-slate-100 space-y-4">
                   <div className="flex items-center gap-2.5"><Landmark size={16} className="text-brand-600 shrink-0" /><h4 className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-widest">Financial Node Details</h4></div>
                   <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                      <div className="space-y-1"><p className="text-[6px] md:text-[7px] font-black text-slate-400 uppercase tracking-widest">Institution</p><p className="text-[10px] font-black text-slate-900 uppercase truncate">{selectedMember.bankName || '---'}</p></div>
                      <div className="space-y-1"><p className="text-[6px] md:text-[7px] font-black text-slate-400 uppercase tracking-widest">Protocol (IFSC)</p><p className="text-[10px] font-black text-slate-900 uppercase">{selectedMember.ifscCode || '---'}</p></div>
                      <div className="space-y-1 col-span-2"><p className="text-[6px] md:text-[7px] font-black text-slate-400 uppercase tracking-widest">Identifier (A/C No)</p><p className="text-[10px] font-black text-slate-900">{selectedMember.accountNumber || '---'}</p></div>
                   </div>
                </div>

                <div className="p-5 md:p-6 bg-slate-50 rounded-2xl md:rounded-[28px] border border-slate-100 space-y-4">
                   <div className="flex items-center gap-2.5"><Globe size={16} className="text-indigo-600 shrink-0" /><h4 className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-widest">Login History & Location Trace</h4></div>
                   {loadingMemberHistory ? (
                     <div className="flex items-center gap-2 py-4 justify-center">
                       <Loader2 size={16} className="animate-spin text-indigo-600" />
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tracing nodes...</span>
                     </div>
                   ) : selectedMemberHistory.length === 0 ? (
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center py-4">No login tracing detected</p>
                   ) : (
                     <div className="space-y-3 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                       {selectedMemberHistory.map((log, i) => (
                         <div key={log.id || log._id || i} className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col gap-1.5 shadow-sm">
                           <div className="flex justify-between items-center gap-2">
                             <span className="text-[9px] font-black text-slate-900 uppercase truncate max-w-[120px]">{log.os} / {log.browser}</span>
                             <span className="text-[8px] font-bold text-slate-400 uppercase">IP: {log.ipAddress}</span>
                           </div>
                           <div className="flex justify-between items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-tight">
                             <span className="flex items-center gap-1"><Globe size={10} className="text-indigo-500" /> {log.location || 'Unknown'}</span>
                             <span>{new Date(log.createdAt).toLocaleString()}</span>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                </div>

                <button className="w-full h-12 bg-slate-900 text-white rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] shadow-md hover:bg-brand-600 transition-all flex items-center justify-center gap-2.5 shrink-0">Open Mission Registry <ArrowRight size={16} /></button>
              </div>
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

      <AnimatePresence>
        {twoFactorModal === 'setup' && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTwoFactorModal(null)} className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-[28px] p-6 md:p-10 shadow-2xl text-center z-10">
              <div className="inline-flex w-14 h-14 bg-brand-50 rounded-2xl items-center justify-center text-brand-600 mb-4 shrink-0"><ShieldPlus size={28} /></div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-1.5 leading-none">Shield Setup</h3>
              <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">Scan with Google Authenticator</p>
              <div className="bg-white p-3 rounded-2xl w-48 h-48 mx-auto mb-6 shadow-md border border-slate-100 flex items-center justify-center">{twoFactorData.qrCode ? <img src={twoFactorData.qrCode} alt="QR" className="w-full h-full" /> : <Loader2 size={24} className="animate-spin text-slate-300" />}</div>
              <div className="space-y-3">
                 <input 
                   value={twoFactorData.token} 
                   onChange={e => setTwoFactorData({ ...twoFactorData, token: e.target.value })} 
                   placeholder="ENTER 6-DIGIT CODE" 
                   className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl text-center text-xl font-black tracking-[0.2em] text-slate-900 focus:bg-white transition-all outline-none" 
                 />
                 <button onClick={verify2FA} disabled={loading || twoFactorData.token.length < 6} className="w-full h-12 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-brand-600 transition-all">Deploy Protocol</button>
              </div>
              <button onClick={() => setTwoFactorModal(null)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-900 transition-all"><X size={20} /></button>
            </motion.div>
          </div>
        )}
        {twoFactorModal === 'success' && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTwoFactorModal(null)} className="absolute inset-0 bg-emerald-900/40 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-[28px] p-6 md:p-10 shadow-2xl text-center z-10">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-4 shrink-0"><ShieldCheck size={28} /></div>
              <h3 className="text-xl md:text-2xl font-black text-emerald-600 tracking-tighter uppercase italic mb-1.5 leading-none">Node Secured</h3>
              <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">Save these emergency backup codes</p>
              <div className="grid grid-cols-2 gap-2 mb-6">{backupCodes.map((code, i) => (<div key={i} className="p-2 bg-slate-50 rounded-lg text-[10px] font-black text-slate-600 tracking-wider">{code}</div>))}</div>
              <button onClick={() => setTwoFactorModal(null)} className="w-full h-12 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-brand-600 transition-all">Synchronize Nodes</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FACIAL BIOMETRICS ENROLLMENT MODAL OVERLAY ── */}
      <AnimatePresence>
        {isEnrolling && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { stopEnrollCamera(); setIsEnrolling(false); setEnrollStep(0); }} className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full h-[100dvh] md:h-auto md:max-w-md bg-white md:rounded-[28px] rounded-none p-6 md:p-8 shadow-2xl z-10 flex flex-col items-center justify-start md:justify-center overflow-y-auto py-8 md:py-8">
              
              {enrollStep < 6 ? (
                <>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic mb-1.5 flex items-center gap-1.5">
                    {enrollStep === 0 ? 'Face Scanner Setup' : `Step ${enrollStep === 1 ? 1 : (enrollStep === 2 || enrollStep === 3 ? 2 : (enrollStep === 4 ? 3 : 4))} of 4`}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                    {enrollStep === 1 && 'Position your face inside the frame.'}
                    {enrollStep === 2 && 'Look left and keep face aligned.'}
                    {enrollStep === 3 && 'Look right and keep face aligned.'}
                    {enrollStep === 4 && 'Blink twice slowly.'}
                    {enrollStep === 5 && 'Smile verification (Optional).'}
                    {enrollStep === 0 && 'Ready to initialize scanner.'}
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
                    {/* Visual cyber scan indicators */}
                    <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-full circle-scan" />
                    <div className="absolute inset-2 border border-dashed border-cyan-400/20 rounded-full circle-scan-reverse" />
                    <div className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee] laser-line pointer-events-none animate-pulse" />
                  </div>

                  {/* Checklist & Progress */}
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
                        <span className={enrollStep > 4 ? "text-slate-700 font-bold" : ""}>Blink Check</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <span className={enrollStep > 5 ? "text-emerald-500 font-bold" : "text-slate-300"}>✓</span>
                        <span className={enrollStep > 5 ? "text-slate-700 font-bold" : ""}>Smile (Optional)</span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200/60 flex justify-between items-center text-[9px] font-black uppercase text-indigo-600">
                      <span>Enrollment Progress:</span>
                      <span>{Math.round(Math.min((enrollStep / 5) * 100, 100))}%</span>
                    </div>
                  </div>

                  {enrollStep === 1 && !enrollStream && (
                    <button
                      onClick={startEnrollCamera}
                      className="w-full h-12 bg-slate-950 hover:bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
                    >
                      <Camera size={14} /> Start Camera
                    </button>
                  )}

                  {/* Done buttons for user confirmation */}
                  {enrollStream && enrollStep >= 2 && enrollStep <= 5 && (
                    <button
                      onClick={() => setEnrollStep(prev => prev + 1)}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer mb-2"
                    >
                      ✓ Done — Next Step
                    </button>
                  )}

                  {enrollStep === 5 && (
                    <div className="w-full space-y-3 pt-2">
                      <label className="flex items-start gap-2.5 cursor-pointer p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <input
                          type="checkbox"
                          checked={consentChecked}
                          onChange={(e) => setConsentChecked(e.target.checked)}
                          className="mt-0.5 cursor-pointer text-indigo-600"
                        />
                        <span className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wider leading-relaxed">
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
                </>
              ) : (
                <>
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-4 shadow-md shrink-0"><ShieldCheck size={28} /></div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-1.5 leading-none">Enrollment Fortified</h3>
                  <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">Biometric signature active in Sentinel Ledger</p>
                  
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left space-y-2.5 font-mono text-[9px] text-slate-500 w-full mb-6">
                    <div className="flex justify-between">
                      <span className="uppercase font-bold">Enrollment Date:</span>
                      <span className="font-black text-slate-900">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200/50 pt-2">
                      <span className="uppercase font-bold">Trusted Device:</span>
                      <span className="font-black text-slate-900">Current Device</span>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => {
                        stopEnrollCamera();
                        setIsEnrolling(false);
                        setEnrollStep(0);
                        startTestCamera();
                      }}
                      className="flex-1 h-12 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-lg"
                    >
                      Test Login
                    </button>
                    <button
                      onClick={() => { stopEnrollCamera(); setIsEnrolling(false); setEnrollStep(0); }}
                      className="flex-1 h-12 bg-slate-950 hover:bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Close Modal
                    </button>
                  </div>
                </>
              )}

              <button onClick={() => { stopEnrollCamera(); setIsEnrolling(false); setEnrollStep(0); }} className="absolute top-4 right-4 text-slate-350 hover:text-slate-900 transition-all"><X size={20} /></button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── TEST LOGIN SIMULATION MODAL OVERLAY ── */}
      <AnimatePresence>
        {isTestingLogin && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={stopTestCamera} className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full h-[100dvh] md:h-auto md:max-w-md bg-white md:rounded-[28px] rounded-none p-6 md:p-8 shadow-2xl z-10 flex flex-col items-center justify-start md:justify-center overflow-y-auto py-8 md:py-8">
              
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic mb-1.5 flex items-center gap-1.5">
                Biometric Login Test
              </h3>
              <p className="text-[8px] font-bold text-slate-450 uppercase tracking-widest mb-4">
                {testLoginStep === 1 && 'STAGE 1: IDENTITY DISCOVERY — Center your face.'}
                {testLoginStep === 2 && 'STAGE 2: LIVENESS VERIFICATION — Blink twice slowly.'}
                {testLoginStep === 3 && 'STAGE 3: ANGULAR FACIAL RESOLUTION — Tilt head left.'}
                {testLoginStep === 4 && 'STAGE 4: MATRIX TEMPLATE DECRYPTION...'}
                {testLoginStep === 0 && 'Initialize test sequence.'}
              </p>

              <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-slate-950 shadow-[0_0_20px_rgba(99,102,241,0.3)] mb-6 flex items-center justify-center bg-slate-50">
                {testStream ? (
                  <video
                    ref={(node) => {
                      if (node) {
                        testVideoRef.current = node;
                        if (testStream && node.srcObject !== testStream) {
                          node.srcObject = testStream;
                          node.play().catch(err => console.error('Test camera play error:', err));
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
                {/* Visual HUD mesh */}
                <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-full circle-scan" />
                <div className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee] laser-line pointer-events-none animate-pulse" />
              </div>

              {testLoginStep === 0 && (
                <button
                  onClick={startTestCamera}
                  className="w-full h-11 bg-slate-950 hover:bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Camera size={14} /> Initialize Test Camera
                </button>
              )}

              {/* Done button for liveness test stages */}
              {testStream && (testLoginStep === 2 || testLoginStep === 3) && (
                <button
                  onClick={() => setTestLoginStep(prev => prev + 1)}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  ✓ Done — Next Step
                </button>
              )}

              <button
                onClick={stopTestCamera}
                className="w-full h-10 mt-2 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer"
              >
                Cancel Test
              </button>

              <button onClick={stopTestCamera} className="absolute top-4 right-4 text-slate-350 hover:text-slate-900 transition-all"><X size={20} /></button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
