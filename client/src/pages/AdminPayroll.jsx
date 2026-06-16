import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Download,
  Search,
  Settings2,
  TrendingUp,
  CreditCard,
  Plus,
  X,
  Loader2,
  FileText,
  Trash2,
  Eye,
  Globe,
  Activity
} from 'lucide-react';
import DigitalPayslip from '../components/Payroll/DigitalPayslip';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

import API_URL from '../config';
const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
  <div className="glass-card flex flex-col group">
    <div className="flex items-center justify-between mb-4 sm:mb-6">
      <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{title}</span>
      <div className={`w-8 h-8 sm:w-10 sm:h-10 ${bgColor} rounded-lg sm:rounded-xl flex items-center justify-center ${color} shadow-sm group-hover:scale-110 transition-transform shrink-0`}>
         <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
      </div>
    </div>
    <div className="flex items-baseline gap-0.5 sm:gap-1">
      <span className="text-xs sm:text-[14px] font-black text-slate-400 leading-none">₹</span>
      <span className="text-xl sm:text-[32px] font-black text-slate-900 tracking-tighter leading-none">{value.toLocaleString()}</span>
    </div>
    <div className="mt-4 sm:mt-6 flex items-center gap-1.5 sm:gap-2">
      <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
      <span className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-widest">Global Sync Active</span>
    </div>
  </div>
);

const AdminPayroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [showConfig, setShowConfig] = useState(null);
  const [configData, setConfigData] = useState({
    baseSalary: 0, bonus: 0, deductions: 0, salaryType: 'Monthly',
    metadata: { service: '', projectName: '' },
    breakdown: { web: 0, ai: 0, video: 0, systems: 0 }
  });
  const [generating, setGenerating] = useState(false);
  const [viewingPayslip, setViewingPayslip] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, teamRes] = await Promise.all([
        fetch(`${API_URL}/payroll`),
        fetch(`${API_URL}/team`)
      ]);
      if (payRes.ok) setPayrolls(await payRes.json());
      if (teamRes.ok) setTeam(await teamRes.json());
    } catch (err) {
      console.error('Fetch failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`${API_URL}/payroll/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, year: selectedYear })
      });
      if (response.ok) fetchData();
    } catch (err) {
      console.error('Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (payrollId) => {
    try {
      const response = await fetch(`${API_URL}/payroll/${payrollId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'Paid', paymentDate: new Date() })
      });
      if (response.ok) fetchData();
    } catch (err) {
      console.error('Update failed');
    }
  };

  const handleDelete = async (payrollId) => {
    if (!window.confirm('Are you sure you want to delete this payroll record?')) return;
    try {
      const response = await fetch(`${API_URL}/payroll/${payrollId}`, { method: 'DELETE' });
      if (response.ok) fetchData();
    } catch (err) {
      console.error('Delete failed');
    }
  };

  const openConfig = async (emp) => {
    setShowConfig(emp);
    try {
      const res = await fetch(`${API_URL}/payroll/salary/${emp.id || emp._id}`);
      if (res.ok) {
        const data = await res.json();
        setConfigData(data || {
          baseSalary: 0, bonus: 0, deductions: 0, salaryType: 'Monthly',
          employeeId: emp.id || emp._id,
          metadata: { service: '', projectName: '' },
          breakdown: { web: 0, ai: 0, video: 0, systems: 0 }
        });
      }
    } catch (err) {
      setConfigData({
        baseSalary: 0, bonus: 0, deductions: 0, salaryType: 'Monthly',
        employeeId: emp.id || emp._id,
        metadata: { service: '', projectName: '' },
        breakdown: { web: 0, ai: 0, video: 0, systems: 0 }
      });
    }
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/payroll/salary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });
      if (response.ok) setShowConfig(null);
    } catch (err) {
      console.error('Save failed');
    }
  };

  const handleDownloadPayslip = (id) => {
    if (!id || id === 'undefined') return;
    window.open(`${API_URL}/payroll/${id}/pdf`, '_blank');
  };

  const currentRecords = payrolls.filter(p => Number(p.month) === Number(selectedMonth) && Number(p.year) === Number(selectedYear));
  const totalPayroll = currentRecords.reduce((acc, p) => acc + (p.calculatedSalary?.total || 0), 0);
  const paidTotal = currentRecords.filter(p => p.paymentStatus === 'Paid').reduce((acc, p) => acc + (p.calculatedSalary?.total || 0), 0);
  const pendingTotal = totalPayroll - paidTotal;

  const sectorTotals = currentRecords.reduce((acc, curr) => {
    const bd = curr.calculatedSalary?.breakdown || { web: 0, ai: 0, video: 0, systems: 0 };
    acc.web += bd.web || 0; acc.ai += bd.ai || 0; acc.video += bd.video || 0; acc.systems += bd.systems || 0;
    return acc;
  }, { web: 0, ai: 0, video: 0, systems: 0 });

  const chartData = [
    { name: 'Settled', value: paidTotal, color: '#10b981' },
    { name: 'Pending', value: pendingTotal, color: '#f59e0b' }
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
       <div className="w-16 h-16 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin" />
       <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Accessing Financial Vault...</p>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col space-y-6 md:space-y-10 animate-in fade-in duration-1000">
      
      {/* 1. HEADER SECTION */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8">
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-[42px] font-black text-slate-900 tracking-tighter leading-none mb-2">
             PAYROLL ARCHITECTURE
          </h1>
          <p className="text-slate-400 text-[12px] md:text-[14px] font-bold tracking-[0.05em]">
             Automated sector-based ledger: cycle {selectedMonth}/{selectedYear}.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 md:gap-6 w-full lg:w-auto">
           <select
             value={selectedMonth}
             onChange={e => setSelectedMonth(e.target.value)}
             className="w-full sm:w-auto h-12 px-6 bg-white border border-slate-100 rounded-2xl text-[13px] font-black text-slate-900 outline-none shadow-sm focus:border-indigo-500 transition-all cursor-pointer"
           >
             {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
               <option key={m} value={i + 1}>{m}</option>
             ))}
           </select>
           <button
             onClick={handleGenerate}
             disabled={generating}
             className="w-full sm:w-auto h-12 px-8 bg-indigo-600 text-white text-[12px] font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 uppercase tracking-widest disabled:opacity-50"
           >
             {generating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
             {generating ? 'Processing Registry...' : 'Generate Payroll'}
           </button>
        </div>
      </section>

      {/* 2. GLOBAL STATS ROW */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
        <div className="col-span-2 md:col-span-1">
          <StatCard title="Total Liability" value={totalPayroll} icon={IndianRupee} color="text-slate-900" bgColor="bg-slate-100" />
        </div>
        <StatCard title="Settled" value={paidTotal} icon={CheckCircle2} color="text-emerald-500" bgColor="bg-emerald-500/10" />
        <StatCard title="Outstanding" value={pendingTotal} icon={Clock} color="text-amber-500" bgColor="bg-amber-500/10" />
      </section>

      {/* 3. SECTOR BUDGET ANALYTICS */}
      <div className="glass-card relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-4 sm:p-12 opacity-[0.03] group-hover:rotate-12 transition-transform duration-1000">
            <IndianRupee size={180} />
         </div>
         <div className="flex items-center gap-4 mb-8 sm:mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
               <TrendingUp size={20} />
            </div>
            <h3 className="text-base sm:text-[18px] font-black text-slate-900 tracking-tight">Sector Allocation Analytics</h3>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
            {[
              { label: 'Web Dev', val: sectorTotals.web || 0, color: 'bg-indigo-600' },
              { label: 'AI Solutions', val: sectorTotals.ai || 0, color: 'bg-purple-600' },
              { label: 'Video Edit', val: sectorTotals.video || 0, color: 'bg-amber-500' },
              { label: 'Systems', val: sectorTotals.systems || 0, color: 'bg-emerald-500' }
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-2.5 sm:gap-4">
                <div className="flex justify-between items-end">
                   <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                   <span className="text-xs sm:text-[14px] font-black text-slate-900">₹{s.val.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden p-[1px]">
                   <motion.div
                     initial={{ width: 0 }}
                     animate={{ width: `${totalPayroll > 0 ? (s.val / totalPayroll) * 100 : 0}%` }}
                     className={`h-full ${s.color} rounded-full shadow-[0_0_8px_rgba(79,70,229,0.3)]`}
                   />
                </div>
              </div>
            ))}
         </div>
      </div>

      {/* 4. MAIN SETTLEMENT GRID */}
      <div className="grid grid-cols-12 gap-6 md:gap-10 items-start">
        
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 md:gap-8">
           <div className="glass-card p-0 overflow-hidden">
              <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                 <h2 className="text-base sm:text-[18px] font-black text-slate-900 tracking-tight">Settlement Registry</h2>
                 <div className="relative w-full sm:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                       placeholder="Find specialist..."
                       value={search}
                       onChange={e => setSearch(e.target.value)}
                       className="w-full h-10 pl-10 pr-4 bg-slate-50 border-none rounded-xl text-[12px] font-medium outline-none focus:ring-1 focus:ring-indigo-500"
                     />
                 </div>
              </div>

              <div className="overflow-x-auto">
                 <table className="w-full text-left min-w-[500px]">
                    <thead>
                       <tr className="bg-slate-50/50">
                          <th className="p-4 sm:p-6 md:p-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identity</th>
                          <th className="p-4 sm:p-6 md:p-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Salary</th>
                          <th className="p-4 sm:p-6 md:p-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                          <th className="p-4 sm:p-6 md:p-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Control</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {currentRecords.filter(p => p.employeeName?.toLowerCase().includes(search.toLowerCase())).map((p) => (
                          <tr key={p.id || p._id} className="group hover:bg-slate-50/30 transition-colors">
                             <td className="p-4 sm:p-6 md:p-8">
                                <div className="flex items-center gap-3 sm:gap-4">
                                   <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 border-white shadow-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black shrink-0">
                                      {p.employeeName?.charAt(0)}
                                   </div>
                                   <div>
                                      <p className="text-xs sm:text-[14px] font-black text-slate-900 leading-snug">{p.employeeName}</p>
                                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Specialist</p>
                                   </div>
                                </div>
                             </td>
                             <td className="p-4 sm:p-6 md:p-8">
                                <div className="flex flex-col">
                                   <span className="text-xs sm:text-[14px] font-black text-slate-900">₹{(p.calculatedSalary?.total || 0).toLocaleString()}</span>
                                   <span className="text-[9px] sm:text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">+{p.calculatedSalary?.bonus || 0} incentive</span>
                                </div>
                             </td>
                             <td className="p-4 sm:p-6 md:p-8">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                                   p.paymentStatus === 'Paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                }`}>
                                   <div className={`w-1 h-1 rounded-full ${p.paymentStatus === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'} ${p.paymentStatus === 'Pending' ? 'animate-pulse' : ''}`} />
                                   <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em]">{p.paymentStatus}</span>
                                </div>
                             </td>
                             <td className="p-4 sm:p-6 md:p-8 text-right">
                                <div className="flex items-center justify-end gap-1.5 sm:gap-3">
                                   <button onClick={() => setViewingPayslip(p)} className="p-2 text-slate-300 hover:text-indigo-600 transition-all"><Eye size={16} /></button>
                                   {p.paymentStatus === 'Pending' ? (
                                      <button onClick={() => handleMarkPaid(p.id || p._id)} className="px-3 sm:px-5 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-500 transition-all shrink-0">Settle</button>
                                   ) : (
                                      <button onClick={() => handleDownloadPayslip(p.id || p._id)} className="p-2 text-slate-300 hover:text-indigo-600 transition-all"><Download size={16} /></button>
                                   )}
                                   <button onClick={() => handleDelete(p.id || p._id)} className="p-2 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              {currentRecords.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center gap-6">
                   <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center relative">
                      <Globe size={32} className="text-slate-200" />
                      <div className="absolute inset-0 border-2 border-indigo-500/10 rounded-full animate-ping-slow" />
                   </div>
                   <div>
                      <p className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em]">No Financial Records Detected</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Awaiting Generation Signal</p>
                   </div>
                </div>
              )}
           </div>
        </div>

        {/* SIDEBAR WIDGETS */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 md:gap-10">
           
           <div className="glass-card">
              <h3 className="text-base sm:text-[16px] font-black text-slate-900 tracking-tight mb-6 sm:mb-8 flex items-center gap-3">
                 <Settings2 size={18} className="text-indigo-600" /> Specialist Registry
              </h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-hide pr-2">
                 {team.map(member => (
                    <div key={member.id || member._id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-indigo-600/30 transition-all group gap-3">
                       <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <img src={member.avatar} className="w-10 h-10 rounded-xl border-2 border-white shadow-md object-cover shrink-0" alt="" />
                          <div className="min-w-0">
                             <p className="text-[13px] font-black text-slate-900 truncate">{member.name}</p>
                             <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5 truncate">{member.role}</p>
                          </div>
                       </div>
                       <button onClick={() => openConfig(member)} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 group-hover:text-indigo-600 group-hover:shadow-md transition-all shrink-0">
                          <Settings2 size={16} />
                       </button>
                    </div>
                 ))}
              </div>
           </div>

           <div className="glass-card bg-slate-900 border border-slate-800 text-white relative overflow-hidden group shadow-2xl transition-all duration-500 hover:border-slate-700/50">
              {/* Ambient Glow */}
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-indigo-500/15 transition-all duration-700" />
              <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none" />

              {/* Title & Live Status */}
              <div className="flex items-center justify-between mb-6 sm:mb-8 relative z-10">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                       <Activity size={16} className="animate-pulse" />
                    </div>
                    <div>
                       <h3 className="text-[13px] font-black uppercase tracking-wider text-slate-100">Flux Analysis</h3>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Real-time Telemetry</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                    Active Ledger
                 </div>
              </div>

              {/* Beautiful BarChart */}
              <div className="h-[200px] relative z-10">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                       <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                       />
                       <YAxis hide />
                       <Tooltip
                          content={({ active, payload }) => {
                             if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                   <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-2xl shadow-2xl backdrop-blur-md">
                                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{data.name}</p>
                                      <p className="text-sm font-black text-white mt-1">₹{data.value.toLocaleString()}</p>
                                   </div>
                                );
                             }
                             return null;
                          }}
                          cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 12 }}
                       />
                       <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={45}>
                          {chartData.map((entry, index) => (
                             <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color === '#10b981' ? 'url(#settledGradient)' : 'url(#pendingGradient)'} 
                             />
                          ))}
                       </Bar>
                       
                       {/* Define gorgeous gradients for bars */}
                       <defs>
                          <linearGradient id="settledGradient" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                             <stop offset="100%" stopColor="#059669" stopOpacity={0.3} />
                          </linearGradient>
                          <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                             <stop offset="100%" stopColor="#d97706" stopOpacity={0.3} />
                          </linearGradient>
                       </defs>
                    </BarChart>
                 </ResponsiveContainer>
              </div>

              {/* Sleek Cycle Progress Tracker */}
              <div className="mt-6 space-y-2 relative z-10 border-t border-slate-800/60 pt-6">
                 <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <span>Cycle Settlement Rate</span>
                    <span className="text-emerald-400">{totalPayroll > 0 ? Math.round((paidTotal / totalPayroll) * 100) : 0}%</span>
                 </div>
                 <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-[2px]">
                    <div 
                       className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-1000"
                       style={{ width: `${totalPayroll > 0 ? (paidTotal / totalPayroll) * 100 : 0}%` }}
                    />
                 </div>
              </div>

              {/* Information Nodes */}
              <div className="mt-6 grid grid-cols-2 gap-4 relative z-10">
                 {chartData.map(d => (
                    <div key={d.name} className="flex flex-col p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all duration-300">
                       <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${d.color === '#10b981' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'}`} />
                          {d.name}
                       </span>
                       <span className="text-[15px] sm:text-base font-black text-slate-100">₹{d.value.toLocaleString()}</span>
                    </div>
                 ))}
              </div>
           </div>

        </div>

      </div>

      {/* 6. MODAL SYSTEMS */}
      <AnimatePresence>
        {showConfig && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowConfig(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg glass-card p-6 md:p-10 z-10 max-h-[90vh] overflow-y-auto scrollbar-hide">
              <div className="flex justify-between items-center mb-6 sm:mb-8">
                 <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none truncate pr-4">CONFIG: {showConfig.name}</h2>
                 <button onClick={() => setShowConfig(null)} className="p-2 text-slate-400 hover:text-slate-900 transition-all shrink-0"><X size={24} /></button>
              </div>

              <form onSubmit={saveConfig} className="space-y-6 sm:space-y-8">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Member Service</label>
                       <input type="text" placeholder="e.g. AI Solutions" value={configData?.metadata?.service || ''} onChange={e => setConfigData({ ...configData, metadata: { ...configData.metadata, service: e.target.value } })} className="h-12 px-5 bg-slate-50 border-none rounded-2xl text-[13px] font-bold text-slate-900 focus:ring-1 focus:ring-indigo-600" />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Name</label>
                       <input type="text" placeholder="e.g. NexovTech" value={configData?.metadata?.projectName || ''} onChange={e => setConfigData({ ...configData, metadata: { ...configData.metadata, projectName: e.target.value } })} className="h-12 px-5 bg-slate-50 border-none rounded-2xl text-[13px] font-bold text-slate-900 focus:ring-1 focus:ring-indigo-600" />
                    </div>
                 </div>

                 <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Compensation Strategy</label>
                    <div className="flex p-1 bg-slate-50 rounded-2xl overflow-x-auto no-scrollbar">
                       {['Monthly', 'Hourly', 'Per Project'].map(t => (
                          <button key={t} type="button" onClick={() => setConfigData({ ...configData, salaryType: t })} className={`flex-1 py-3 px-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${configData.salaryType === t ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>{t}</button>
                       ))}
                    </div>
                 </div>

                 <div className="flex flex-col gap-3 sm:gap-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sector Breakdown (INR)</label>
                    <div className="grid grid-cols-1 gap-3">
                       {[
                         { key: 'web', label: 'Web Development' },
                         { key: 'ai', label: 'AI Solutions' },
                         { key: 'video', label: 'Video Editing' },
                         { key: 'systems', label: 'Management Systems' }
                       ].map((sector) => (
                          <div key={sector.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 bg-slate-50 p-3 sm:p-4 rounded-2xl border border-transparent focus-within:border-indigo-600/30 transition-all">
                             <span className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">{sector.label}</span>
                             <input type="number" value={configData?.breakdown?.[sector.key] || 0} onChange={(e) => {
                                 const val = Number(e.target.value);
                                 const newBreakdown = { ...configData.breakdown, [sector.key]: val };
                                 const newTotal = Object.values(newBreakdown).reduce((a, b) => a + (Number(b) || 0), 0);
                                 setConfigData({ ...configData, breakdown: newBreakdown, baseSalary: newTotal });
                              }} className="w-full sm:w-48 h-10 bg-white rounded-xl px-4 text-[13px] font-black text-slate-900 outline-none" />
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="bg-indigo-600 p-6 sm:p-8 rounded-[24px] text-white flex justify-between items-center shadow-xl shadow-indigo-100">
                    <div className="flex flex-col">
                       <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-60">Total Base Compensation</span>
                       <span className="text-2xl sm:text-3xl font-black tracking-tighter">₹{configData.baseSalary.toLocaleString()}</span>
                    </div>
                    <IndianRupee size={36} className="opacity-20 shrink-0" />
                 </div>

                 <button type="submit" className="w-full h-14 sm:h-16 bg-indigo-600 text-white text-[12px] font-black uppercase tracking-widest rounded-2xl shadow-2xl shadow-indigo-100 hover:bg-indigo-500 transition-all">Store Configuration</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingPayslip && (
          <DigitalPayslip 
            data={viewingPayslip} 
            onClose={() => setViewingPayslip(null)} 
            onDownload={() => handleDownloadPayslip(viewingPayslip.id || viewingPayslip._id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPayroll;
