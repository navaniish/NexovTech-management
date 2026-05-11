import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Filter, 
  Search, 
  Download,
  Users,
  Briefcase,
  FileText,
  UserCheck,
  UserMinus,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import API_URL from '../config';

const AdminLeaves = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    teamAvailability: '94%'
  });
  const [activeTab, setActiveTab] = useState('pending');

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/leaves/admin/summary`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
        setStats(data.stats || stats);
      }
    } catch (err) {
      console.error('Leave protocol link severed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleAction = async (id, action) => {
    try {
      const response = await fetch(`${API_URL}/leaves/admin/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, action })
      });
      if (response.ok) {
        fetchLeaves();
      }
    } catch (err) {
      console.error('Action protocol failed:', err);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Syncing Leave Protocols...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 p-8 rounded-[48px] border border-gray-100 backdrop-blur-md">
          <div>
             <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Leave Command</h1>
             <p className="text-gray-400 mt-2 font-bold uppercase tracking-[0.2em] text-[10px]">Workforce Stability: {stats.teamAvailability} Availability Rate</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                <input placeholder="Search requests..." className="w-64 pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 text-xs outline-none focus:ring-2 focus:ring-brand-500/20" />
             </div>
             <button className="bg-brand-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/30 flex items-center gap-2">
                <Download size={16} /> Export Reports
             </button>
          </div>
       </div>

       {/* Stats Grid */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard label="Pending Action" value={stats.pending} icon={Clock} color="text-amber-500" bgColor="bg-amber-500/10" />
          <StatCard label="Approved (Month)" value={stats.approved} icon={CheckCircle2} color="text-emerald-500" bgColor="bg-emerald-500/10" />
          <StatCard label="Absence Load" value="4.2%" icon={UserMinus} color="text-rose-500" bgColor="bg-rose-500/10" />
          <StatCard label="Availability" value={stats.teamAvailability} icon={UserCheck} color="text-brand-400" bgColor="bg-brand-600/10" />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Leave Requests Table */}
          <div className="lg:col-span-2 glass-light rounded-[40px] border border-gray-100 overflow-hidden flex flex-col">
             <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-gray-900 shadow-lg">
                      <Calendar size={20} />
                   </div>
                   <h2 className="text-xl font-black text-gray-900 tracking-tight">Request Protocol Queue</h2>
                </div>
                <div className="flex bg-white rounded-xl p-1 border border-gray-100">
                   {['pending', 'history'].map(tab => (
                      <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-300 hover:text-gray-900'}`}
                      >
                         {tab}
                      </button>
                   ))}
                </div>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar">
                {requests.filter(r => activeTab === 'pending' ? r.status === 'Pending' : r.status !== 'Pending').length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-32 gap-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-white/10">
                         <FileText size={32} />
                      </div>
                      <p className="text-gray-300 font-black uppercase tracking-widest text-[10px]">No Active Requests in Queue</p>
                   </div>
                ) : (
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="border-b border-gray-100 bg-white/[0.02]">
                            <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Specialist</th>
                            <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Duration</th>
                            <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Category</th>
                            <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                            <th className="p-6"></th>
                         </tr>
                      </thead>
                      <tbody>
                         {requests.filter(r => activeTab === 'pending' ? r.status === 'Pending' : r.status !== 'Pending').map((req, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-white/[0.02] transition-colors group">
                               <td className="p-6">
                                  <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 rounded-xl overflow-hidden bg-brand-600 p-0.5">
                                        <img src={req.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.name}`} className="w-full h-full object-cover rounded-[9px]" alt="" />
                                     </div>
                                     <div>
                                        <p className="text-sm font-black text-gray-900">{req.name}</p>
                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{req.role}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="p-6">
                                  <div className="flex flex-col">
                                     <span className="text-xs font-black text-gray-900">{new Date(req.startDate).toLocaleDateString()}</span>
                                     <span className="text-[8px] font-black text-brand-500 uppercase tracking-widest mt-1">{req.days} Day(s)</span>
                                  </div>
                               </td>
                               <td className="p-6">
                                  <div className="flex items-center gap-2">
                                     <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                                     <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">{req.type || 'Casual'}</span>
                                  </div>
                               </td>
                               <td className="p-6">
                                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                                     req.status === 'Pending' ? 'text-amber-500' : 
                                     req.status === 'Approved' ? 'text-emerald-500' : 'text-rose-500'
                                  }`}>{req.status}</span>
                               </td>
                               <td className="p-6 text-right">
                                  {req.status === 'Pending' ? (
                                     <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => handleAction(req._id, 'Approved')} className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-gray-900 transition-all"><CheckCircle2 size={16} /></button>
                                        <button onClick={() => handleAction(req._id, 'Rejected')} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-gray-900 transition-all"><XCircle size={16} /></button>
                                     </div>
                                  ) : (
                                     <button className="p-2 text-gray-300 hover:text-gray-900 transition-colors"><MoreVertical size={18} /></button>
                                  )}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                )}
             </div>
          </div>

          {/* Leave Intelligence Sidebar */}
          <div className="space-y-8">
             <div className="glass-light p-8 rounded-[40px] border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:rotate-12 transition-transform">
                   <Briefcase size={100} className="text-gray-900" />
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Workload Analysis</h3>
                <p className="text-[10px] text-brand-500 font-black uppercase tracking-widest mb-6">Absence Impact Assessment</p>
                
                <div className="space-y-6">
                   <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      <div className="flex items-center gap-3 mb-4">
                         <Sparkles size={16} className="text-brand-400" />
                         <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">AI Prediction</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed font-bold">
                         Current absence load is within safe operational limits. Team velocity remains stable at 94.2%.
                      </p>
                   </div>

                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Team Balance</h4>
                      {[
                        { label: 'Development', val: 98, color: 'bg-emerald-500' },
                        { label: 'Video Ops', val: 72, color: 'bg-amber-500' },
                        { label: 'AI Core', val: 94, color: 'bg-indigo-500' }
                      ].map((dept, i) => (
                         <div key={i} className="space-y-2">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                               <span className="text-gray-400">{dept.label}</span>
                               <span className="text-gray-900">{dept.val}% Available</span>
                            </div>
                            <div className="h-1 bg-gray-50 rounded-full overflow-hidden">
                               <motion.div initial={{ width: 0 }} animate={{ width: `${dept.val}%` }} className={`h-full ${dept.color}`} />
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             </div>

             <div className="bg-white rounded-[40px] p-8 border border-gray-200 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-400">
                      <AlertTriangle size={20} />
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">Critical Alerts</h3>
                      <p className="text-[9px] text-rose-400 font-black uppercase tracking-widest mt-0.5">Staffing Shortage Warning</p>
                   </div>
                </div>
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                   <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Alert: Video Ops</p>
                   <p className="text-xs text-gray-600 font-bold">Over 25% of Video Specialists are scheduled for leave next week.</p>
                </div>
                <button className="w-full py-4 bg-gray-50 border border-gray-100 rounded-2xl mt-6 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all">Review Schedule</button>
             </div>
          </div>
       </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, bgColor }) => (
  <div className="glass-light p-8 rounded-[40px] border border-gray-100 flex items-center gap-6 group hover:border-brand-500/30 transition-all">
     <div className={`w-14 h-14 ${bgColor} rounded-2xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
        <Icon size={28} />
     </div>
     <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-gray-900 tracking-tighter">{value}</p>
     </div>
  </div>
);

export default AdminLeaves;


