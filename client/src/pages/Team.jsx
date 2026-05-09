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
    className="glass-light p-4 md:p-8 rounded-[32px] md:rounded-[40px] border border-white/5 relative overflow-hidden group"
  >
    <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2 px-2 py-0.5 md:px-3 md:py-1 bg-white/5 rounded-full border border-white/10">
      <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${member.performance?.rating >= 4.5 ? 'bg-emerald-500 animate-pulse' : 'bg-surface-600'}`}></div>
      <span className="text-[8px] md:text-[10px] font-black text-surface-400 uppercase tracking-widest">Active</span>
    </div>

    <div className="flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-0">
      <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[32px] bg-gradient-to-tr from-brand-600 to-neon-blue p-[2px] md:p-[3px] shadow-xl md:shadow-2xl shadow-brand-600/20 group-hover:rotate-3 transition-transform duration-500 relative shrink-0">
         <div className="w-full h-full rounded-xl md:rounded-[29px] bg-[#020617] overflow-hidden">
            <img 
              src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} 
              alt={member.name} 
              className="w-full h-full object-cover"
              onError={(e) => { e.target.onerror = null; e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`; }}
            />
         </div>
      </div>
      
      <div className="flex-1 md:w-full">
        <h3 className="text-base md:text-xl font-black theme-text-primary tracking-tight leading-none md:mt-4">{member.name}</h3>
        <p className="text-[10px] md:text-sm font-bold text-brand-500 mt-1 uppercase tracking-wider">{member.role}</p>
      </div>
    </div>
    
    {/* Performance Stats */}
    <div className="grid grid-cols-2 gap-3 md:gap-4 w-full mt-6 md:mt-10 pt-4 md:pt-8 border-t border-white/5">
       <div className="flex flex-col">
          <p className="text-[8px] md:text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Efficiency</p>
          <div className="flex items-end gap-1.5">
            <p className="text-sm md:text-lg font-black theme-text-primary">{member.performance?.onTimeRate || 0}%</p>
            <TrendingUp size={12} className="text-emerald-500 mb-1" />
          </div>
       </div>
       <div className="flex flex-col">
          <p className="text-[8px] md:text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Missions</p>
          <p className="text-sm md:text-lg font-black theme-text-primary">{member.performance?.tasksCompleted || 0}</p>
       </div>
    </div>

    <div className="w-full h-1 bg-white/5 rounded-full mt-4 md:mt-6 overflow-hidden">
       <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${member.performance?.onTimeRate || 0}%` }}
          className="h-full bg-brand-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.4)]"
       />
    </div>

    {/* Actions */}
    <div className="flex flex-col gap-2 md:gap-3 w-full mt-6 md:mt-8">
       <button 
         onClick={() => onAssign(member)}
         className="w-full py-3 md:py-4 bg-brand-600 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest text-white hover:bg-brand-500 transition-all shadow-lg md:shadow-xl shadow-brand-600/20 flex items-center justify-center gap-2"
       >
         <Zap size={14} /> Assign Work
       </button>
       <div className="flex gap-2 md:gap-3">
          <button 
            onClick={() => onViewDossier(member)}
            className="flex-1 py-2.5 md:py-3 bg-white/5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest text-surface-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
          >
            View Dossier
          </button>
          <button 
            onClick={() => onRemove(member.id || member._id, member.name)}
            className="p-2.5 md:p-3 bg-white/5 rounded-xl md:rounded-2xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-white/5"
          >
            <UserX size={16} />
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
       <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">Loading Personnel...</p>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-24 md:pb-12 px-1 md:px-0">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#020617]/40 p-4 md:p-8 rounded-[32px] md:rounded-[48px] border border-white/5 backdrop-blur-md">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">Team Roster</h1>
          <p className="text-[10px] md:text-sm text-white/40 font-bold uppercase tracking-[0.2em]">Roster Sync: {members.length} Active Specialists</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={14} />
            <input 
              placeholder="Search roster..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>
          <button 
            onClick={() => setShowInvite(true)}
            className="bg-brand-600 text-white px-5 md:px-8 py-2.5 md:py-3.5 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/30 flex items-center gap-2 group shrink-0"
          >
            <UserPlus size={16} className="group-hover:scale-110 transition-transform" /> 
            <span className="hidden sm:inline">Invite Member</span>
            <span className="sm:hidden">Invite</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl flex items-center gap-4 text-rose-500 text-xs font-bold">
           <AlertTriangle size={18} /> {error}
        </div>
      )}

      {filteredMembers.length === 0 ? (
        <div className="text-center py-24 glass rounded-[40px] border border-white/5">
           <Users size={64} className="text-white/10 mx-auto mb-6" />
           <h3 className="text-xl font-black text-white uppercase tracking-widest">No Specialists Found</h3>
           <p className="text-white/30 text-xs mt-2">Adjust your filters or invite new talent.</p>
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
              onClick={() => setShowInvite(false)} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#020617] border border-white/10 rounded-[40px] p-6 md:p-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Deploy Talent</h2>
                <button onClick={() => setShowInvite(false)} className="p-2 text-white/40 hover:text-white transition-all"><X size={24} /></button>
              </div>

              <form onSubmit={handleInvite} className="space-y-5">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Full Name</label>
                   <input required value={inviteData.name} onChange={(e) => setInviteData({...inviteData, name: e.target.value})}
                     className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" placeholder="e.g. Sarah Miller" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Email Address</label>
                   <input required type="email" value={inviteData.email} onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                     className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" placeholder="sarah@nexovtech.com" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Specialization</label>
                   <select value={inviteData.role} onChange={(e) => setInviteData({...inviteData, role: e.target.value})}
                     className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 appearance-none">
                      <option className="bg-[#020617]">Developer</option>
                      <option className="bg-[#020617]">Video Editor</option>
                      <option className="bg-[#020617]">AI Specialist</option>
                      <option className="bg-[#020617]">Security Analyst</option>
                   </select>
                </div>
                <button type="submit" className="w-full py-4.5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/20">Send Activation Invite</button>
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
              onClick={() => setAssignModal({ show: false, member: null })} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-[#020617] border border-white/10 rounded-[40px] p-6 md:p-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                   <h2 className="text-2xl font-black text-white tracking-tight">Assign Mission</h2>
                   <p className="text-[10px] text-brand-500 font-black uppercase tracking-widest mt-1">Specialist: {assignModal.member?.name}</p>
                </div>
                <button onClick={() => setAssignModal({ show: false, member: null })} className="p-2 text-white/40 hover:text-white transition-all"><X size={24} /></button>
              </div>

              <form onSubmit={handleAssignTask} className="space-y-5">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Task Title</label>
                   <input required value={taskData.title} onChange={(e) => setTaskData({...taskData, title: e.target.value})}
                     className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" placeholder="e.g. Optimize Database" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Project Hub</label>
                      <select required value={taskData.projectId} onChange={(e) => setTaskData({...taskData, projectId: e.target.value})}
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 appearance-none">
                          <option value="" className="bg-[#020617]">Select Mission</option>
                          {projects.map(p => (
                            <option key={p.id || p._id} value={p.id || p._id} className="bg-[#020617]">{p.title}</option>
                          ))}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Deadline</label>
                      <input type="date" required value={taskData.deadline} onChange={(e) => setTaskData({...taskData, deadline: e.target.value})}
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Priority Protocol</label>
                   <div className="flex gap-2">
                      {['Low', 'Medium', 'High'].map(p => (
                         <button key={p} type="button" onClick={() => setTaskData({...taskData, priority: p})}
                           className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                              taskData.priority === p 
                              ? 'bg-brand-600 text-white border-brand-500' 
                              : 'bg-white/5 text-white/30 border-white/10 hover:text-white'
                           }`}>{p}</button>
                      ))}
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Reference Dossier</label>
                   <div className="flex items-center gap-3 p-5 bg-white/5 border border-dashed border-white/10 rounded-2xl relative overflow-hidden group">
                      <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => setTaskData(prev => ({ ...prev, files: [...prev.files, ...Array.from(e.target.files)] }))} />
                      <Plus className="text-brand-500 group-hover:scale-125 transition-transform" />
                      <span className="text-[10px] text-white/30 font-black uppercase tracking-widest">Attach Briefings ({taskData.files.length})</span>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Mission Briefing</label>
                   <textarea required value={taskData.description} onChange={(e) => setTaskData({...taskData, description: e.target.value})}
                     className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 h-32 custom-scrollbar" placeholder="Detailed tactical instructions..." />
                </div>
                
                <button type="submit" className="w-full py-4.5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/20">Authorize Assignment</button>
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
              onClick={() => setRemoveModal({ show: false, id: null, name: '' })} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-[#020617] border border-rose-500/30 rounded-[32px] p-8 text-center shadow-2xl">
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
                   <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">Retire Specialist?</h3>
                <p className="text-white/40 text-xs mt-2 font-bold leading-relaxed">Are you sure you want to remove <span className="text-white">{removeModal.name}</span> from the active roster? This action is permanent.</p>
                <div className="flex gap-3 mt-8">
                   <button onClick={() => setRemoveModal({ show: false, id: null, name: '' })} className="flex-1 py-3.5 rounded-xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest">Abort</button>
                   <button onClick={confirmRemove} className="flex-1 py-3.5 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest">Confirm</button>
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
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 glass border ${notification.isError ? 'border-rose-500/50' : 'border-brand-500/30'} px-6 md:px-8 py-3 md:py-4 rounded-2xl shadow-2xl text-white text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-3 z-[120] animate-bounce`}>
           {notification.isError ? <AlertTriangle className="text-rose-500" size={16} /> : <CheckCircle2 className="text-emerald-500" size={16} />} 
           {notification.msg}
        </div>
      )}
    </div>
  );
};

export default Team;
