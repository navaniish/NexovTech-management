import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Briefcase,
  Users,
  ChevronRight,
  GripVertical,
  AlertTriangle,
  X,
  Target,
  IndianRupee,
  Calendar,
  Loader2,
  Trash2,
  Globe,
  Code,
  FileText
} from 'lucide-react';

import API_URL from '../config';

const TaskCard = ({ project }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -12, scale: 1.02 }}
    className="glass-card flex flex-col group cursor-pointer"
  >
    <div className="flex justify-between items-start mb-6">
      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
        project.priority === 'High' ? 'bg-rose-500/10 text-rose-500' : 
        project.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'
      }`}>
        {project.priority || 'Medium'}
      </div>
      <div className="flex items-center gap-2">
        {project.githubRepoUrl && (
          <a
            href={project.githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-slate-400 hover:text-indigo-600 transition-colors p-1 flex items-center justify-center"
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
            onClick={(e) => e.stopPropagation()}
            className="text-slate-400 hover:text-indigo-600 transition-colors p-1 flex items-center justify-center"
            title="Project Invoice"
          >
            <FileText size={16} />
          </a>
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Are you sure you want to terminate this mission?')) {
              project.onDelete(project.id || project._id);
            }
          }}
          className="text-slate-400 hover:text-rose-500 transition-colors p-1 flex items-center justify-center"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
    
    <h4 className="text-slate-900 font-black text-[15px] mb-6 tracking-tight group-hover:text-indigo-600 transition-colors leading-tight">
       {project.title}
    </h4>
    
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {project.team?.slice(0, 3).map((member, i) => (
            <div key={member._id || i} className="w-8 h-8 rounded-xl bg-white border-2 border-white shadow-lg overflow-hidden transition-transform group-hover:scale-110" style={{ transitionDelay: `${i * 100}ms` }}>
               <img src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
          ))}
          {project.team?.length > 3 && (
             <div className="w-8 h-8 rounded-xl bg-indigo-600 border-2 border-white flex items-center justify-center text-[9px] font-black text-white shadow-lg">
                +{project.team.length - 3}
             </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold">
          <Clock size={14} /> {project.deadline ? new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No Date'}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-[12px] font-black text-indigo-600 tracking-widest uppercase">₹{project.budget?.toLocaleString() || 0}</span>
        <span className="text-[10px] font-bold text-slate-400 truncate max-w-[100px] uppercase tracking-widest">{project.client?.name || 'External'}</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
           <span>Progress</span>
           <span>{project.progress || 0}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden p-[1px]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${project.progress || 0}%` }}
            className="h-full bg-indigo-600 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.4)]"
          />
        </div>
      </div>
    </div>
  </motion.div>
);

