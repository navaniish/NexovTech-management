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
  FileText
} from 'lucide-react';
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const AdminPayroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  
  // Modals
  const [showConfig, setShowConfig] = useState(null); // Employee object
  const [configData, setConfigData] = useState({ baseSalary: 0, bonus: 0, deductions: 0, salaryType: 'Monthly' });
  const [generating, setGenerating] = useState(false);

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
      if (response.ok) {
        fetchData();
      }
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
      if (response.ok) {
        setPayrolls(prev => prev.map(p => p._id === payrollId ? { ...p, paymentStatus: 'Paid', paymentDate: new Date() } : p));
      }
    } catch (err) {
      console.error('Update failed');
    }
  };

  const openConfig = async (emp) => {
    setShowConfig(emp);
    try {
      const res = await fetch(`${API_URL}/payroll/salary/${emp.id || emp._id}`);
      if (res.ok) {
        const data = await res.json();
        setConfigData(data || { baseSalary: 0, bonus: 0, deductions: 0, salaryType: 'Monthly', employeeId: emp.id || emp._id });
      }
    } catch (err) {
      setConfigData({ baseSalary: 0, bonus: 0, deductions: 0, salaryType: 'Monthly', employeeId: emp.id || emp._id });
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
      if (response.ok) {
        setShowConfig(null);
      }
    } catch (err) {
      console.error('Save failed');
    }
  };

  const handleDownloadPayslip = (id) => {
    window.open(`${API_URL}/payroll/${id}/pdf`, '_blank');
  };

  // Calculations
  const currentRecords = payrolls.filter(p => p.month === Number(selectedMonth) && p.year === Number(selectedYear));
  const totalPayroll = currentRecords.reduce((acc, p) => acc + p.calculatedSalary.total, 0);
  const paidTotal = currentRecords.filter(p => p.paymentStatus === 'Paid').reduce((acc, p) => acc + p.calculatedSalary.total, 0);
  const pendingTotal = totalPayroll - paidTotal;

  const chartData = [
    { name: 'Paid', value: paidTotal, color: '#10b981' },
    { name: 'Pending', value: pendingTotal, color: '#f59e0b' }
  ];

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-brand-500" size={48} /></div>;

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Payroll Architecture</h1>
          <p className="text-surface-500 mt-2 font-medium">Automated salary calculation and settlement ledger.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-black text-white outline-none focus:border-brand-500"
          >
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="bg-brand-600 text-white px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all flex items-center gap-2 shadow-xl shadow-brand-600/20"
          >
            {generating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} 
            Generate Payroll
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Liability" value={totalPayroll} icon={IndianRupee} color="text-brand-400" />
        <StatCard title="Settled" value={paidTotal} icon={CheckCircle2} color="text-emerald-400" />
        <StatCard title="Outstanding" value={pendingTotal} icon={Clock} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-light rounded-[40px] border border-white/5 p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white tracking-tight">Settlement Grid</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-600" size={14} />
              <input 
                placeholder="Find specialist..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-white/5 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-surface-500 uppercase tracking-widest border-b border-white/5">
                  <th className="pb-4 px-2">Identity</th>
                  <th className="pb-4 px-2">Base</th>
                  <th className="pb-4 px-2">Bonus</th>
                  <th className="pb-4 px-2">Net Salary</th>
                  <th className="pb-4 px-2">Status</th>
                  <th className="pb-4 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentRecords.filter(p => p.employeeName?.toLowerCase().includes(search.toLowerCase())).map((p) => (
                  <tr key={p._id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xs">{p.employeeName?.charAt(0)}</div>
                        <span className="text-sm font-bold text-white">{p.employeeName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-sm text-surface-300">₹{p.calculatedSalary.base.toLocaleString()}</td>
                    <td className="py-4 px-2 text-sm text-emerald-500">+₹{p.calculatedSalary.bonus}</td>
                    <td className="py-4 px-2 text-sm font-black text-white">₹{p.calculatedSalary.total.toLocaleString()}</td>
                    <td className="py-4 px-2">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      {p.paymentStatus === 'Pending' ? (
                        <button 
                          onClick={() => handleMarkPaid(p._id)}
                          className="px-3 py-1.5 bg-brand-600/10 text-brand-400 rounded-lg text-[10px] font-black uppercase hover:bg-brand-600 hover:text-white transition-all"
                        >
                          Settle
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleDownloadPayslip(p._id)}
                          className="p-2 text-surface-600 hover:text-white transition-colors"
                        >
                          <Download size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {currentRecords.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-surface-700 font-black uppercase tracking-widest text-xs">No records for this cycle. Generate payroll to begin.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-light rounded-[40px] border border-white/5 p-8">
            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-400" /> Flux Analysis
            </h3>
            <div className="h-[200px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 900}} />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-light rounded-[40px] border border-white/5 p-8">
            <h3 className="text-lg font-black text-white mb-6">Salary Configuration</h3>
            <div className="space-y-3">
              {team.map(member => (
                <div key={member.id || member._id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-brand-500/30 transition-all group">
                   <div className="flex items-center gap-3">
                      <img src={member.avatar} className="w-8 h-8 rounded-lg" alt="" />
                      <div className="max-w-[100px]">
                         <p className="text-xs font-bold text-white truncate">{member.name}</p>
                         <p className="text-[8px] text-surface-500 uppercase tracking-widest">{member.role}</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => openConfig(member)}
                    className="p-2 bg-white/5 rounded-xl text-surface-500 hover:text-brand-400 transition-colors"
                   >
                     <Settings2 size={16} />
                   </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfig && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowConfig(null)} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass border border-white/10 rounded-[40px] p-10 shadow-2xl"
            >
              <h2 className="text-3xl font-black text-white tracking-tighter mb-2">Config: {showConfig.name}</h2>
              <p className="text-xs text-brand-500 font-black uppercase tracking-widest mb-8">Set Base Compensation</p>
              
              <form onSubmit={saveConfig} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Salary Type</label>
                  <select 
                    value={configData.salaryType} 
                    onChange={e => setConfigData({...configData, salaryType: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-brand-500"
                  >
                    <option>Monthly</option>
                    <option>Hourly</option>
                    <option>Per Project</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Base Salary (INR)</label>
                  <input 
                    type="number"
                    value={configData.baseSalary}
                    onChange={e => setConfigData({...configData, baseSalary: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-brand-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Bonus</label>
                    <input type="number" value={configData.bonus} onChange={e => setConfigData({...configData, bonus: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-brand-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Deductions</label>
                    <input type="number" value={configData.deductions} onChange={e => setConfigData({...configData, deductions: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-brand-500" />
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-brand-600 rounded-2xl text-xs font-black uppercase tracking-widest text-white hover:bg-brand-500 transition-all">Store Configuration</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="glass-light rounded-[32px] border border-white/5 p-8 relative overflow-hidden group">
    <div className="flex items-center justify-between mb-4">
       <span className="text-[10px] font-black text-surface-500 uppercase tracking-widest">{title}</span>
       <div className={`p-3 bg-white/5 rounded-xl ${color}`}><Icon size={18} /></div>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xs font-black text-surface-600">₹</span>
      <span className="text-4xl font-black text-white tracking-tighter">{value.toLocaleString()}</span>
    </div>
    <div className="mt-4 flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-[9px] font-black text-surface-600 uppercase tracking-widest">Real-time Synchronization</span>
    </div>
  </div>
);

export default AdminPayroll;
