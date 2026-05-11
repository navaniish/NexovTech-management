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
  Loader2,
  Globe
} from 'lucide-react';
import API_URL from '../config';

const StatCard = ({ label, value, icon: Icon, color, bgColor }) => (
  <div className="glass-card flex items-center gap-6 group">
     <div className={`w-14 h-14 ${bgColor} rounded-2xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
        <Icon size={26} strokeWidth={2.5} />
     </div>
     <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-[28px] font-black text-slate-900 tracking-tighter leading-none">{value}</p>
     </div>
  </div>
);

const AdminAttendance = () => {
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({
    present: 0,
    late: 0,
    onLeave: 0,
    avgTime: '09:12 AM',
    onTimeRate: 98.4
  });
  const [viewMode, setViewMode] = useState('daily');

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/attendance/admin/summary`);
      if (response.ok) {
        const data = await response.json();
        setAttendance(data.records || []);
        setStats(prev => ({ ...prev, ...data.stats }));
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
    const rows = attendance.map(rec => [rec.name, rec.role, rec.checkIn || '09:00 AM', rec.location || 'HQ Office', rec.status || 'On-Time', `${rec.efficiency || 95}%`]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
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
    <div className="flex flex-col items-center justify-center py-40 gap-6">
       <div className="w-16 h-16 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin" />
       <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Synchronizing Bio-Metric Data...</p>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col p-10 space-y-10 animate-in fade-in duration-1000 overflow-y-auto scrollbar-hide">
      
      {/* 1. HEADER SECTION */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="flex flex-col">
          <h1 className="text-[42px] font-black text-slate-900 tracking-tighter leading-none mb-2">
             SMART ATTENDANCE
          </h1>
          <p className="text-slate-400 text-[14px] font-bold tracking-[0.05em]">
             Bio-metric command: {stats.present} specialists active on-site.
          </p>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="relative w-[320px]">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search specialists..." 
                className="w-full h-12 pl-12 pr-6 bg-white border border-white rounded-2xl text-[13px] font-medium focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
              />
           </div>
           <button className="h-12 w-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
              <Filter size={20} />
           </button>
           <button 
             onClick={handleExport}
             className="h-12 px-8 bg-indigo-600 text-white text-[12px] font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 uppercase tracking-widest"
           >
              <Download size={18} /> EXPORT LOGS
           </button>
        </div>
      </section>

      {/* 2. REAL-TIME STATS ROW */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <StatCard label="On-Site Now" value={stats.present} icon={CheckCircle2} color="text-emerald-500" bgColor="bg-emerald-500/10" />
        <StatCard label="Late Arrivals" value={stats.late} icon={AlertTriangle} color="text-amber-500" bgColor="bg-amber-500/10" />
        <StatCard label="Offline/Leave" value={stats.onLeave} icon={XCircle} color="text-rose-500" bgColor="bg-rose-500/10" />
        <StatCard label="Avg Check-In" value={stats.avgTime} icon={Clock} color="text-indigo-600" bgColor="bg-indigo-600/10" />
      </section>

      {/* 3. MAIN CONTENT GRID */}
      <div className="grid grid-cols-12 gap-10 flex-1 items-start">
        
        {/* Personnel Log Table */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
           <div className="glass-card p-0 overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                       <CalendarIcon size={20} />
                    </div>
                    <h2 className="text-[18px] font-black text-slate-900 tracking-tight">Personnel Log: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
                 </div>
                 <div className="flex bg-slate-50 p-1 rounded-xl">
                    {['daily', 'heatmap'].map(mode => (
                       <button 
                         key={mode} 
                         onClick={() => setViewMode(mode)}
                         className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                       >
                          {mode}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-slate-50/50">
                          <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Specialist</th>
                          <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Check-In</th>
                          <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                          <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Efficiency</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {attendance.map((rec, idx) => (
                          <tr key={idx} className="group hover:bg-slate-50/30 transition-colors">
                             <td className="p-8">
                                <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-lg">
                                      <img src={rec.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.name}`} className="w-full h-full object-cover" alt="" />
                                   </div>
                                   <div>
                                      <p className="text-[14px] font-black text-slate-900">{rec.name}</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{rec.role}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="p-8">
                                <div className="flex flex-col">
                                   <span className="text-[14px] font-black text-slate-900">{rec.checkIn || '09:00 AM'}</span>
                                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{rec.location || 'HQ'}</span>
                                </div>
                             </td>
                             <td className="p-8">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                                   rec.status === 'On-Time' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                }`}>
                                   <div className={`w-1.5 h-1.5 rounded-full ${rec.status === 'On-Time' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                                   <span className="text-[9px] font-black uppercase tracking-[0.15em]">{rec.status || 'On-Time'}</span>
                                </div>
                             </td>
                             <td className="p-8">
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                   <motion.div initial={{ width: 0 }} animate={{ width: `${rec.efficiency || 95}%` }} className="h-full bg-indigo-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.4)]" />
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        {/* Right Sidebar Widgets */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-10">
           
           {/* Late Detection Analytics */}
           <div className="glass-card relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:rotate-12 transition-transform">
                 <Zap size={120} />
              </div>
              <h3 className="text-[18px] font-black text-slate-900 tracking-tight mb-2">Late Detection</h3>
              <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-8">Protocol Breach Flagged</p>
              
              <div className="space-y-4">
                 {attendance.filter(r => r.status === 'Late').length > 0 ? (
                    attendance.filter(r => r.status === 'Late').map((late, i) => (
                       <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                <AlertTriangle size={20} />
                             </div>
                             <div>
                                <p className="text-[13px] font-black text-slate-900">{late.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{late.checkIn} ({late.delay || '+0m'})</p>
                             </div>
                          </div>
                          <button className="px-4 py-2 bg-white text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all rounded-lg shadow-sm border border-slate-100">Audit</button>
                       </div>
                    ))
                 ) : (
                    <div className="py-12 text-center bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-100 flex flex-col items-center gap-4">
                       <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center relative">
                          <Globe size={28} className="text-slate-200" />
                          <div className="absolute inset-0 border-2 border-indigo-500/10 rounded-full animate-ping-slow" />
                       </div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No Protocol Breaches Detected</p>
                    </div>
                 )}
              </div>
              <button className="w-full h-14 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all rounded-2xl mt-8">Audit Full Incident Log</button>
           </div>

           {/* Workforce WPS */}
           <div className="glass-card bg-indigo-600 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-4 mb-10 relative z-10">
                 <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center">
                    <TrendingUp size={24} />
                 </div>
                 <div>
                    <h3 className="text-[18px] font-black tracking-tight">Workforce WPS</h3>
                    <p className="text-[10px] text-white/60 font-black uppercase tracking-widest mt-0.5">Global Productivity</p>
                 </div>
              </div>

              <div className="flex flex-col items-center justify-center py-6 relative z-10">
                 <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                       <circle cx="80" cy="80" r="72" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="16" />
                       <motion.circle cx="80" cy="80" r="72" fill="transparent" stroke="white" strokeWidth="16" strokeDasharray="452.4" initial={{ strokeDashoffset: 452.4 }} animate={{ strokeDashoffset: 452.4 - (452.4 * (stats.onTimeRate || 98.4)) / 100 }} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className="text-[42px] font-black text-white leading-none">{stats.onTimeRate || 98.4}%</span>
                       <span className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-2">Optimized</span>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-10 relative z-10">
                 <div className="p-6 bg-white/10 backdrop-blur-xl rounded-[24px]">
                    <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">On-Time Rate</p>
                    <p className="text-[22px] font-black text-white">{stats.onTimeRate || 98}%</p>
                 </div>
                 <div className="p-6 bg-white/10 backdrop-blur-xl rounded-[24px]">
                    <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">Late Arrivals</p>
                    <p className="text-[22px] font-black text-white">{stats.late || 0}</p>
                 </div>
              </div>
           </div>

        </div>

      </div>


    </div>
  );
};

export default AdminAttendance;


