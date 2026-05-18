import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, CheckCircle2, LogIn, LogOut, Calendar, Loader2, 
  AlertCircle, Activity, ShieldCheck, Timer, MapPin, 
  ChevronRight, ArrowRight, MousePointer2 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';

const MyAttendance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [todayRecord, setTodayRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const employeeId = user?.id || user?._id || user?.firebaseUid;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendance = async () => {
    try {
      const res = await fetch(`${API_URL}/attendance/my?employeeId=${employeeId}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
        const today = new Date().toISOString().split('T')[0];
        const tr = data.find(a => a.date === today);
        setTodayRecord(tr || null);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAttendance(); }, []);

  const handleAction = async (type) => {
    setActionLoading(true);
    try {
      const endpoint = type === 'in' ? '/attendance/checkin' : '/attendance/checkout';
      const body = type === 'in' ? { employeeId, remarks } : { employeeId };
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setRemarks('');
        fetchAttendance();
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  // Stats
  const thisMonth = records.filter(r => {
    const d = new Date(r.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const presentDays = thisMonth.filter(r => r.attendanceStatus === 'Present' || r.attendanceStatus === 'Late').length;
  const lateDays = thisMonth.filter(r => r.attendanceStatus === 'Late').length;
  const totalHours = thisMonth.reduce((acc, r) => acc + (r.totalHours || 0), 0).toFixed(1);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing Chronos Nodes...</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      
      {/* 1. PREMIUM HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-2">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                 <Timer size={24} />
              </div>
              <div>
                 <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">Chronos Interface</h1>
                 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Temporal Alignment & Attendance</p>
              </div>
           </div>
        </div>
      </div>

      {/* 2. REAL-TIME CLOCK & ACTION CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4">
         <motion.div 
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           className="lg:col-span-2 glass-card p-10 flex flex-col md:flex-row items-center justify-between gap-10 border-slate-100 overflow-hidden relative"
         >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-[100px] -mr-32 -mt-32" />
            
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2 relative z-10">
               <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <MapPin size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">Sector 7G Uplink</span>
               </div>
               <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  <span className="text-xl md:text-2xl text-slate-300 ml-2 font-bold">{currentTime.toLocaleTimeString([], { second: '2-digit' })}</span>
               </h2>
               <p className="text-sm font-black text-brand-600 uppercase tracking-[0.2em]">
                  {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
               </p>
            </div>

            <div className="w-full md:w-auto space-y-4 relative z-10">
               {!todayRecord ? (
                  <div className="flex flex-col gap-4">
                     <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <input 
                           value={remarks} 
                           onChange={e => setRemarks(e.target.value)} 
                           placeholder="Deployment Notes..."
                           className="w-full bg-transparent outline-none text-xs font-bold text-slate-900 placeholder:text-slate-300" 
                        />
                     </div>
                     <button 
                        onClick={() => handleAction('in')} 
                        disabled={actionLoading}
                        className="w-full md:w-[200px] bg-emerald-500 text-white py-5 rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 group"
                     >
                        {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />} Initiate Shift
                     </button>
                  </div>
               ) : !todayRecord.checkOut ? (
                  <div className="flex flex-col items-center gap-4">
                     <div className="flex items-center gap-6 mb-2">
                        <div className="text-center">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Entry</p>
                           <p className="text-sm font-black text-slate-900">{new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-100" />
                        <div className="text-center">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Elapsed</p>
                           <p className="text-sm font-black text-emerald-500">Active</p>
                        </div>
                     </div>
                     <button 
                        onClick={() => handleAction('out')} 
                        disabled={actionLoading}
                        className="w-full md:w-[200px] bg-rose-500 text-white py-5 rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center gap-3 group"
                     >
                        {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />} Terminate Shift
                     </button>
                  </div>
               ) : (
                  <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[32px] text-center space-y-2">
                     <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl">
                        <ShieldCheck size={24} />
                     </div>
                     <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] pt-2">Sector Logged</p>
                     <p className="text-[9px] font-bold text-emerald-400 uppercase">Operational hours recorded</p>
                  </div>
               )}
            </div>
         </motion.div>

         <motion.div 
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           className="glass-card p-10 flex flex-col justify-between border-slate-100"
         >
            <div className="space-y-8">
               <div className="flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Status</p>
                     <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Operational Stats</h3>
                  </div>
                  <Activity size={24} className="text-brand-500" />
               </div>

               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Presence Index</span>
                     <span className="text-lg font-black text-slate-900">{presentDays} Days</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(presentDays / 30) * 100}%` }} />
                  </div>

                  <div className="flex items-center justify-between">
                     <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Temporal Log</span>
                     <span className="text-lg font-black text-slate-900">{totalHours}h</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(totalHours / 160) * 100}%` }} />
                  </div>
               </div>
            </div>
            
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mt-8">NexovGen Workforce Protocol v4.2</p>
         </motion.div>
      </div>

      {/* 3. ATTENDANCE HISTORY TABLE */}
      <div className="px-4">
         <div className="glass-card rounded-[40px] border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
               <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Temporal History</h3>
               <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-brand-600 transition-colors">Export Logs</button>
            </div>
            <div className="overflow-x-auto w-full">
               <table className="w-full min-w-[700px]">
                  <thead>
                     <tr className="bg-slate-50/50">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Date Node</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Inflow</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Outflow</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Logged</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Status</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {records.slice(0, 10).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/30 transition-colors group">
                           <td className="px-8 py-5">
                              <p className="text-sm font-black text-slate-900 leading-none">{r.date}</p>
                           </td>
                           <td className="px-8 py-5 text-sm font-medium text-slate-500">
                              {r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                           </td>
                           <td className="px-8 py-5 text-sm font-medium text-slate-500">
                              {r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                           </td>
                           <td className="px-8 py-5">
                              <span className="text-sm font-black text-slate-900">{r.totalHours || 0}h</span>
                           </td>
                           <td className="px-8 py-5">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                 r.attendanceStatus === 'Present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                 r.attendanceStatus === 'Late' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                 'bg-rose-50 text-rose-600 border-rose-100'
                              }`}>{r.attendanceStatus}</span>
                           </td>
                           <td className="px-8 py-5 text-right">
                              <button className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                 <ChevronRight size={16} />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
               {records.length === 0 && (
                  <div className="py-20 text-center space-y-2 opacity-30">
                     <MousePointer2 size={40} className="mx-auto" />
                     <p className="text-[10px] font-black uppercase tracking-[0.2em]">Initiate first entry to populate history</p>
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default MyAttendance;
