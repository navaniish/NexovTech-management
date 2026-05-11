import React from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, 
  Database, 
  Code, 
  ExternalLink, 
  Terminal, 
  Cpu, 
  GitBranch,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Layout,
  Server,
  Zap,
  Activity
} from 'lucide-react';

const WebModule = () => {
  return (
    <div className="space-y-12 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black theme-text-primary tracking-tighter">Fullstack Dev Hub</h1>
          <p className="text-surface-500 mt-2 font-medium">Synchronize frontend, backend, and deployment pipelines.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black theme-text-primary uppercase tracking-widest">Main Branch</span>
             </div>
             <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
             <div className="flex items-center gap-2">
                <Code size={14} className="text-brand-400" />
                <span className="text-[10px] font-bold text-surface-400">9c4f2e1</span>
             </div>
          </div>
          <button className="bg-brand-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/30 flex items-center gap-3 group">
            <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700" /> Push Code
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Frontend Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-light p-10 rounded-[40px] border border-gray-100 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <Layout size={120} />
          </div>
          
          <div className="flex justify-between items-center mb-10 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/20 shadow-xl">
                <Globe size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black theme-text-primary tracking-tight">Frontend Ops</h2>
                <p className="text-[10px] text-surface-500 font-black uppercase tracking-[0.2em] mt-1">React / Tailwind / UI</p>
              </div>
            </div>
            <span className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Live</span>
          </div>

          <div className="space-y-4 relative z-10">
            {[
              { task: 'Implement Dashboard UI', status: 'Done', priority: 'High' },
              { task: 'Responsive Navigation Fixes', status: 'In Progress', priority: 'Medium' },
              { task: 'Dark Mode System', status: 'Todo', priority: 'Low' },
              { task: 'Auth Flow Integration', status: 'Done', priority: 'High' },
            ].map((t, i) => (
              <div key={i} className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:border-blue-500/30 transition-all group/task">
                <div className="flex items-center gap-5">
                  <div className={`w-3 h-3 rounded-full ${t.status === 'Done' ? 'bg-emerald-500' : t.status === 'In Progress' ? 'bg-blue-500' : 'bg-surface-700'}`}></div>
                  <p className="text-sm font-bold theme-text-primary group-hover/task:text-blue-400 transition-colors">{t.task}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-surface-600 uppercase tracking-widest">{t.priority}</span>
                  <button className="text-surface-600 hover:theme-text-primary transition-colors"><ExternalLink size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Backend Section */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-light p-10 rounded-[40px] border border-gray-100 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <Server size={120} />
          </div>

          <div className="flex justify-between items-center mb-10 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-600/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-xl">
                <Database size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black theme-text-primary tracking-tight">Backend API</h2>
                <p className="text-[10px] text-surface-500 font-black uppercase tracking-[0.2em] mt-1">Node.js / MongoDB / SSE</p>
              </div>
            </div>
            <span className="px-4 py-2 bg-amber-500/10 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-500/20">Syncing</span>
          </div>

          <div className="space-y-4 relative z-10">
            {[
              { task: 'Express Server Setup', status: 'Done', priority: 'High' },
              { task: 'DB Schema Design', status: 'Done', priority: 'High' },
              { task: 'JWT Logic', status: 'In Progress', priority: 'Critical' },
              { task: 'Socket.io Flows', status: 'Todo', priority: 'Medium' },
            ].map((t, i) => (
              <div key={i} className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:border-emerald-500/30 transition-all group/task">
                <div className="flex items-center gap-5">
                  <div className={`w-3 h-3 rounded-full ${t.status === 'Done' ? 'bg-emerald-500' : t.status === 'In Progress' ? 'bg-blue-500' : 'bg-surface-700'}`}></div>
                  <p className="text-sm font-bold theme-text-primary group-hover/task:text-emerald-400 transition-colors">{t.task}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-surface-600 uppercase tracking-widest">{t.priority}</span>
                  <button className="text-surface-600 hover:theme-text-primary transition-colors"><ExternalLink size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Deployment & Terminal */}
      <div className="glass-light p-10 rounded-[40px] border border-gray-100 shadow-2xl relative overflow-hidden">
         <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black theme-text-primary tracking-tight flex items-center gap-3">
               <Terminal size={22} className="text-brand-400" /> System Logs
            </h2>
            <div className="flex gap-4">
               <div className="flex items-center gap-2 text-[10px] font-black text-surface-500 uppercase tracking-widest">
                  <Activity size={14} className="text-brand-500" /> CPU: 12%
               </div>
               <div className="flex items-center gap-2 text-[10px] font-black text-surface-500 uppercase tracking-widest">
                  <Zap size={14} className="text-amber-500" /> RAM: 1.2GB
               </div>
            </div>
         </div>
         <div className="bg-surface-950 p-8 rounded-3xl border border-gray-100 font-mono text-sm space-y-3 shadow-inner">
            <p className="text-emerald-400"><span className="text-surface-600">09:14:22</span> [BUILD] Production build successful in 12s.</p>
            <p className="text-brand-400"><span className="text-surface-600">09:14:25</span> [DEPLOY] Deploying to edge node... v2.4.1</p>
            <p className="theme-text-primary"><span className="text-surface-600">09:15:01</span> [SERVER] Listening on port 3000 (HTTPS)</p>
            <p className="text-surface-500 flex items-center gap-2">
               <span className="animate-pulse">_</span>
               <span>Waiting for new commits...</span>
            </p>
         </div>
      </div>
    </div>
  );
};

export default WebModule;


