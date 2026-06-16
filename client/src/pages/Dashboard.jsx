import React from 'react';
import { motion } from 'framer-motion';
import {
   Users, Briefcase, CheckCircle2, IndianRupee,
   Calendar, Clock, Target, Activity, CheckCircle, Sparkles, Cpu
} from 'lucide-react';
import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid,
   Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';
import { nexaApi } from '../services/nexaApi';


const CardSparkline = ({ data, color, index }) => (
   <ResponsiveContainer width="100%" height={45} debounce={50}>
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
   const [briefing, setBriefing] = React.useState(null);
   const [briefingLoading, setBriefingLoading] = React.useState(true);

   React.useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      fetchDashboardStats();
      fetchExecutiveBriefing();
      return () => clearInterval(timer);
   }, []);

   const fetchExecutiveBriefing = async () => {
      try {
         const data = await nexaApi.getExecutiveBriefing();
         if (data.success) {
            setBriefing(data);
         }
      } catch (err) {
         console.error('Executive briefing fetch failed');
      } finally {
         setBriefingLoading(false);
      }
   };


   const fetchDashboardStats = async () => {
      try {
         const res = await fetch(`${API_URL}/dashboard/stats`);
         if (res.ok) setStats(await res.json());
      } catch (err) {
         console.error('Stats fetch failed');
      } finally {
         setLoading(false);
      }
   };

   const getGreeting = () => {
      const hour = currentTime.getHours();
      const minute = currentTime.getMinutes();
      const totalMinutes = hour * 60 + minute;
      if (totalMinutes < 750) return 'Good morning'; // Before 12:30 PM
      if (totalMinutes < 1020) return 'Good afternoon'; // 12:30 PM to 5:00 PM
      return 'Good evening'; // After 5:00 PM
   };

   const formatDate = (date) => new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
   const formatTime = (date) => new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date);

   const kpiStats = [
      { label: 'Units', value: stats?.totalEmployees || '0', trend: '+12%', color: '#6366f1', icon: Users, data: [20, 35, 30, 45, 60] },
      { label: 'Projects', value: stats?.totalProjects || '0', trend: '+8%', color: '#10b981', icon: Briefcase, data: [30, 25, 45, 35, 50] },
      { label: 'Missions', value: stats?.totalTasks || '0', trend: '+18%', color: '#f59e0b', icon: Target, data: [40, 50, 45, 65, 75] },
      { label: 'Payload', value: `₹${(stats?.mrr || 0).toLocaleString()}`, trend: '+15%', color: '#8b5cf6', icon: IndianRupee, data: [25, 40, 35, 55, 70] },
   ];

   const deptData = [
      { name: 'Engineering', value: 48, color: '#6366f1' },
      { name: 'Design', value: 26, color: '#10b981' },
      { name: 'Marketing', value: 18, color: '#8b5cf6' },
      { name: 'Operations', value: 16, color: '#f59e0b' },
   ];

   return (
      <div className="w-full flex flex-col space-y-6 animate-in fade-in duration-1000">
         {/* OFFICE HEADER */}
         <section className="relative w-full overflow-hidden rounded-[24px] md:rounded-[40px] bg-white shadow-2xl border border-white flex flex-col min-h-[160px] md:min-h-[200px] group">
            <div className="absolute inset-0 bg-cover bg-center transition-all duration-700 blur-[8px] scale-105 group-hover:scale-110" style={{ backgroundImage: "url('/assets/office-bg.png')" }} />
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[12px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent md:hidden" />

            <div className="relative z-10 flex-1 p-6 md:p-12 flex flex-col justify-center">
               <div className="space-y-1 mb-4 md:mb-6">
                  <h1 className="mobile-hero-title font-black text-slate-900 leading-tight">
                     {getGreeting()}<span className="hidden sm:inline">, <span className="text-[0.55em] font-extrabold opacity-80 tracking-tight">{user?.name || 'Nexovtech Admin'}</span>!</span>
                     <span className="inline-block animate-bounce-slow ml-3">👋</span>
                  </h1>
                  <h2 className="sm:hidden text-sm font-bold text-slate-700 -mt-1">{user?.name || 'Nexovtech Admin'}</h2>
                  <p className="mobile-body-text text-slate-500 font-medium max-w-[280px] md:max-w-none">Here's what's happening with NexovTech today.</p>
               </div>

               <div className="flex flex-wrap gap-2 md:gap-4">
                  <div className="bg-white/60 border border-slate-100 px-3 py-2 md:px-6 md:py-3 rounded-xl md:rounded-[20px] flex items-center gap-2 md:gap-4 shadow-sm backdrop-blur-xl">
                     <Calendar size={14} className="text-indigo-600 md:size-[18px]" />
                     <span className="text-[11px] md:text-sm font-bold text-slate-700">{formatDate(currentTime)}</span>
                  </div>
                  <div className="bg-white/60 border border-slate-100 px-3 py-2 md:px-6 md:py-3 rounded-xl md:rounded-[20px] flex items-center gap-2 md:gap-4 shadow-sm backdrop-blur-xl">
                     <Clock size={14} className="text-brand-600 md:size-[18px]" />
                     <span className="text-[11px] md:text-sm font-bold text-slate-700 uppercase">{formatTime(currentTime)}</span>
                  </div>
               </div>
            </div>
         </section>

         {/* KPI GRID */}
         <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6">
            {kpiStats.map((stat, i) => (
               <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card !p-4 md:!p-5 flex flex-col relative overflow-hidden group min-h-[110px] md:min-h-[130px] border-slate-100 hover:scale-[1.02] transition-all">
                  <div className="flex items-center gap-2.5 md:gap-3.5 mb-3 md:mb-4 relative z-10">
                     <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${stat.color}10`, color: stat.color }}>
                        <stat.icon size={16} md:size={20} strokeWidth={2.5} />
                     </div>
                     <div className="flex flex-col min-w-0">
                        <span className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-widest truncate mb-0.5">{stat.label}</span>
                        <h3 className="text-lg md:text-xl font-black text-slate-900 leading-none truncate">{loading ? '...' : stat.value}</h3>
                     </div>
                  </div>
                  <div className="mt-auto -mx-4 -mb-4 md:-mx-5 md:-mb-5 h-[35px] md:h-[45px] opacity-20 group-hover:opacity-60 transition-opacity duration-700">
                     <CardSparkline data={stat.data} color={stat.color} index={i} />
                  </div>
               </motion.div>
            ))}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card !p-4 md:!p-5 flex flex-col group justify-center items-center text-center bg-white/40 border-slate-100 min-h-[110px] md:min-h-[130px] col-span-1 sm:col-span-2 lg:col-span-1">
               <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-md mb-2 group-hover:scale-110 transition-transform">
                  <Activity size={16} md:size={20} strokeWidth={2.5} />
               </div>
               <span className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Status</span>
               <h3 className="text-[14px] md:text-[16px] font-black text-slate-900 uppercase italic">Operational</h3>
            </motion.div>
         </section>

         {/* AI EXECUTIVE COMMAND CENTER */}
         <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Health Score Gauge */}
            <div className="lg:col-span-3 glass-card !p-6 flex flex-col items-center justify-center border-slate-100 relative overflow-hidden text-center min-h-[220px]">
               <div className="absolute top-4 left-4 flex items-center gap-1.5 text-indigo-600">
                  <Cpu size={14} className="animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Health Index</span>
               </div>
               {briefingLoading ? (
                  <div className="animate-pulse flex flex-col items-center">
                     <div className="w-20 h-20 rounded-full border-4 border-slate-100 flex items-center justify-center">...</div>
                     <span className="text-[10px] text-slate-400 mt-2">Calculating...</span>
                  </div>
               ) : (
                  <div className="flex flex-col items-center mt-2">
                     <div className="relative flex items-center justify-center">
                        <svg className="w-24 h-24 transform -rotate-90">
                           <circle cx="48" cy="48" r="40" className="text-slate-100" strokeWidth="6" stroke="currentColor" fill="transparent" />
                           <circle cx="48" cy="48" r="40" className="text-indigo-600 transition-all duration-1000" strokeWidth="6" strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 * (1 - briefing?.healthScore / 100)} strokeLinecap="round" stroke="currentColor" fill="transparent" />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                           <span className="text-2xl font-black text-slate-900 leading-none">{briefing?.healthScore || '90'}</span>
                           <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest mt-1">Health Score</span>
                        </div>
                     </div>
                     <div className="mt-3 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-wider">
                        {briefing?.healthScore > 80 ? '🟢 Stable Index' : (briefing?.healthScore > 50 ? '🟡 Moderate Risk' : '🔴 Critical Status')}
                     </div>
                  </div>
               )}
            </div>

            {/* Revenue Forecasting */}
            <div className="lg:col-span-4 glass-card !p-6 flex flex-col border-slate-100 min-h-[220px]">
               <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue Forecasts</h4>
                  <span className="text-[9px] text-indigo-500 font-bold">30/60/90 Days</span>
               </div>
               {briefingLoading ? (
                  <div className="flex-1 flex flex-col justify-center gap-3">
                     {[1, 2, 3].map(i => <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" />)}
                  </div>
               ) : (
                  <div className="flex-1 flex flex-col justify-center space-y-4">
                     {[
                        { label: '30 Days Projection', val: briefing?.forecasts?.days30, color: 'bg-indigo-500', max: briefing?.forecasts?.days90 },
                        { label: '60 Days Projection', val: briefing?.forecasts?.days60, color: 'bg-brand-500', max: briefing?.forecasts?.days90 },
                        { label: '90 Days Projection', val: briefing?.forecasts?.days90, color: 'bg-violet-500', max: briefing?.forecasts?.days90 }
                     ].map((proj, idx) => (
                        <div key={idx} className="space-y-1">
                           <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                              <span>{proj.label}</span>
                              <span>₹{(proj.val || 0).toLocaleString()}</span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${proj.color}`} style={{ width: `${(proj.val / Math.max(1, proj.max)) * 100}%` }}></div>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>

            {/* Dynamic COO Alert & Strategic Briefing Feed */}
            <div className="lg:col-span-5 glass-card !p-6 flex flex-col border-slate-100 min-h-[220px]">
               <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-violet-500 animate-pulse" />
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Strategic Recommendations</h4>
               </div>
               {briefingLoading ? (
                  <div className="flex-1 flex flex-col justify-center gap-2">
                     <div className="h-12 bg-slate-100 rounded animate-pulse" />
                     <div className="h-12 bg-slate-100 rounded animate-pulse" />
                  </div>
               ) : (
                  <div className="flex-1 flex flex-col justify-between space-y-3">
                     <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic border-l-2 border-brand-500 pl-3 overflow-y-auto max-h-[110px] custom-scrollbar">
                        "{briefing?.aiCOOReport}"
                     </p>
                     {briefing?.churnRisks?.length > 0 && (
                        <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 max-h-[60px] overflow-hidden">
                           <span className="text-[10px] mt-0.5">⚠️</span>
                           <div className="min-w-0">
                              <p className="text-[9px] font-black text-rose-900 uppercase tracking-tight">Churn Alert: {briefing.churnRisks[0].clientName} ({briefing.churnRisks[0].probability}%)</p>
                              <p className="text-[8px] text-indigo-600 font-bold leading-none mt-1">Action: {briefing.churnRisks[0].recommendedAction}</p>
                           </div>
                        </div>
                     )}
                  </div>
               )}
            </div>
         </section>


         {/* ANALYTICS HUB */}
         <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-3 glass-card !p-6 flex flex-col min-h-[280px] md:min-h-[300px] border-slate-100">
               <h4 className="mobile-section-title text-slate-900 uppercase mb-6 tracking-tight italic text-center">Unit Allocation</h4>
               <div className="flex-1 relative min-h-[160px] md:min-h-[180px]">
                  <ResponsiveContainer width="100%" height={160} md:height={180} debounce={50}>
                     <PieChart>
                        <Pie data={deptData} innerRadius={50} outerRadius={70} md:innerRadius={55} md:outerRadius={75} paddingAngle={8} dataKey="value" stroke="none">
                           {deptData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                     </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-xl md:text-2xl font-black text-slate-900 leading-none">{stats?.totalEmployees || '0'}</span>
                     <span className="text-[7px] md:text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1">Total</span>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-3 glass-card !p-6 flex flex-col gap-4 min-h-[280px] md:min-h-[300px] border-slate-100">
               <h4 className="mobile-section-title text-slate-900 uppercase tracking-tight italic">Intelligence</h4>
               <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
                  {[
                     { label: 'Sentiment', val: 'Positive (88%)', color: 'text-emerald-500' },
                     { label: 'Response', val: '1.4h avg', color: 'text-indigo-500' },
                     { label: 'Nodes', val: 'Secure', color: 'text-slate-400' }
                  ].map((sig, i) => (
                     <div key={i} className={`p-3 bg-slate-50/50 rounded-xl border border-slate-100 ${i === 2 ? 'col-span-2 md:col-span-1' : ''}`}>
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{sig.label}</p>
                        <p className={`text-[10px] md:text-[11px] font-black ${sig.color}`}>{sig.val}</p>
                     </div>
                  ))}
               </div>
            </div>

            <div className="md:col-span-2 lg:col-span-6 glass-card !p-6 flex flex-col border-slate-100">
               <h4 className="mobile-section-title text-slate-900 uppercase tracking-tight italic mb-6">Event Horizon</h4>
               <div className="space-y-3 md:space-y-4">
                  {(stats?.recentOrders || []).slice(0, 4).map((ev, i) => (
                     <div key={i} className="flex items-center justify-between p-3 bg-slate-50/30 rounded-2xl">
                        <div className="flex items-center gap-3 md:gap-4">
                           <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-[10px] md:text-[12px] font-black">{ev.avatar}</div>
                           <div className="min-w-0">
                              <h5 className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase truncate">{ev.name}</h5>
                              <span className="text-[7px] md:text-[8px] font-bold text-slate-400 truncate block">{ev.status} • {ev.date}</span>
                           </div>
                        </div>
                        <span className="text-[10px] md:text-[11px] font-black text-emerald-600 whitespace-nowrap">{ev.price}</span>
                     </div>
                  ))}
               </div>
            </div>
         </section>
      </div>
   );
};

export default Dashboard;
