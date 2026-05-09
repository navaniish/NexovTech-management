import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, Briefcase, TrendingUp, Target, Calendar, CheckCircle2, AlertCircle, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    const userId = user?.id || user?._id || user?.firebaseUid;
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/tasks/my?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to synchronize mission intelligence');
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const pending = tasks.filter(t => t.status === 'Pending').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  const stats = [
    { label: 'Active Tasks', value: inProgress, icon: Zap, accent: '#8b5cf6' },
    { label: 'Pending', value: pending, icon: Clock, accent: '#f59e0b' },
    { label: 'Completed', value: completed, icon: CheckCircle2, accent: '#10b981' },
    { label: 'Success Rate', value: `${rate}%`, icon: TrendingUp, accent: '#3b82f6' },
  ];

  const priorityColor = (p) => p === 'High' ? '#ef4444' : p === 'Medium' ? '#f59e0b' : '#64748b';

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-surface-500 font-black uppercase tracking-widest text-xs">Synchronizing Mission Control...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20 glass rounded-[40px] border border-rose-500/20">
       <AlertTriangle size={64} className="text-rose-500 mx-auto mb-6" />
       <h3 className="text-2xl font-black theme-text-primary">Grid Connection Severed</h3>
       <p className="text-surface-500 mt-2">{error}</p>
       <button onClick={fetchDashboardData} className="mt-8 px-8 py-3 bg-brand-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all">Retry Link</button>
    </div>
  );

  return (
    <div className="space-y-8 pb-12 max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-white">
          Mission Control
          <span className="text-[9px] font-black px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 uppercase tracking-widest">Specialist</span>
        </h1>
        <p className="text-[11px] font-bold mt-1 flex items-center gap-2 text-white/50">
          <Sparkles size={12} className="text-brand-400 animate-pulse" />
          Welcome back, {user?.name?.split(' ')[0]}. Here's your assignment overview.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="theme-card rounded-2xl p-5 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{s.label}</p>
                <p className="text-[28px] font-black mt-1 tracking-tight leading-none text-white">{s.value}</p>
              </div>
              <div className="p-2.5 rounded-xl group-hover:scale-110 transition-transform" style={{ background: `${s.accent}22` }}>
                <s.icon size={18} style={{ color: s.accent }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="lg:col-span-2 theme-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-black flex items-center gap-2 text-white">
              <Target size={18} className="text-brand-400" /> Active Missions
            </h2>
            <span className="text-[9px] font-black px-2 py-1 rounded-md text-white/40 bg-white/5">
              {tasks.filter(t => t.status !== 'Completed').length} deployments
            </span>
          </div>
          <div className="space-y-2">
            {tasks.filter(t => t.status !== 'Completed').length === 0 ? (
               <p className="text-[10px] text-surface-500 font-bold text-center py-10 uppercase tracking-widest">No Priority Missions Detected</p>
            ) : tasks.filter(t => t.status !== 'Completed').slice(0, 5).map((task, idx) => (
              <div key={task._id || task.id || idx} className="flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: priorityColor(task.priority), boxShadow: task.priority === 'High' ? '0 0 8px rgba(239,68,68,0.4)' : 'none' }} />
                  <div>
                    <p className="text-sm font-black leading-none text-white">{task.title}</p>
                    <p className="text-[10px] font-bold text-white/40 mt-0.5">{task.projectId?.title || 'Direct Assignment'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: task.status === 'In Progress' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)', color: task.status === 'In Progress' ? '#3b82f6' : '#f59e0b' }}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="theme-card rounded-2xl p-6">
          <h2 className="text-base font-black mb-5 flex items-center gap-2 text-white">
            <Calendar size={18} className="text-brand-400" /> Network Events
          </h2>
          <div className="space-y-6">
            <div className="flex gap-4 relative pl-5 border-l-2 border-white/10">
              <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-brand-500" />
              <div>
                <h4 className="text-sm font-black leading-none text-white">Daily Standup</h4>
                <p className="text-[10px] font-bold text-white/40 mt-1">Today • 10:00 AM</p>
              </div>
            </div>
            <div className="flex gap-4 relative pl-5 opacity-40 border-l-2 border-white/10">
              <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-white/20" />
              <div>
                <h4 className="text-sm font-black leading-none text-white">Sprint Review</h4>
                <p className="text-[10px] font-bold text-white/40 mt-1">Tomorrow • 04:00 PM</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
