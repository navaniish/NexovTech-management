import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Calendar, Target, Users, ExternalLink, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';

const MyProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/projects`)
      .then(r => r.json()).then(setProjects)
      .catch(() => setProjects([
        { _id: '1', title: 'NexovTech AI Platform', description: 'Building a real-time SaaS dashboard with AI integration.', deadline: new Date(Date.now() + 7 * 86400000).toISOString(), status: 'In Progress', progress: 72, team: [{ name: 'Sarah M.' }, { name: 'Alex J.' }], sector: 'AI' },
        { _id: '2', title: 'E-commerce Redesign', description: 'Complete frontend overhaul with performance optimization.', deadline: new Date(Date.now() + 14 * 86400000).toISOString(), status: 'In Progress', progress: 45, team: [{ name: 'Emily W.' }], sector: 'Web' },
      ]));
  }, []);

  const statusColor = (s) => s === 'Completed' ? '#10b981' : s === 'In Progress' ? '#3b82f6' : '#f59e0b';
  const formatDate = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return 'TBD'; } };

  return (
    <div className="space-y-8 pb-12 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>My Projects</h1>
        <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>Overview of projects you are currently assigned to.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((project, i) => (
          <motion.div key={project._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="theme-card rounded-2xl overflow-hidden group">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-brand-500/10 rounded-xl"><Briefcase size={20} className="text-brand-400" /></div>
                <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest"
                  style={{ background: `${statusColor(project.status)}18`, color: statusColor(project.status) }}>
                  {project.status}
                </span>
              </div>
              <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{project.title}</h2>
              <p className="text-xs theme-text-secondary mt-1 line-clamp-2">{project.description}</p>

              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="theme-text-muted" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest theme-text-muted">Deadline</p>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{formatDate(project.deadline)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Target size={14} className="theme-text-muted" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest theme-text-muted">Progress</p>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{project.progress || 0}%</p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 w-full h-1.5 rounded-full" style={{ background: 'var(--border-default)' }}>
                <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${project.progress || 0}%` }} />
              </div>

              {/* Team */}
              <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {(project.team || []).slice(0, 3).map((m, j) => (
                      <img key={j} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name || m}`} alt=""
                        className="w-7 h-7 rounded-full border-2 bg-brand-500/10" style={{ borderColor: 'var(--bg-base)' }} />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold theme-text-secondary">{(project.team || []).length} members</span>
                </div>
                <Users size={14} className="theme-text-muted" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MyProjects;