const Projects = () => {
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('nexov_projects');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [teamMembers, setTeamMembers] = useState(() => {
    const saved = localStorage.getItem('nexov_team_members');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [loading, setLoading] = useState(() => !localStorage.getItem('nexov_projects'));
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [newProject, setNewProject] = useState({ 
    title: '', 
    client: { name: '' }, 
    budget: '', 
    deadline: '', 
    priority: 'Medium', 
    status: 'Planning',
    team: [] 
  });
  const [notification, setNotification] = useState(null);

  const showToast = (msg, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchProjects = async (silent = false) => {
    try {
      const token = localStorage.getItem('nexov_token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const [pRes, tRes] = await Promise.all([
        fetch(`${API_URL}/projects`, { headers }),
        fetch(`${API_URL}/team`, { headers })
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProjects(pData);
        try {
          localStorage.setItem('nexov_projects', JSON.stringify(pData));
        } catch (storageErr) {
          console.warn('⚠️ localStorage quota exceeded for projects:', storageErr.message);
        }
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTeamMembers(tData);
        try {
          localStorage.setItem('nexov_team_members', JSON.stringify(tData));
        } catch (storageErr) {
          console.warn('⚠️ localStorage quota exceeded for team members:', storageErr.message);
        }
      }
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (id) => {
    try {
      const token = localStorage.getItem('nexov_token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${API_URL}/projects/${id}`, { 
        method: 'DELETE',
        headers
      });
      if (response.ok) {
        showToast('Mission archived.');
        fetchProjects(true);
      } else {
        showToast('Archive failed.', true);
      }
    } catch (err) {
      showToast('Network error.', true);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('nexov_token') || '';
      const response = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newProject)
      });
      if (response.ok) {
        setShowModal(false);
        setNewProject({ title: '', client: { name: '' }, budget: '', deadline: '', priority: 'Medium', status: 'Planning', team: [] });
        showToast('Mission successfully deployed to cloud!');
        fetchProjects(true);
      } else {
        showToast('Mission deployment aborted. Check logs.', true);
      }
    } catch (err) {
      showToast('Mission deployment aborted. Check logs.', true);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const columns = {
    pending: { id: 'pending', title: 'Planning', color: 'bg-slate-400', projects: projects.filter(p => p.status === 'Planning') },
    progress: { id: 'progress', title: 'In Progress', color: 'bg-amber-500', projects: projects.filter(p => p.status === 'In Progress') },
    review: { id: 'review', title: 'Review', color: 'bg-indigo-600', projects: projects.filter(p => p.status === 'Review') },
    completed: { id: 'completed', title: 'Completed', color: 'bg-emerald-500', projects: projects.filter(p => p.status === 'Completed') }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
       <div className="w-16 h-16 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin" />
       <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Accessing Project Vault...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20 glass-card mx-auto max-w-md border-rose-500/20">
       <AlertTriangle size={64} className="text-rose-500 mx-auto mb-6" />
       <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Grid Connection Failure</h3>
       <p className="text-slate-400 mt-2 text-sm">{error}</p>
       <button onClick={() => fetchProjects()} className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-100">Retry Link</button>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 md:p-10 space-y-6 md:space-y-10 animate-in fade-in duration-1000">
      
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-10 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 backdrop-blur-3xl ${
              notification.isError ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'
            }`}
          >
            {notification.isError ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            <span className="text-[11px] font-black uppercase tracking-widest">{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8">
        <div className="flex flex-col">
          <h1 className="mobile-hero-title font-black text-slate-900 tracking-tighter leading-none mb-2">PROJECT HUB</h1>
          <p className="mobile-body-text text-slate-400 font-bold tracking-tight">Real-time mission tracking and specialist deployment.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
           <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search parameters..." className="w-full h-11 md:h-12 pl-12 pr-6 bg-white border border-slate-100 rounded-xl md:rounded-2xl text-[13px] font-medium focus:outline-none focus:border-indigo-500 transition-all shadow-sm" />
           </div>
           <button onClick={() => setShowModal(true)} className="w-full sm:w-auto h-11 md:h-12 px-6 md:px-8 bg-indigo-600 text-white text-[11px] md:text-[12px] font-black rounded-xl md:rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 uppercase tracking-widest">
              <Plus size={18} /> NEW MISSION
           </button>
        </div>
      </section>

      {/* MOBILE BOARD SCROLL INDICATOR */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {Object.values(columns).map((col) => (
          <button 
            key={col.id} 
            onClick={() => {
              setActiveTab(col.id);
              document.getElementById(`column-${col.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }} 
            className={`whitespace-nowrap px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === col.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/60 text-slate-400'}`}
          >
            {col.title}
          </button>
        ))}
      </div>

      <section className="flex lg:grid lg:grid-cols-4 gap-6 md:gap-10 overflow-x-auto lg:overflow-x-visible no-scrollbar -mx-4 px-4 pb-10 snap-x">
        {Object.values(columns).map((column) => (
          <div 
            key={column.id} 
            id={`column-${column.id}`}
            className="flex flex-col gap-6 md:gap-8 min-w-[280px] sm:min-w-[320px] lg:min-w-0 snap-center"
          >
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${column.color} shadow-lg shadow-indigo-100`}></div>
                <h3 className="text-slate-900 font-black text-[13px] md:text-[14px] uppercase tracking-[0.2em]">{column.title}</h3>
                <span className="text-[10px] md:text-[11px] font-black text-slate-300 ml-2">{column.projects.length}</span>
              </div>
              <button className="text-slate-300 hover:text-indigo-600 transition-colors"><MoreHorizontal size={18} /></button>
            </div>
            
            <div className="space-y-6 md:space-y-8 min-h-[400px] md:min-h-[500px]">
              <AnimatePresence mode="popLayout">
                {column.projects.length === 0 ? (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card flex flex-col items-center justify-center text-center gap-6 min-h-[260px] border-dashed">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center relative">
                         <Globe size={24} className="text-slate-200" />
                         <div className="absolute inset-0 border-2 border-indigo-500/10 rounded-full animate-ping-slow" />
                      </div>
                      <div>
                         <p className="text-[10px] md:text-[12px] font-black text-slate-900 uppercase tracking-widest mb-1">NO ACTIVE MISSIONS</p>
                         <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Awaiting Parameter</p>
                      </div>
                   </motion.div>
                ) : column.projects.map((project) => (
                  <TaskCard key={project.id || project._id} project={{ ...project, onDelete: handleDeleteProject }} />
                ))}
              </AnimatePresence>
              
              <button onClick={() => setShowModal(true)} className="w-full h-14 md:h-16 border-2 border-dashed border-slate-200 rounded-2xl md:rounded-[24px] flex items-center justify-center group hover:border-indigo-600 transition-all">
                 <span className="text-[10px] md:text-[11px] font-black text-slate-300 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Authorize Phase</span>
              </button>
            </div>
          </div>
        ))}
      </section>


      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg glass-card p-10 z-10 max-h-[90vh] overflow-y-auto scrollbar-hide">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Launch Mission</h2>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateProject} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Title</label>
                   <div className="relative">
                      <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input required placeholder="e.g. Project Nexovgen" value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })} className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-slate-900 focus:outline-none focus:border-indigo-600" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Budget</label>
                    <div className="relative">
                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="number" placeholder="Amount" value={newProject.budget} onChange={e => setNewProject({ ...newProject, budget: e.target.value })} className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-slate-900 focus:outline-none focus:border-indigo-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deadline</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="date" value={newProject.deadline} onChange={e => setNewProject({ ...newProject, deadline: e.target.value })} className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-slate-900 focus:outline-none focus:border-indigo-600" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deploy Specialists</label>
                  <div className="flex flex-wrap gap-2 p-4 bg-white border border-slate-100 rounded-2xl min-h-[80px]">
                    {teamMembers.map((member) => {
                      const isSelected = newProject.team?.find(m => m.email === member.email);
                      return (
                        <button key={member.id || member._id || member.email} type="button" onClick={() => {
                            const team = isSelected ? newProject.team.filter(m => m.email !== member.email) : [...(newProject.team || []), { name: member.name, email: member.email, avatar: member.avatar }];
                            setNewProject({ ...newProject, team });
                          }} className={`flex items-center gap-2 p-1.5 pr-3 rounded-xl border transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 border-transparent text-slate-500 hover:border-slate-200'}`}>
                          <div className="w-5 h-5 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} className="w-full h-full object-cover" alt="" />
                          </div>
                          <span className="text-[10px] font-bold whitespace-nowrap">{member.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority Strategy</label>
                  <div className="flex p-1 bg-slate-50 rounded-2xl">
                    {['Low', 'Medium', 'High'].map((p) => (
                      <button key={p} type="button" onClick={() => setNewProject({ ...newProject, priority: p })} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newProject.priority === p ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-900'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 mt-4">
                  <Plus size={20} /> Deploy Mission
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Projects;
