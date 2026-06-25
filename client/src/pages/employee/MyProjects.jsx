import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase, Calendar, Target, Users, ExternalLink,
  ArrowRight, RefreshCw, Layers, Zap, Globe, ShieldCheck, Cpu,
  Code, FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';

const MyProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchMyProjects = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsSyncing(true);

    try {
      const response = await fetch(`${API_URL}/projects`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nexov_token') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const allProjects = await response.json();
        const myProjects = allProjects.filter(p =>
          p.team?.some(m => m.email?.toLowerCase() === user?.email?.toLowerCase())
        );
        setProjects(myProjects);
      }
    } catch (err) {
      console.error('Project sync failure');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      fetchMyProjects();

      const interval = setInterval(() => {
        if (!document.hidden) fetchMyProjects(true);
      }, 10000);

      const handleFocus = () => fetchMyProjects(true);
      window.addEventListener('focus', handleFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [user?.email]);

  const formatDate = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return 'TBD'; } };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">

      {/* 1. DYNAMIC HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl">
              <Layers size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">Operation Center</h1>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active Deployment Registry</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchMyProjects(true)}
          disabled={isSyncing}
          className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-brand-500/20 hover:text-brand-600 transition-all shadow-xl group"
        >
          <RefreshCw size={16} className={`${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          {isSyncing ? 'Syncing Uplink...' : 'Sync Registry'}
        </button>
      </div>

      {/* 2. PROJECT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="h-[280px] glass-card rounded-[32px] animate-pulse bg-white/50" />
          ))
        ) : projects.length === 0 ? (
          <div className="lg:col-span-2 py-32 text-center glass-card rounded-[48px] border border-slate-100 flex flex-col items-center justify-center gap-6">
            <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200">
              <Globe size={56} />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">No Active Deployments</h3>
              <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em]">Awaiting project assignment from command center</p>
            </div>
          </div>
        ) : (
          projects.map((project, i) => (
            <motion.div
              key={project._id || project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-[32px] overflow-hidden group border-slate-100 hover:border-brand-500/30 hover:shadow-2xl transition-all"
            >
              <div className="p-8">
                <div className="flex items-start justify-between mb-8">
                  <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Cpu size={28} />
                  </div>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${project.status === 'Completed' ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' :
                      project.status === 'In Progress' ? 'bg-brand-50 text-brand-600 border border-brand-100' : 'bg-amber-50 text-amber-500 border border-amber-100'
                    }`}>
                    {project.status}
                  </span>
                </div>

                <div className="space-y-2 mb-8">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-brand-600 transition-colors leading-none">{project.title}</h2>
                  <p className="text-[13px] font-medium text-slate-400 line-clamp-2 leading-relaxed">{project.description}</p>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Deadline</p>
                    <p className="text-xs font-black text-slate-700">{formatDate(project.deadline)}</p>
                  </div>
                  <div className="space-y-1 border-x border-slate-200 px-6">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Velocity</p>
                    <p className="text-xs font-black text-slate-700">{project.progress || 0}%</p>
                  </div>
                  <div className="space-y-1 pl-6">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Team Size</p>
                    <p className="text-xs font-black text-slate-700">{(project.team || []).length} Units</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-8">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress || 0}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                  />
                </div>

                {/* Team & Action */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex -space-x-3">
                    {(project.team || []).slice(0, 4).map((m, j) => (
                      <div key={j} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm hover:scale-110 hover:z-10 transition-all">
                        <img
                          src={m.avatar ? (m.avatar.startsWith('http') || m.avatar.startsWith('data:') ? m.avatar : `${API_URL.replace('/api', '')}${m.avatar}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name || j}`}
                          alt={m.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {(project.team || []).length > 4 && (
                      <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                        +{(project.team || []).length - 4}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {project.githubRepoUrl && (
                      <a
                        href={project.githubRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-brand-600 transition-colors p-1 flex items-center justify-center"
                        title="GitHub Repository"
                      >
                        <Code size={16} />
                      </a>
                    )}
                    {project.invoiceUrl && (
                      <a
                        href={project.invoiceUrl.startsWith('http') ? project.invoiceUrl : `${API_URL.replace('/api', '')}${project.invoiceUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-brand-600 transition-colors p-1 flex items-center justify-center"
                        title="Project Invoice"
                      >
                        <FileText size={16} />
                      </a>
                    )}
                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 hover:text-brand-800 transition-colors">
                      View Dossier <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyProjects;
