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

const CardSparkline = ({ data, color, index }) => (
   <ResponsiveContainer width="100%" height={45} minWidth={0}>
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
      { label: 'Missions', value: stats?.totalApplicants || '0', trend: '+18%', color: '#f59e0b', icon: Target, data: [40, 50, 45, 65, 75] },
      { label: 'Payload', value: `₹${(stats?.mrr || 0).toLocaleString()}`, trend: '+15%', color: '#8b5cf6', icon: IndianRupee, data: [25, 40, 35, 55, 70] },
   ];

   const deptData = [
      { name: 'Engineering', value: 48, color: '#6366f1' },
      { name: 'Design', value: 26, color: '#10b981' },
      { name: 'Marketing', value: 18, color: '#8b5cf6' },
      { name: 'Operations', value: 16, color: '#f59e0b' },
   ];

   return (
      <div className="w-full flex flex-col space-y-6 animate-in fade-in duration-1000 overflow-y-auto custom-scrollbar">
         {/* OFFICE HEADER */}
         <section className="relative w-full overflow-hidden rounded-[40px] bg-white shadow-2xl border border-white flex flex-col min-h-[200px] group">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: "url('/assets/office-bg.png')" }} />
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[4px]" />

            <div className="relative z-10 flex-1 p-8 md:p-12 flex flex-col justify-center">
               <div className="space-y-1 mb-6">
                  <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none flex items-center gap-3">
                     {getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'}! <span className="animate-bounce-slow">👋</span>
                  </h1>
                  <p className="text-slate-500 text-sm md:text-base font-medium">Here's what's happening with NexovTech today.</p>
               </div>

               <div className="flex flex-wrap gap-4">
                  <div className="bg-white/60 border border-slate-100 px-6 py-3 rounded-[20px] flex items-center gap-4 shadow-sm backdrop-blur-xl">
                     <Calendar size={18} className="text-indigo-600" />
                     <span className="text-sm font-bold text-slate-700">{formatDate(currentTime)}</span>
                  </div>
                  <div className="bg-white/60 border border-slate-100 px-6 py-3 rounded-[20px] flex items-center gap-4 shadow-sm backdrop-blur-xl">
                     <Clock size={18} className="text-brand-600" />
                     <span className="text-sm font-bold text-slate-700 uppercase">{formatTime(currentTime)}</span>
                  </div>
               </div>
            </div>
         </section>

         {/* KPI GRID */}
         <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {kpiStats.map((stat, i) => (
               <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card !p-5 flex flex-col relative overflow-hidden group min-h-[130px] border-slate-100 hover:scale-[1.02] transition-all">
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card !p-5 flex flex-col group justify-center items-center text-center bg-white/40 border-slate-100 min-h-[130px]">
               <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-md mb-2 group-hover:scale-110 transition-transform">
                  <Activity size={20} strokeWidth={2.5} />
               </div>
               <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Status</span>
               <h3 className="text-[16px] font-black text-slate-900 uppercase italic">Paid</h3>
            </motion.div>
         </section>

         {/* ANALYTICS HUB */}
         <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-3 glass-card !p-6 flex flex-col min-h-[300px] border-slate-100">
               <h4 className="text-[11px] font-black text-slate-900 uppercase mb-6 tracking-tight italic text-center">Unit Allocation</h4>
               <div className="flex-1 relative min-h-[180px]">
                  <ResponsiveContainer width="100%" height="100%" minHeight={180}>
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
            </div>

            <div className="lg:col-span-3 glass-card !p-6 flex flex-col gap-4 min-h-[300px] border-slate-100">
               <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight italic">Intelligence Signal</h4>
               <div className="space-y-3">
                  {[
                     { label: 'Sentiment', val: 'Positive (88%)', color: 'text-emerald-500' },
                     { label: 'Response', val: '1.4h avg', color: 'text-indigo-500' },
                     { label: 'Nodes', val: 'Secure', color: 'text-slate-400' }
                  ].map((sig, i) => (
                     <div key={i} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{sig.label}</p>
                        <p className={`text-[11px] font-black ${sig.color}`}>{sig.val}</p>
                     </div>
                  ))}
               </div>
            </div>

            <div className="lg:col-span-6 glass-card !p-6 flex flex-col border-slate-100">
               <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight italic mb-6">Event Horizon</h4>
               <div className="space-y-4">
                  {(stats?.recentOrders || []).map((ev, i) => (
                     <div key={i} className="flex items-center justify-between p-3 bg-slate-50/30 rounded-2xl">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black">{ev.avatar}</div>
                           <div>
                              <h5 className="text-[11px] font-black text-slate-900 uppercase">{ev.name}</h5>
                              <span className="text-[8px] font-bold text-slate-400">{ev.status} • {ev.date}</span>
                           </div>
                        </div>
                        <span className="text-[11px] font-black text-emerald-600">{ev.price}</span>
                     </div>
                  ))}
               </div>
            </div>
         </section>
      </div>
   );
};

export default Dashboard;
