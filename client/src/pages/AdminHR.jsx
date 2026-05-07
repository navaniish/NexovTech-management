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
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const fetchAll = async () => {
    try {
      const [tRes, aRes, lRes] = await Promise.all([
        fetch(`${API_URL}/team`),
        fetch(`${API_URL}/attendance/all`),
        fetch(`${API_URL}/leave/all`)
      ]);
      if (tRes.ok) setTeam(await tRes.json());
      if (aRes.ok) setAttendance(await aRes.json());
      if (lRes.ok) setLeaves(await lRes.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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
  const nonAdminTeam = team.filter(t => t.role !== 'Admin');
  const todayAtt = attendance.filter(a => a.date === dateFilter);
  const presentCount = todayAtt.filter(a => a.attendanceStatus === 'Present').length;
  const lateCount = todayAtt.filter(a => a.attendanceStatus === 'Late').length;
  const absentCount = Math.max(0, nonAdminTeam.length - todayAtt.length);
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
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>HR Command Center</h1>
          <p className="mt-2 font-medium" style={{ color: 'var(--text-primary)' }}>Workforce management, attendance tracking & leave operations.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Present Today" value={presentCount} icon={CheckCircle2} accent="#10b981" />
        <StatCard title="Late Arrivals" value={lateCount} icon={AlertCircle} accent="#f59e0b" />
        <StatCard title="Absent" value={absentCount} icon={XCircle} accent="#ef4444" />
        <StatCard title="Pending Leaves" value={pendingLeaves} icon={Calendar} accent="#8b5cf6" />
      </div>

      {/* Chart + Tab Nav */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="theme-card rounded-2xl p-6">
          <h3 className="text-sm font-black mb-4" style={{ color: 'var(--text-primary)' }}>Today's Snapshot</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#000', fontSize: 9, fontWeight: 900 }} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-3">
          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  tab === t.id ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'theme-card'
                }`}
                style={tab !== t.id ? { color: 'var(--text-primary)' } : {}}
              >
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {tab === 'attendance' && (
            <AttendanceTab attendance={attendance} dateFilter={dateFilter} setDateFilter={setDateFilter} search={search} setSearch={setSearch} team={team} onRefresh={fetchAll} />
          )}
          {tab === 'leaves' && (
            <LeaveTab leaves={leaves} onAction={handleLeaveAction} />
          )}
          {tab === 'directory' && (
            <DirectoryTab team={team} search={search} setSearch={setSearch} onTeamUpdated={fetchAll} />
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Stat Card ── */
const StatCard = ({ title, value, icon: Icon, accent }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="theme-card rounded-2xl p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>{title}</span>
      <div className="p-2 rounded-xl" style={{ background: `${accent}18` }}><Icon size={16} style={{ color: accent }} /></div>
    </div>
    <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{value}</p>
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
    <div className="theme-card rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Attendance Log</h3>
        <div className="flex items-center gap-3">
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="px-4 py-2 rounded-xl text-xs font-bold outline-none border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: 'var(--text-primary)' }} />
            <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl text-xs font-bold outline-none border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          </div>
          <button onClick={() => setShowMark(true)}
            className="bg-brand-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 transition-all flex items-center gap-2 shadow-lg shadow-brand-600/20">
            <UserPlus size={14} /> Mark Attendance
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-widest border-b" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
              <th className="pb-3 px-2">Employee</th>
              <th className="pb-3 px-2">Check In</th>
              <th className="pb-3 px-2">Check Out</th>
              <th className="pb-3 px-2">Hours</th>
              <th className="pb-3 px-2">Status</th>
              <th className="pb-3 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
            {filtered.map(a => (
              <tr key={a.id} className="hover:bg-black/[0.02] transition-colors">
                <td className="py-3 px-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{getName(a.employeeId)}</td>
                <td className="py-3 px-2 text-sm" style={{ color: 'var(--text-primary)' }}>{a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '—'}</td>
                <td className="py-3 px-2 text-sm" style={{ color: 'var(--text-primary)' }}>{a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '—'}</td>
                <td className="py-3 px-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{a.totalHours || 0}h</td>
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
                  className="w-full py-4 bg-brand-600 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:bg-brand-500 transition-all flex items-center justify-center gap-2">
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
                  className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all">
                  Approve
                </button>
                <button onClick={() => onAction(l.id, 'Rejected')}
                  className="px-3 py-1.5 bg-rose-500/10 text-rose-600 rounded-lg text-[10px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all">
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
    <div className="theme-card rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Employee Directory</h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: 'var(--text-primary)' }} />
            <input placeholder="Search by name or role..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl text-xs font-bold outline-none border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          </div>
          <button onClick={() => setShowAdd(true)}
            className="bg-brand-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 transition-all flex items-center gap-2 shadow-lg shadow-brand-600/20">
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
                <img src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}`} className="w-12 h-12 rounded-xl" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{emp.name}</p>
                  <p className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>{emp.email}</p>
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
                  className="w-full py-4 bg-brand-600 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:bg-brand-500 transition-all flex items-center justify-center gap-2">
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
