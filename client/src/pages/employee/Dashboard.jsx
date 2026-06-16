import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Clock, TrendingUp, Target, Calendar, CheckCircle2, 
  AlertTriangle, Sparkles, Loader2, MessageSquare, Activity, 
  ChevronRight, ArrowUpRight, ShieldCheck, Cpu, Layers,
  LayoutDashboard, Star, Award, BookOpen
} from 'lucide-react';
import { 
  AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';
import { nexaApi } from '../../services/nexaApi';

// --- HELPER FOR SPARKLINE ---
const MiniSparkline = ({ data, color }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data.map((v, i) => ({ v, i }))}>
       <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
             <stop offset="0%" stopColor={color} stopOpacity={0.3}/>
             <stop offset="100%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
       </defs>
       <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#grad-${color})`} isAnimationActive={false} />
    </AreaChart>
  </ResponsiveContainer>
);

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // WhatsApp Chatbot States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'assistant', text: 'Hello! I am your NEXA AI Administrator. Ask me about your attendance, tasks, salary, payslips, or leaves here on WhatsApp.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatTyping, setChatTyping] = useState(false);

  const handleSendChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatTyping) return;

    const userText = chatInput.trim();
    setChatInput('');

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, {
      sender: 'user',
      text: userText,
      time: currentTime
    }]);

    setChatTyping(true);

    try {
      const result = await nexaApi.sendWhatsappSimulatorMessage(userText);
      if (result.success) {
        setChatMessages(prev => [...prev, {
          sender: 'assistant',
          text: result.response,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        throw new Error('Failed reply');
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        sender: 'assistant',
        text: '⚠️ Unable to connect to NEXA Multi-Agent event loop.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setChatTyping(false);
    }
  };

  const fetchDashboardData = async () => {
    // Priority: id (DocID) > _id > firebaseUid
    const userId = user?.id || user?._id || user?.firebaseUid;
    if (!userId) {
      console.warn('⚠️ DASHBOARD_SYNC: No valid Specialist ID found in session.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`📋 DASHBOARD_SYNC: Synchronizing missions for [${userId}]...`);
      const response = await fetch(`${API_URL}/tasks/my?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nexov_token') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to synchronize mission intelligence');
      const data = await response.json();
      console.log(`✅ DASHBOARD_SYNC: ${data.length} missions active.`);
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
    { label: 'Active Tasks', value: inProgress, icon: Zap, color: '#6366f1', trend: '+2%', data: [10, 15, 12, 18, 20] },
    { label: 'Pending Approval', value: pending, icon: Clock, color: '#f59e0b', trend: 'High Priority', data: [5, 8, 4, 10, 7] },
    { label: 'Completed Missions', value: completed, icon: CheckCircle2, color: '#10b981', trend: 'Verified', data: [20, 25, 30, 45, 50] },
    { label: 'Performance Index', value: `${rate}%`, icon: TrendingUp, color: '#8b5cf6', trend: 'Stable', data: [60, 65, 62, 70, 75] },
  ];

  const pieData = [
    { name: 'Completed', value: completed || 1, color: '#10b981' },
    { name: 'Active', value: inProgress || 1, color: '#6366f1' },
    { name: 'Pending', value: pending || 1, color: '#f59e0b' },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Synchronizing Mission Control...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20 glass rounded-[40px] border border-rose-500/20 max-w-2xl mx-auto">
       <AlertTriangle size={64} className="text-rose-500 mx-auto mb-6" />
       <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Grid Connection Severed</h3>
       <p className="text-slate-500 mt-2 text-sm font-medium">{error}</p>
       <button onClick={fetchDashboardData} className="mt-8 px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl">Retry Link</button>
    </div>
  );

  return (
    <div className="w-full flex flex-col space-y-6 animate-in fade-in duration-1000 max-w-[1440px] mx-auto">
      
      {/* 1. COMPACT VIBRANT HEADER */}
      <section className="relative w-full overflow-hidden rounded-[24px] md:rounded-[32px] bg-white border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col md:flex-row min-h-[160px] md:min-h-[180px]">
        {/* Subtle Background Mesh Glow */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
           <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[100%] bg-indigo-600 rounded-full blur-[100px]" />
           <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[100%] bg-fuchsia-500 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 flex-1 p-6 md:p-10 flex flex-col justify-center">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                 <div className="px-2.5 py-0.5 bg-slate-900 text-white rounded-lg">
                    <span className="text-[9px] font-black uppercase tracking-widest">Node Alpha</span>
                 </div>
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Uplink Stable</span>
              </div>
              <h1 className="text-[28px] md:text-[42px] font-black tracking-tighter leading-none uppercase italic bg-gradient-to-r from-indigo-600 via-brand-600 to-fuchsia-600 bg-clip-text text-transparent">
                 Welcome back, {user?.name?.split(' ')[0] || 'Mani'}!
              </h1>
              <p className="text-[13px] text-slate-400 font-medium">
                 Command center reports optimized mission parameters. Ready for deployment.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
               <div className="bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl flex items-center gap-3 hover:bg-white transition-all shadow-sm">
                  <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                     <Calendar size={16} />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Log</span>
                     <span className="text-[12px] font-black text-slate-900">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
               </div>
               <div className="bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl flex items-center gap-3 hover:bg-white transition-all shadow-sm">
                  <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                     <Activity size={16} />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ping</span>
                     <span className="text-[12px] font-black text-slate-900">24ms</span>
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:block w-1/4 relative overflow-hidden bg-slate-50/50">
           <div 
             className="absolute inset-0 bg-cover bg-center opacity-30 grayscale hover:grayscale-0 transition-all duration-1000"
             style={{ backgroundImage: "url('/assets/header-bg.png')" }}
           />
           <div className="absolute inset-0 bg-gradient-to-r from-white via-white/20 to-transparent" />
           <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-end gap-2">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-slate-100">
                 <Star size={28} className="text-yellow-400 fill-yellow-400" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Elite Specialist</p>
           </div>
        </div>
      </section>

      {/* 2. KPI CARDS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass-card !p-4 md:!p-6 flex flex-col relative overflow-hidden group min-h-[110px] md:min-h-[140px] border-slate-100/60 shadow-lg shadow-slate-200/30">
            <div className="flex items-start justify-between mb-2 md:mb-4 relative z-10">
              <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110" 
                style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                <stat.icon className="w-4 h-4 md:w-6 md:h-6" strokeWidth={2.5} />
              </div>
              <div className="text-right">
                 <span className="text-[8px] md:text-[9px] font-black text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md md:rounded-lg uppercase tracking-widest">{stat.trend}</span>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mb-0.5">{stat.label}</span>
              <h3 className="text-xl md:text-[28px] font-black text-slate-900 leading-none tracking-tighter">{stat.value}</h3>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-[30px] md:h-[40px] opacity-10 group-hover:opacity-20 transition-opacity">
               <MiniSparkline data={stat.data} color={stat.color} />
            </div>
          </div>
        ))}
      </section>

      {/* 3. COLORFUL INTELLIGENCE GRID */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
        
        {/* ANALYTICS (5/12) */}
        <div className="lg:col-span-5 flex flex-col gap-4 md:gap-6">
           <div className="flex items-center gap-3 px-4">
              <div className="w-3 h-3 rounded-full bg-brand-500 shadow-[0_0_12px_rgba(139,92,246,0.6)]" />
              <span className="text-[12px] md:text-[14px] font-black text-slate-900 tracking-[0.2em] uppercase">Tactical Analysis</span>
           </div>
           <div className="glass-card !p-6 md:!p-10 flex flex-col items-center justify-center min-h-[380px] md:min-h-[460px] relative overflow-hidden bg-white/40 border-slate-100 shadow-2xl">
              {/* Background Glow */}
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-brand-400/10 rounded-full blur-[80px]" />
              
              <h4 className="text-[11px] md:text-[13px] font-black text-slate-900 uppercase mb-6 md:mb-10 tracking-widest text-center flex items-center gap-3">
                 <Layers size={18} className="text-brand-600" /> Operational Spread
              </h4>
              <div className="w-full h-[180px] md:h-[260px] relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie data={pieData} innerRadius={55} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} className="filter drop-shadow-xl" />)}
                       </Pie>
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl md:text-[48px] font-black text-slate-900 leading-none">{tasks.length}</span>
                    <span className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1 md:mt-2">Active Units</span>
                 </div>
              </div>
              <div className="mt-6 md:mt-12 flex justify-between w-full max-w-sm">
                 {pieData.map((d, i) => (
                   <div key={i} className="flex flex-col items-center gap-2 group cursor-default">
                      <div className="w-2.5 h-2.5 rounded-full shadow-lg group-hover:scale-150 transition-transform" style={{ background: d.color }} />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{d.name}</span>
                      <span className="text-[14px] font-black text-slate-900">{d.value}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* OPERATIONS (7/12) */}
        <div className="lg:col-span-7 flex flex-col gap-4 md:gap-6">
           <div className="flex items-center gap-3 px-4">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
              <span className="text-[12px] md:text-[14px] font-black text-slate-900 tracking-[0.2em] uppercase">Deployment Queue</span>
           </div>
           <div className="glass-card !p-0 overflow-hidden min-h-[380px] md:min-h-[460px] flex flex-col shadow-2xl border-indigo-50/50">
              <div className="p-6 md:p-10 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white/0">
                 <div className="flex items-center gap-3 md:gap-5">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-indigo-600 rounded-[14px] md:rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                       <Target className="w-5 h-5 md:w-7 md:h-7" />
                    </div>
                    <div>
                       <h3 className="text-lg md:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-1">Active Missions</h3>
                       <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">Real-time Specialist Assignments</p>
                    </div>
                 </div>
                 <button className="px-4 py-2 md:px-6 md:py-3 bg-white text-brand-600 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200/50 border border-slate-100 hover:bg-brand-600 hover:text-white transition-all">Expand Map</button>
              </div>

              <div className="p-4 md:p-8 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                 {tasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-16 md:py-20">
                       <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-[24px] md:rounded-[40px] flex items-center justify-center text-slate-200 mb-4 md:mb-6">
                          <Cpu className="w-10 h-10 md:w-14 md:h-14" />
                       </div>
                       <p className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-slate-300">Awaiting Central Dispatch</p>
                    </div>
                 ) : tasks.slice(0, 5).map((task, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-6 gap-4 rounded-[20px] md:rounded-[32px] bg-white border border-slate-50 hover:border-brand-500/30 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group">
                       <div className="flex items-center gap-4 md:gap-8">
                          <div className={`w-1.5 h-10 md:h-14 rounded-full transition-all group-hover:h-12 md:group-hover:h-16 ${task.priority === 'High' ? 'bg-gradient-to-b from-rose-400 to-rose-600 shadow-[0_0_15px_#ef4444]' : 'bg-slate-100'}`} />
                          <div>
                             <h4 className="text-sm md:text-[17px] font-black text-slate-900 uppercase group-hover:text-brand-600 transition-colors tracking-tight leading-none mb-2 truncate max-w-[200px] md:max-w-xs">{task.title}</h4>
                             <div className="flex items-center gap-3 md:gap-4">
                                <div className="flex items-center gap-1.5 md:gap-2">
                                   <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                                   <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[80px] md:max-w-none">{task.projectId?.title || 'Standalone'}</span>
                                </div>
                                <span className="text-slate-200">|</span>
                                <div className="flex items-center gap-1.5 md:gap-2">
                                   <Clock size={10} className="text-slate-300" />
                                   <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                </div>
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-slate-50">
                          <span className={`text-[8px] md:text-[10px] font-black px-3 py-1.5 rounded-lg md:rounded-xl uppercase tracking-tighter shadow-sm ${
                             task.status === 'In Progress' ? 'bg-indigo-600 text-white' : 'bg-amber-50 text-white'
                          }`}>{task.status}</span>
                          <button className="w-10 h-10 md:w-12 md:h-12 rounded-[14px] md:rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-md">
                             <ChevronRight size={18} className="md:size-[22px]" />
                          </button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

      </section>

      {/* 3.5 CERTIFICATION & LEARNING HORIZON (Intern / Employee Specialty) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         {/* Certificate Status Card */}
         <div className="lg:col-span-5 glass-card !p-6 flex flex-col justify-between border-slate-100 min-h-[200px] shadow-xl">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                  <Award size={18} className="text-amber-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Certificate Status</span>
               </div>
               <span className="text-[8px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md">85% Progress</span>
            </div>
            
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <div className="min-w-0">
                     <p className="text-[12px] font-black text-slate-900 uppercase tracking-tight truncate">NexovTech Certified Specialist</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Expected: 30 June 2026</p>
                  </div>
                  <span className="text-xs font-black text-brand-600">5/6 Modules</span>
               </div>
               <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-brand-600" style={{ width: '85%' }}></div>
               </div>
            </div>

            <p className="text-[8px] font-black text-slate-400 uppercase mt-4 tracking-widest">Verified by NexovTech Academic Board</p>
         </div>

         {/* Learning Resources Carousel */}
         <div className="lg:col-span-7 glass-card !p-6 flex flex-col border-slate-100 min-h-[200px] shadow-xl">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-violet-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recommended Training</span>
               </div>
               <span className="text-[8px] font-black text-violet-500 uppercase tracking-widest">Swipe left →</span>
            </div>
            
            {/* Horizontal scroll carousel */}
            <div className="flex overflow-x-auto gap-4 pb-2 no-scrollbar scroll-smooth">
               {[
                  { title: "React Native Advanced Architecture", duration: "12h", level: "Advanced" },
                  { title: "Zero-Trust Endpoint Security", duration: "8h", level: "Intermediate" },
                  { title: "LLM Orchestration & Multi-Agents", duration: "15h", level: "Expert" },
               ].map((course, idx) => (
                  <div key={idx} className="min-w-[220px] max-w-[220px] bg-slate-50 border border-slate-100 rounded-2xl p-4 shrink-0 flex flex-col justify-between hover:border-brand-500/20 hover:bg-white transition-all cursor-pointer">
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{course.level} • {course.duration}</span>
                     <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-tight mt-2 leading-snug line-clamp-2">{course.title}</h5>
                     <div className="mt-4 flex items-center justify-between">
                        <span className="text-[8px] font-bold text-brand-600 uppercase tracking-widest">Start Module</span>
                        <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">→</div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* 4. VIBRANT FOOTER PROTOCOLS */}
      <section className="flex md:grid overflow-x-auto md:overflow-visible no-scrollbar pb-12 gap-4 md:gap-8 w-full md:grid-cols-3">
         <div className="glass-card !p-6 md:!p-10 flex items-center gap-6 md:gap-8 border-indigo-200/50 bg-gradient-to-br from-indigo-50/50 to-white shadow-xl hover:shadow-2xl transition-all group min-w-[280px] md:min-w-0 shrink-0 md:shrink">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-600 rounded-xl md:rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-indigo-600/40 group-hover:scale-110 transition-transform">
               <ShieldCheck className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
               <h5 className="text-[9px] md:text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Security Node</h5>
               <p className="text-base md:text-[18px] font-black text-slate-900 uppercase tracking-tighter leading-none">Uplink Active</p>
            </div>
         </div>
         <div className="glass-card !p-6 md:!p-10 flex items-center gap-6 md:gap-8 border-emerald-200/50 bg-gradient-to-br from-emerald-50/50 to-white shadow-xl hover:shadow-2xl transition-all group min-w-[280px] md:min-w-0 shrink-0 md:shrink">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-500 rounded-xl md:rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40 group-hover:scale-110 transition-transform">
               <Activity className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
               <h5 className="text-[9px] md:text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-1">Health Index</h5>
               <p className="text-base md:text-[18px] font-black text-slate-900 uppercase tracking-tighter leading-none">Optimal (98%)</p>
            </div>
         </div>
         <div 
           onClick={() => setIsChatOpen(true)}
           className="glass-card !p-6 md:!p-10 flex items-center gap-6 md:gap-8 border-brand-200/50 bg-gradient-to-br from-brand-50/50 to-white shadow-xl hover:shadow-2xl transition-all group cursor-pointer min-w-[280px] md:min-w-0 shrink-0 md:shrink"
         >
            <div className="w-12 h-12 md:w-16 md:h-16 bg-brand-600 rounded-xl md:rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-brand-600/40 group-hover:scale-110 transition-transform">
               <MessageSquare className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
               <h5 className="text-[9px] md:text-[11px] font-black text-brand-400 uppercase tracking-[0.3em] mb-1">Comms Uplink</h5>
               <p className="text-base md:text-[18px] font-black text-slate-900 uppercase tracking-tighter leading-none">WhatsApp AI Online</p>
            </div>
         </div>
      </section>

      {/* 5. FLOATING WHATSAPP CHAT WIDGET */}
      <div className="fixed bottom-6 left-6 md:left-auto md:right-28 md:bottom-8 z-50 flex flex-col items-start md:items-end">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="w-[320px] sm:w-[360px] h-[480px] bg-slate-900 rounded-[28px] p-2.5 shadow-2xl border-2 border-slate-800 flex flex-col mb-4 overflow-hidden"
            >
              <div className="flex-1 bg-[#efeae2] rounded-[22px] overflow-hidden flex flex-col relative">
                {/* WhatsApp Header */}
                <div className="bg-[#075E54] text-white p-3 flex items-center justify-between shadow-md z-10 relative">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-emerald-400/30 overflow-hidden">
                      <Cpu size={18} className="text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black leading-tight">NEXA AI WhatsApp</h4>
                      <span className="text-[8px] text-emerald-200/90 font-medium block">Online Assistant</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsChatOpen(false)}
                    className="text-white/80 hover:text-white text-xs font-black uppercase"
                  >
                    ✕
                  </button>
                </div>

                {/* Message Window */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3 flex flex-col custom-scrollbar z-10 relative">
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex flex-col max-w-[85%] ${
                        msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                      }`}
                    >
                      <div 
                        className={`p-2.5 rounded-xl text-[10px] font-semibold leading-relaxed shadow-sm ${
                          msg.sender === 'user' 
                            ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none' 
                            : 'bg-white text-slate-800 rounded-tl-none'
                      }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                        <div className="text-right text-[7px] text-slate-400 mt-1">{msg.time}</div>
                      </div>
                    </div>
                  ))}
                  {chatTyping && (
                    <div className="self-start flex flex-col items-start max-w-[85%]">
                      <div className="bg-white border border-gray-100 p-2.5 rounded-xl rounded-tl-none flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#128C7E] animate-bounce"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#128C7E] animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#128C7E] animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Footer */}
                <form onSubmit={handleSendChatMessage} className="p-2.5 bg-[#f0f0f0] border-t border-slate-200/50 flex gap-2 items-center z-10 relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask WhatsApp bot..."
                    disabled={chatTyping}
                    className="flex-1 bg-white rounded-full px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none border border-slate-200 focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || chatTyping}
                    className="p-2 bg-[#128C7E] text-white rounded-full transition-all disabled:opacity-40"
                  >
                    <MessageSquare size={12} />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Green WhatsApp Button */}
        <button
          type="button"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 bg-[#25D366] hover:bg-[#1ebd59] text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 border border-emerald-400/20"
        >
          <MessageSquare size={24} className="animate-pulse" />
        </button>
      </div>

    </div>
  );
};

export default EmployeeDashboard;
