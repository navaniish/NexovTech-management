import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, LogIn, LogOut, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import API_URL from '../../config';

const MyAttendance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState('');

  const employeeId = user?.id || user?._id || user?.firebaseUid;

  const fetchAttendance = async () => {
    try {
      const res = await fetch(`${API_URL}/attendance/my?employeeId=${employeeId}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
        const today = new Date().toISOString().split('T')[0];
        const tr = data.find(a => a.date === today);
        if (tr) {
          setTodayRecord(tr);
          setCheckedIn(!tr.checkOut);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAttendance(); }, []);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/attendance/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, remarks })
      });
      if (res.ok) {
        setRemarks('');
        fetchAttendance();
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/attendance/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId })
      });
      if (res.ok) { fetchAttendance(); }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  // Stats
  const thisMonth = records.filter(r => {
    const d = new Date(r.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const presentDays = thisMonth.filter(r => r.attendanceStatus === 'Present' || r.attendanceStatus === 'Late').length;
  const lateDays = thisMonth.filter(r => r.attendanceStatus === 'Late').length;
  const totalHours = thisMonth.reduce((acc, r) => acc + (r.totalHours || 0), 0).toFixed(1);

  if (loading) return <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-brand-500" size={48} /></div>;

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      <div>
        <h1 className="text-4xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>My Attendance</h1>
        <p className="mt-2 font-medium" style={{ color: 'var(--text-primary)' }}>Track your daily check-in, check-out, and work hours.</p>
      </div>

      {/* Check-In / Check-Out Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="theme-card rounded-2xl p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 blur-[80px] -mr-20 -mt-20" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Clock size={24} className="text-brand-500" />
              <span className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            {todayRecord && (
              <div className="flex items-center gap-4 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                <span>In: {new Date(todayRecord.checkIn).toLocaleTimeString()}</span>
                {todayRecord.checkOut && <span>Out: {new Date(todayRecord.checkOut).toLocaleTimeString()}</span>}
                {todayRecord.totalHours > 0 && <span>{todayRecord.totalHours}h logged</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!todayRecord && (
              <input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Remarks (optional)"
                className="px-4 py-3 rounded-xl text-xs font-bold outline-none border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
            )}
            {!todayRecord ? (
              <button onClick={handleCheckIn} disabled={actionLoading}
                className="bg-emerald-500 text-white px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />} Check In
              </button>
            ) : !todayRecord.checkOut ? (
              <button onClick={handleCheckOut} disabled={actionLoading}
                className="bg-rose-500 text-white px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center gap-2 shadow-lg shadow-rose-500/20">
                {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />} Check Out
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 text-emerald-600 rounded-xl text-xs font-black uppercase">
                <CheckCircle2 size={16} /> Day Complete
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="theme-card rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Days Present</p>
          <p className="text-3xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>{presentDays}</p>
        </div>
        <div className="theme-card rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Late Arrivals</p>
          <p className="text-3xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>{lateDays}</p>
        </div>
        <div className="theme-card rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Total Hours</p>
          <p className="text-3xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>{totalHours}h</p>
        </div>
      </div>

      {/* Attendance History */}
      <div className="theme-card rounded-2xl p-6">
        <h3 className="text-lg font-black mb-4" style={{ color: 'var(--text-primary)' }}>Attendance History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest border-b" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                <th className="pb-3 px-2">Date</th>
                <th className="pb-3 px-2">Check In</th>
                <th className="pb-3 px-2">Check Out</th>
                <th className="pb-3 px-2">Hours</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 px-2">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
              {records.slice(0, 30).map(r => (
                <tr key={r.id} className="hover:bg-black/[0.02] transition-colors">
                  <td className="py-3 px-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{r.date}</td>
                  <td className="py-3 px-2 text-sm" style={{ color: 'var(--text-primary)' }}>{r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '—'}</td>
                  <td className="py-3 px-2 text-sm" style={{ color: 'var(--text-primary)' }}>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '—'}</td>
                  <td className="py-3 px-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{r.totalHours || 0}h</td>
                  <td className="py-3 px-2">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      r.attendanceStatus === 'Present' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                      r.attendanceStatus === 'Late' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                      'bg-rose-500/10 text-rose-600 border-rose-500/20'
                    }`}>{r.attendanceStatus}</span>
                  </td>
                  <td className="py-3 px-2 text-xs" style={{ color: 'var(--text-primary)' }}>{r.remarks || '—'}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan="6" className="py-10 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>No attendance records yet. Start by checking in!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyAttendance;
