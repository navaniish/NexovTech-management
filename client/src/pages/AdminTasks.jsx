import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Filter, Clock, CheckCircle2, 
  AlertCircle, Briefcase, Users, X, 
  Calendar, Loader2, Trash2, LayoutGrid, 
  List, MessageSquare, Paperclip, ChevronRight,
  TrendingUp, Zap, Target
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const AdminTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    projectId: '',
    deadline: '',
    priority: 'Medium',
    attachments: []
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('nexov_token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const [tRes, tmRes, pRes] = await Promise.all([
        fetch(`${API_URL}/tasks`, { headers }),
        fetch(`${API_URL}/team`, { headers }),
        fetch(`${API_URL}/projects`, { headers })
      ]);
      if (tRes.ok) setTasks(await tRes.json());
      if (tmRes.ok) setTeam(await tmRes.json());
      if (pRes.ok) setProjects(await pRes.json());
    } catch (err) {
      console.error('Task fetch failure:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const formData = new FormData();
    Object.keys(taskData).forEach(key => {
      if (key === 'attachments') {
        taskData.attachments.forEach(file => formData.append('attachments', file));
      } else {
        formData.append(key, taskData[key]);
      }
    });

    try {
      const token = localStorage.getItem('nexov_token') || '';
      const res = await axios.post(`${API_URL}/tasks`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.status === 201 || res.status === 200) {
        setShowAssign(false);
        setTaskData({ title: '', description: '', assignedTo: '', projectId: '', deadline: '', priority: 'Medium', attachments: [] });
        fetchAll();
      }
    } catch (err) {
      console.error('Assignment failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm('Confirm task termination?')) return;
    try {
      const token = localStorage.getItem('nexov_token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/tasks/${id}`, { 
        method: 'DELETE',
        headers
      });
      if (res.ok) fetchAll();
    } catch (err) { console.error(err); }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title?.toLowerCase().includes(search.toLowerCase()) || 
                         t.assignedUser?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || t.status?.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: tasks.length,
    active: tasks.filter(t => t.status !== 'Completed').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    critical: tasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
       <div className="w-16 h-16 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin" />
       <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Synchronizing Mission Queue...</p>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-10 space-y-6 md:space-y-8 animate-in fade-in duration-1000">
      {/* 1. HIGH-FIDELITY OFFICE HEADER */}
      <section className="relative w-full overflow-hidden rounded-[24px] md:rounded-[40px] bg-white shadow-2xl border border-white flex flex-col min-h-[220px] group">
         {/* Background Image Layer */}
         <div 
           className="absolute inset-0 bg-cover bg-center transition-all duration-700 blur-[8px] scale-105 group-hover:scale-110"
           style={{ backgroundImage: "url('/assets/office-bg.png')" }}
         />
         {/* Glass Overlay */}
         <div className="absolute inset-0 bg-white/25 backdrop-blur-[12px]" />
         
         <div className="relative z-10 flex-1 p-6 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
               <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none flex items-center gap-3">
                  Work Assignment <span className="animate-bounce-slow">📝</span>
               </h1>
               <p className="text-slate-500 text-[13px] md:text-[15px] font-medium">
                  Global mission dispatch and tactical task management.
               </p>
            </div>
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4">
               {/* Dispatch Button */}
               <button 
                 onClick={() => setShowAssign(true)}
                 className="bg-slate-900 text-white px-6 md:px-8 py-2.5 md:py-3.5 rounded-[16px] md:rounded-[20px] text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl flex items-center gap-3"
               >
                 <Zap size={18} className="fill-current" />
                 <span>Dispatch</span>
               </button>
            </div>
         </div>
      </section>

      {/* 2. KPI DASHBOARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Global Missions" value={stats.total} icon={Briefcase} accent="#6366f1" />
        <KPICard title="Active Units" value={stats.active} icon={Clock} accent="#f59e0b" />
        <KPICard title="Completed" value={stats.completed} icon={CheckCircle2} accent="#10b981" />
        <KPICard title="Critical Alerts" value={stats.critical} icon={AlertCircle} accent="#ef4444" />
      </div>

      {/* 3. TASK CONTROLS */}
      <section className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 bg-white/40 backdrop-blur-xl p-3 md:p-4 rounded-[24px] md:rounded-[32px] border border-white shadow-xl shadow-slate-900/5">
         <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
            {['all', 'todo', 'in progress', 'review', 'completed'].map((f) => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  filter === f ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 hover:bg-white'
                }`}
              >
                {f}
              </button>
            ))}
         </div>

         <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
               <input 
                 type="text" 
                 placeholder="Search mission..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full h-11 md:h-12 pl-10 pr-4 bg-white border border-slate-100 rounded-xl md:rounded-2xl text-[12px] font-bold focus:outline-none focus:border-indigo-500 transition-all"
               />
            </div>
            <div className="flex bg-white/60 p-1 rounded-xl border border-slate-100 shadow-sm shrink-0">
               <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><LayoutGrid size={16} /></button>
               <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><List size={16} /></button>
            </div>
         </div>
      </section>

      {/* 4. MISSION GRID */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 glass-card border-dashed">
           <Zap size={64} className="text-slate-200 mb-6" />
           <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">No Active Missions</h3>
           <p className="text-slate-400 text-xs mt-2 uppercase font-bold tracking-widest">Global dispatch queue is currently clear.</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col gap-4"}>
           {filteredTasks.map((task) => (
             <TaskItem key={task.id || task._id} task={task} onDelete={deleteTask} viewMode={viewMode} />
           ))}
        </div>
      )}

      {/* 5. ASSIGN MISSION MODAL */}
      <AnimatePresence>
        {showAssign && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAssign(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-lg glass-card !p-6 md:!p-10 shadow-2xl z-10 max-h-[90vh] overflow-y-auto no-scrollbar border-white rounded-[32px] md:rounded-[40px]"
             >
                <div className="flex justify-between items-center mb-6 md:mb-8">
                   <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Dispatch Mission</h2>
                   <button onClick={() => setShowAssign(false)} className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all flex items-center justify-center"><X size={20} /></button>
                </div>

                <form onSubmit={handleAssign} className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Label</label>
                      <input 
                        required 
                        placeholder="e.g. Optimize Cloud Pipeline" 
                        value={taskData.title}
                        onChange={(e) => setTaskData({...taskData, title: e.target.value})}
                        className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-[14px] font-bold focus:outline-none focus:border-indigo-600 transition-all" 
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specialist</label>
                        <select 
                          required 
                          value={taskData.assignedTo}
                          onChange={(e) => setTaskData({...taskData, assignedTo: e.target.value})}
                          className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold focus:outline-none focus:border-indigo-600 appearance-none"
                        >
                           <option value="">Select Talent</option>
                           {team.filter(m => m.role !== 'Admin').map(m => (
                             <option key={m.id || m._id} value={m.id || m._id}>{m.name}</option>
                           ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Command Hub</label>
                        <select 
                          required 
                          value={taskData.projectId}
                          onChange={(e) => setTaskData({...taskData, projectId: e.target.value})}
                          className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold focus:outline-none focus:border-indigo-600 appearance-none"
                        >
                           <option value="">Select Project</option>
                           {projects.map(p => (
                             <option key={p.id || p._id} value={p.id || p._id}>{p.title}</option>
                           ))}
                        </select>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deadline Protocol</label>
                        <input 
                          type="date" 
                          required 
                          value={taskData.deadline}
                          onChange={(e) => setTaskData({...taskData, deadline: e.target.value})}
                          className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold focus:outline-none focus:border-indigo-600" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority Strategy</label>
                        <div className="flex bg-slate-100 p-1 rounded-2xl">
                           {['Low', 'Medium', 'High'].map(p => (
                             <button 
                               key={p}
                               type="button"
                               onClick={() => setTaskData({...taskData, priority: p})}
                               className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                                 taskData.priority === p ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'
                               }`}
                             >
                               {p}
                             </button>
                           ))}
                        </div>
                      </div>
                   </div>

                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Briefing</label>
                      <textarea 
                        required 
                        placeholder="Detail the technical parameters..." 
                        value={taskData.description}
                        onChange={(e) => setTaskData({...taskData, description: e.target.value})}
                        className="w-full h-32 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold focus:outline-none focus:border-indigo-600 resize-none"
                      />
                   </div>

                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Encryption Assets</label>
                      <div className="relative group/file">
                         <input 
                           type="file" 
                           multiple 
                           onChange={(e) => setTaskData({...taskData, attachments: Array.from(e.target.files)})}
                           className="absolute inset-0 opacity-0 cursor-pointer z-10"
                         />
                         <div className="w-full h-16 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-400 group-hover/file:border-indigo-600 group-hover/file:text-indigo-600 transition-all bg-slate-50">
                            <Paperclip size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                               {taskData.attachments.length > 0 ? `${taskData.attachments.length} Assets Loaded` : 'Attach Documents'}
                            </span>
                         </div>
                      </div>
                   </div>

                   <button 
                     type="submit" 
                     disabled={submitting}
                     className="w-full h-16 bg-slate-950 text-white rounded-[24px] font-black uppercase tracking-[0.3em] text-[11px] hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-900/20 mt-4 flex items-center justify-center gap-3"
                   >
                      {submitting ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />} 
                      AUTHORIZE DISPATCH
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── KPI Node ── */
const KPICard = ({ title, value, icon: Icon, accent }) => (
  <div className="glass-card !p-4 md:!p-6 flex items-center gap-4 md:gap-6 group hover:scale-[1.02] transition-all border-white shadow-xl shadow-slate-900/5">
     <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6" style={{ backgroundColor: `${accent}15`, color: accent }}>
        <Icon size={28} strokeWidth={2.5} />
     </div>
     <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-950 leading-none">{value}</h3>
     </div>
  </div>
);

