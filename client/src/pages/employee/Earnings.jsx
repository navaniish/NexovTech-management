import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ArrowUpRight, Clock, CheckCircle2, Download, CreditCard, History, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const Earnings = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEarnings = async () => {
    const userId = user?.id || user?._id || user?.firebaseUid;
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/finance/earnings/${userId}`);
      if (!response.ok) throw new Error('Failed to synchronize financial data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, [user]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-surface-500 font-black uppercase tracking-widest text-xs">Accessing Financial Records...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20 glass rounded-[40px] border border-rose-500/20">
       <AlertTriangle size={64} className="text-rose-500 mx-auto mb-6" />
       <h3 className="text-2xl font-black text-white">Ledger Sync Failed</h3>
       <p className="text-surface-500 mt-2">{error}</p>
       <button onClick={fetchEarnings} className="mt-8 px-8 py-3 bg-brand-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all">Retry Link</button>
    </div>
  );

  return (
    <div className="space-y-8 pb-12 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Earnings & Payouts</h1>
          <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>Track your earnings and automated payment history.</p>
        </div>
        <button className="px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all hover:bg-brand-600 hover:text-white"
          style={{ background: 'var(--card-hover-bg)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
          <Download size={14} /> Annual Statement
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="theme-card rounded-2xl p-6">
          <div className="p-2.5 bg-brand-500/10 rounded-xl w-fit mb-4"><Wallet size={20} className="text-brand-400" /></div>
          <p className="text-[10px] font-black uppercase tracking-widest theme-text-secondary">Gross Revenue</p>
          <p className="text-3xl font-black mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>₹{data.totalEarned.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-emerald-500 text-[11px] font-bold mt-2">
            <ArrowUpRight size={14} /> Real-time tracking
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="theme-card rounded-2xl p-6">
          <div className="p-2.5 bg-amber-500/10 rounded-xl w-fit mb-4"><Clock size={20} className="text-amber-400" /></div>
          <p className="text-[10px] font-black uppercase tracking-widest theme-text-secondary">Pending Cycle</p>
          <p className="text-3xl font-black mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>₹{data.pendingPayout.toLocaleString()}</p>
          <p className="text-[10px] font-bold theme-text-muted mt-2">Scheduled Disbursement</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl p-6 bg-gradient-to-br from-brand-600 to-brand-800 text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 opacity-10"><CreditCard size={100} /></div>
          <div className="relative z-10">
            <h3 className="text-base font-black mb-1">Payment Hub</h3>
            <p className="text-xs font-medium text-white/60">Verified Primary Method</p>
            <div className="mt-6">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Designated Bank</p>
              <p className="text-lg font-mono font-black mt-0.5">**** **** **** 8492</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Payment History */}
      <div className="theme-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <History size={16} className="theme-text-secondary" /> Disbursement Ledger
          </h2>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
          {data.history.length === 0 ? (
             <p className="text-center py-20 text-xs font-black uppercase tracking-widest text-surface-700">No Historical Disbursements Detected</p>
          ) : data.history.map((p, i) => (
            <div key={p._id} className="px-6 py-4 flex items-center justify-between transition-colors hover:bg-white/5">
              <div>
                <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{p.description}</p>
                <p className="text-[10px] font-bold theme-text-secondary mt-0.5">{new Date(p.date).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-black ${p.status === 'Completed' ? 'text-emerald-500' : 'text-amber-500'}`}>₹{p.amount.toLocaleString()}</span>
                <span className={`flex items-center gap-1 text-[9px] font-black ${p.status === 'Completed' ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {p.status === 'Completed' ? <CheckCircle2 size={12} /> : <Clock size={12} />} {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Earnings;
