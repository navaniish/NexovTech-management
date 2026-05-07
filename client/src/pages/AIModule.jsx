import React from 'react';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Cpu, 
  Zap, 
  Activity, 
  Settings, 
  Play, 
  Layers, 
  Terminal,
  Database,
  Search,
  Sparkles,
  Command,
  Workflow,
  Share2
} from 'lucide-react';

const AIModule = () => {
  return (
    <div className="space-y-12 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">AI Orchestrator</h1>
          <p className="text-surface-500 mt-2 font-medium">Build, train, and deploy autonomous workflows.</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-brand-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/30 flex items-center gap-3 group">
            <Zap size={18} /> Run All Flows
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Workflow Canvas Mockup */}
        <div className="lg:col-span-2 glass-light rounded-[40px] border border-white/5 p-10 h-[600px] relative overflow-hidden group shadow-2xl">
           <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]"></div>
           
           <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-center mb-12">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-600/10 text-brand-400 rounded-xl border border-brand-500/20"><Workflow size={24} /></div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Workflow Builder</h2>
                 </div>
                 <div className="flex gap-3">
                    <button className="p-2.5 bg-white/5 rounded-xl text-surface-500 hover:text-white transition-all"><Settings size={18} /></button>
                    <button className="p-2.5 bg-white/5 rounded-xl text-surface-500 hover:text-white transition-all"><Share2 size={18} /></button>
                 </div>
              </div>

              {/* Node Layout Simulation */}
              <div className="flex-1 relative">
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="absolute top-10 left-10 p-6 glass border border-brand-500/30 rounded-3xl w-48 shadow-2xl"
                 >
                    <div className="flex items-center gap-2 mb-4 text-brand-400">
                       <Database size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Input Node</span>
                    </div>
                    <p className="text-xs font-bold text-white">Client_Data_Stream</p>
                 </motion.div>

                 <div className="absolute top-[120px] left-[130px] w-[100px] h-[2px] bg-gradient-to-r from-brand-500 to-neon-blue opacity-50"></div>

                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.2 }}
                   className="absolute top-40 left-[230px] p-6 glass border border-neon-blue/30 rounded-3xl w-64 shadow-2xl"
                 >
                    <div className="flex items-center gap-2 mb-4 text-neon-blue">
                       <Cpu size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Processing Node</span>
                    </div>
                    <p className="text-xs font-bold text-white">GPT-4o Vision Engine</p>
                    <div className="mt-4 flex items-center gap-2">
                       <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full w-2/3 bg-neon-blue shadow-[0_0_10px_#00d2ff]"></div>
                       </div>
                       <span className="text-[8px] font-black text-surface-500">67%</span>
                    </div>
                 </motion.div>

                 <div className="absolute top-[250px] left-[350px] w-[100px] h-[100px] border-b-2 border-r-2 border-white/10 rounded-br-3xl"></div>

                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.4 }}
                   className="absolute bottom-10 right-10 p-6 glass border border-emerald-500/30 rounded-3xl w-48 shadow-2xl"
                 >
                    <div className="flex items-center gap-2 mb-4 text-emerald-400">
                       <Layers size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Output Node</span>
                    </div>
                    <p className="text-xs font-bold text-white">Slack_Final_Report</p>
                 </motion.div>
              </div>
           </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-10">
           <div className="glass-light p-10 rounded-[40px] border border-white/5 shadow-2xl">
              <h3 className="text-xl font-black text-white tracking-tight mb-8">Model Config</h3>
              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Inference Engine</label>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-white font-bold text-sm flex justify-between items-center">
                       <span>Claude 3.5 Sonnet</span>
                       <ChevronDown size={16} className="text-surface-600" />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Temperature</label>
                    <div className="px-1 py-4">
                       <div className="w-full h-1 bg-white/10 rounded-full relative">
                          <div className="absolute top-1/2 left-[70%] -translate-y-1/2 w-4 h-4 bg-brand-500 rounded-full shadow-[0_0_10px_#8b5cf6]"></div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="glass-light p-10 rounded-[40px] border border-white/5 shadow-2xl">
              <h3 className="text-xl font-black text-white tracking-tight mb-8">System Health</h3>
              <div className="space-y-6">
                 {[
                   { label: 'Latency', value: '142ms', color: 'text-emerald-400' },
                   { label: 'Uptime', value: '99.99%', color: 'text-brand-400' },
                   { label: 'Cost YTD', value: '$2.4k', color: 'text-white' },
                 ].map((stat, i) => (
                   <div key={i} className="flex justify-between items-end border-b border-white/5 pb-4">
                      <span className="text-[10px] font-black text-surface-500 uppercase tracking-widest">{stat.label}</span>
                      <span className={`text-lg font-black ${stat.color}`}>{stat.value}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const ChevronDown = ({ size, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default AIModule;
