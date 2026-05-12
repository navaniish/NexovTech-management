import React from 'react';
import { motion } from 'framer-motion';
import {
   Users, Briefcase, CheckCircle2, IndianRupee,
   ChevronRight, Search, Bell, MessageSquare, Sun,
   Bot, Sparkles, TrendingUp, Calendar, Clock,
   MoreVertical, ArrowUp, ArrowDown, ExternalLink,
   Target, Zap, Activity, Globe, Cpu, Layers,
   CreditCard, Megaphone, Terminal
} from 'lucide-react';
import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid,
   Tooltip, ResponsiveContainer, LineChart, Line,
   PieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';
// --- COMPONENTS ---

const CardSparkline = ({ data, color, index }) => (
   <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data.map((v, i) => ({ v, i }))}>
         <defs>
            <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
               <stop offset="0%" stopColor={color} stopOpacity={0.3} />
               <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
         </defs>
         <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2.5} fill={`url(#grad-${index})`} isAnimationActive={false} />
      </AreaChart>
   </ResponsiveContainer>
);

const Dashboard = () => {
   const { user } = useAuth();
   const [currentTime, setCurrentTime] = React.useState(new Date());
   const [stats, setStats] = React.useState(null);
   const [loading, setLoading] = React.useState(true);

   React.useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      fetchDashboardStats();
      return () => clearInterval(timer);
   }, []);

   const deptData = [
      { name: 'Engineering', value: 48, color: '#6366f1' },
      { name: 'Design', value: 26, color: '#10b981' },
      { name: 'Marketing', value: 18, color: '#8b5cf6' },
      { name: 'Operations', value: 16, color: '#f59e0b' },
   ];

   const fetchDashboardStats = async () => {
      try {
         const res = await fetch(`${API_URL}/dashboard/stats`);
         if (res.ok) {
            const data = await res.json();
            setStats(data);
         } else {
            const errorData = await res.json().catch(() => ({}));
            console.error(`Stats fetch failed [${res.status}]:`, errorData.message || 'Unknown error');
         }
      } catch (err) {
         console.error('Network error during stats fetch:', err.message);
      } finally {
         setLoading(false);
      }
   };

   const formatDate = (date) => {
      return new Intl.DateTimeFormat('en-US', {
         weekday: 'long',
         day: 'numeric',
         month: 'long',
         year: 'numeric'
      }).format(date);
   };

   const formatTime = (date) => {
      return new Intl.DateTimeFormat('en-US', {
         hour: '2-digit',
         minute: '2-digit',
         hour12: true
      }).format(date);
   };

   const kpiStats = [
      { label: 'Units', value: stats?.totalEmployees || '0', trend: '+12%', color: '#6366f1', icon: Users, data: [20, 35, 30, 45, 60] },
      { label: 'Projects', value: stats?.totalProjects || '0', trend: '+8%', color: '#10b981', icon: Briefcase, data: [30, 25, 45, 35, 50] },
      { label: 'Missions', value: stats?.totalApplicants || '0', trend: '+18%', color: '#f59e0b', icon: Target, data: [40, 50, 45, 65, 75] },
      { label: 'Payload', value: `₹${(stats?.mrr || 0).toLocaleString()}`, trend: '+15%', color: '#8b5cf6', icon: IndianRupee, data: [25, 40, 35, 55, 70] },
   ];

   return (
      <div className="w-full flex flex-col space-y-6 animate-in fade-in duration-1000 overflow-y-auto custom-scrollbar">

         {/* 1. HIGH-FIDELITY OFFICE HEADER */}
         <section className="relative w-full overflow-hidden rounded-[24px] md:rounded-[40px] bg-white shadow-2xl border border-white flex flex-col min-h-[220px] group">
            {/* Background Image Layer */}
            <div
               className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
               style={{ backgroundImage: "url('/assets/office-bg.png')" }}
            />
            {/* Glass Overlay */}
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[4px]" />

            <div className="relative z-10 flex-1 p-6 md:p-12 flex flex-col justify-center">
               <div className="space-y-1 mb-6">
                  <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none flex items-center gap-3">
                     Good morning, {user?.name?.split(' ')[0] || 'Admin'}! <span className="animate-bounce-slow">👋</span>
                  </h1>
                  <p className="text-slate-500 text-[13px] md:text-[15px] font-medium">
                     Here's what's happening with NexovTech today.
                  </p>
               </div>

               <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4">
                  {/* Date Pill */}
                  <div className="bg-white/60 border border-slate-100 px-4 md:px-6 py-2.5 md:py-3.5 rounded-[16px] md:rounded-[20px] flex items-center gap-3 md:gap-4 shadow-sm backdrop-blur-xl">
                     <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Calendar size={16} />
                     </div>
                     <span className="text-[11px] md:text-[13px] font-bold text-slate-700 truncate">{formatDate(currentTime)}</span>
                  </div>

                  {/* Time Pill */}
                  <div className="bg-white/60 border border-slate-100 px-4 md:px-6 py-2.5 md:py-3.5 rounded-[16px] md:rounded-[20px] flex items-center gap-3 md:gap-4 shadow-sm backdrop-blur-xl">
                     <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                        <Clock size={16} />
                     </div>
                     <span className="text-[11px] md:text-[13px] font-bold text-slate-700 uppercase">{formatTime(currentTime)}</span>
                  </div>

                  {/* Tasks Pill */}
                  <div className="bg-white/60 border border-slate-100 px-4 md:px-6 py-2.5 md:py-3.5 rounded-[16px] md:rounded-[20px] flex items-center gap-3 md:gap-4 shadow-sm backdrop-blur-xl">
                     <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 size={16} />
                     </div>
                     <span className="text-[11px] md:text-[13px] font-bold text-slate-700 truncate">
                        {stats?.overview?.pending ? `${stats.overview.pending} missions pending` : 'No pending missions'}
                     </span>
                  </div>
               </div>
            </div>
         </section>

         {/* 2. COMPACT KPI CARDS GRID */}
         <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
            {kpiStats.map((stat, i) => (
               <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card !p-5 flex flex-col relative overflow-hidden group min-h-[130px] border-slate-100 hover:scale-[1.02] transition-all"
               >
                  <div className="flex items-center gap-3.5 mb-4 relative z-10">
                     <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${stat.color}10`, color: stat.color }}>
                        <stat.icon size={20} strokeWidth={2.5} />
                     </div>
                     <div className="flex flex-col min-w-0">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest truncate mb-0.5">{stat.label}</span>
                        <h3 className="text-xl font-black text-slate-900 leading-none truncate">{loading ? '...' : stat.value}</h3>
                     </div>
                  </div>
                  <div className="mt-auto -mx-5 -mb-5 h-[45px] opacity-20 group-hover:opacity-60 transition-opacity duration-700">
                     <CardSparkline data={stat.data} color={stat.color} index={i} />
                  </div>
               </motion.div>
            ))}
            <motion.div
               initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
               className="glass-card !p-5 flex flex-col group justify-center items-center text-center bg-white/40 border-slate-100 min-h-[130px]"
            >
               <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-md mb-2 group-hover:scale-110 transition-transform">
                  <Activity size={20} strokeWidth={2.5} />
               </div>
               <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Payload Status</span>
               <h3 className="text-[16px] font-black text-slate-900 uppercase italic">Paid</h3>
            </motion.div>
         </section>

         {/* 3. CORE ANALYTICS HUB */}
         <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

            {/* Department Distribution (Donut) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
               <div className="flex items-center gap-3 px-1">
                  <div className="w-2 h-2 rounded-full bg-slate-900" />
                  <span className="text-[10px] font-black text-slate-900 tracking-widest uppercase">Planning</span>
               </div>
               <div className="glass-card !p-6 flex-1 flex flex-col min-h-[300px] border-slate-100">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase mb-6 tracking-tight italic">Unit Allocation</h4>
                  <div className="flex-1 relative min-h-[160px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie data={deptData} innerRadius={55} outerRadius={75} paddingAngle={8} dataKey="value" stroke="none">
                              {deptData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                           </Pie>
                        </PieChart>
                     </ResponsiveContainer>
                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-black text-slate-900 leading-none">{stats?.totalEmployees || '0'}</span>
                        <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1">Total</span>
                     </div>
                  </div>
                  <div className="mt-6 space-y-2">
                     {deptData.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px] font-bold">
                           <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                              <span className="text-slate-500 uppercase tracking-tighter">{d.name}</span>
                           </div>
                           <span className="text-slate-900">{d.value}%</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* Signal Analysis (Intelligence) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
               <div className="flex items-center gap-3 px-1">
                  <div className="w-2 h-2 rounded-full bg-brand-500 shadow-lg shadow-brand-500/20" />
                  <span className="text-[10px] font-black text-slate-900 tracking-widest uppercase">Intelligence</span>
               </div>
               <div className="glass-card !p-6 flex flex-col gap-4 min-h-[300px] border-slate-100 group">
                  <div className="flex items-center justify-between mb-2">
                     <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight italic">Signal Dossier</h4>
                     <Sparkles size={16} className="text-brand-500 group-hover:scale-125 transition-transform" />
                  </div>
                  <div className="space-y-3">
                     {[
                        { label: 'Sentiment', val: 'Positive (88%)', color: 'text-emerald-500' },
                        { label: 'Response', val: '1.4h avg', color: 'text-indigo-500' },
                        { label: 'Network', val: 'Secure Node', color: 'text-slate-400' }
                     ].map((sig, i) => (
                        <div key={i} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 group-hover:translate-x-1 transition-transform">
                           <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{sig.label}</p>
                           <p className={`text-[11px] font-black ${sig.color}`}>{sig.val}</p>
                        </div>
                     ))}
                  </div>
                  <button className="w-full mt-auto h-11 bg-slate-900 text-white text-[9px] font-black rounded-xl hover:bg-brand-600 transition-all shadow-xl shadow-slate-900/10 uppercase tracking-widest">
                     Open Command Dossier
                  </button>
               </div>
            </div>

            {/* Event Horizon (Timeline) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
               <div className="flex items-center gap-3 px-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-black text-slate-900 tracking-widest uppercase">Timeline</span>
               </div>
               <div className="glass-card !p-6 space-y-5 min-h-[300px] border-slate-100">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight italic">Upcoming Sync</h4>
                  {(stats?.recentOrders || []).length > 0 ? (stats.recentOrders.map((ev, i) => (
                     <div key={i} className="flex items-center gap-4 group cursor-pointer hover:translate-x-1 transition-transform">
                        <div className={`bg-slate-900 w-10 h-10 rounded-xl flex flex-col items-center justify-center text-white shrink-0 shadow-lg`}>
                           <span className="text-[12px] font-black leading-none">{ev.avatar}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                           <h5 className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">{ev.name}</h5>
                           <span className="text-[8px] font-black text-slate-300 uppercase block mt-0.5">{ev.status} • {ev.date}</span>
                        </div>
                        <div className="text-right">
                           <span className="text-[10px] font-black text-emerald-600">{ev.price}</span>
                        </div>
                     </div>
                  ))) : (
                     <div className="flex flex-col items-center justify-center py-10 opacity-20">
                        <Activity size={32} />
                        <p className="text-[9px] font-black uppercase tracking-widest mt-2">No recent pulses</p>
                     </div>
                  )}
               </div>
            </div>

            {/* AI Integrity (Audit) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
               <div className="flex items-center gap-3 px-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black text-slate-900 tracking-widest uppercase">Audit</span>
               </div>
               <div className="glass-card !p-6 flex flex-col gap-5 min-h-[300px] bg-emerald-50/5 border-emerald-100/50 group">
                  <div className="flex items-center justify-between">
                     <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight italic">System Integrity</h4>
                     <Cpu size={16} className="text-emerald-500 group-hover:rotate-90 transition-transform duration-700" />
                  </div>
                  <div className="flex flex-col items-center justify-center flex-1 py-2">
                     <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xl mb-4 animate-pulse">
                        <CheckCircle2 size={32} />
                     </div>
                     <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">All Nodes Verified</p>
                     <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-widest mt-1.5 opacity-60">Verified: 12ms Ago</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                     <div className="p-2.5 bg-white/60 rounded-xl text-center border border-slate-50">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Log Node</p>
                        <p className="text-xs font-black text-slate-900 italic">1.2k</p>
                     </div>
                     <div className="p-2.5 bg-white/60 rounded-xl text-center border border-slate-50">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Threats</p>
                        <p className="text-xs font-black text-rose-500 italic">0</p>
                     </div>
                  </div>
               </div>
            </div>
         </section>

      </div>
   );
};

export default Dashboard;
