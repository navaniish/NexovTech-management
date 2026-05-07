import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, Plus, Calendar, Send, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const Timesheet = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], hoursWorked: '', description: '' });
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
        body: JSON.stringify({ userId: user._id, ...form, hoursWorked: Number(form.hoursWorked) })
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

  const statusColor = (s) => s === 'Approved' ? '#10b981' : s === 'Submitted' ? '#3b82f6' : s === 'Rejected' ? '#ef4444' : '#64748b';
  const formatDate = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }); } catch { return 'N/A'; } };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-surface-500 font-black uppercase tracking-widest text-xs">Accessing Temporal Records...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20 glass rounded-[40px] border border-rose-500/20">
       <AlertTriangle size={64} className="text-rose-500 mx-auto mb-6" />
       <h3 className="text-2xl font-black text-white">Temporal Link Failed</h3>
       <p className="text-surface-500 mt-2">{error}</p>
       <button onClick={fetchTimesheets} className="mt-8 px-8 py-3 bg-brand-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all">Retry Link</button>
    </div>
  );

  return (
    <div className="space-y-8 pb-12 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Timesheet</h1>
        <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>Log your daily work hours and track submissions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="theme-card rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest theme-text-secondary">Logged Effort</p>
          <p className="text-[28px] font-black mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>{totalHours}h</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="theme-card rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest theme-text-secondary">Submissions</p>
          <p className="text-[28px] font-black mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>{entries.length}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="theme-card rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest theme-text-secondary">Approved</p>
          <p className="text-[28px] font-black mt-1 tracking-tight text-emerald-500">{approvedCount}</p>
        </motion.div>
      </div>

      <motion.form onSubmit={handleSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="theme-card rounded-2xl p-6">
        <h3 className="text-sm font-black mb-4" style={{ color: 'var(--text-primary)' }}>Log Temporal Phase</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            className="px-4 py-3 rounded-xl text-sm font-medium outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
          <input type="number" min="0" max="24" step="0.5" placeholder="Hours" value={form.hoursWorked}
            onChange={e => setForm({ ...form, hoursWorked: e.target.value })}
            className="px-4 py-3 rounded-xl text-sm font-medium outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
          <input type="text" placeholder="Mission Description" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="px-4 py-3 rounded-xl text-sm font-medium outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
          <button type="submit" disabled={submitting}
            className="px-6 py-3 bg-brand-600 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-brand-700 transition-all disabled:opacity-60">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Authorize
          </button>
        </div>
      </motion.form>

      <div className="theme-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Temporal History</h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
          {entries.length === 0 ? (
             <p className="text-center py-20 text-xs font-black uppercase tracking-widest text-surface-700">No Temporal Logs Detected</p>
          ) : entries.map((entry) => (
            <div key={entry._id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl" style={{ background: `${statusColor(entry.status)}15` }}>
                  {entry.status === 'Approved' ? <CheckCircle2 size={16} style={{ color: statusColor(entry.status) }} /> : <Clock size={16} style={{ color: statusColor(entry.status) }} />}
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{entry.description || 'General Development'}</p>
                  <p className="text-[10px] font-bold theme-text-secondary">{formatDate(entry.date)} • {entry.project?.title || 'System Mission'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{entry.hoursWorked}h</span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase"
                  style={{ background: `${statusColor(entry.status)}15`, color: statusColor(entry.status) }}>{entry.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timesheet;
