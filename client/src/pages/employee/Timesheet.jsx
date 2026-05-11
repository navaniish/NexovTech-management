import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, CheckCircle2, Plus, Calendar, Send, Loader2, 
  AlertTriangle, Target, Zap, TrendingUp, History,
  LayoutGrid, List, Filter, Search, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';

const Timesheet = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    hoursWorked: '', 
    description: '' 
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTimesheets = async () => {
    const userId = user?.id || user?._id || user?.firebaseUid;
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/timesheet?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to synchronize temporal ledger');
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.hoursWorked || form.hoursWorked <= 0) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/timesheet`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user._id || user.id, 
          ...form, 
          hoursWorked: Number(form.hoursWorked) 
        })
      });
      if (response.ok) {
        const saved = await response.json();
        setEntries(prev => [saved, ...prev]);
        setForm({ date: new Date().toISOString().split('T')[0], hoursWorked: '', description: '' });
      }
    } catch (err) {
      console.error('Temporal submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const totalHours = entries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
  const approvedCount = entries.filter(e => e.status === 'Approved').length;

  const getStatusConfig = (s) => {
    switch(s) {
      case 'Approved': return { color: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-500' };
      case 'Submitted': return { color: '#3b82f6', bg: 'bg-blue-500/10', text: 'text-blue-500' };
      case 'Rejected': return { color: '#ef4444', bg: 'bg-rose-500/10', text: 'text-rose-500' };
      default: return { color: '#64748b', bg: 'bg-slate-500/10', text: 'text-slate-500' };
    }
  };

  const formatDate = (d) => { 
    try { 
      return new Date(d).toLocaleDateString('en-GB', { 
        weekday: 'short', 
        day: '2-digit', 
        month: 'short' 
      }); 
    } catch { return 'N/A'; } 
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
       <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <Clock className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500" size={24} />
       </div>
       <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">Synchronizing Temporal Records...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20 glass-card rounded-[40px] border border-rose-500/20 max-w-2xl mx-auto">
       <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-6 shadow-xl shadow-rose-500/10">
          <AlertTriangle size={40} />
       </div>
       <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Temporal Link Failed</h3>
       <p className="text-slate-500 mt-2 font-bold">{error}</p>
       <button 
         onClick={fetchTimesheets} 
         className="mt-8 px-10 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-2xl"
       >
         Retry Connection
       </button>
    </div>
  );

  const KPICard = ({ label, value, icon: Icon, accent }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="glass-card !p-6 flex items-center gap-6 group hover:scale-[1.02] transition-all border-white shadow-xl shadow-slate-900/5"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6 ${accent}`}>
         <Icon size={24} />
      </div>
      <div>
         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
         <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
      </div>
    </motion.div>
  );

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-10 space-y-8 animate-in fade-in duration-1000 overflow-y-auto custom-scrollbar">
      
      {/* 1. PREMIUM HEADER SECTION */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-slate-950 p-8 md:p-12 rounded-[40px] relative overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full -mr-40 -mt-40" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/20">
                <Clock size={24} className="text-white" />
             </div>
             <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none italic">
                Temporal <span className="text-indigo-500">Registry</span>
             </h1>
          </div>
          <p className="text-slate-400 text-[14px] font-bold tracking-[0.05em] max-w-md">
             Log tactical operations and optimize your specialist duty cycle within the NexovTech temporal framework.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 relative z-10">
           <div className="flex flex-col items-end pr-6 border-r border-white/10">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Effort</span>
              <span className="text-3xl font-black text-white">{totalHours}h</span>
           </div>
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Approval Velocity</span>
              <span className="text-3xl font-black text-emerald-500">{approvedCount}</span>
           </div>
        </div>
      </section>

      {/* 2. KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          label="Logged Effort" 
          value={`${totalHours} Hours`} 
          icon={TrendingUp} 
          accent="bg-indigo-500/10 text-indigo-600" 
        />
        <KPICard 
          label="Active Submissions" 
          value={entries.length} 
          icon={Send} 
          accent="bg-amber-500/10 text-amber-600" 
        />
        <KPICard 
          label="Approved Phases" 
          value={approvedCount} 
          icon={CheckCircle2} 
          accent="bg-emerald-500/10 text-emerald-600" 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* 3. LOGGING INTERFACE */}
        <motion.section 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="xl:col-span-5 glass-card !p-8 md:!p-10 border-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Plus size={20} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Log Temporal Phase</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duty Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="date" 
                  value={form.date} 
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Temporal Duration (Hours)</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="number" 
                  min="0" max="24" step="0.5" 
                  placeholder="e.g. 8.5"
                  value={form.hoursWorked}
                  onChange={e => setForm({ ...form, hoursWorked: e.target.value })}
                  className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Description</label>
              <textarea 
                placeholder="Detail tactical objectives and outcomes..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
              />
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-900/20 disabled:opacity-60 group"
            >
              {submitting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              )} 
              Authorize Submission
            </button>
          </form>
        </motion.section>

        {/* 4. TEMPORAL HISTORY */}
        <section className="xl:col-span-7 space-y-6">
          <div className="flex items-center justify-between px-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/80 backdrop-blur rounded-xl flex items-center justify-center text-slate-900 shadow-sm border border-slate-100">
                   <History size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Temporal History</h3>
             </div>
             <div className="flex bg-white/60 p-1 rounded-xl border border-slate-100 shadow-sm">
                <button className="p-2 rounded-lg bg-white text-indigo-600 shadow-sm"><List size={18} /></button>
                <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600"><LayoutGrid size={18} /></button>
             </div>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {entries.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="glass-card !p-20 text-center flex flex-col items-center justify-center border-dashed border-2 border-slate-200 bg-transparent shadow-none"
                >
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                      <History size={32} />
                   </div>
                   <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">No Temporal Logs Detected</p>
                </motion.div>
              ) : (
                entries.map((entry, idx) => {
                  const config = getStatusConfig(entry.status);
                  return (
                    <motion.div 
                      key={entry._id || idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="glass-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-slate-100 hover:border-indigo-500/30 hover:shadow-2xl transition-all group"
                    >
                      <div className="flex items-start gap-6 flex-1 min-w-0">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0 transition-transform group-hover:scale-110 ${config.bg} ${config.text}`}>
                           {entry.status === 'Approved' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                        </div>
                        
                        <div className="space-y-1 min-w-0">
                           <div className="flex items-center gap-3">
                              <p className="text-base font-black text-slate-900 truncate uppercase tracking-tight">{entry.description || 'Tactical Development Operation'}</p>
                           </div>
                           <div className="flex flex-wrap items-center gap-3">
                              <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                 <Calendar size={12} /> {formatDate(entry.date)}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-slate-200" />
                              <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                 <Target size={12} /> {entry.project?.title || 'Nexus Command'}
                              </span>
                           </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-8 pt-4 md:pt-0 border-t md:border-0 border-slate-50">
                        <div className="flex flex-col items-start md:items-end">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Effort</span>
                           <span className="text-xl font-black text-slate-900">{entry.hoursWorked}h</span>
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${config.bg} ${config.text} border-transparent group-hover:border-current`}>
                           {entry.status}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Timesheet;
