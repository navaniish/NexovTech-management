import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  IndianRupee, 
  Download, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  CreditCard,
  FileText,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

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
    window.open(`${API_URL}/payroll/${id}/pdf`, '_blank');
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-brand-500" size={48} /></div>;

  const current = payrolls[0] || null;

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tighter">Financial Ledger</h1>
        <p className="text-surface-500 mt-2 font-medium">Tracking your mission compensation and settlement history.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Current Status Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-light rounded-[40px] border border-white/5 p-10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-[100px] -mr-32 -mt-32" />
            
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full text-[10px] font-black uppercase tracking-widest">Active Cycle</span>
                    <span className="text-surface-500 text-xs font-bold">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                 </div>
                 <h2 className="text-6xl font-black text-white tracking-tighter flex items-baseline gap-2">
                   <span className="text-2xl text-brand-500 font-bold">₹</span>
                   {current ? current.calculatedSalary.total.toLocaleString() : '0'}
                 </h2>
                 <p className="text-surface-500 text-sm font-medium">Estimated Net Salary for current deployment period.</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <IndianRupee size={32} className="text-brand-400" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8 mt-12 pt-10 border-t border-white/5">
              <DetailItem label="Attendance" value={`${current?.attendanceSummary.presentDays || 0} Days`} icon={CheckCircle2} color="text-emerald-400" />
              <DetailItem label="Performance Bonus" value={`₹${current?.calculatedSalary.bonus || 0}`} icon={TrendingUp} color="text-violet-400" />
              <DetailItem label="Status" value={current?.paymentStatus || 'Processing'} icon={Clock} color="text-amber-400" />
            </div>
          </motion.div>

          {/* History Grid */}
          <div className="glass-light rounded-[40px] border border-white/5 p-10">
            <h3 className="text-2xl font-black text-white tracking-tight mb-8">Payment Registry</h3>
            <div className="space-y-4">
              {payrolls.map((p, i) => (
                <div key={p._id} className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-3xl hover:border-brand-500/30 transition-all group">
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-surface-500 group-hover:text-brand-400 transition-colors">
                         <Calendar size={24} />
                      </div>
                      <div>
                         <p className="text-white font-bold text-lg">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][p.month - 1]} {p.year}</p>
                         <p className="text-[10px] text-surface-600 font-black uppercase tracking-widest mt-1">Ref: {p._id.slice(-8).toUpperCase()}</p>
                      </div>
                   </div>
                   <div className="text-right flex items-center gap-8">
                      <div>
                         <p className="text-white font-black text-xl">₹{p.calculatedSalary.total.toLocaleString()}</p>
                         <span className={`text-[9px] font-black uppercase tracking-widest ${p.paymentStatus === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>{p.paymentStatus}</span>
                      </div>
                      <button 
                        onClick={() => handleDownloadPayslip(p._id)}
                        className="p-4 bg-white/5 rounded-2xl text-surface-500 hover:text-white transition-all shadow-xl group-hover:scale-110"
                      >
                         <Download size={20} />
                      </button>
                   </div>
                </div>
              ))}
              {payrolls.length === 0 && (
                <div className="text-center py-20">
                   <FileText size={48} className="mx-auto text-surface-700 mb-4" />
                   <p className="text-surface-600 font-bold uppercase tracking-widest text-xs">No compensation records detected.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar Info */}
        <div className="space-y-8">
          <div className="glass-light rounded-[40px] border border-white/5 p-8">
             <h4 className="text-lg font-black text-white mb-6 flex items-center gap-2">
               <CreditCard size={20} className="text-brand-500" /> Settlement Info
             </h4>
             <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[9px] font-black text-surface-500 uppercase tracking-widest mb-1">Payment Method</p>
                   <p className="text-sm font-bold text-white">Cloud Bank Transfer</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[9px] font-black text-surface-500 uppercase tracking-widest mb-1">Frequency</p>
                   <p className="text-sm font-bold text-white">Monthly (1st Week)</p>
                </div>
             </div>
          </div>

          <div className="glass-light rounded-[40px] border border-rose-500/10 p-8">
             <h4 className="text-lg font-black text-white mb-6 flex items-center gap-2">
               <AlertTriangle size={20} className="text-rose-500" /> Deduction Alerts
             </h4>
             <p className="text-xs text-surface-500 leading-relaxed font-medium">
               Your salary is subject to performance-based deductions and attendance verification. Ensure your mission logs are updated daily to prevent settlement delays.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value, icon: Icon, color }) => (
  <div className="space-y-2">
     <div className="flex items-center gap-2 text-surface-500">
        <Icon size={14} className={color} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
     </div>
     <p className="text-xl font-black text-white">{value}</p>
  </div>
);

export default MySalary;
