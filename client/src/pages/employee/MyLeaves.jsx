import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, X, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

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

  if (loading) return <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-brand-500" size={48} /></div>;

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>Leave Management</h1>
          <p className="mt-2 font-medium" style={{ color: 'var(--text-primary)' }}>Apply for leaves, track balances, and view request history.</p>
        </div>
        <button onClick={() => setShowApply(true)}
          className="bg-brand-600 text-white px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all flex items-center gap-2 shadow-lg shadow-brand-600/20">
          <Plus size={16} /> Apply Leave
        </button>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {balance.map(b => (
          <div key={b.type} className="theme-card rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>{b.type}</p>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{b.remaining}</span>
              <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>/ {b.total}</span>
            </div>
            <div className="w-full h-1.5 rounded-full mt-3" style={{ background: 'var(--border-default)' }}>
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(b.remaining / b.total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Leave History */}
      <div className="theme-card rounded-2xl p-6">
        <h3 className="text-lg font-black mb-4" style={{ color: 'var(--text-primary)' }}>Request History</h3>
        <div className="space-y-3">
          {leaves.map(l => (
            <div key={l.id} className="flex items-center justify-between p-4 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  l.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' :
                  l.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600' :
                  'bg-amber-500/10 text-amber-600'
                }`}>
                  {l.status === 'Approved' ? <CheckCircle2 size={20} /> : l.status === 'Rejected' ? <AlertCircle size={20} /> : <Clock size={20} />}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{l.leaveType}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
                    {l.startDate} → {l.endDate} · {l.totalDays} day{l.totalDays > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-primary)' }}>{l.reason}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                l.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                l.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                'bg-amber-500/10 text-amber-600 border-amber-500/20'
              }`}>{l.status}</span>
            </div>
          ))}
          {leaves.length === 0 && (
            <p className="text-center py-10 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>No leave requests found. Apply for one above!</p>
          )}
        </div>
      </div>

      {/* Apply Leave Modal */}
      <AnimatePresence>
        {showApply && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowApply(false)} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-2xl p-8 shadow-2xl z-10" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Apply for Leave</h2>
                <button onClick={() => setShowApply(false)} className="p-2 hover:bg-black/5 rounded-xl transition-colors"><X size={20} style={{ color: 'var(--text-primary)' }} /></button>
              </div>
              <form onSubmit={handleApply} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Leave Type</label>
                  <select value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value })}
                    className="w-full p-3 rounded-xl text-sm font-bold outline-none border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                    {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Start Date</label>
                    <input type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                      className="w-full p-3 rounded-xl text-sm font-bold outline-none border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>End Date</label>
                    <input type="date" required value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                      className="w-full p-3 rounded-xl text-sm font-bold outline-none border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Reason</label>
                  <textarea required value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3}
                    className="w-full p-3 rounded-xl text-sm font-bold outline-none border resize-none" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                    placeholder="Describe the reason..." />
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full py-4 bg-brand-600 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:bg-brand-500 transition-all flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Calendar size={16} />} Submit Request
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
