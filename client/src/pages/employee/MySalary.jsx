import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  IndianRupee, Download, Calendar, CheckCircle2, 
  Clock, TrendingUp, CreditCard, FileText, Loader2, 
  AlertTriangle, Trash2, Wallet, Landmark, Receipt, 
  ChevronRight, ArrowUpRight 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';

const MySalary = () => {
  const { user } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSalary = async () => {
      try {
        const response = await fetch(`${API_URL}/payroll/employee/${user.id || user._id}`);
        if (response.ok) {
          const data = await response.json();
          setPayrolls(data.sort((a, b) => (b.year - a.year) || (b.month - a.month)));
        }
      } catch (err) {
        setError('Connection failed');
      } finally {
        setLoading(false);
      }
    };
    fetchSalary();
  }, [user]);

  const handleDownloadPayslip = (id) => {
    if (!id || id === 'undefined') {
      console.error('❌ PDF_GEN_ABORT: Invalid specialist identifier.');
      return;
    }
    window.open(`${API_URL}/payroll/${id}/pdf`, '_blank');
  };

  const deletePayrollRecord = async (id) => {
    if (!confirm('Are you sure you want to purge this record from your local ledger?')) return;
    try {
      const response = await fetch(`${API_URL}/payroll/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setPayrolls(prev => prev.filter(p => (p.id || p._id) !== id));
      }
    } catch (err) {
      console.error('Purge protocol failure');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Synchronizing Financial Nodes...</p>
    </div>
  );

  const current = payrolls[0] || null;

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      
      {/* 1. PREMIUM HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-2">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                 <Wallet size={24} />
              </div>
              <div>
                 <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">Financial Ledger</h1>
                 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Mission Compensation & Settlement Archive</p>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4">
        <div className="lg:col-span-2 space-y-8">
          {/* Current Status Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-[40px] border-slate-100 p-10 relative overflow-hidden group shadow-2xl shadow-slate-200/50"
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 blur-[120px] -mr-40 -mt-40 group-hover:bg-brand-500/10 transition-colors duration-1000" />
            
            <div className="flex justify-between items-start relative z-10 mb-12">
              <div className="space-y-6">
                 <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-[0.2em]">Active Cycle</span>
                    <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estimated Settlement</p>
                    <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter flex items-baseline gap-3">
                      <span className="text-2xl md:text-3xl text-brand-600 font-black italic">₹</span>
                      {current?.calculatedSalary?.total?.toLocaleString() || '0'}
                    </h2>
                 </div>
              </div>
              <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center text-brand-600 shadow-sm border border-slate-100">
                <Landmark size={32} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8 pt-10 border-t border-slate-50 relative z-10">
              <DetailItem label="Presence Log" value={`${current?.attendanceSummary?.presentDays || 0} Units`} icon={CheckCircle2} color="text-emerald-500" />
              <DetailItem label="Merit Bonus" value={`₹${current?.calculatedSalary?.bonus || 0}`} icon={TrendingUp} color="text-brand-500" />
              <DetailItem label="Status" value={current?.paymentStatus || 'Awaiting'} icon={Clock} color="text-amber-500" />
            </div>
          </motion.div>

          {/* History Grid */}
          <div className="glass-card rounded-[40px] border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <Receipt size={20} className="text-slate-400" />
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Settlement Registry</h3>
               </div>
               <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Historical Compensation Logs</span>
            </div>
            
            <div className="p-4 space-y-3">
              {payrolls.map((p, i) => (
                <motion.div 
                  key={p._id || p.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-6 rounded-[28px] border border-slate-50 hover:bg-slate-50/50 hover:border-brand-500/20 transition-all group"
                >
                   <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                         <Calendar size={20} />
                      </div>
                      <div>
                         <p className="text-slate-900 font-black uppercase tracking-tight leading-none group-hover:text-brand-600 transition-colors">
                           {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][(p.month || 1) - 1]} {p.year || ''}
                         </p>
                         <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">Uplink ID: {String(p?._id || p?.id || 'REF').slice(-8).toUpperCase()}</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-8">
                      <div className="text-right">
                         <p className="text-xl font-black text-slate-900 tracking-tighter leading-none italic group-hover:text-brand-600 transition-colors">₹{p.calculatedSalary?.total?.toLocaleString() || '0'}</p>
                         <span className={`text-[8px] font-black uppercase tracking-[0.2em] mt-2 block ${p.paymentStatus === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>{p.paymentStatus}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleDownloadPayslip(p.id || p._id)}
                          className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-brand-600 hover:text-white transition-all shadow-sm group/btn"
                        >
                           <Download size={18} />
                        </button>
                        <button 
                          onClick={() => deletePayrollRecord(p.id || p._id)}
                          className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-200 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                           <Trash2 size={18} />
                        </button>
                      </div>
                   </div>
                </motion.div>
              ))}
              {payrolls.length === 0 && (
                <div className="py-24 text-center opacity-30 space-y-3">
                   <FileText size={48} className="mx-auto" />
                   <p className="text-[10px] font-black uppercase tracking-[0.2em]">No financial transmissions recorded</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar Info */}
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-[40px] border-slate-100 p-10 shadow-xl"
          >
             <h4 className="text-lg font-black text-slate-900 mb-8 uppercase tracking-tighter flex items-center gap-3 leading-none">
               <CreditCard size={20} className="text-brand-600" /> Settlement Info
             </h4>
             <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-[28px] border border-slate-100 group hover:bg-white hover:border-brand-500/20 transition-all">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Disbursement Method</p>
                   <p className="text-sm font-black text-slate-900 uppercase">Cloud Bank Transfer</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-[28px] border border-slate-100 group hover:bg-white hover:border-brand-500/20 transition-all">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Protocol Frequency</p>
                   <p className="text-sm font-black text-slate-900 uppercase">Monthly (Cycle Start)</p>
                </div>
             </div>
             
             <div className="mt-10 p-6 bg-brand-50 rounded-[28px] border border-brand-100 group">
                <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest flex items-center gap-2">
                   Direct Support <ArrowUpRight size={14} />
                </p>
                <p className="text-[11px] font-medium text-brand-700/70 mt-2 leading-relaxed italic">"For settlement inquiries, contact the Finance Node directly via Nexus Mail."</p>
             </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-[40px] border-rose-100 p-10 bg-rose-50/30"
          >
             <h4 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-tighter flex items-center gap-3 leading-none">
               <AlertTriangle size={20} className="text-rose-500" /> Deduction Protocol
             </h4>
             <p className="text-[12px] font-medium text-slate-500 leading-relaxed">
               Compensation is dynamically calculated based on daily mission logs and operational attendance. Discrepancies should be reported within 48 hours of settlement.
             </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value, icon: Icon, color }) => (
  <div className="space-y-3">
     <div className="flex items-center gap-3 text-slate-400">
        <div className={`p-2 rounded-lg bg-white shadow-sm border border-slate-100 ${color}`}>
           <Icon size={14} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
     </div>
     <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{value}</p>
  </div>
);

export default MySalary;
