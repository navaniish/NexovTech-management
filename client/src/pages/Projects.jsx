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
  Trash2
} from 'lucide-react';

import API_URL from '../config';

const TaskCard = ({ project, onDelete }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4, scale: 1.02 }}
    className="glass-light p-5 rounded-3xl border border-white/5 hover:border-brand-500/30 transition-all cursor-pointer group shadow-xl"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
        project.priority === 'High' ? 'bg-rose-500/20 text-rose-500' : 
        project.priority === 'Medium' ? 'bg-amber-500/20 text-amber-500' : 'bg-surface-500/20 text-surface-500'
      }`}>
        {project.priority || 'Medium'}
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Are you sure you want to terminate this mission?')) {
              project.onDelete(project.id || project._id);
            }
          }}
          className="text-surface-600 hover:text-rose-500 transition-colors p-1"
        >
          <Trash2 size={16} />
        </button>
        <button className="text-surface-600 hover:text-white transition-colors">
          <MoreHorizontal size={18} />
        </button>
      </div>
    </div>
    
    <h4 className="text-white font-bold text-base mb-4 group-hover:text-brand-400 transition-colors">{project.title}</h4>
    
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {project.team?.slice(0, 3).map((member, i) => (
            <div key={member._id || i} className="w-7 h-7 rounded-full bg-surface-800 border-2 border-[#020617] flex items-center justify-center overflow-hidden">
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
          ))}
          {project.team?.length > 3 && (
             <div className="w-7 h-7 rounded-full bg-brand-600 border-2 border-[#020617] flex items-center justify-center text-[8px] font-black text-white">
                +{project.team.length - 3}
             </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-surface-500 text-[10px] font-bold">
          <Clock size={12} /> {project.deadline ? new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No Date'}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">₹{project.budget?.toLocaleString() || 0}</span>
        <span className="text-[10px] font-bold text-surface-600 truncate max-w-[100px]">{project.client?.name || 'N/A'}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-surface-600">
           <span>Progress</span>
           <span>{project.progress || 0}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${project.progress || 0}%` }}
            className="h-full bg-brand-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"
          />
        </div>
      </div>
    </div>
  </motion.div>
);

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // For mobile Kanban view
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

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([
        fetch(`${API_URL}/projects`),
        fetch(`${API_URL}/team`)
      ]);
      if (pRes.ok) setProjects(await pRes.json());
      if (tRes.ok) {
        const data = await tRes.json();
        // Deduplicate
        const unique = (data || []).reduce((acc, curr) => {
          if (curr.email && !acc.find(item => item.email === curr.email)) acc.push(curr);
          return acc;
        }, []);
        setTeamMembers(unique);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (id) => {
    try {
      const response = await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE' });
      if (response.ok) {
        showToast('Mission archived and removed from grid.');
        fetchProjects();
      } else {
        showToast('Archive failed. Access denied.', true);
      }
    } catch (err) {
      showToast('Network disruption. Archive aborted.', true);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      if (response.ok) {
        setShowModal(false);
        setNewProject({ title: '', client: { name: '' }, budget: '', deadline: '', priority: 'Medium', status: 'Planning', team: [] });
        showToast('Mission successfully deployed to cloud!');
        fetchProjects();
      } else {
        showToast('Mission deployment aborted. Check logs.', true);
      }
    } catch (err) {
      showToast('Mission deployment aborted. Check logs.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const columns = {
    pending: {
      id: 'pending',
      title: 'Planning',
      color: 'bg-surface-500',
      projects: projects.filter(p => p.status === 'Planning')
    },
    progress: {
      id: 'progress',
      title: 'In Progress',
      color: 'bg-brand-500',
      projects: projects.filter(p => p.status === 'In Progress')
    },
    review: {
      id: 'review',
      title: 'Review',
      color: 'bg-neon-blue',
      projects: projects.filter(p => p.status === 'Review')
    },
    completed: {
      id: 'completed',
      title: 'Completed',
      color: 'bg-emerald-500',
      projects: projects.filter(p => p.status === 'Completed')
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-surface-500 font-black uppercase tracking-widest text-xs">Accessing Project Vault...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20 glass rounded-[40px] border border-rose-500/20 px-6">
       <AlertTriangle size={64} className="text-rose-500 mx-auto mb-6" />
       <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">Grid Connection Failure</h3>
       <p className="text-surface-500 mt-2 text-sm">{error}</p>
       <button onClick={fetchProjects} className="mt-8 px-8 py-3 bg-brand-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 transition-all">Retry Link</button>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 max-w-[1400px] mx-auto relative">
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-10 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 ${
              notification.isError ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-brand-500/10 border-brand-500/20 text-brand-500'
            }`}
          >
            {notification.isError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span className="text-xs font-black uppercase tracking-widest">{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div className="px-1">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase">Project Hub</h1>
          <p className="text-surface-500 mt-1 md:mt-2 text-xs md:text-sm font-medium">Real-time mission tracking and specialist deployment.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 md:flex-none relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-600 group-focus-within:text-brand-500 transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full md:w-auto bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-white"
            />
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="flex-1 md:flex-none bg-brand-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/30 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus size={16} /> New Mission
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex p-1 bg-white/5 border border-white/10 rounded-2xl overflow-x-auto no-scrollbar">
        {Object.values(columns).map((col) => (
          <button
            key={col.id}
            onClick={() => setActiveTab(col.id)}
            className={`flex-1 min-w-[100px] py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${
              activeTab === col.id ? 'bg-brand-600 text-white shadow-lg' : 'text-surface-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${col.color}`}></div>
              {col.title}
            </div>
            <span className={`text-[8px] ${activeTab === col.id ? 'text-white/70' : 'text-surface-700'}`}>{col.projects.length} Missions</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {Object.values(columns).map((column) => (
          <div 
            key={column.id} 
            className={`space-y-6 ${activeTab === column.id ? 'block' : 'hidden lg:block'}`}
          >
            <div className="hidden lg:flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${column.color}`}></div>
                <h3 className="text-white font-black text-sm uppercase tracking-widest">{column.title}</h3>
                <span className="px-2 py-0.5 bg-white/5 rounded-md text-[10px] font-black text-surface-500 border border-white/5">{column.projects.length}</span>
              </div>
              <button className="text-surface-600 hover:text-white transition-colors">
                <Plus size={18} />
              </button>
            </div>
            
            <div className="space-y-4 md:space-y-5 min-h-[400px]">
              <AnimatePresence mode="popLayout">
                {column.projects.length === 0 ? (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     className="h-32 border-2 border-dashed border-white/5 rounded-[32px] flex items-center justify-center"
                   >
                      <p className="text-[10px] font-black text-surface-800 uppercase tracking-widest">No Active Missions</p>
                   </motion.div>
                ) : column.projects.map((project) => (
                  <TaskCard 
                    key={project.id || project._id} 
                    project={{ ...project, onDelete: handleDeleteProject }} 
                  />
                ))}
              </AnimatePresence>
              
              <div className="h-20 border-2 border-dashed border-white/5 rounded-[32px] flex items-center justify-center group hover:border-brand-500/20 transition-all cursor-pointer">
                 <p className="text-[10px] font-black text-surface-700 uppercase tracking-widest group-hover:text-surface-500 transition-colors">Authorize Phase</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg glass border border-white/10 rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-2xl z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-6 md:mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase">Launch Mission</h2>
                <button onClick={() => setShowModal(false)} className="p-2 text-surface-500 hover:text-white transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Mission Title</label>
                   <div className="relative">
                      <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-600" size={16} />
                      <input 
                        required
                        placeholder="e.g. Project Nexovgen"
                        value={newProject.title}
                        onChange={e => setNewProject({ ...newProject, title: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Budget</label>
                    <div className="relative">
                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-600" size={16} />
                        <input 
                          type="number"
                          placeholder="Amount"
                          value={newProject.budget}
                          onChange={e => setNewProject({ ...newProject, budget: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Deadline</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-600" size={16} />
                        <input 
                          type="date"
                          value={newProject.deadline}
                          onChange={e => setNewProject({ ...newProject, deadline: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Deploy Specialists</label>
                  <div className="flex flex-wrap gap-2 p-3 bg-white/5 rounded-2xl border border-white/10 min-h-[60px] max-h-[150px] overflow-y-auto custom-scrollbar">
                    {teamMembers.map((member) => {
                      const isSelected = newProject.team?.find(m => m.email === member.email);
                      return (
                        <button
                          key={member.id || member._id || member.email}
                          type="button"
                          onClick={() => {
                            const team = isSelected 
                              ? newProject.team.filter(m => m.email !== member.email)
                              : [...(newProject.team || []), { name: member.name, email: member.email, avatar: member.avatar }];
                            setNewProject({ ...newProject, team });
                          }}
                          className={`flex items-center gap-2 p-1.5 pr-3 rounded-xl border transition-all ${
                            isSelected 
                              ? 'bg-brand-500/20 border-brand-500/50 text-brand-400' 
                              : 'bg-white/5 border-white/5 text-surface-500 hover:border-white/20'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={member.avatar} className="w-full h-full object-cover" alt="" />
                          </div>
                          <span className="text-[10px] font-bold whitespace-nowrap">{member.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                    {teamMembers.length === 0 && (
                      <p className="text-[10px] text-surface-700 italic">No specialists available in Registry.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Priority Strategy</label>
                  <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                    {['Low', 'Medium', 'High'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewProject({ ...newProject, priority: p })}
                        className={`flex-1 py-3 rounded-[13px] text-[10px] font-black uppercase tracking-widest transition-all ${newProject.priority === p ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'text-surface-500 hover:text-white'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-brand-600 rounded-2xl text-xs font-black uppercase tracking-widest text-white hover:bg-brand-500 transition-all shadow-2xl shadow-brand-600/40 flex items-center justify-center gap-3 mt-4"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <><Plus size={20} /> Deploy Mission</>}
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
