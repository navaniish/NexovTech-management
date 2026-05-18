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

const StatCard = ({ label, value, icon: Icon, color, bgColor }) => (
  <div className="glass-light p-4 sm:p-6 md:p-8 rounded-[20px] md:rounded-[40px] border border-gray-100 flex items-center gap-4 sm:gap-6 group hover:border-brand-500/30 transition-all">
     <div className={`w-10 h-10 sm:w-14 sm:h-14 ${bgColor} rounded-xl sm:rounded-2xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform shrink-0`}>
        <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
     </div>
     <div>
        <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 sm:mb-1">{label}</p>
        <p className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 tracking-tighter leading-none">{value}</p>
     </div>
  </div>
);

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
       <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Scanning Talent Cloud...</p>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 md:p-10 space-y-6 md:space-y-8 pb-20 max-w-7xl mx-auto overflow-y-auto scrollbar-hide">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 p-4 sm:p-6 md:p-8 rounded-[24px] md:rounded-[48px] border border-gray-100 backdrop-blur-md">
          <div>
             <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tighter">Talent Command</h1>
             <p className="text-gray-400 mt-2 font-bold uppercase tracking-[0.2em] text-[10px]">ATS Status: {candidates.length} Active Applicants</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
             <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                <input placeholder="Search candidates..." className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 text-xs outline-none focus:ring-2 focus:ring-brand-500/20" />
             </div>
             <button 
                onClick={handleAddCandidate}
                className="bg-brand-600 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/30 flex items-center justify-center gap-2"
             >
                <UserPlus size={16} /> Add Candidate
             </button>
          </div>
       </div>

       {/* Stats Grid */}
       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard label="Pipeline Total" value={stats.totalApplicants} icon={Users} color="text-brand-400" bgColor="bg-brand-600/10" />
            <StatCard label="Interviews" value={stats.interviews} icon={Calendar} color="text-indigo-400" bgColor="bg-indigo-600/10" />
            <StatCard label="Vacancies" value={stats.activeVacancies} icon={Briefcase} color="text-amber-500" bgColor="bg-amber-500/10" />
            <StatCard label="Hiring Velocity" value={stats.hiringVelocity} icon={TrendingUp} color="text-emerald-500" bgColor="bg-emerald-500/10" />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Recruitment Pipeline */}
          <div className="lg:col-span-2 glass-light rounded-[24px] md:rounded-[40px] border border-gray-100 overflow-hidden flex flex-col">
             <div className="p-4 sm:p-6 md:p-8 border-b border-gray-100 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between bg-gray-50">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-gray-900 shadow-lg shrink-0">
                      <Sparkles size={20} />
                   </div>
                   <h2 className="text-base sm:text-lg md:text-xl font-black text-gray-900 tracking-tight">Active Recruitment Pipeline</h2>
                </div>
                <div className="flex bg-white rounded-xl p-1 border border-gray-100 w-fit">
                   {['pipeline', 'vacancies'].map(tab => (
                      <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-300 hover:text-gray-900'}`}
                      >
                         {tab}
                      </button>
                   ))}
                </div>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                {activeTab === 'pipeline' ? (
                   <div className="space-y-4">
                      {candidates.length === 0 ? (
                         <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-white/10">
                               <Users size={32} />
                            </div>
                            <p className="text-gray-300 font-black uppercase tracking-widest text-[10px]">No Candidates in Selection Stream</p>
                         </div>
                      ) : (
                         candidates.map((can, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 bg-gray-50 rounded-[20px] sm:rounded-[32px] border border-gray-100 hover:border-brand-500/30 transition-all group gap-4">
                               <div className="flex items-center gap-4 sm:gap-5">
                                  <div className="w-12 h-12 bg-brand-600/20 rounded-2xl flex items-center justify-center text-brand-400 group-hover:bg-brand-600 group-hover:text-gray-900 transition-all shrink-0">
                                     <FileText size={22} />
                                  </div>
                                  <div className="min-w-0">
                                     <h4 className="text-sm font-black text-gray-900 truncate">{can.name}</h4>
                                     <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-0.5 truncate">{can.role} • {can.experience} Exp</p>
                                  </div>
                               </div>
                               <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                                  <div className="hidden md:block">
                                     <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">AI Match Score</p>
                                     <div className="flex items-center gap-2">
                                        <div className="w-20 h-1.5 bg-gray-50 rounded-full overflow-hidden">
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
                                  <button className="p-2 text-gray-300 hover:text-gray-900 transition-colors"><MoreVertical size={18} /></button>
                               </div>
                            </div>
                         ))
                      )}
                   </div>
                ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {vacancies.map(v => (
                         <div key={v.id} className="p-6 sm:p-8 bg-white border border-gray-100 rounded-[24px] md:rounded-[40px] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:scale-110 transition-transform">
                               <Briefcase size={80} className="text-gray-900" />
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest mb-4 inline-block ${v.status === 'Urgent' ? 'bg-rose-500/20 text-rose-500' : 'bg-brand-500/20 text-brand-500'}`}>{v.status}</span>
                            <h4 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">{v.title}</h4>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{v.dept}</p>
                            
                            <div className="flex items-center justify-between mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-100">
                               <div>
                                  <p className="text-base sm:text-[18px] font-black text-gray-900">{v.applications}</p>
                                  <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Applications</p>
                               </div>
                               <button className="px-5 py-2 bg-gray-50 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 hover:bg-white/10 transition-all border border-gray-100">View Board</button>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </div>
          </div>

          {/* Recruitment Analytics Sidebar */}
          <div className="space-y-6 md:space-y-8">
             <div className="glass-light p-4 sm:p-6 md:p-8 rounded-[24px] md:rounded-[40px] border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:rotate-12 transition-transform">
                   <Zap size={100} className="text-gray-900" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight mb-2">Neural Sourcing</h3>
                <p className="text-[10px] text-brand-500 font-black uppercase tracking-widest mb-6">AI Recruitment Insights</p>
                
                <div className="space-y-6">
                   <div className="p-4 sm:p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      <div className="flex items-center gap-3 mb-4">
                         <TrendingUp size={16} className="text-emerald-500" />
                         <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">Growth Vector</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed font-bold">
                         Specialist demand for **AI Core** has increased by 42% this quarter. Recommended: Initiate proactive sourcing.
                      </p>
                   </div>

                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Specialization Load</h4>
                      {[
                        { label: 'AI Core', val: 92, color: 'bg-brand-500' },
                        { label: 'Web Systems', val: 78, color: 'bg-indigo-500' },
                        { label: 'Video Ops', val: 45, color: 'bg-amber-500' }
                      ].map((load, i) => (
                         <div key={i} className="space-y-2">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                               <span className="text-gray-400">{load.label}</span>
                               <span className="text-gray-900">{load.val}% Capacity</span>
                            </div>
                            <div className="h-1 bg-gray-50 rounded-full overflow-hidden">
                               <motion.div initial={{ width: 0 }} animate={{ width: `${load.val}%` }} className={`h-full ${load.color}`} />
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             </div>

             <div className="bg-white rounded-[24px] md:rounded-[40px] p-4 sm:p-6 md:p-8 border border-gray-200">
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                   <div className="w-10 h-10 bg-indigo-50/20 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                      <TrendingUp size={20} />
                   </div>
                   <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">Hiring Velocity</h3>
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                      <div>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg Time-to-Hire</p>
                         <p className="text-xl sm:text-2xl font-black text-gray-900">12.4 Days</p>
                      </div>
                      <div className="text-emerald-500 flex items-center gap-1 mb-1">
                         <TrendingUp size={12} />
                         <span className="text-[8px] font-black">14% faster</span>
                      </div>
                   </div>
                   <div className="flex justify-between items-end pt-2">
                      <div>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Offer Accept Rate</p>
                         <p className="text-xl sm:text-2xl font-black text-gray-900">88%</p>
                      </div>
                      <div className="text-emerald-500 flex items-center gap-1 mb-1">
                         <TrendingUp size={12} />
                         <span className="text-[8px] font-black">2.4% gain</span>
                      </div>
                   </div>
                </div>
                <button className="w-full py-3.5 bg-brand-600 text-white rounded-2xl mt-6 sm:mt-8 text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/20">Optimize Funnel</button>
             </div>
          </div>
       </div>
    </div>
  );
};

export default AdminRecruitment;


