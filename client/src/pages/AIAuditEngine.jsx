import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Activity, 
  Target, 
  Zap, 
  FileText, 
  Download,
  Search,
  RefreshCw,
  Cpu,
  Brain,
  Layers,
  ArrowUpRight,
  ChevronRight,
  AlertCircle,
  Clock,
  Sparkles,
  BarChart3,
  Globe
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area 
} from 'recharts';
import API_URL from '../config';

const AIAuditEngine = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [risks, setRisks] = useState([]);
  const [predictive, setPredictive] = useState(null);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const [sumRes, anaRes, riskRes, predRes] = await Promise.all([
        fetch(`${API_URL}/audit/summary`),
        fetch(`${API_URL}/audit/analytics`),
        fetch(`${API_URL}/audit/risks`),
        fetch(`${API_URL}/audit/predictive`)
      ]);

      const [sumData, anaData, riskData, predData] = await Promise.all([
        sumRes.json(),
        anaRes.json(),
        riskRes.json(),
        predRes.json()
      ]);

      setSummary(sumData);
      setAnalytics(anaData);
      setRisks(riskData);
      setPredictive(predData);
    } catch (err) {
      console.error('Audit Protocol Failure:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const COLORS = ['#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#ef4444'];

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
       <div className="relative">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-20 h-20 border-4 border-brand-500/20 border-t-brand-500 rounded-full"
          />
          <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-500 animate-pulse" size={32} />
       </div>
       <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px]">Initializing Neural Audit Engine...</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* Executive HUD Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white/60 p-10 rounded-[48px] border border-gray-100 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-[0.03] pointer-events-none">
           <ShieldCheck size={300} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
             <div className="px-3 py-1 bg-brand-600/20 border border-brand-500/30 rounded-full">
                <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest flex items-center gap-2">
                   <Zap size={12} className="animate-pulse" /> Live Audit Active
                </span>
             </div>
             <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Protocol Version: 4.2.0-Alpha</span>
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Workforce Intelligence</h1>
          <p className="text-gray-400 mt-3 font-bold uppercase tracking-[0.2em] text-[11px] max-w-xl">
             {summary?.executiveSummary}
          </p>
        </div>

        <div className="flex flex-col items-end gap-4 relative z-10">
           <div className="flex items-center gap-4">
              <div className="text-right">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Confidence</p>
                 <p className="text-2xl font-black text-brand-400 tracking-tight">{summary?.confidenceScore}%</p>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-brand-500/20 border-t-brand-500 flex items-center justify-center text-xs font-black text-gray-900">
                 96%
              </div>
           </div>
           <button className="bg-brand-600 text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-2xl shadow-brand-600/30 flex items-center gap-3">
              <FileText size={18} /> Generate Executive Audit
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Org Health Gauge */}
        <div className="glass-light p-10 rounded-[48px] border border-gray-100 relative overflow-hidden flex flex-col items-center justify-center text-center group shadow-2xl">
           <div className="absolute inset-0 bg-gradient-to-b from-brand-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-8">Org Health Index</p>
           
           <div className="relative w-48 h-48 mb-8">
              <svg className="w-full h-full transform -rotate-90">
                 <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                 <motion.circle 
                   cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" 
                   strokeDasharray={552}
                   initial={{ strokeDashoffset: 552 }}
                   animate={{ strokeDashoffset: 552 - (552 * summary?.healthScore) / 100 }}
                   className="text-brand-500 shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                 />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-5xl font-black text-gray-900 tracking-tighter">{summary?.healthScore}</span>
                 <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Stable</span>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4 w-full">
              <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Stability</p>
                 <p className="text-sm font-black text-gray-900">94.2%</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Risk Level</p>
                 <p className="text-sm font-black text-rose-500">Minimal</p>
              </div>
           </div>
        </div>

        {/* Workforce Analytics Sector */}
        <div className="lg:col-span-2 glass-light p-10 rounded-[48px] border border-gray-100 shadow-2xl relative overflow-hidden">
           <div className="flex items-center justify-between mb-10">
              <div>
                 <h3 className="text-2xl font-black text-gray-900 tracking-tight">Personnel Distribution</h3>
                 <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mt-1">Cross-Departmental Mission Balance</p>
              </div>
              <BarChart3 className="text-white/10" size={40} />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="h-[250px] relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                          data={analytics?.workforceDistribution}
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={8}
                          dataKey="value"
                       >
                          {analytics?.workforceDistribution.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                       </Pie>
                       <Tooltip 
                         contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                         itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                       />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                 {analytics?.workforceDistribution.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-gray-100 group hover:border-brand-500/30 transition-all">
                       <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">{item.name}</span>
                       </div>
                       <span className="text-xs font-black text-gray-400">{item.value} specialists</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Predictive Sector */}
        <div className="lg:col-span-2 glass-light p-10 rounded-[48px] border border-gray-100 shadow-2xl overflow-hidden relative">
           <div className="flex items-center justify-between mb-10">
              <div>
                 <h3 className="text-2xl font-black text-gray-900 tracking-tight">Predictive Scaling</h3>
                 <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mt-1">AI-Driven Financial & Growth Forecasting</p>
              </div>
              <div className="flex gap-2">
                 <div className="px-3 py-1 bg-brand-500/10 rounded-full text-[9px] font-black text-brand-400 uppercase tracking-widest">Attrition Risk: {predictive?.attritionRisk.score}</div>
              </div>
           </div>

           <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={analytics?.productivityTrend}>
                    <defs>
                       <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                       contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
           
           <div className="mt-8 p-6 bg-brand-500/5 border border-brand-500/10 rounded-[32px] flex items-center gap-6">
              <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-gray-900 shrink-0">
                 <Brain size={24} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-1">Strategic AI Insight</p>
                 <p className="text-xs font-bold text-white/70 leading-relaxed">{predictive?.scalingRecommendation}</p>
              </div>
           </div>
        </div>

        {/* Risk Detection Feed */}
        <div className="glass-light p-10 rounded-[48px] border border-gray-100 shadow-2xl flex flex-col">
           <h3 className="text-xl font-black text-gray-900 tracking-tight mb-8">Anomaly Feed</h3>
           <div className="space-y-6 flex-1">
              {risks.map((risk, i) => (
                 <div key={i} className="p-6 bg-white/[0.03] rounded-3xl border border-gray-100 relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[8px] font-black uppercase tracking-widest ${
                       risk.severity === 'Critical' ? 'bg-rose-500 text-white' : 
                       risk.severity === 'Warning' ? 'bg-amber-500 text-gray-900' : 'bg-emerald-500 text-white'
                    }`}>
                       {risk.severity}
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                       <div className={`w-2 h-2 rounded-full ${
                          risk.severity === 'Critical' ? 'bg-rose-500 animate-pulse' : 
                          risk.severity === 'Warning' ? 'bg-amber-500' : 'bg-emerald-500'
                       }`} />
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{risk.category}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-900 mb-4">{risk.message}</p>
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                       <span className="text-[9px] font-black text-brand-400 uppercase tracking-widest">Remediation Protocol</span>
                       <ChevronRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                    </div>
                 </div>
              ))}
           </div>
           <button className="w-full py-4 mt-8 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all">Clear Resolve All</button>
        </div>
      </div>
    </div>
  );
};

export default AIAuditEngine;


