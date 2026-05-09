import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  CheckSquare,
  IndianRupee,
  CreditCard,
  RefreshCw,
  FileText,
  Wallet,
  ChevronDown,
  MapPin,
  Sparkles,
  Loader2,
  AlertCircle,
  LayoutDashboard,
  TrendingUp,
  Users,
  Clock,
  Calendar,
  Briefcase,
  Bell,
  Zap
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API_URL from '../config';

const DonutWidget = ({ data, centerLabel }) => (
  <div className="relative w-[88px] h-[88px] flex-shrink-0">
    <PieChart width={88} height={88}>
      <Pie data={data} cx={40} cy={40} innerRadius={28} outerRadius={40}
        paddingAngle={3} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
        {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
      </Pie>
    </PieChart>
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{centerLabel}</span>
    </div>
  </div>
);

const MiniCard = ({ title, value, change, icon: Icon, accent, delay, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="theme-card rounded-2xl p-5 flex flex-col gap-3 group"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{title}</p>
        <p className="text-[28px] font-black mt-1 tracking-tight leading-none text-white">{value}</p>
        {change !== undefined && (
          <p className={`text-[10px] font-bold mt-1.5 ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% since last month
          </p>
        )}
      </div>
      {Icon && (
        <div className="p-2.5 rounded-xl group-hover:scale-110 transition-transform" style={{ background: `${accent}22` }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
      )}
    </div>
    {children}
  </motion.div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const fetchStats = async (retryCount = 0) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/dashboard/stats`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error(`Engine offline (${response.status})`);
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('FETCH_ERROR:', err);
      if (retryCount < 2) {
        setTimeout(() => fetchStats(retryCount + 1), 1500);
      } else {
        setError(err.message || 'Connection lost. Check mission uplink.');
      }
    } finally {
      if (retryCount === 0 || !error) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');

  const tickColor = theme === 'dark' ? '#475569' : '#94a3b8';
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const tooltipBg = theme === 'dark' ? '#0f172a' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const tooltipText = theme === 'dark' ? '#fff' : '#0f172a';
  const tooltipLabel = theme === 'dark' ? '#64748b' : '#94a3b8';

  const tooltipStyle = {
    contentStyle: { background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '12px', padding: '10px 14px' },
    itemStyle: { color: tooltipText, fontWeight: 700, fontSize: 12 },
    labelStyle: { color: tooltipLabel, fontWeight: 900, fontSize: 10, marginBottom: 4 },
  };

  const statusStyle = {
    Delivered: { bg: 'rgba(16,185,129,0.15)', text: '#10b981' },
    Processed: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
    Cancelled: { bg: 'rgba(239,68,68,0.15)',  text: '#ef4444' },
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-surface-500 font-black uppercase tracking-widest text-xs text-center">Synchronizing Real-time Data...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-40 text-center">
       <AlertCircle size={64} className="text-rose-500 mb-6" />
       <h3 className="text-2xl font-black text-white">Analytics Unreachable</h3>
       <p className="text-surface-500 mt-2 max-w-md">{error}</p>
       <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 hover:bg-brand-600 transition-all">Retry Connection</button>
    </div>
  );

  const mobileModules = [
    { label: 'Dashboard', icon: LayoutDashboard, color: '#3b82f6', path: '/' },
    { label: 'Projects', icon: Briefcase, color: '#8b5cf6', path: '/projects' },
    { label: 'Team', icon: Users, color: '#10b981', path: '/team' },
    { label: 'Attendance', icon: Clock, color: '#f59e0b', path: '/hr' },
    { label: 'Employees', icon: Users, color: '#06b6d4', path: '/hr' },
    { label: 'Leaves', icon: Calendar, color: '#ec4899', path: '/hr' },
    { label: 'Payroll', icon: IndianRupee, color: '#f97316', path: '/payroll' },
    { label: 'Invoices', icon: FileText, color: '#14b8a6', path: '/invoice-forge' },
    { label: 'Reports', icon: BarChart, color: '#6366f1', path: '/finance' },
    { label: 'Messages', icon: Sparkles, color: '#f43f5e', path: '/' },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-surface-500 font-black uppercase tracking-widest text-xs text-center">Synchronizing Real-time Data...</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-[1400px] mx-auto px-1 md:px-0">
      {/* Top Header - Exact Mockup Style */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-row items-center justify-between gap-4 mb-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg md:text-3xl font-black tracking-tight text-white">
            Welcome back, Admin 👋
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors cursor-pointer shadow-lg">
             <Bell size={18} />
             <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]" />
          </div>
          <div className="hidden md:flex items-center gap-3 pl-3 border-l border-white/10">
            <div className="text-right">
              <p className="text-[13px] font-black text-white leading-none">Admin</p>
              <p className="text-[9px] font-black text-brand-500 uppercase tracking-[0.2em] mt-1.5">Executive</p>
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/10 shadow-xl bg-black">
              <img src="/logo.jpg" alt="Admin" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* DASHBOARD CARDS - Enterprise SaaS Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <MiniCard title="Active Roster" value={stats?.totalEmployees || 18} icon={Users} accent="#06b6d4" delay={0.1}>
           <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{stats?.onSiteRatio || '94%'} On-Site</span>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
           </div>
        </MiniCard>
        
        <MiniCard title="MRR (Global)" value={`₹${((stats?.mrr || 0)/1000).toFixed(1)}K`} icon={IndianRupee} accent="#10b981" delay={0.15}>
           <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{stats?.mrrGrowth || '+12.4%'} Growth</span>
              <TrendingUp size={12} className="text-emerald-500" />
           </div>
        </MiniCard>

        <MiniCard title="Talent Pipeline" value={stats?.activeVacancies || 3} icon={Briefcase} accent="#f59e0b" delay={0.2}>
           <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{stats?.totalApplicants || '84'} Applicants</span>
           </div>
        </MiniCard>

        <MiniCard title="Leave Load" value={stats?.pendingLeaves || 2} icon={Calendar} accent="#f43f5e" delay={0.25}>
           <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Action Required</span>
           </div>
        </MiniCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Insight Orchestrator */}
        <div className="lg:col-span-1 glass-light p-8 rounded-[40px] border border-brand-500/20 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:rotate-12 transition-transform">
              <Sparkles size={100} className="text-brand-500" />
           </div>
           <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                 <Zap size={20} />
              </div>
              <div>
                 <h3 className="text-lg font-black text-white tracking-tight">Neural Insights</h3>
                 <p className="text-[9px] text-brand-500 font-black uppercase tracking-widest mt-0.5">Nexov AI Analysis</p>
              </div>
           </div>
           
           <div className="space-y-6">
              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                 <p className="text-xs text-white/70 leading-relaxed font-bold italic">
                   "Payroll liability is projected to increase by 12% next month due to performance bonuses. Recommend auditing the specialist roster."
                 </p>
              </div>
              <div className="space-y-4">
                 {[
                    { label: 'Hiring Speed', val: '+14%', color: 'text-emerald-500' },
                    { label: 'Workforce Stability', val: '98.2%', color: 'text-brand-400' },
                    { label: 'Fiscal Health', val: 'Optimized', color: 'text-emerald-500' }
                 ].map((stat, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                       <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{stat.label}</span>
                       <span className={`text-[11px] font-black ${stat.color}`}>{stat.val}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Operational Overview Chart */}
        <div className="lg:col-span-2 glass-light p-8 rounded-[40px] border border-white/5 min-w-0">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h2 className="text-xl font-black text-white tracking-tight">Operational Flux</h2>
                 <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">Revenue vs Productivity</p>
              </div>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-500" />
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Revenue</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Efficiency</span>
                 </div>
              </div>
           </div>
           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={stats?.salesData || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 800}} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 800}} />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* MANAGEMENT MODULES - Mobile Only */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-widest text-white/60">Management Modules</h2>
          <span className="text-[10px] font-bold text-brand-400">View All</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {mobileModules.map((module, i) => (
            <motion.div
              key={module.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card rounded-[22px] p-4 flex flex-col items-center justify-center gap-2.5 min-h-[90px] border-white/5 hover:border-brand-500/30"
              onClick={() => navigate(module.path)}
            >
              <div className="p-2.5 rounded-[14px]" style={{ background: `${module.color}12`, border: `1px solid ${module.color}25` }}>
                 <module.icon size={20} style={{ color: module.color }} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/70 text-center leading-tight">
                {module.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniCard title="Monthly MRR" value={`₹${stats.mrr}`} change={9} icon={IndianRupee} accent="#6366f1" delay={0.25} />
        <MiniCard title="New Leads" value={stats.overview.newClients} change={15} icon={CreditCard} accent="#3b82f6" delay={0.3} />

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="col-span-2 theme-card rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest theme-text-secondary mb-3">Mission Overview</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
            {[
              { label: 'In Pipeline', val: stats.overview.pending,  color: '#f59e0b' },
              { label: 'Finalized',   val: stats.overview.completed, color: '#10b981' },
              { label: 'Acquisitions', val: stats.overview.newClients,  color: '#8b5cf6' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="text-[10px] font-bold text-white/50">{s.label}</span>
                <span className="ml-auto text-xs font-black text-white">{s.val}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="lg:col-span-2 theme-card rounded-2xl p-6 min-w-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Revenue Stream</h2>
          </div>
          <div className="h-[320px] w-full min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.salesData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }} />
                <Tooltip cursor={{ fill: 'rgba(128,128,128,0.05)' }} {...tooltipStyle} />
                <Bar dataKey="value" fill="#3b82f6" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className="flex flex-col gap-4">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            className="theme-card rounded-2xl p-5 flex items-center gap-4 flex-1">
            <div className="p-3 bg-violet-500/10 rounded-xl flex-shrink-0">
              <FileText size={20} className="text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest theme-text-secondary">Gross Revenue</p>
              <p className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>₹{(stats.mrr * 12).toLocaleString()}</p>
              <p className="text-[10px] font-bold mt-0.5 theme-text-muted">Current Financial Year</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="theme-card rounded-2xl p-5 flex items-center gap-4 flex-1">
            <div className="p-3 bg-amber-500/10 rounded-xl flex-shrink-0">
              <Wallet size={20} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest theme-text-secondary">Projected Earnings</p>
              <p className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>₹{(stats.mrr * 24).toLocaleString()}</p>
              <p className="text-[10px] font-bold mt-0.5 theme-text-muted">24-Month Forecast</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="lg:col-span-2 theme-card rounded-2xl p-6 min-w-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>User Growth Curve</h2>
          </div>
          <div className="h-[320px] w-full min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#a78bfa' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="theme-card rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Recent Acquisitions</h2>
            <RefreshCw size={13} className="cursor-pointer theme-text-secondary hover:text-brand-400 transition-colors" />
          </div>

          <div className="grid grid-cols-[1fr_72px_68px_52px] text-[9px] font-black uppercase tracking-widest mb-2 px-1 theme-text-muted">
            <span>Identity</span>
            <span>Date</span>
            <span>Status</span>
            <span className="text-right">Value</span>
          </div>

          <div className="space-y-1 flex-1">
            {stats.recentOrders.length === 0 ? (
               <p className="text-[10px] text-surface-500 text-center py-10 font-bold">No recent activity detected.</p>
            ) : stats.recentOrders.map((o, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                className="grid grid-cols-[1fr_72px_68px_52px] items-center px-1.5 py-2 rounded-xl transition-colors"
                style={{ ':hover': { background: 'var(--card-hover-bg)' } }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 shadow"
                    style={{ background: o.color }}>
                    {o.avatar}
                  </div>
                  <div>
                    <p className="text-[11px] font-black leading-none" style={{ color: 'var(--text-primary)' }}>{o.name}</p>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <MapPin size={7} className="theme-text-muted" />
                      <p className="text-[9px] font-bold theme-text-muted">{o.address}</p>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] font-bold theme-text-secondary">{o.date}</p>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full w-fit"
                  style={{ background: statusStyle[o.status]?.bg || 'rgba(128,128,128,0.1)', color: statusStyle[o.status]?.text || '#64748b' }}>
                  {o.status}
                </span>
                <p className="text-[11px] font-black text-right" style={{ color: 'var(--text-primary)' }}>{o.price.replace('$', '₹')}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