/* ── Task Item ── */
const TaskItem = ({ task, onDelete, viewMode }) => {
  const isCompleted = task.status === 'Completed';
  
  if (viewMode === 'list') {
    return (
      <div className="glass-card !p-4 flex items-center gap-6 group hover:bg-indigo-50/50 transition-all border-white shadow-sm">
         <div className={`w-2 h-10 rounded-full ${
           task.priority === 'High' ? 'bg-rose-500' : task.priority === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'
         }`} />
         
         <div className="flex-1 min-w-0">
            <h4 className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">{task.title}</h4>
            <div className="flex items-center gap-4 mt-1">
               <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{task.project?.title}</span>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignee: {task.assignedUser?.name}</span>
            </div>
         </div>

         <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
               <Calendar size={14} className="text-slate-300" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
               </span>
            </div>
            <StatusBadge status={task.status} />
            <button onClick={() => onDelete(task.id || task._id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
         </div>
      </div>
    );
  }

  return (
    <motion.div 
      layout
      className="glass-card flex flex-col group border-white shadow-xl shadow-slate-900/5 relative overflow-hidden h-full"
    >
       <div className={`absolute top-0 left-0 w-full h-1.5 ${
         task.priority === 'High' ? 'bg-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 
         task.priority === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'
       }`} />

       <div className="flex justify-between items-start mb-6 pt-2">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Briefcase size={16} />
             </div>
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{task.project?.title}</span>
          </div>
          <button onClick={() => onDelete(task.id || task._id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
       </div>

       <h4 className="text-lg font-black text-slate-900 leading-tight mb-6 tracking-tight uppercase group-hover:text-indigo-600 transition-colors min-h-[56px] line-clamp-2">
          {task.title}
       </h4>

       <div className="space-y-6 mt-auto">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-white shadow-lg shrink-0">
                 <img 
                   src={task.assignedUser?.avatar ? (task.assignedUser.avatar.startsWith('http') || task.assignedUser.avatar.startsWith('data:') ? task.assignedUser.avatar : `${API_URL.replace('/api', '')}${task.assignedUser.avatar}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignedUser?.name}`} 
                   alt="" 
                   className="w-full h-full object-cover"
                 />
                </div>
                <div className="flex flex-col min-w-0">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Specialist</span>
                   <span className="text-[11px] font-black text-slate-900 truncate">{task.assignedUser?.name}</span>
                </div>
             </div>
             <StatusBadge status={task.status} />
          </div>

          <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-slate-400">
                   <Paperclip size={14} />
                   <span className="text-[10px] font-bold">{task.files?.length || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                   <MessageSquare size={14} />
                   <span className="text-[10px] font-bold">{task.comments?.length || 0}</span>
                </div>
             </div>
             <div className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl">
                <Calendar size={14} className="opacity-70" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                   {new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </span>
             </div>
          </div>
       </div>
    </motion.div>
  );
};

const StatusBadge = ({ status }) => {
  const isDone = status === 'Completed';
  return (
    <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
      status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
      status === 'In Progress' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
      status === 'Review' ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' :
      'bg-slate-100 text-slate-400 border-slate-200'
    }`}>
       <div className={`w-1.5 h-1.5 rounded-full ${
         status === 'Completed' ? 'bg-emerald-500' :
         status === 'In Progress' ? 'bg-amber-500' :
         status === 'Review' ? 'bg-indigo-600' :
         'bg-slate-300'
       }`} />
       <span className="text-[9px] font-black uppercase tracking-widest">{status || 'Assigned'}</span>
    </div>
  );
};

export default AdminTasks;
