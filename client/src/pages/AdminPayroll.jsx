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
  Eye
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
const AdminPayroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  
  // Modals
  const [showConfig, setShowConfig] = useState(null); // Employee object
  const [configData, setConfigData] = useState({ 
    baseSalary: 0, 
    bonus: 0, 
    deductions: 0, 
    salaryType: 'Monthly',
    metadata: {
      service: '',
      projectName: ''
    },
    breakdown: {
      web: 0,
      ai: 0,
      video: 0,
      systems: 0
    }
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
        fetchData(); // Refresh all data to ensure charts update
      }
    } catch (err) {
      console.error('Update failed');
    }
  };

  const handleDelete = async (payrollId) => {
    if (!window.confirm('Are you sure you want to delete this payroll record?')) return;
    try {
      const response = await fetch(`${API_URL}/payroll/${payrollId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchData(); // Refresh UI
      }
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
          baseSalary: 0, 
          bonus: 0, 
          deductions: 0, 
          salaryType: 'Monthly', 
          employeeId: emp.id || emp._id,
          metadata: { service: '', projectName: '' },
          breakdown: { web: 0, ai: 0, video: 0, systems: 0 }
        });
      }
    } catch (err) {
      setConfigData({ 
        baseSalary: 0, 
        bonus: 0, 
        deductions: 0, 
        salaryType: 'Monthly', 
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
      if (response.ok) {
        setShowConfig(null);
      }
    } catch (err) {
      console.error('Save failed');
    }
  };

  const handleDownloadPayslip = (id) => {
    if (!id || id === 'undefined') {
      console.error('❌ PDF_GEN_ABORT: Invalid identifier detected.');
      alert('Mission Error: Payroll record identifier is missing. Please refresh.');
      return;
    }
    window.open(`${API_URL}/payroll/${id}/pdf`, '_blank');
  };

  // Calculations
  const currentRecords = payrolls.filter(p => p.month === Number(selectedMonth) && p.year === Number(selectedYear));
  const totalPayroll = currentRecords.reduce((acc, p) => acc + (p.calculatedSalary?.total || 0), 0);
  const paidTotal = currentRecords.filter(p => p.paymentStatus === 'Paid').reduce((acc, p) => acc + (p.calculatedSalary?.total || 0), 0);
  const pendingTotal = totalPayroll - paidTotal;

  const sectorTotals = currentRecords.reduce((acc, curr) => {
    const bd = curr.calculatedSalary?.breakdown || { web: 0, ai: 0, video: 0, systems: 0 };
    acc.web += bd.web || 0;
    acc.ai += bd.ai || 0;
    acc.video += bd.video || 0;
    acc.systems += bd.systems || 0;
    return acc;
  }, { web: 0, ai: 0, video: 0, systems: 0 });

  const chartData = [
    { name: 'Paid', value: paidTotal, color: '#10b981' },
    { name: 'Pending', value: pendingTotal, color: '#f59e0b' }
  ];

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-brand-500" size={48} /></div>;

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Payroll Architecture</h1>
          <p className="text-slate-400 mt-1 text-[10px] font-black uppercase tracking-widest">Automated sector-based ledger • {selectedMonth}/{selectedYear}</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-black outline-none focus:border-brand-500"
          >
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-brand-600 transition-all shadow-xl shadow-brand-600/20 disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Detecting Members...
              </>
            ) : (
              <>
                <Plus size={18} />
                Generate Payroll
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Liability" value={totalPayroll} icon={IndianRupee} color="text-white" />
        <StatCard title="Settled" value={paidTotal} icon={CheckCircle2} color="text-emerald-500" />
        <StatCard title="Outstanding" value={pendingTotal} icon={Clock} color="text-amber-500" />
      </div>

      {/* Sector Budget Breakdown */}
      <div className="bg-slate-900 rounded-[40px] p-8 shadow-2xl overflow-hidden relative group border border-white/10">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
           <IndianRupee size={200} className="text-white" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-8 bg-amber-500 rounded-full" />
            <h3 className="text-lg font-black text-white tracking-tighter uppercase">Sector Allocation Analytics</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Web Dev', val: sectorTotals.web || 0, color: 'bg-blue-500' },
              { label: 'AI Solutions', val: sectorTotals.ai || 0, color: 'bg-purple-500' },
              { label: 'Video Edit', val: sectorTotals.video || 0, color: 'bg-amber-500' },
              { label: 'Systems', val: sectorTotals.systems || 0, color: 'bg-emerald-500' }
            ].map((s) => (
              <div key={s.label} className="space-y-3">
                 <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 tracking-widest">
                    <span>{s.label}</span>
                    <span className="text-white font-black">₹ {s.val.toLocaleString()}</span>
                 </div>
                 <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${totalPayroll > 0 ? (s.val / totalPayroll) * 100 : 0}%` }}
                      className={`h-full ${s.color}`}
                    />
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-light rounded-[40px] border border-slate-100 p-4 md:p-8 flex flex-col shadow-2xl bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 px-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Settlement Grid</h2>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={14} />
              <input 
                placeholder="Find specialist..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-xl py-3 pl-9 pr-4 text-xs font-bold text-white outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-white/50 uppercase tracking-widest border-b border-white/5">
                  <th className="pb-4 px-2">Identity</th>
                  <th className="pb-4 px-2">Attendance</th>
                  <th className="pb-4 px-2">Base</th>
                  <th className="pb-4 px-2">Bonus</th>
                  <th className="pb-4 px-2">Net Salary</th>
                  <th className="pb-4 px-2">Status</th>
                  <th className="pb-4 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentRecords.filter(p => p.employeeName?.toLowerCase().includes(search.toLowerCase())).map((p) => (
                  <tr key={p.id || p._id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xs">{p.employeeName?.charAt(0)}</div>
                        <span className="text-sm font-bold text-white">{p.employeeName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className="text-xs font-black text-white/60">{p.attendanceSummary?.presentDays || 0} / 22</span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-sm text-white/80">₹{(p.calculatedSalary?.base || 0).toLocaleString()}</td>
                    <td className="py-4 px-2 text-sm text-emerald-400 font-bold">+₹{p.calculatedSalary?.bonus || 0}</td>
                    <td className="py-4 px-2 text-sm font-black text-white">₹{(p.calculatedSalary?.total || 0).toLocaleString()}</td>
                    <td className="py-4 px-2">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                        {p.paymentStatus}
                      </span>
                    </td>
                     <td className="py-4 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setViewingPayslip(p)}
                          className="p-2 text-slate-400 hover:text-brand-500 transition-colors"
                          title="Review Statement"
                        >
                          <Eye size={14} />
                        </button>
                        {p.paymentStatus === 'Pending' ? (
                          <button 
                            onClick={() => handleMarkPaid(p.id || p._id)}
                            className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-brand-500 transition-all"
                          >
                            Settle
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleDownloadPayslip(p.id || p._id)}
                            className="p-2 text-slate-900 hover:text-brand-500 transition-colors"
                          >
                            <Download size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(p.id || p._id)}
                          className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-4">
             {currentRecords.filter(p => p.employeeName?.toLowerCase().includes(search.toLowerCase())).map((p) => (
                <div key={p.id || p._id} className="p-5 bg-white/5 rounded-3xl border border-white/5 flex flex-col gap-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-black">{p.employeeName?.charAt(0)}</div>
                         <div>
                            <p className="text-sm font-black text-white">{p.employeeName}</p>
                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${p.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {p.paymentStatus}
                            </span>
                         </div>
                      </div>
                      <p className="text-lg font-black text-white tracking-tight">₹{p.calculatedSalary.total.toLocaleString()}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4 py-2 border-y border-white/5">
                      <div>
                         <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Base Compensation</p>
                         <p className="text-xs font-bold text-white">₹{p.calculatedSalary.base.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Incentives</p>
                         <p className="text-xs font-bold text-emerald-600">+₹{p.calculatedSalary.bonus}</p>
                      </div>
                   </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setViewingPayslip(p)}
                        className="p-4 bg-white/5 text-white/60 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                      >
                        <Eye size={16} /> View
                      </button>
                      {p.paymentStatus === 'Pending' ? (
                        <button 
                          onClick={() => handleMarkPaid(p.id || p._id)}
                          className="flex-1 py-4 bg-brand-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-600/20 active:scale-[0.98] transition-all"
                        >
                          Process Settlement
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleDownloadPayslip(p.id || p._id)}
                          className="flex-1 py-4 bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <FileText size={14} /> Download Slip
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(p.id || p._id)}
                        className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl"
                      >
                        <Trash2 size={16} />
                      </button>
                   </div>
                </div>
             ))}
          </div>

          {currentRecords.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                 <AlertCircle size={32} className="text-slate-300" />
              </div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">No Financial Records Detected</p>
              <p className="text-[10px] text-slate-500 font-bold mt-2">Generate payroll for the current cycle to populate the grid.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-light rounded-[40px] border border-white/10 shadow-2xl p-8 bg-slate-900 min-w-0">
            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-400" /> Flux Analysis
            </h3>
            <div className="h-[200px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#0f172a', fontSize: 10, fontWeight: 900}} />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-light rounded-[40px] border border-white/10 shadow-2xl p-8 bg-slate-900">
            <h3 className="text-lg font-black text-white mb-6">Salary Configuration</h3>
            <div className="space-y-3">
              {team.map(member => (
                <div key={member.id || member._id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl hover:border-brand-500/30 transition-all group shadow-sm">
                   <div className="flex items-center gap-3">
                      <img 
                        src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} 
                        className="w-8 h-8 rounded-lg object-cover border border-white/10" 
                        alt="" 
                        onError={(e) => { e.target.onerror = null; e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`; }}
                      />
                      <div className="max-w-[120px]">
                         <p className="text-xs font-black text-white truncate">{member.name}</p>
                         <p className="text-[8px] text-white/40 font-black uppercase tracking-widest">{member.role}</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => openConfig(member)}
                    className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-brand-500 transition-all"
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
              className="relative w-full max-w-md glass border border-white/10 rounded-[40px] p-10 shadow-2xl bg-[#020617]"
            >
              <h2 className="text-3xl font-black text-white tracking-tighter mb-2">Config: {showConfig.name}</h2>
              <p className="text-xs text-brand-500 font-black uppercase tracking-widest mb-8">Set Base Compensation</p>
              
              <form onSubmit={saveConfig} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Member Service</label>
                    <input 
                      type="text" 
                      placeholder="e.g. AI Solutions"
                      value={configData?.metadata?.service || ''} 
                      onChange={e => setConfigData({...configData, metadata: { ...configData.metadata, service: e.target.value }})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-brand-500" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Project Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. NexovTech"
                      value={configData?.metadata?.projectName || ''} 
                      onChange={e => setConfigData({...configData, metadata: { ...configData.metadata, projectName: e.target.value }})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-brand-500" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Salary Type</label>
                  <select 
                    value={configData.salaryType} 
                    onChange={e => setConfigData({...configData, salaryType: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-brand-500"
                  >
                    <option className="bg-slate-900">Monthly</option>
                    <option className="bg-slate-900">Hourly</option>
                    <option className="bg-slate-900">Per Project</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Sector Breakdown (INR)</label>
                  <div className="grid grid-cols-1 gap-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                    {[
                      { key: 'web', label: 'Web Development' },
                      { key: 'ai', label: 'AI Solutions' },
                      { key: 'video', label: 'Video Editing' },
                      { key: 'systems', label: 'Management Systems' }
                    ].map((sector) => (
                      <div key={sector.key} className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                        <span className="text-[9px] font-bold text-white/40 w-24 leading-tight">{sector.label}</span>
                        <input 
                          type="number"
                          value={configData?.breakdown?.[sector.key] || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const currentBreakdown = configData?.breakdown || { web: 0, ai: 0, video: 0, systems: 0 };
                            const newBreakdown = { ...currentBreakdown, [sector.key]: val };
                            const newTotal = Object.values(newBreakdown).reduce((a, b) => a + (Number(b) || 0), 0);
                            setConfigData({ ...configData, breakdown: newBreakdown, baseSalary: newTotal });
                          }}
                          className="flex-1 bg-white/5 border border-white/5 rounded-lg p-2 text-sm font-bold text-white outline-none focus:border-brand-500"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl text-white">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Base</span>
                    <span className="text-lg font-black tracking-tighter">₹ {configData.baseSalary}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Performance Bonus (INR)</label>
                    <input type="number" value={configData.bonus} onChange={e => setConfigData({...configData, bonus: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-brand-500" />
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-brand-600 rounded-2xl text-xs font-black uppercase tracking-widest text-white hover:bg-brand-500 transition-all">Store Configuration</button>
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
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="glass-light rounded-[32px] border border-white/10 shadow-xl p-8 relative overflow-hidden group bg-slate-900">
    <div className="flex items-center justify-between mb-4">
       <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{title}</span>
       <div className={`p-3 bg-white/5 rounded-xl ${color}`}><Icon size={18} /></div>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xs font-black text-white/60">₹</span>
      <span className="text-4xl font-black text-white tracking-tighter">{value.toLocaleString()}</span>
    </div>
    <div className="mt-4 flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Real-time Synchronization</span>
    </div>
  </div>
);

export default AdminPayroll;
