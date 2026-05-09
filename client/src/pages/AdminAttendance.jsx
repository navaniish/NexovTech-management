import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Filter, 
  Download, 
  Calendar as CalendarIcon,
  Zap,
  Users,
  MapPin,
  TrendingUp,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2
} from 'lucide-react';
import API_URL from '../config';

const AdminAttendance = () => {
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({
    present: 0,
    late: 0,
    onLeave: 0,
    avgTime: '09:12 AM'
  });
  const [viewMode, setViewMode] = useState('daily'); // daily, monthly, heatmap

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/attendance/admin/summary`);
      if (response.ok) {
        const data = await response.json();
        setAttendance(data.records || []);
        setStats(data.stats || stats);
      }
    } catch (err) {
      console.error('Attendance link severed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleExport = () => {
    if (!attendance.length) return;
    
    const headers = ['Specialist', 'Role', 'Check-In', 'Location', 'Status', 'Efficiency'];
    const rows = attendance.map(rec => [
      rec.name,
      rec.role,
      rec.checkIn || '09:00 AM',
      rec.location || 'HQ Office',
      rec.status || 'On-Time',
      `${rec.efficiency || 95}%`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `NexovTech_Attendance_Log_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">Synchronizing Bio-Metric Data...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#020617]/40 p-8 rounded-[48px] border border-white/5 backdrop-blur-md">
          <div>
             <h1 className="text-4xl font-black text-white tracking-tighter">Smart Attendance</h1>
             <p className="text-white/40 mt-2 font-bold uppercase tracking-[0.2em] text-[10px]">Bio-Metric Command: {stats.present} Specialists On-Site</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                <input placeholder="Search specialists..." className="w-64 pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:ring-2 focus:ring-brand-500/20" />
             </div>
             <button className="p-3 bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all border border-white/5"><Filter size={18} /></button>
             <button 
               onClick={handleExport}
               className="bg-brand-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/30 flex items-center gap-2"
             >
                <Download size={16} /> Export Logs
             </button>
          </div>
       </div>

       {/* Real-time Stats Grid */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard label="On-Site Now" value={stats.present} icon={CheckCircle2} color="text-emerald-500" bgColor="bg-emerald-500/10" />
          <StatCard label="Late Arrivals" value={stats.late} icon={AlertTriangle} color="text-amber-500" bgColor="bg-amber-500/10" />
          <StatCard label="Offline/Leave" value={stats.onLeave} icon={XCircle} color="text-rose-500" bgColor="bg-rose-500/10" />
          <StatCard label="Avg Check-in" value={stats.avgTime} icon={Clock} color="text-brand-400" bgColor="bg-brand-600/10" />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Attendance Grid */}
          <div className="lg:col-span-2 glass-light rounded-[40px] border border-white/5 overflow-hidden">
             <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <CalendarIcon size={20} />
                   </div>
                   <h2 className="text-xl font-black text-white tracking-tight">Personnel Log: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
                </div>
                <div className="flex bg-[#020617] rounded-xl p-1 border border-white/5">
                   {['daily', 'heatmap'].map(mode => (
                      <button 
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-brand-600 text-white shadow-lg' : 'text-white/20 hover:text-white'}`}
                      >
                         {mode}
                      </button>
                   ))}
                </div>
             </div>

             <div className="p-0">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                         <th className="p-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Specialist</th>
                         <th className="p-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Check-In</th>
                         <th className="p-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Status</th>
                         <th className="p-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Efficiency</th>
                         <th className="p-6"></th>
                      </tr>
                   </thead>
                   <tbody>
                      {attendance.map((rec, idx) => (
                         <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                            <td className="p-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-brand-600 p-0.5">
                                     <img src={rec.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.name}`} className="w-full h-full object-cover rounded-[9px]" alt="" />
                                  </div>
                                  <div>
                                     <p className="text-sm font-black text-white">{rec.name}</p>
                                     <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{rec.role}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="p-6">
                               <div className="flex flex-col">
                                  <span className="text-xs font-black text-white">{rec.checkIn || '09:00 AM'}</span>
                                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">{rec.location || 'HYD Office'}</span>
                               </div>
                            </td>
                            <td className="p-6">
                               <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                                  rec.status === 'On-Time' 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                                  : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                               }`}>
                                  <div className={`w-1 h-1 rounded-full ${rec.status === 'On-Time' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                  <span className="text-[9px] font-black uppercase tracking-widest">{rec.status || 'On-Time'}</span>
                               </div>
                            </td>
                            <td className="p-6">
                               <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${rec.efficiency || 95}%` }} className="h-full bg-brand-500 rounded-full" />
                               </div>
                            </td>
                            <td className="p-6 text-right">
                               <button className="p-2 text-white/20 hover:text-white transition-colors"><MoreVertical size={18} /></button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          {/* Late-Detection Analytics */}
          <div className="space-y-8">
             <div className="glass-light p-8 rounded-[40px] border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:rotate-12 transition-transform">
                   <Zap size={100} className="text-white" />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight mb-2">Late Detection</h3>
                <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-6">Protocol Breach Flagged</p>
                
                <div className="space-y-4">
                   {attendance.filter(r => r.status === 'Late').length > 0 ? (
                     attendance.filter(r => r.status === 'Late').map((late, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-amber-500/30 transition-all">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                                 <AlertTriangle size={16} />
                              </div>
                              <div>
                                 <p className="text-xs font-black text-white">{late.name}</p>
                                 <p className="text-[9px] text-white/20 font-black uppercase mt-0.5">{late.checkIn} ({late.delay || '+0m'})</p>
                              </div>
                           </div>
                           <button className="px-3 py-1.5 bg-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all border border-white/5">Audit</button>
                        </div>
                     ))
                   ) : (
                     <div className="py-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                        <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={24} />
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No Protocol Breaches Detected</p>
                     </div>
                   )}
                </div>
                <button className="w-full py-4 bg-white/5 border border-white/5 rounded-2xl mt-6 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all">Audit Full Incident Log</button>
             </div>

             <div className="bg-slate-900 rounded-[40px] p-8 border border-white/10 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                      <TrendingUp size={20} />
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-white tracking-tight">Workforce WPS</h3>
                      <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mt-0.5">Global Productivity Score</p>
                   </div>
                </div>

                <div className="flex flex-col items-center justify-center py-4">
                   <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90">
                         <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-white/5" />
                         <motion.circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-indigo-500" strokeDasharray="364.4" initial={{ strokeDashoffset: 364.4 }} animate={{ strokeDashoffset: 364.4 - (364.4 * (stats.onTimeRate || 100)) / 100 }} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-3xl font-black text-white">{stats.onTimeRate || 100}%</span>
                         <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{stats.onTimeRate < 90 ? 'Warning' : 'Optimized'}</span>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                   <div className="p-4 bg-white/5 rounded-2xl">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">On-Time Rate</p>
                      <p className={`text-xl font-black ${stats.onTimeRate < 90 ? 'text-amber-500' : 'text-emerald-500'}`}>{stats.onTimeRate || 100}%</p>
                   </div>
                   <div className="p-4 bg-white/5 rounded-2xl">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Late Arrivals</p>
                      <p className="text-xl font-black text-rose-500">{stats.late || 0}</p>
                   </div>
                </div>
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

export default AdminAttendance;
