import React from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  History, 
  Upload, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Video as VideoIcon,
  Plus,
  MoreVertical,
  ChevronRight,
  Monitor
} from 'lucide-react';

const VideoModule = () => {
  return (
    <div className="space-y-12 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black theme-text-primary tracking-tighter">Video Production</h1>
          <p className="text-surface-500 mt-2 font-medium">Manage edits, revisions, and render pipelines.</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-brand-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/30 flex items-center gap-3 group">
            <Upload size={18} className="group-hover:-translate-y-1 transition-transform" /> New Upload
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Preview */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-light rounded-[40px] border border-white/5 overflow-hidden relative group"
          >
            <div className="aspect-video bg-surface-950 flex items-center justify-center relative overflow-hidden">
               <img src="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=1200" alt="Preview" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <button className="w-20 h-20 bg-brand-600/90 rounded-full flex items-center justify-center text-white shadow-2xl backdrop-blur-sm hover:scale-110 transition-transform">
                     <Play size={32} className="ml-1" />
                  </button>
               </div>
               
               {/* Timeline Overlay */}
               <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#020617] to-transparent">
                  <div className="flex justify-between items-center mb-4 text-[10px] font-black uppercase tracking-widest text-surface-400">
                     <span>Nike_Ad_Campaign_v2.mp4</span>
                     <span>02:45 / 04:30</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                     <div className="w-[60%] h-full bg-brand-500 shadow-[0_0_10px_#8b5cf6]"></div>
                  </div>
               </div>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {[
               { label: 'Active Renders', value: '3', icon: Layers, color: 'text-brand-400' },
               { label: 'Total Storage', value: '4.2 TB', icon: Monitor, color: 'text-neon-blue' },
               { label: 'Avg Render Time', value: '14m', icon: Clock, color: 'text-emerald-400' },
             ].map((stat, i) => (
               <div key={i} className="glass-light p-6 rounded-3xl border border-white/5 flex items-center gap-5">
                  <div className={`p-3 bg-white/5 rounded-xl ${stat.color} shadow-xl border border-white/5`}><stat.icon size={20} /></div>
                  <div>
                     <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                     <p className="text-xl font-black theme-text-primary">{stat.value}</p>
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* Revision History */}
        <div className="glass-light p-10 rounded-[40px] border border-white/5 flex flex-col h-full shadow-2xl">
           <div className="flex items-center gap-3 mb-10">
              <History size={24} className="text-brand-500" />
              <h2 className="text-2xl font-black theme-text-primary tracking-tight">Revision History</h2>
           </div>
           <div className="space-y-6 flex-1">
              {[
                { version: 'v2.1', author: 'Sarah Miller', date: '2h ago', status: 'Approved', comment: 'Added color grading to the final shot.' },
                { version: 'v2.0', author: 'David Smith', date: '5h ago', status: 'Feedback', comment: 'Audio levels need adjustment.' },
                { version: 'v1.2', author: 'Sarah Miller', date: '1d ago', status: 'Completed', comment: 'Initial export with motion graphics.' },
              ].map((rev, i) => (
                <div key={i} className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-white/10 transition-all space-y-4 group">
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                         <span className="text-sm font-black theme-text-primary">{rev.version}</span>
                         <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                           rev.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
                         }`}>{rev.status}</span>
                      </div>
                      <span className="text-[10px] font-bold text-surface-500">{rev.date}</span>
                   </div>
                   <p className="text-xs text-surface-400 font-medium leading-relaxed italic">"{rev.comment}"</p>
                   <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">{rev.author}</span>
                      <button className="text-surface-500 hover:theme-text-primary transition-colors"><ChevronRight size={16} /></button>
                   </div>
                </div>
              ))}
           </div>
           <button className="w-full mt-10 py-4 bg-brand-600/10 text-brand-400 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-brand-500/20 hover:bg-brand-600/20 transition-all">
              View Archive
           </button>
        </div>
      </div>
    </div>
  );
};

export default VideoModule;
