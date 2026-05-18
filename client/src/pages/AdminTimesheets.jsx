import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, CheckCircle2, XCircle, Search, Filter, 
  Loader2, Calendar, User, Briefcase, FileText,
  Sparkles, ChevronRight, MoreVertical, Check, X
} from 'lucide-react';
import API_URL from '../config';

const StatCard = ({ label, value, icon: Icon, color, bgColor }) => (
  <div className="glass-card flex items-center gap-3 sm:gap-6 group hover:border-brand-500/30 transition-all">
     <div className={`w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 ${bgColor} rounded-xl sm:rounded-2xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform shrink-0`}>
        <Icon className="w-5 h-5 sm:w-8 sm:h-8" />
     </div>
     <div>
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">{label}</p>
        <p className="text-xl sm:text-2xl md:text-[36px] font-black text-slate-900 tracking-tighter leading-none">{value}</p>
     </div>
  </div>
);

const AdminTimesheets = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Submitted');
  const [stats, setStats] = useState({
    pending: 0,
    totalHours: 0,
    approvedCount: 0
  });

  const fetchAllTimesheets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/timesheet/admin/all`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
        
        // Calculate stats
        const pending = data.filter(e => e.status === 'Submitted').length;
        const totalHours = data.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
        const approvedCount = data.filter(e => e.status === 'Approved').length;
        setStats({ pending, totalHours, approvedCount });
      }
    } catch (err) {
      console.error('Temporal link severed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTimesheets();
  }, []);

  const handleAction = async (id, status) => {
    try {
      const response = await fetch(`${API_URL}/timesheet/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        fetchAllTimesheets();
      }
    } catch (err) {
      console.error('Action protocol failure');
    }
  };

  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.userName?.toLowerCase().includes(search.toLowerCase()) || 
                         e.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
       <Loader2 size={64} className="text-brand-500 animate-spin" />
       <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Accessing Global Temporal Ledger...</p>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 md:p-10 space-y-6 md:space-y-10 animate-in fade-in duration-1000 overflow-y-auto scrollbar-hide">
      
      {/* Header */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/40 p-4 sm:p-6 md:p-10 rounded-[24px] md:rounded-[48px] border border-gray-100 backdrop-blur-md shadow-xl shadow-slate-900/5">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none mb-2">
             TEMPORAL COMMAND
          </h1>
          <p className="text-slate-400 text-xs md:text-[14px] font-bold tracking-[0.05em]">
             Authorized oversight of specialist effort and mission logs.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
           <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search specialist or mission..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 md:h-14 pl-12 pr-6 bg-white border border-slate-100 rounded-2xl text-[13px] font-medium focus:outline-none focus:border-brand-500 transition-all shadow-sm"
              />
           </div>
           <select 
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
             className="h-12 md:h-14 px-6 bg-white border border-slate-100 rounded-2xl text-[12px] font-black uppercase tracking-widest text-slate-600 focus:outline-none focus:border-brand-500 transition-all shadow-sm cursor-pointer"
           >
              <option value="Submitted">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="All">Global Log</option>
           </select>
        </div>
      </section>

      {/* Stats Row */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        <div className="col-span-2 sm:col-span-1">
          <StatCard label="Awaiting Approval" value={stats.pending} icon={Clock} color="text-amber-500" bgColor="bg-amber-500/10" />
        </div>
        <StatCard label="Total Effort (h)" value={stats.totalHours.toFixed(1)} icon={CheckCircle2} color="text-emerald-500" bgColor="bg-emerald-500/10" />
        <StatCard label="Authorized Logs" value={stats.approvedCount} icon={Sparkles} color="text-brand-500" bgColor="bg-brand-500/10" />
      </section>

      {/* Main Table */}
      <div className="glass-card p-0 overflow-hidden shadow-2xl shadow-slate-900/5">
        <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between bg-gray-50/50">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
                 <Calendar size={20} />
              </div>
              <h2 className="text-base sm:text-lg md:text-[20px] font-black text-slate-900 tracking-tight">Temporal Records</h2>
           </div>
           <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Sync</span>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="p-4 sm:p-6 md:p-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Specialist</th>
                <th className="p-4 sm:p-6 md:p-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mission Description</th>
                <th className="p-4 sm:p-6 md:p-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Effort</th>
                <th className="p-4 sm:p-6 md:p-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="p-4 sm:p-6 md:p-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((entry, idx) => (
                <tr key={entry._id || idx} className="group hover:bg-slate-50/30 transition-colors">
                  <td className="p-4 sm:p-6 md:p-8">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 border-white shadow-md shrink-0">
                        <img src={entry.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userName}`} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-black text-slate-900 leading-snug">{entry.userName}</p>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(entry.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 sm:p-6 md:p-8">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:text-brand-500 transition-colors shrink-0">
                          <Briefcase size={16} />
                       </div>
                       <div>
                          <p className="text-xs sm:text-sm font-black text-slate-900 leading-snug">{entry.description || 'General Mission'}</p>
                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Project: {entry.projectTitle || 'Internal'}</p>
                       </div>
                    </div>
                  </td>
                  <td className="p-4 sm:p-6 md:p-8">
                    <div className="flex flex-col">
                       <span className="text-sm sm:text-base font-black text-slate-900">{entry.hoursWorked}h</span>
                       <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Temporal Unit</span>
                    </div>
                  </td>
                  <td className="p-4 sm:p-6 md:p-8">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                      entry.status === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                      entry.status === 'Rejected' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 
                      'bg-amber-500/10 border-amber-500/20 text-amber-500'
                    }`}>
                      <div className={`w-1 h-1 rounded-full ${
                        entry.status === 'Approved' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 
                        entry.status === 'Rejected' ? 'bg-rose-500' : 'bg-amber-500'
                      }`} />
                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em]">{entry.status}</span>
                    </div>
                  </td>
                  <td className="p-4 sm:p-6 md:p-8 text-right">
                    {entry.status === 'Submitted' ? (
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        <button 
                          onClick={() => handleAction(entry._id, 'Approved')}
                          className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg hover:shadow-emerald-500/20 shrink-0"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => handleAction(entry._id, 'Rejected')}
                          className="p-2 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-lg hover:shadow-rose-500/20 shrink-0"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEntries.length === 0 && (
            <div className="py-32 text-center flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center text-slate-200">
                <FileText size={40} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No Temporal Records Matching Filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTimesheets;
