import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, CheckCircle2, ArrowRight, User, 
  Mail, Lock, Building2, Briefcase, 
  Sparkles, ShieldCheck, Zap, ArrowLeft,
  Key, Globe, Cpu, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TeamAccess = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    inviteCode: '',
    name: '',
    email: '',
    role: 'Developer',
    department: 'Engineering',
    password: '',
    otp: ''
  });

  const nextStep = () => setStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate verification
    setTimeout(() => {
      setLoading(false);
      nextStep();
    }, 1500);
  };

  const steps = [
    { id: 1, label: 'Verify' },
    { id: 2, label: 'Identity' },
    { id: 3, label: 'Workspace' },
    { id: 4, label: 'Security' },
    { id: 5, label: 'Success' }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/50 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/50 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[540px]"
      >
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-[24px] shadow-2xl shadow-slate-200 border border-slate-100 mb-6 group hover:rotate-12 transition-transform duration-500">
            <ShieldCheck size={32} className="text-indigo-600" />
          </div>
          <h1 className="text-[32px] font-black text-slate-900 tracking-tighter leading-none mb-3">
             {step === 5 ? 'Welcome Aboard! 🚀' : 'Join NexovTech Workspace'}
          </h1>
          <p className="text-slate-400 text-[14px] font-medium max-w-sm mx-auto">
            {step === 1 && "Enter your enterprise invite code to begin your onboarding journey."}
            {step === 2 && "Confirm your identity for our global specialist registry."}
            {step === 3 && "Configure your operational environment and department."}
            {step === 4 && "Initialize your secure mission keys and authentication."}
            {step === 5 && "Your secure team environment is fully provisioned and ready."}
          </p>
        </div>

        {/* Step Indicator */}
        {step < 5 && (
          <div className="flex items-center justify-between px-10 mb-10 relative">
            <div className="absolute top-1/2 left-10 right-10 h-[2px] bg-slate-100 -translate-y-1/2 z-0" />
            {steps.slice(0, 4).map((s) => (
              <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-500 ${
                  step === s.id 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-125' 
                  : step > s.id 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-white text-slate-300 border border-slate-100'
                }`}>
                  {step > s.id ? <CheckCircle2 size={14} /> : s.id}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Onboarding Card */}
        <div className="glass-card !p-0 overflow-hidden bg-white/80 backdrop-blur-3xl border-white shadow-[0_40px_100px_-20px_rgba(15,23,42,0.1)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="p-8 md:p-12"
            >
              {step === 1 && (
                <form onSubmit={handleVerify} className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Invite Code</label>
                    <div className="relative group">
                      <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                      <input 
                        required
                        value={formData.inviteCode}
                        onChange={e => setFormData({...formData, inviteCode: e.target.value})}
                        className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-6 text-slate-900 font-bold text-lg tracking-[0.3em] uppercase placeholder:text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all" 
                        placeholder="NXV-XXXX-XXXX"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                    {loading ? <Activity size={20} className="animate-spin" /> : <>Verify Invitation <ArrowRight size={20} /></>}
                  </button>
                </form>
              )}

              {step === 2 && (
                <div className="space-y-8">
                   <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Specialist Name</label>
                        <div className="relative group">
                          <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 text-slate-900 font-bold text-sm focus:outline-none focus:border-indigo-500 transition-all" 
                            placeholder="e.g. Navaneeswar"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Official Email</label>
                        <div className="relative group">
                          <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input 
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 text-slate-900 font-bold text-sm focus:outline-none focus:border-indigo-500 transition-all" 
                            placeholder="navaniish@nexovtech.com"
                          />
                        </div>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <button onClick={prevStep} className="h-14 px-6 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-100 transition-all"><ArrowLeft size={18} /></button>
                      <button onClick={nextStep} className="flex-1 h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-indigo-600 transition-all">Confirm Identity</button>
                   </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                   <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Operational Role</label>
                        <div className="relative group">
                          <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <select 
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: e.target.value})}
                            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 text-slate-900 font-bold text-sm appearance-none focus:outline-none focus:border-indigo-500 transition-all"
                          >
                             <option>Developer</option>
                             <option>AI Specialist</option>
                             <option>Security Analyst</option>
                             <option>Manager</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assigned Department</label>
                        <div className="relative group">
                          <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <select 
                            value={formData.department}
                            onChange={e => setFormData({...formData, department: e.target.value})}
                            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 text-slate-900 font-bold text-sm appearance-none focus:outline-none focus:border-indigo-500 transition-all"
                          >
                             <option>Engineering</option>
                             <option>Core AI</option>
                             <option>Cyber Security</option>
                             <option>Operations</option>
                          </select>
                        </div>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <button onClick={prevStep} className="h-14 px-6 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-100 transition-all"><ArrowLeft size={18} /></button>
                      <button onClick={nextStep} className="flex-1 h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-indigo-600 transition-all">Setup Workspace</button>
                   </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8">
                   <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">New Mission Key (Password)</label>
                        <div className="relative group">
                          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input 
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 text-slate-900 font-bold text-sm focus:outline-none focus:border-indigo-500 transition-all" 
                            placeholder="••••••••••••"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">MFA Shield Initialization</p>
                        <div className="flex justify-between gap-3">
                           {[1,2,3,4,5,6].map(i => (
                             <input key={i} maxLength="1" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-xl text-center text-xl font-black text-indigo-600 outline-none focus:border-indigo-500" placeholder="-" />
                           ))}
                        </div>
                      </div>
                   </div>
                   <div className="flex gap-4 pt-4">
                      <button onClick={prevStep} className="h-14 px-6 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-100 transition-all"><ArrowLeft size={18} /></button>
                      <button onClick={nextStep} className="flex-1 h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-indigo-500 transition-all">Secure & Activate</button>
                   </div>
                </div>
              )}

              {step === 5 && (
                <div className="text-center py-6 space-y-8">
                   <div className="relative inline-block">
                      <div className="w-24 h-24 bg-emerald-500 rounded-[32px] flex items-center justify-center text-white shadow-2xl shadow-emerald-200 animate-bounce">
                        <CheckCircle2 size={48} strokeWidth={3} />
                      </div>
                      <motion.div 
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 bg-emerald-500 rounded-[32px] z-[-1]"
                      />
                   </div>
                   
                   <div className="space-y-2">
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Access Granted</h3>
                      <p className="text-slate-400 text-sm font-medium">Your credentials have been successfully synchronized with NexovTech Mission Control.</p>
                   </div>

                   <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 text-left space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Network Access</span>
                         <span className="text-[10px] font-black text-emerald-500 uppercase">Authorized</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Clearance</span>
                         <span className="text-[10px] font-black text-indigo-500 uppercase">Level 4</span>
                      </div>
                   </div>

                   <button 
                     onClick={() => window.location.href = '/login'}
                     className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3"
                   >
                      Enter Workspace <ArrowRight size={20} />
                   </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <div className="mt-12 flex items-center justify-center gap-8 opacity-40">
           <div className="flex items-center gap-2">
              <Shield size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">256-bit AES</span>
           </div>
           <div className="flex items-center gap-2">
              <Globe size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Global CDN</span>
           </div>
           <div className="flex items-center gap-2">
              <Cpu size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Neural Auth</span>
           </div>
        </div>
      </motion.div>

      {/* AI Assistant Peek */}
      <div className="fixed bottom-10 right-10 flex items-center gap-4 bg-white p-4 rounded-[24px] shadow-2xl border border-slate-100 group cursor-pointer hover:scale-105 transition-all">
         <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Sparkles size={20} />
         </div>
         <div className="pr-4">
            <p className="text-[10px] font-black text-slate-900 uppercase leading-none">Need help?</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">AI Assistant is online</p>
         </div>
      </div>
    </div>
  );
};

export default TeamAccess;
