import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Zap,
  X,
  UserPlus,
  AlertTriangle,
  UserX,
  CheckCircle2,
  Loader2,
  RefreshCw,
  TrendingUp,
  Filter,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import API_URL from '../config';
import SpecialistDossier from '../components/HR/SpecialistDossier';

const MemberCard = ({ member, index, onRemove, onAssign, onViewDossier }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="glass-card group flex flex-col h-full !p-0 overflow-hidden border-slate-100/50"
  >
    {/* Status Indicator */}
    <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-2.5 py-1 bg-white/80 backdrop-blur-md rounded-full border border-slate-100 shadow-sm">
      <div className={`w-1.5 h-1.5 rounded-full ${member.performance?.rating >= 4.5 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">Active Unit</span>
    </div>

    {/* Header Section with Profile */}
    <div className="p-8 pb-6 flex flex-col items-center text-center space-y-4">
      <div className="relative group/avatar">
         <div className="w-24 h-24 rounded-[32px] bg-gradient-to-tr from-indigo-500 to-purple-500 p-[3px] shadow-2xl shadow-indigo-500/20 transition-all duration-500 group-hover/avatar:scale-105 group-hover/avatar:rotate-3">
            <div className="w-full h-full rounded-[29px] bg-white overflow-hidden p-1">
               <img 
                 src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} 
                 alt={member.name} 
                 className="w-full h-full object-cover rounded-[25px]"
                 onError={(e) => { e.target.onerror = null; e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`; }}
               />
            </div>
         </div>
         <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xl border-2 border-white group-hover/avatar:scale-110 transition-transform">
            <Zap size={14} className="fill-current" />
         </div>
      </div>
      
      <div>
        <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none">{member.name}</h3>
        <p className="text-[11px] font-bold text-indigo-500 mt-2 uppercase tracking-[0.2em]">{member.role}</p>
      </div>
    </div>
    
    {/* Stats Grid */}
    <div className="px-8 py-6 bg-slate-50/50 border-y border-slate-100 grid grid-cols-2 gap-4">
       <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-slate-900">{member.performance?.onTimeRate || 0}%</span>
            <TrendingUp size={14} className="text-emerald-500" />
          </div>
       </div>
       <div className="space-y-1 border-l border-slate-100 pl-4">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Missions</p>
          <span className="text-lg font-black text-slate-900">{member.performance?.tasksCompleted || 0}</span>
       </div>
    </div>

    {/* Performance Bar */}
    <div className="px-8 pt-6 pb-2">
       <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grid Performance</span>
          <span className="text-[10px] font-black text-indigo-600">{member.performance?.onTimeRate || 0}%</span>
       </div>
       <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${member.performance?.onTimeRate || 0}%` }}
             className="h-full bg-indigo-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.3)]"
          />
       </div>
    </div>

    {/* Actions */}
    <div className="p-8 pt-6 flex flex-col gap-3 mt-auto">
       <button 
         onClick={() => onAssign(member)}
         className="w-full py-4 bg-slate-900 text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 hover:bg-indigo-600 hover:shadow-indigo-600/20 transition-all flex items-center justify-center gap-3 group"
       >
         <Plus size={16} className="group-hover:rotate-90 transition-transform" /> Assign Mission
       </button>
       <div className="grid grid-cols-5 gap-2">
          <button 
            onClick={() => onViewDossier(member)}
            className="col-span-4 py-3.5 bg-white border border-slate-100 rounded-[20px] text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
          >
            Access Dossier
          </button>
          <button 
            onClick={() => onRemove(member.id || member._id, member.name)}
            className="col-span-1 flex items-center justify-center bg-rose-50 text-rose-500 rounded-[20px] hover:bg-rose-500 hover:text-white transition-all border border-rose-100"
          >
            <UserX size={18} />
          </button>
       </div>
    </div>
  </motion.div>
);

const Team = () => {
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState('');
  const [inviteData, setInviteData] = useState({ name: '', email: '', role: 'Developer' });
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);
  
  const [removeModal, setRemoveModal] = useState({ show: false, id: null, name: '' });
  const [assignModal, setAssignModal] = useState({ show: false, member: null });
  const [viewingDossier, setViewingDossier] = useState(null);
  const [taskData, setTaskData] = useState({ title: '', description: '', projectId: '', deadline: '', priority: 'Medium', files: [] });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamRes, projectsRes] = await Promise.all([
        fetch(`${API_URL}/team?t=${Date.now()}`),
        fetch(`${API_URL}/projects?t=${Date.now()}`)
      ]);
      
      if (teamRes.ok) {
        const data = await teamRes.json();
        const unique = (data || []).reduce((acc, curr) => {
          const email = curr.email?.toLowerCase();
          if (email && !acc.find(item => item.email?.toLowerCase() === email)) {
            acc.push({ ...curr, email });
          } else if (!email && !acc.find(item => (item.id === curr.id || item._id === curr._id))) {
            acc.push(curr);
          }
          return acc;
        }, []);
        setMembers(unique);
      }

      if (projectsRes.ok) {
        const pData = await projectsRes.json();
        setProjects(pData || []);
      }
    } catch (err) {
      setError('Connection disrupted. Unable to synchronize roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/team/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData)
      });
      if (response.ok) {
        showNotification('Team invitation dispatched successfully.');
        fetchData();
        setShowInvite(false);
        setInviteData({ name: '', email: '', role: 'Developer' });
      } else {
        const data = await response.json();
        showNotification(data.message || 'Error inviting member', true);
      }
    } catch (err) {
      showNotification('Server connection failed.', true);
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(taskData).forEach(key => {
      if (key !== 'files') {
        formData.append(key, taskData[key]);
      }
    });
    formData.append('assignedTo', assignModal.member._id || assignModal.member.id);
    
    if (taskData.files && taskData.files.length > 0) {
      taskData.files.forEach(file => {
        formData.append('attachments', file);
      });
    }

    try {
      const response = await axios.post(`${API_URL}/tasks`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.status === 200 || response.status === 201) {
        setAssignModal({ show: false, member: null });
        setTaskData({ title: '', description: '', projectId: '', deadline: '', priority: 'Medium', files: [] });
        showNotification(`Mission assigned to ${assignModal.member.name}`);
      } else {
        showNotification('Error assigning mission', true);
      }
    } catch (err) {
      showNotification('Server connection failed.', true);
    }
  };

  const confirmRemove = async () => {
    const { id } = removeModal;
    try {
      const response = await fetch(`${API_URL}/team/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setMembers(prev => prev.filter(m => (m.id !== id && m._id !== id)));
        showNotification('Specialist removed from roster.');
      } else {
        showNotification('Error removing specialist', true);
      }
    } catch (err) {
      showNotification('Server connection failed.', true);
    } finally {
      setRemoveModal({ show: false, id: null, name: '' });
    }
  };

  const showNotification = (msg, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Loading Personnel...</p>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 pb-24 md:pb-12 px-1 md:px-0 animate-in fade-in duration-1000">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 p-8 md:p-10 rounded-[48px] border border-slate-100 backdrop-blur-md shadow-xl shadow-slate-900/5">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-slate-900 rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-slate-900/20">
              <Users size={32} strokeWidth={2.5} />
           </div>
           <div>
              <h1 className="text-[32px] font-black text-slate-900 tracking-tighter leading-none mb-1">TEAM ROSTER</h1>
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-60">{members.length} ACTIVE SPECIALISTS DEPLOYED</p>
           </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
            <input 
              placeholder="Search roster..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-80 pl-14 pr-6 h-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 text-sm font-bold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => setShowInvite(true)}
            className="h-14 px-8 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-600/30 flex items-center gap-3 group shrink-0"
          >
            <UserPlus size={18} className="group-hover:scale-110 transition-transform" /> 
            <span>Invite Specialist</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl flex items-center gap-4 text-rose-500 text-xs font-bold">
           <AlertTriangle size={18} /> {error}
        </div>
      )}

      {filteredMembers.length === 0 ? (
        <div className="text-center py-24 glass rounded-[40px] border border-gray-100">
           <Users size={64} className="text-white/10 mx-auto mb-6" />
           <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest">No Specialists Found</h3>
           <p className="text-gray-400 text-xs mt-2">Adjust your filters or invite new talent.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredMembers.map((member, i) => (
            <MemberCard 
              key={member.id || member._id || member.email || i} 
              member={member} 
              index={i} 
              onRemove={(id, name) => setRemoveModal({ show: true, id, name })} 
              onAssign={(m) => {
                fetchData();
                setAssignModal({ show: true, member: m });
              }}
              onViewDossier={(m) => setViewingDossier(m)}
            />
          ))}
        </div>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {showInvite && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowInvite(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-card !p-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar border-white"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-[28px] font-black text-slate-900 tracking-tighter uppercase">Deploy Talent</h2>
                <button onClick={() => setShowInvite(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all"><X size={20} /></button>
              </div>

              <form onSubmit={handleInvite} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Identity Label</label>
                   <input required value={inviteData.name} onChange={(e) => setInviteData({...inviteData, name: e.target.value})}
                     className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all" placeholder="Sarah Miller" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Secure Email</label>
                   <input required type="email" value={inviteData.email} onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                     className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all" placeholder="sarah@nexovtech.com" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Specialization Grid</label>
                   <select value={inviteData.role} onChange={(e) => setInviteData({...inviteData, role: e.target.value})}
                     className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 text-sm font-bold focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer">
                       <option className="bg-white">Developer</option>
                       <option className="bg-white">Video Editor</option>
                       <option className="bg-white">AI Specialist</option>
                       <option className="bg-white">Security Analyst</option>
                   </select>
                </div>
                <button type="submit" className="w-full h-16 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-[0.3em] text-[11px] hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-900/20 mt-4">Dispatch Activation</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Task Modal */}
      <AnimatePresence>
        {assignModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAssignModal({ show: false, member: null })} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl glass-card !p-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar border-white"
            >
              <div className="flex justify-between items-center mb-10">
                <div>
                   <h2 className="text-[28px] font-black text-slate-900 tracking-tighter uppercase">Assign Mission</h2>
                   <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest mt-2">Deploying to: {assignModal.member?.name}</p>
                </div>
                <button onClick={() => setAssignModal({ show: false, member: null })} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all"><X size={20} /></button>
              </div>

              <form onSubmit={handleAssignTask} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mission Title</label>
                   <input required value={taskData.title} onChange={(e) => setTaskData({...taskData, title: e.target.value})}
                     className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all" placeholder="e.g. Database Optimization" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Project Command</label>
                      <select required value={taskData.projectId} onChange={(e) => setTaskData({...taskData, projectId: e.target.value})}
                        className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 text-sm font-bold focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer">
                          <option value="" className="bg-white">Select Hub</option>
                          {projects.map(p => (
                            <option key={p.id || p._id} value={p.id || p._id} className="bg-white">{p.title}</option>
                          ))}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mission Deadline</label>
                      <input type="date" required value={taskData.deadline} onChange={(e) => setTaskData({...taskData, deadline: e.target.value})}
                        className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all" />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Priority Protocol</label>
                   <div className="grid grid-cols-3 gap-3">
                      {['Low', 'Medium', 'High'].map(p => (
                         <button key={p} type="button" onClick={() => setTaskData({...taskData, priority: p})}
                           className={`h-12 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                              taskData.priority === p 
                              ? 'bg-slate-900 text-white border-slate-900' 
                              : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                           }`}>{p}</button>
                      ))}
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tactical Briefing</label>
                   <textarea required value={taskData.description} onChange={(e) => setTaskData({...taskData, description: e.target.value})}
                     className="w-full h-32 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 text-sm font-bold focus:outline-none focus:border-indigo-500 custom-scrollbar resize-none" placeholder="Detailed tactical instructions..." />
                </div>
                
                <button type="submit" className="w-full h-16 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-[0.3em] text-[11px] hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-900/20 mt-4">Authorize Assignment</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Remove Confirmation Modal */}
      <AnimatePresence>
        {removeModal.show && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setRemoveModal({ show: false, id: null, name: '' })} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-white rounded-[40px] p-10 text-center shadow-2xl border border-rose-100">
                <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-8 shadow-inner">
                   <AlertTriangle size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Retire Specialist?</h3>
                <p className="text-slate-400 text-xs mt-4 font-bold leading-relaxed uppercase tracking-widest">Confirm removal of <span className="text-rose-600">{removeModal.name}</span> from active roster.</p>
                <div className="flex gap-3 mt-10">
                   <button onClick={() => setRemoveModal({ show: false, id: null, name: '' })} className="flex-1 h-14 rounded-2xl bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Abort</button>
                   <button onClick={confirmRemove} className="flex-1 h-14 rounded-2xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-600/20">Confirm</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingDossier && (
          <SpecialistDossier 
            member={viewingDossier} 
            onClose={() => setViewingDossier(null)} 
          />
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 glass border ${notification.isError ? 'border-rose-500/50' : 'border-brand-500/30'} px-6 md:px-8 py-3 md:py-4 rounded-2xl shadow-2xl text-gray-900 text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-3 z-[120] animate-bounce`}>
           {notification.isError ? <AlertTriangle className="text-rose-500" size={16} /> : <CheckCircle2 className="text-emerald-500" size={16} />} 
           {notification.msg}
        </div>
      )}
    </div>
  );
};

export default Team;


