import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Plus, X, CheckCircle2, Clock, AlertCircle, 
  Loader2, ShieldCheck, Umbrella, Coffee, HeartPulse, 
  Home, Send, ChevronRight, Activity, Cpu 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';

const LEAVE_TYPES = ['Sick Leave', 'Casual Leave', 'Paid Leave', 'Work From Home'];

const MyLeaves = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState({ leaveType: 'Casual Leave', startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const employeeId = user?.id || user?._id || user?.firebaseUid;

  const fetchData = async () => {
    try {
      const [lRes, bRes] = await Promise.all([
        fetch(`${API_URL}/leave/my?employeeId=${employeeId}`),
        fetch(`${API_URL}/leave/balance/${employeeId}`)
      ]);
      if (lRes.ok) setLeaves(await lRes.json());
      if (bRes.ok) setBalance(await bRes.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/leave/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, employeeId, employeeName: user?.name })
      });
      if (res.ok) {
        setShowApply(false);
        setForm({ leaveType: 'Casual Leave', startDate: '', endDate: '', reason: '' });
        fetchData();
      }
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const getLeaveIcon = (type) => {
    if (type.includes('Sick')) return <HeartPulse size={20} />;
    if (type.includes('Casual')) return <Coffee size={20} />;
    if (type.includes('Work')) return <Home size={20} />;
    return <Umbrella size={20} />;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading Protocol Nodes...</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      
      {/* 1. PREMIUM HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-2">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                 <ShieldCheck size={24} />
              </div>
              <div>
                 <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">Absence Protocol</h1>
                 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Leave Management & Balance Tracking</p>
              </div>
           </div>
        </div>
        
        <button onClick={() => setShowApply(true)}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 transition-all flex items-center justify-center gap-3 shadow-xl group">
          <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" /> Apply Permission
        </button>
      </div>

      {/* 2. LEAVE BALANCE GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
        {balance.map((b, i) => (
          <motion.div 
            key={b.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 flex flex-col border-slate-100 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start justify-between mb-6">
               <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-all shadow-sm">
                  {getLeaveIcon(b.type)}
               </div>
               <div className="text-right">
                  <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-100">{b.remaining} Left</span>
               </div>
            </div>
            
            <div className="space-y-1 mb-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{b.type}</p>
               <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
                  {b.remaining} <span className="text-xs text-slate-300 font-bold">/ {b.total} Days</span>
               </h3>
            </div>

            <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${(b.remaining / b.total) * 100}%` }}
                 className="h-full bg-brand-600 rounded-full" 
               />
            </div>
          </motion.div>
        ))}
      </div>

      {/* 3. REQUEST HISTORY */}
      <div className="px-4">
         <div className="glass-card rounded-[40px] border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <Activity size={20} className="text-slate-400" />
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Permission Logs</h3>
               </div>
               <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Full Historical Data</span>
            </div>
            
            <div className="p-4 space-y-3">
              {leaves.map((l, i) => (
                <motion.div 
                  key={l.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-[28px] border border-slate-50 hover:bg-slate-50/50 hover:border-brand-500/20 transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                      l.status === 'Approved' ? 'bg-emerald-50 text-emerald-500' :
                      l.status === 'Rejected' ? 'bg-rose-50 text-rose-500' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {l.status === 'Approved' ? <CheckCircle2 size={24} /> : l.status === 'Rejected' ? <AlertCircle size={24} /> : <Clock size={24} />}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 uppercase tracking-tight leading-none group-hover:text-brand-600 transition-colors">{l.leaveType}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-3">
                        <span>{l.startDate} <ArrowRight size={10} className="inline mx-1" /> {l.endDate}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                        <span className="text-brand-500">{l.totalDays} Units Logged</span>
                      </p>
                      {l.reason && <p className="text-[11px] font-medium text-slate-500 mt-2 italic leading-relaxed line-clamp-1 max-w-md">"{l.reason}"</p>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-6 md:mt-0 w-full md:w-auto">
                    <span className={`flex-1 md:flex-none text-center px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                      l.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      l.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>{l.status}</span>
                    
                    <button className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-300 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                       <ChevronRight size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
              
              {leaves.length === 0 && (
                <div className="py-20 text-center space-y-3 opacity-30">
                   <Cpu size={48} className="mx-auto" />
                   <p className="text-[10px] font-black uppercase tracking-[0.2em]">No permission records found in the archive</p>
                </div>
              )}
            </div>
         </div>
      </div>

      {/* APPLY LEAVE MODAL */}
      <AnimatePresence>
        {showApply && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowApply(false)} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl rounded-[40px] p-10 shadow-2xl z-10 bg-white border border-slate-100"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                      <Calendar size={24} />
                   </div>
                   <div>
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Apply for Permission</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Submit leave request for approval</p>
                   </div>
                </div>
                <button onClick={() => setShowApply(false)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleApply} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type of Absence</label>
                  <select value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value })}
                    className="w-full p-4 rounded-2xl text-sm font-bold outline-none border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900">
                    {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Node</label>
                    <input type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                      className="w-full p-4 rounded-2xl text-sm font-bold outline-none border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Node</label>
                    <input type="date" required value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                      className="w-full p-4 rounded-2xl text-sm font-bold outline-none border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operational Justification</label>
                  <textarea required value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={4}
                    className="w-full p-5 rounded-3xl text-sm font-medium outline-none border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 resize-none leading-relaxed"
                    placeholder="Provide details for the request..." />
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full py-5 bg-slate-900 rounded-[28px] text-[11px] font-black uppercase tracking-widest text-white hover:bg-brand-600 transition-all flex items-center justify-center gap-3 shadow-2xl">
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} Dispatch Request
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyLeaves;
