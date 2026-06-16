import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Clock, AlertCircle, Search, Filter, Upload, 
  MessageSquare, Send, X, Loader2, FileText, Download, 
  AlertTriangle, Trash2, Target, Zap, ShieldCheck, Cpu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';

const MyTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [commentModal, setCommentModal] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [updating, setUpdating] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  const fetchTasks = async () => {
    // Priority: id (DocID) > _id > firebaseUid
    const userId = user?.id || user?._id || user?.firebaseUid;
    if (!userId) {
      console.warn('⚠️ MISSION_SYNC: No valid Specialist ID found in session.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`📋 MISSION_SYNC: Requesting task registry for specialist [${userId}]...`);
      const response = await fetch(`${API_URL}/tasks/my?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nexov_token') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Mission Control Link Severed');
      const data = await response.json();
      console.log(`✅ MISSION_SYNC: ${data.length} assignments synchronized.`);
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const handleStatusChange = async (taskId, newStatus) => {
    setUpdating(taskId);
    try { 
      const response = await fetch(`${API_URL}/tasks/${taskId}/status`, { 
        method: 'PUT', 
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('nexov_token') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json' 
        }, 
        body: JSON.stringify({ status: newStatus }) 
      }); 
      if (response.ok) {
        setTasks(prev => prev.map(t => (t.id === taskId || t._id === taskId) ? { ...t, status: newStatus } : t));
      }
    } catch (err) {
      console.error('Status sync failed');
    } finally {
      setUpdating(null);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !commentModal) return;
    try { 
      const response = await fetch(`${API_URL}/tasks/${commentModal}/comment`, { 
        method: 'POST', 
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('nexov_token') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json' 
        }, 
        body: JSON.stringify({ text: commentText, userId: user._id || user.id }) 
      }); 
      if (response.ok) {
        setTasks(prev => prev.map(t => t._id === commentModal ? { ...t, comments: [...(t.comments || []), { text: commentText, user: user.name, createdAt: new Date().toISOString() }] } : t));
        setCommentText('');
        setCommentModal(null);
      }
    } catch (err) {
      console.error('Comment dispatch failed');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to terminate this mission?')) return;
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nexov_token') || localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        setTasks(prev => prev.filter(t => (t.id !== taskId && t._id !== taskId)));
      }
    } catch (err) {
      console.error('Task termination failed');
    }
  };

  const filtered = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'All' || t.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const formatDate = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); } catch { return 'N/A'; } };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Accessing Assignment Vault...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20 glass-card rounded-[40px] border border-rose-500/20 max-w-2xl mx-auto mt-10">
       <AlertTriangle size={64} className="text-rose-500 mx-auto mb-6" />
       <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Task Sync Failed</h3>
       <p className="text-slate-500 mt-2 text-sm font-medium">{error}</p>
       <button onClick={fetchTasks} className="mt-8 px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl">Retry Link</button>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      
      {/* 1. PREMIUM HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-2">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-2xl">
                 <Target size={20} className="md:hidden" />
                 <Target size={24} className="hidden md:block" />
              </div>
              <div>
                 <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">Mission Registry</h1>
                 <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Specialist Assignment Management</p>
              </div>
           </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
           {['All', 'Pending', 'In Progress', 'Completed'].map((tab) => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                 activeTab === tab ? 'bg-slate-900 text-white shadow-xl' : 'bg-white/50 text-slate-400 hover:bg-white hover:text-slate-600'
               }`}
             >
               {tab}
             </button>
           ))}
        </div>
      </div>

      {/* 2. SEARCH BAR */}
      <div className="px-4">
        <div className="relative group max-w-2xl">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
           <input 
             type="text" 
             value={search} 
             onChange={e => setSearch(e.target.value)} 
             placeholder="Filter missions by title or objective..."
             className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/50 border border-slate-100 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all text-sm font-medium text-slate-900 placeholder:text-slate-300 shadow-sm"
           />
        </div>
      </div>

      {/* 3. TASK GRID/LIST */}
      <div className="space-y-4 px-4">
        {filtered.length === 0 ? (
           <div className="text-center py-24 glass-card rounded-[48px] border border-slate-100 flex flex-col items-center justify-center gap-6">
              <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200">
                 <ShieldCheck size={56} />
              </div>
              <div className="space-y-1">
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Sector Cleared</h3>
                 <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em]">No active missions detected in the current queue</p>
              </div>
              <button onClick={fetchTasks} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl">Refresh Grid</button>
           </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((task) => {
              const isExpanded = expandedTaskId === (task.id || task._id);
              return (
                <motion.div 
                  key={task.id || task._id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setExpandedTaskId(isExpanded ? null : (task.id || task._id));
                    }
                  }}
                  className="glass-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 border-slate-100 hover:border-brand-500/30 hover:shadow-2xl transition-all group cursor-pointer md:cursor-default"
                >
                  <div className="flex items-start gap-4 md:gap-8 flex-1 w-full min-w-0">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shrink-0 transition-transform group-hover:scale-110 ${
                      task.status === 'Completed' ? 'bg-emerald-50 text-emerald-500' : 
                      task.status === 'In Progress' ? 'bg-brand-50 text-brand-600' : 'bg-amber-50 text-amber-500'
                    }`}>
                      {updating === (task.id || task._id) ? <Loader2 size={20} className="animate-spin" /> : 
                       task.status === 'Completed' ? <CheckCircle2 size={20} /> : 
                       task.status === 'In Progress' ? <Zap size={20} /> : <Clock size={20} />}
                    </div>
                    
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center justify-between w-full">
                         <div className="flex items-center gap-3 min-w-0">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight group-hover:text-brand-600 transition-colors leading-none truncate">{task.title}</h3>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase shrink-0 ${
                              task.priority === 'High' ? 'bg-rose-50 text-rose-500 border border-rose-100' : 
                              task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
                            }`}>{task.priority}</span>
                         </div>
                         {/* Mobile Expand Chevron Toggle */}
                         <button
                           type="button"
                           onClick={(e) => {
                             e.stopPropagation();
                             setExpandedTaskId(isExpanded ? null : (task.id || task._id));
                           }}
                           className="md:hidden p-1.5 hover:bg-slate-100 rounded-xl transition-all text-slate-400 shrink-0"
                         >
                           <ChevronRight 
                             size={18} 
                             className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-90 text-brand-600' : ''}`} 
                           />
                         </button>
                      </div>
                      
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
                         <span className="text-brand-500">{task.projectId?.title || 'Nexus Direct'}</span>
                         <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                         <span>Deadline: {formatDate(task.deadline)}</span>
                      </p>
                      
                      {task.description && (
                        <p className={`text-[12px] font-medium text-slate-500 leading-relaxed max-w-2xl transition-all ${
                          isExpanded ? 'line-clamp-none mt-2' : 'line-clamp-2 max-md:hidden'
                        }`}>
                          {task.description}
                        </p>
                      )}
                      
                      {task.files && task.files.length > 0 && (
                        <div className={`flex flex-wrap gap-2 mt-4 transition-all ${isExpanded ? 'flex' : 'max-md:hidden'}`} onClick={e => e.stopPropagation()}>
                          {task.files.map((file, idx) => (
                            <a 
                              key={idx} 
                              href={`${API_URL}/tasks/download/${file.filename}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-brand-500/20 transition-all no-underline group/file"
                            >
                               <FileText size={12} className="text-slate-400" />
                               <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{file.name}</span>
                               <Download size={12} className="text-slate-300 opacity-0 group-hover/file:opacity-100 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div 
                    onClick={e => e.stopPropagation()}
                    className={`flex items-center gap-4 w-full md:w-auto pt-6 md:pt-0 border-t md:border-0 border-slate-50 transition-all ${
                      isExpanded ? 'flex mt-4' : 'max-md:hidden'
                    }`}
                  >
                    <select 
                      value={task.status} 
                      onChange={e => handleStatusChange(task.id || task._id, e.target.value)}
                      disabled={updating === (task.id || task._id)}
                      className="flex-1 md:flex-none text-[10px] md:text-[11px] font-black px-4 py-3 rounded-xl md:rounded-2xl bg-slate-900 text-white outline-none cursor-pointer hover:bg-brand-600 transition-all disabled:opacity-50 appearance-none min-w-[120px] md:min-w-[140px] text-center"
                    >
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setCommentModal(task.id || task._id)}
                        className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-brand-600 hover:border-brand-500/20 hover:shadow-xl transition-all relative"
                      >
                        <MessageSquare size={20} />
                        {task.comments?.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">{task.comments.length}</span>
                        )}
                      </button>

                      <button 
                        onClick={() => handleDeleteTask(task.id || task._id)}
                        className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:border-rose-100 hover:shadow-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMMENT MODAL */}
      <AnimatePresence>
        {commentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setCommentModal(null)} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-2xl z-10 bg-white border border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-600/20">
                      <MessageSquare size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Mission Comms</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Uplink Secured • Real-time Sync</p>
                   </div>
                </div>
                <button onClick={() => setCommentModal(null)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"><X size={20} /></button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto mb-8 custom-scrollbar px-2">
                {(tasks.find(t => (t.id === commentModal || t._id === commentModal))?.comments || []).map((c, i) => (
                  <div key={i} className={`p-5 rounded-[24px] ${c.user === user.name ? 'bg-brand-50/50 border border-brand-100 ml-8' : 'bg-slate-50 border border-slate-100 mr-8'}`}>
                    <div className="flex items-center justify-between mb-1">
                       <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">{c.user || 'Collaborator'}</p>
                       <p className="text-[8px] font-bold text-slate-400">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <p className="text-[13px] font-medium text-slate-700 leading-relaxed">{c.text}</p>
                  </div>
                ))}
                {(tasks.find(t => (t.id === commentModal || t._id === commentModal))?.comments || []).length === 0 && (
                  <div className="text-center py-10 opacity-30">
                     <Cpu size={48} className="mx-auto mb-4" />
                     <p className="text-[10px] font-black uppercase tracking-[0.2em]">Awaiting signal input</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 bg-slate-50 p-3 rounded-[28px] border border-slate-100">
                <input 
                  type="text" 
                  value={commentText} 
                  onChange={e => setCommentText(e.target.value)} 
                  placeholder="Type transmission details..."
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                  className="flex-1 bg-transparent px-5 py-3 outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400" 
                />
                <button onClick={handleAddComment} className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-brand-600 transition-all shadow-xl">
                  <Send size={20} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyTasks;
