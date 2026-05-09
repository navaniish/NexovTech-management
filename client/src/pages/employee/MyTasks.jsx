import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, AlertCircle, Search, Filter, Upload, MessageSquare, Send, X, Loader2, FileText, Download, AlertTriangle, Trash2 } from 'lucide-react';
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

  const fetchTasks = async () => {
    const userId = user?.id || user?._id || user?.firebaseUid;
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/tasks/my?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to synchronize task queue');
      const data = await response.json();
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
        headers: { 'Content-Type': 'application/json' }, 
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
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ text: commentText, userId: user._id }) 
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
      const response = await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
      if (response.ok) {
        setTasks(prev => prev.filter(t => (t.id !== taskId && t._id !== taskId)));
      }
    } catch (err) {
      console.error('Task termination failed');
    }
  };

  const filtered = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
  const statusIcon = (s) => s === 'Completed' ? <CheckCircle2 size={18} className="text-emerald-400" /> : s === 'In Progress' ? <Clock size={18} className="text-blue-400" /> : <AlertCircle size={18} className="text-amber-400" />;
  const statusBg = (s) => s === 'Completed' ? 'rgba(16,185,129,0.12)' : s === 'In Progress' ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)';

  const formatDate = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); } catch { return 'N/A'; } };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-surface-500 font-black uppercase tracking-widest text-xs">Accessing Assignment Vault...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20 glass rounded-[40px] border border-rose-500/20">
       <AlertTriangle size={64} className="text-rose-500 mx-auto mb-6" />
       <h3 className="text-2xl font-black text-white">Task Sync Failed</h3>
       <p className="text-surface-500 mt-2">{error}</p>
       <button onClick={fetchTasks} className="mt-8 px-8 py-3 bg-brand-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all">Retry Link</button>
    </div>
  );

  return (
    <div className="space-y-8 pb-12 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>My Tasks</h1>
        <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>Manage your assignments, update status, and submit work.</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 theme-text-secondary group-focus-within:text-brand-400 transition-colors" size={18} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search missions..."
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm font-medium"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
           <div className="text-center py-20 glass rounded-[40px] border border-white/5">
              <CheckCircle2 size={64} className="text-surface-800 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-white">All Clear</h3>
              <p className="text-surface-500 mt-2">No active missions assigned to your account.</p>
           </div>
        ) : filtered.map((task) => (
          <motion.div key={task.id || task._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="theme-card rounded-2xl p-5 group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl mt-0.5" style={{ background: statusBg(task.status) }}>
                  {(updating === task.id || updating === task._id) ? <Loader2 size={18} className="text-brand-500 animate-spin" /> : statusIcon(task.status)}
                </div>
                <div>
                  <h3 className="font-black text-base" style={{ color: 'var(--text-primary)' }}>{task.title}</h3>
                  <p className="text-[11px] font-bold theme-text-secondary mt-0.5">{task.projectId?.title || 'Standalone Task'} • Due {formatDate(task.deadline)}</p>
                  {task.description && <p className="text-xs theme-text-muted mt-1">{task.description}</p>}
                  
                  {task.files && task.files.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {task.files.map((file, idx) => {
                        const filename = file.filename || file.url?.split('/').pop();
                        const downloadUrl = `${API_URL}/tasks/download/${filename}`;
                        return (
                          <a 
                            key={idx} 
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-lg group/file cursor-pointer hover:bg-brand-500/20 transition-all no-underline"
                          >
                             <FileText size={12} className="text-brand-400" />
                             <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">{file.name}</span>
                             <Download size={12} className="text-brand-400 opacity-0 group-hover/file:opacity-100 transition-opacity" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase"
                  style={{ background: task.priority === 'High' ? 'rgba(239,68,68,0.12)' : task.priority === 'Medium' ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.12)', color: task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#64748b' }}>
                  {task.priority}
                </span>

                <select value={task.status} onChange={e => handleStatusChange(task.id || task._id, e.target.value)}
                  disabled={updating === task.id || updating === task._id}
                  className="text-xs font-black px-3 py-2 rounded-xl outline-none cursor-pointer disabled:opacity-50"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>

                <button onClick={() => setCommentModal(task.id || task._id)}
                  className="p-2 rounded-xl transition-colors relative"
                  style={{ background: 'var(--card-hover-bg)', color: 'var(--text-secondary)' }}>
                  <MessageSquare size={16} />
                  {task.comments?.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">{task.comments.length}</span>
                  )}
                </button>

                <button onClick={() => handleDeleteTask(task.id || task._id)}
                  className="p-2 rounded-xl transition-colors text-surface-600 hover:text-rose-500"
                  style={{ background: 'var(--card-hover-bg)' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {commentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCommentModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg rounded-[28px] p-6 shadow-2xl z-10" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black" style={{ color: 'var(--text-primary)' }}>Mission Comms</h3>
                <button onClick={() => setCommentModal(null)} style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto mb-4 custom-scrollbar">
                {(tasks.find(t => (t.id === commentModal || t._id === commentModal))?.comments || []).map((c, i) => (
                  <div key={i} className="px-4 py-3 rounded-xl" style={{ background: 'var(--bg-card)' }}>
                    <p className="text-xs font-black text-brand-400">{c.user || 'Collaborator'}</p>
                    <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{c.text}</p>
                  </div>
                ))}
                {(tasks.find(t => (t.id === commentModal || t._id === commentModal))?.comments || []).length === 0 && (
                  <p className="text-xs text-center py-4 theme-text-muted">No transmission logs found.</p>
                )}
              </div>
              <div className="flex gap-2">
                <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Enter transmission..."
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                  className="flex-1 px-4 py-3 rounded-xl outline-none text-sm font-medium"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                <button onClick={handleAddComment} className="px-4 py-3 bg-brand-600 text-white rounded-xl font-black text-sm hover:bg-brand-700 transition-all">
                  <Send size={16} />
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
