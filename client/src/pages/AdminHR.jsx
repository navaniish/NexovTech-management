import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Clock, CheckCircle2, XCircle, AlertCircle,
  Calendar, Filter, ChevronDown, Loader2, UserPlus, Edit3, Trash2,
  X, Building2, Mail, Phone, Briefcase, AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import API_URL from '../config';
const AdminHR = () => {
  const [tab, setTab] = useState('attendance');
  const [team, setTeam] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const fetchAll = async () => {
    try {
      const [tRes, aRes, lRes] = await Promise.all([
        fetch(`${API_URL}/team?t=${Date.now()}`),
        fetch(`${API_URL}/attendance/all`),
        fetch(`${API_URL}/leave/all`)
      ]);
      if (tRes.ok) setTeam(await tRes.json());
      if (aRes.ok) setAttendance(await aRes.json());
      if (lRes.ok) setLeaves(await lRes.json());
    } catch (err) {
      console.error('Personnel Sync Failure:', err);
      setError('Mission Control Link Disrupted. Unable to synchronize personnel registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleLeaveAction = async (leaveId, action) => {
    try {
      const res = await fetch(`${API_URL}/leave/${leaveId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, approvedBy: 'Admin' })
      });
      if (res.ok) {
        const updated = await res.json();
        setLeaves(prev => prev.map(l => l.id === leaveId ? updated : l));
      }
    } catch (err) { console.error(err); }
  };

  // Stats
  const activePersonnel = team;
  const todayAtt = attendance.filter(a => a.date === dateFilter);
  const presentCount = todayAtt.filter(a => a.attendanceStatus === 'Present').length;
  const lateCount = todayAtt.filter(a => a.attendanceStatus === 'Late').length;
  const absentCount = Math.max(0, activePersonnel.length - todayAtt.length);
  const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;

  const chartData = [
    { name: 'Present', value: presentCount, color: '#10b981' },
    { name: 'Late', value: lateCount, color: '#f59e0b' },
    { name: 'Absent', value: absentCount, color: '#ef4444' },
    { name: 'Leave Req', value: pendingLeaves, color: '#8b5cf6' }
  ];

  const tabs = [
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leaves', label: 'Leave Requests', icon: Calendar },
    { id: 'directory', label: 'Employee Directory', icon: Users }
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 size={48} className="text-brand-500 animate-spin" />
      <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Loading HR System...</p>
    </div>
  );

  return (
    <div className="w-full flex flex-col p-4 sm:p-6 space-y-6 animate-in fade-in duration-1000 overflow-y-auto custom-scrollbar">
      {/* 1. HIGH-FIDELITY OFFICE HEADER */}
      <section className="relative w-full overflow-hidden rounded-[24px] md:rounded-[40px] bg-white shadow-2xl border border-white flex flex-col min-h-[160px] md:min-h-[220px] group">
         <div 
           className="absolute inset-0 bg-cover bg-center transition-all duration-700 blur-[8px] scale-105 group-hover:scale-110"
           style={{ backgroundImage: "url('/assets/office-bg.png')" }}
         />
         <div className="absolute inset-0 bg-white/40 backdrop-blur-[12px]" />
         <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent md:hidden" />
         
         <div className="relative z-10 flex-1 p-6 md:p-12 flex flex-col justify-center">
            <div className="space-y-1 mb-4 md:mb-8">
               <h1 className="mobile-hero-title font-black text-slate-900 flex items-center gap-2">
                  HR Command Center <span className="animate-bounce-slow text-2xl md:text-4xl">🏢</span>
               </h1>
               <p className="mobile-body-text text-slate-500 font-medium">
                  Workforce management & leave operations.
               </p>
            </div>
         </div>
      </section>

      {/* 2. KPI NODES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard title="Present Today" value={presentCount} icon={CheckCircle2} accent="#10b981" delay={0.1} />
        <StatCard title="Late Arrivals" value={lateCount} icon={AlertCircle} accent="#f59e0b" delay={0.2} />
        <StatCard title="Absent" value={absentCount} icon={XCircle} accent="#ef4444" delay={0.3} />
        <StatCard title="Pending" value={pendingLeaves} icon={Calendar} accent="#8b5cf6" delay={0.4} />
      </div>

      {/* 3. CORE CONTENT HUB */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-3 space-y-4">
           {/* Snapshot Card */}
           <div className="glass-card !p-4 md:!p-6 border-slate-100">
              <h4 className="mobile-label-text text-slate-900 mb-4 md:mb-6">Daily Snapshot</h4>
              <div className="h-[160px] md:h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 7, fontWeight: 900 }} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ background: '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} 
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* Slim Nav Switcher */}
           <div className="flex lg:flex-col gap-2 p-1.5 bg-white/40 border border-slate-100 rounded-[24px] md:rounded-[32px] shadow-lg backdrop-blur-xl overflow-x-auto no-scrollbar">
             {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-3 md:gap-4 px-4 md:px-6 h-10 md:h-12 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] transition-all uppercase tracking-widest lg:w-full group whitespace-nowrap ${
                      tab === t.id
                      ? 'bg-slate-900 text-white shadow-xl translate-x-0 lg:translate-x-1'
                      : 'text-slate-400 hover:text-slate-900 hover:bg-white'
                    }`}
                >
                  <t.icon size={14} className={tab === t.id ? 'text-brand-400' : 'opacity-40 group-hover:opacity-100'} />
                  {t.label}
                </button>
             ))}
           </div>
        </div>

        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card !p-5 md:!p-10 min-h-[500px] md:min-h-[600px] border-slate-100 rounded-[32px] md:rounded-[40px] shadow-2xl"
            >
              {tab === 'attendance' && (
                <AttendanceTab attendance={attendance} dateFilter={dateFilter} setDateFilter={setDateFilter} search={search} setSearch={setSearch} team={team} onRefresh={fetchAll} />
              )}
              {tab === 'leaves' && (
                <LeaveTab leaves={leaves} onAction={handleLeaveAction} />
              )}
              {tab === 'directory' && (
                <DirectoryTab team={team} search={search} setSearch={setSearch} onTeamUpdated={fetchAll} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

/* ── Stat Card ── */
const StatCard = ({ title, value, icon: Icon, accent, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    transition={{ delay }}
    className="glass-card !p-4 md:!p-6 flex flex-col relative overflow-hidden group border-slate-100 hover:scale-[1.02] transition-all min-h-[100px] md:min-h-[120px]"
  >
    <div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-4 relative z-10">
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm shrink-0" style={{ backgroundColor: `${accent}10`, color: accent }}>
        <Icon size={18} md:size={24} strokeWidth={2.5} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5 truncate">{title}</span>
        <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-none truncate">{value}</h3>
      </div>
    </div>
  </motion.div>
);
/* ── Attendance Tab ── */
const AttendanceTab = ({ attendance, dateFilter, setDateFilter, search, setSearch, team, onRefresh }) => {
  const [showMark, setShowMark] = useState(false);
  const [markEmpId, setMarkEmpId] = useState('');
  const [markStatus, setMarkStatus] = useState('Present');
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState('');

  const filtered = attendance.filter(a => a.date === dateFilter);
  const getName = (empId) => {
    const emp = team.find(t => (t.id || t._id) === empId);
    return emp?.name || empId;
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!markEmpId) return;
    setMarking(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/attendance/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: markEmpId, remarks: `Marked by Admin as ${markStatus}` })
      });
      const data = await res.json();
      if (res.ok) {
        setShowMark(false);
        setMarkEmpId('');
        if (onRefresh) onRefresh();
      } else {
        setError(data.message || 'Check-in failed');
      }
    } catch (err) { 
      setError('Mission control connection failed');
      console.error(err); 
    } finally { setMarking(false); }
  };

  return (
    <div className="theme-card rounded-2xl p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="mobile-section-title text-slate-900">Attendance Log</h3>
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar pb-1">
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-[10px] md:text-xs font-bold outline-none border bg-white border-slate-100" />
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
            <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-xl text-[10px] md:text-xs font-bold outline-none border bg-white border-slate-100 w-32 md:w-48" />
          </div>
          <button onClick={() => setShowMark(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 shrink-0">
            <UserPlus size={12} /> Mark
          </button>
        </div>
      </div>
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="text-[9px] md:text-[10px] font-black uppercase tracking-widest border-b border-slate-50 text-slate-400">
              <th className="pb-3 px-2">Employee</th>
              <th className="pb-3 px-2">In</th>
              <th className="pb-3 px-2">Out</th>
              <th className="pb-3 px-2">Hrs</th>
              <th className="pb-3 px-2">Status</th>
              <th className="pb-3 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(a => (
              <tr key={a.id} className="hover:bg-black/[0.02] transition-colors">
                <td className="py-3 px-2 text-sm font-bold text-gray-900">{getName(a.employeeId)}</td>
                <td className="py-3 px-2 text-sm text-gray-600">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '—'}</td>
                <td className="py-3 px-2 text-sm text-gray-600">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '—'}</td>
                <td className="py-3 px-2 text-sm font-bold text-gray-900">{a.totalHours || 0}h</td>
                <td className="py-3 px-2">
                  <StatusBadge status={a.attendanceStatus} />
                </td>
                <td className="py-3 px-2 text-right">
                  <button 
                    onClick={async () => {
                      if (window.confirm('Delete this attendance record?')) {
                        const res = await fetch(`${API_URL}/attendance/${a.id}`, { method: 'DELETE' });
                        if (res.ok && onRefresh) onRefresh();
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="6" className="py-10 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>No records for selected date.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mark Attendance Modal */}
      <AnimatePresence>
        {showMark && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMark(false)} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm rounded-2xl p-8 shadow-2xl z-10" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Mark Attendance</h2>
                <button onClick={() => setShowMark(false)} className="p-2 hover:bg-black/5 rounded-xl transition-colors"><X size={20} style={{ color: 'var(--text-primary)' }} /></button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-500 text-xs font-bold">
                  <AlertTriangle size={16} /> {error}
                </div>
              )}

              <form onSubmit={handleMarkAttendance} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Select Employee</label>
                  <select required value={markEmpId} onChange={e => setMarkEmpId(e.target.value)}
                    className="w-full p-3 rounded-xl text-sm font-bold outline-none border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                    <option value="">— Choose —</option>
                    {team.filter(t => t.role !== 'Admin').map(t => (
                      <option key={t.id || t._id} value={t.id || t._id}>{t.name} ({t.role})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Status</label>
                  <select value={markStatus} onChange={e => setMarkStatus(e.target.value)}
                    className="w-full p-3 rounded-xl text-sm font-bold outline-none border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                    <option>Present</option>
                    <option>Late</option>
                    <option>Half Day</option>
                  </select>
                </div>
                <button type="submit" disabled={marking}
                  className="w-full py-4 bg-brand-600 rounded-xl text-xs font-black uppercase tracking-widest text-gray-900 hover:bg-brand-500 transition-all flex items-center justify-center gap-2">
                  {marking ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Confirm Check-In
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


/* ── Leave Tab ── */
const LeaveTab = ({ leaves, onAction }) => (
  <div className="theme-card rounded-2xl p-6 space-y-4">
    <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Leave Requests</h3>
    <div className="space-y-3">
      {leaves.map(l => (
        <div key={l.id} className="flex items-center justify-between p-4 rounded-2xl border transition-all hover:shadow-md" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500 font-black text-sm">
              {(l.employeeName || 'E')[0]}
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{l.employeeName || l.employeeId}</p>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
                {l.leaveType} · {l.startDate} → {l.endDate} · {l.totalDays}d
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-primary)' }}>{l.reason}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {l.status === 'Pending' ? (
              <>
                <button onClick={() => onAction(l.id, 'Approved')}
                  className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-gray-900 transition-all">
                  Approve
                </button>
                <button onClick={() => onAction(l.id, 'Rejected')}
                  className="px-3 py-1.5 bg-rose-500/10 text-rose-600 rounded-lg text-[10px] font-black uppercase hover:bg-rose-500 hover:text-gray-900 transition-all">
                  Reject
                </button>
              </>
            ) : (
              <StatusBadge status={l.status} />
            )}
          </div>
        </div>
      ))}
      {leaves.length === 0 && (
        <p className="text-center py-10 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>No leave requests found.</p>
      )}
    </div>
  </div>
);

/* ── Directory Tab ── */
const DirectoryTab = ({ team, search, setSearch, onTeamUpdated }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Employee', phone: '', department: 'Engineering' });
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/team/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowAdd(false);
        setForm({ name: '', email: '', role: 'Employee', phone: '', department: 'Engineering' });
        if (onTeamUpdated) onTeamUpdated();
      }
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this employee from the system?')) return;
    try {
      const res = await fetch(`${API_URL}/team/${id}`, { method: 'DELETE' });
      if (res.ok && onTeamUpdated) onTeamUpdated();
    } catch (err) { console.error(err); }
  };

  const filtered = team.filter(t => t.name?.toLowerCase().includes(search.toLowerCase()) || t.role?.toLowerCase().includes(search.toLowerCase()));
  const departments = [...new Set(filtered.map(t => t.role || 'General'))];

  return (
    <div className="theme-card rounded-2xl p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <h3 className="text-base sm:text-lg font-black" style={{ color: 'var(--text-primary)' }}>Employee Directory</h3>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: 'var(--text-primary)' }} />
            <input placeholder="Search by name or role..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl text-xs font-bold outline-none border w-full sm:w-48" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          </div>
          <button onClick={() => setShowAdd(true)}
            className="bg-brand-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 w-full sm:w-auto">
            <UserPlus size={14} /> Add Employee
          </button>
        </div>
      </div>
      {departments.map(dept => (
        <div key={dept}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Building2 size={12} /> {dept}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.filter(t => (t.role || 'General') === dept).map(emp => (
              <div key={emp.id || emp._id} className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-md" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                <img
                  src={(() => {
                    const avatar = emp.avatar;
                    if (!avatar) return `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}`;
                    if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
                    if (/^[A-Za-z0-9+/=]+$/.test(avatar.trim()) && avatar.length > 100) {
                      return `data:image/jpeg;base64,${avatar.trim()}`;
                    }
                    return `${API_URL.replace('/api', '')}${avatar}`;
                  })()}
                  className="w-12 h-12 rounded-xl"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate text-gray-900">{emp.name}</p>
                  <p className="text-[10px] font-bold text-gray-400">{emp.email}</p>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Active</span>
                <button onClick={() => handleDelete(emp.id || emp._id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {team.length === 0 && (
        <p className="text-center py-10 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>No employees registered. Add your first employee above!</p>
      )}

      {/* Add Employee Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-2xl p-8 shadow-2xl z-10" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Add Employee</h2>
                <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-black/5 rounded-xl transition-colors"><X size={20} style={{ color: 'var(--text-primary)' }} /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Full Name</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ravi Kumar"
                    className="w-full p-3 rounded-xl text-sm font-bold outline-none border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Email</label>
                  <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ravi@company.com"
                    className="w-full p-3 rounded-xl text-sm font-bold outline-none border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Role</label>
                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                      className="w-full p-3 rounded-xl text-sm font-bold outline-none border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                      <option>Employee</option>
                      <option>Developer</option>
                      <option>Editor</option>
                      <option>Manager</option>
                      <option>AI Specialist</option>
                      <option>Security Analyst</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Department</label>
                    <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                      className="w-full p-3 rounded-xl text-sm font-bold outline-none border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                      <option>Engineering</option>
                      <option>Design</option>
                      <option>Marketing</option>
                      <option>Operations</option>
                      <option>Sales</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210"
                    className="w-full p-3 rounded-xl text-sm font-bold outline-none border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full py-4 bg-brand-600 rounded-xl text-xs font-black uppercase tracking-widest text-gray-900 hover:bg-brand-500 transition-all flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />} Register Employee
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


/* ── Status Badge ── */
const StatusBadge = ({ status }) => {
  const styles = {
    Present: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    Late: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    'Half Day': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    Absent: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    Approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    Rejected: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    Pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

export default AdminHR;


