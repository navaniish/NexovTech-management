import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  Briefcase, 
  FileText, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  UserPlus, 
  Mail, 
  Download,
  Sparkles,
  Zap,
  MoreVertical,
  X,
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import API_URL from '../config';

const AdminRecruitment = () => {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [stats, setStats] = useState({
    activeVacancies: 3,
    totalApplicants: 0,
    interviews: 0,
    hiringVelocity: '12 Days'
  });
  const [vacancies, setVacancies] = useState([
    { id: 1, title: 'Senior AI Specialist', dept: 'AI Core', applications: 24, status: 'Active' },
    { id: 2, title: 'Video Systems Engineer', dept: 'Video Design', applications: 12, status: 'Urgent' },
    { id: 3, title: 'Fullstack Architect', dept: 'Web Systems', applications: 48, status: 'Active' }
  ]);
  const [activeTab, setActiveTab] = useState('pipeline');

  const fetchRecruitmentData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/recruitment/summary`);
      if (response.ok) {
        const data = await response.json();
        setCandidates(data.candidates || []);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Talent link severed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruitmentData();
  }, []);

  const handleAddCandidate = async () => {
    const name = prompt('Enter Candidate Name:');
    const role = prompt('Enter Role:');
    if (!name || !role) return;

    try {
      const response = await fetch(`${API_URL}/recruitment/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, status: 'Applied', score: 85 })
      });
      if (response.ok) fetchRecruitmentData();
    } catch (err) {
      console.error('Registration failed');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">Scanning Talent Cloud...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#020617]/40 p-8 rounded-[48px] border border-white/5 backdrop-blur-md">
          <div>
             <h1 className="text-4xl font-black text-white tracking-tighter">Talent Command</h1>
             <p className="text-white/40 mt-2 font-bold uppercase tracking-[0.2em] text-[10px]">ATS Status: {candidates.length} Active Applicants</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                <input placeholder="Search candidates..." className="w-64 pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:ring-2 focus:ring-brand-500/20" />
             </div>
             <button 
                onClick={handleAddCandidate}
                className="bg-brand-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/30 flex items-center gap-2"
             >
                <UserPlus size={16} /> Add Candidate
             </button>
          </div>
       </div>

       {/* Stats Grid */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <StatCard label="Pipeline Total" value={stats.totalApplicants} icon={Users} color="text-brand-400" bgColor="bg-brand-600/10" />
           <StatCard label="Interviews" value={stats.interviews} icon={Calendar} color="text-indigo-400" bgColor="bg-indigo-600/10" />
           <StatCard label="Vacancies" value={stats.activeVacancies} icon={Briefcase} color="text-amber-500" bgColor="bg-amber-500/10" />
           <StatCard label="Hiring Velocity" value={stats.hiringVelocity} icon={TrendingUp} color="text-emerald-500" bgColor="bg-emerald-500/10" />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Recruitment Pipeline */}
          <div className="lg:col-span-2 glass-light rounded-[40px] border border-white/5 overflow-hidden flex flex-col">
             <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <Sparkles size={20} />
                   </div>
                   <h2 className="text-xl font-black text-white tracking-tight">Active Recruitment Pipeline</h2>
                </div>
                <div className="flex bg-[#020617] rounded-xl p-1 border border-white/5">
                   {['pipeline', 'vacancies'].map(tab => (
                      <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-brand-600 text-white shadow-lg' : 'text-white/20 hover:text-white'}`}
                      >
                         {tab}
                      </button>
                   ))}
                </div>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {activeTab === 'pipeline' ? (
                   <div className="space-y-4">
                      {candidates.length === 0 ? (
                         <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white/10">
                               <Users size={32} />
                            </div>
                            <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">No Candidates in Selection Stream</p>
                         </div>
                      ) : (
                         candidates.map((can, idx) => (
                            <div key={idx} className="flex items-center justify-between p-6 bg-white/5 rounded-[32px] border border-white/5 hover:border-brand-500/30 transition-all group">
                               <div className="flex items-center gap-5">
                                  <div className="w-12 h-12 bg-brand-600/20 rounded-2xl flex items-center justify-center text-brand-400 group-hover:bg-brand-600 group-hover:text-white transition-all">
                                     <FileText size={22} />
                                  </div>
                                  <div>
                                     <h4 className="text-sm font-black text-white">{can.name}</h4>
                                     <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-0.5">{can.role} • {can.experience} Exp</p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-8">
                                  <div className="hidden md:block">
                                     <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">AI Match Score</p>
                                     <div className="flex items-center gap-2">
                                        <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                           <div className="h-full bg-emerald-500" style={{ width: `${can.matchScore || 85}%` }} />
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-500">{can.matchScore || 85}%</span>
                                     </div>
                                  </div>
                                  <div className="text-right">
                                     <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                        can.status === 'Applied' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                                        can.status === 'Interview' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                        'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                     }`}>{can.status}</span>
                                  </div>
                                  <button className="p-2 text-white/20 hover:text-white transition-colors"><MoreVertical size={18} /></button>
                               </div>
                            </div>
                         ))
                      )}
                   </div>
                ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {vacancies.map(v => (
                         <div key={v.id} className="p-8 bg-[#020617] border border-white/5 rounded-[40px] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:scale-110 transition-transform">
                               <Briefcase size={80} className="text-white" />
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest mb-4 inline-block ${v.status === 'Urgent' ? 'bg-rose-500/20 text-rose-500' : 'bg-brand-500/20 text-brand-500'}`}>{v.status}</span>
                            <h4 className="text-xl font-black text-white tracking-tight">{v.title}</h4>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1">{v.dept}</p>
                            
                            <div className="flex items-center justify-between mt-8 pt-8 border-t border-white/5">
                               <div>
                                  <p className="text-[18px] font-black text-white">{v.applications}</p>
                                  <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Applications</p>
                               </div>
                               <button className="px-6 py-2.5 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5">View Board</button>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </div>
          </div>

          {/* Recruitment Analytics Sidebar */}
          <div className="space-y-8">
             <div className="glass-light p-8 rounded-[40px] border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:rotate-12 transition-transform">
                   <Zap size={100} className="text-white" />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight mb-2">Neural Sourcing</h3>
                <p className="text-[10px] text-brand-500 font-black uppercase tracking-widest mb-6">AI Recruitment Insights</p>
                
                <div className="space-y-6">
                   <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                      <div className="flex items-center gap-3 mb-4">
                         <TrendingUp size={16} className="text-emerald-500" />
                         <span className="text-[9px] font-black text-white uppercase tracking-widest">Growth Vector</span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed font-bold">
                         Specialist demand for **AI Core** has increased by 42% this quarter. Recommended: Initiate proactive sourcing.
                      </p>
                   </div>

                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Specialization Load</h4>
                      {[
                        { label: 'AI Core', val: 92, color: 'bg-brand-500' },
                        { label: 'Web Systems', val: 78, color: 'bg-indigo-500' },
                        { label: 'Video Ops', val: 45, color: 'bg-amber-500' }
                      ].map((load, i) => (
                         <div key={i} className="space-y-2">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                               <span className="text-white/40">{load.label}</span>
                               <span className="text-white">{load.val}% Capacity</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                               <motion.div initial={{ width: 0 }} animate={{ width: `${load.val}%` }} className={`h-full ${load.color}`} />
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             </div>

             <div className="bg-slate-900 rounded-[40px] p-8 border border-white/10">
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                      <TrendingUp size={20} />
                   </div>
                   <h3 className="text-lg font-black text-white tracking-tight">Hiring Velocity</h3>
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between items-end border-b border-white/5 pb-4">
                      <div>
                         <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Avg Time-to-Hire</p>
                         <p className="text-2xl font-black text-white">12.4 Days</p>
                      </div>
                      <div className="text-emerald-500 flex items-center gap-1 mb-1">
                         <TrendingUp size={12} />
                         <span className="text-[8px] font-black">14% faster</span>
                      </div>
                   </div>
                   <div className="flex justify-between items-end pt-2">
                      <div>
                         <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Offer Accept Rate</p>
                         <p className="text-2xl font-black text-white">88%</p>
                      </div>
                      <div className="text-emerald-500 flex items-center gap-1 mb-1">
                         <TrendingUp size={12} />
                         <span className="text-[8px] font-black">2.4% gain</span>
                      </div>
                   </div>
                </div>
                <button className="w-full py-4.5 bg-brand-600 text-white rounded-2xl mt-8 text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/20">Optimize Funnel</button>
             </div>
          </div>
       </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, bgColor }) => (
  <div className="glass-light p-8 rounded-[40px] border border-white/5 flex items-center gap-6 group hover:border-brand-500/30 transition-all">
     <div className={`w-14 h-14 ${bgColor} rounded-2xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
        <Icon size={28} />
     </div>
     <div>
        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
     </div>
  </div>
);

export default AdminRecruitment;
