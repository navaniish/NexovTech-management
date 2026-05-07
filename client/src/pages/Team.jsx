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
  RefreshCw
} from 'lucide-react';
import API_URL from '../config';

const MemberCard = ({ member, index, onRemove, onAssign }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    whileHover={{ y: -5, scale: 1.02 }}
    className="glass-light p-8 rounded-[40px] border border-white/5 relative overflow-hidden group shadow-2xl"
  >
    <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
      <div className={`w-2 h-2 rounded-full ${member.performance?.rating >= 4.5 ? 'bg-emerald-500 animate-pulse' : 'bg-surface-600'}`}></div>
      <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Active</span>
    </div>

    <div className="flex flex-col items-center text-center">
      <div className="w-24 h-24 rounded-[32px] bg-gradient-to-tr from-brand-600 to-neon-blue p-[3px] mb-6 shadow-2xl shadow-brand-600/20 group-hover:rotate-3 transition-transform duration-500 relative">
         <div className="w-full h-full rounded-[29px] bg-[#020617] overflow-hidden">
            <img 
              src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} 
              alt={member.name} 
              className="w-full h-full object-cover"
              onError={(e) => { e.target.onerror = null; e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`; }}
            />
         </div>
      </div>
      
      <h3 className="text-xl font-black theme-text-primary tracking-tight">{member.name}</h3>
      <p className="text-sm font-bold text-brand-500 mt-1">{member.role}</p>
      
      <div className="grid grid-cols-2 gap-4 w-full mt-10 pt-8 border-t border-white/5">
         <div className="text-center">
            <p className="text-[10px] font-black text-surface-500 uppercase tracking-[0.2em] mb-1">Performance</p>
            <p className="text-lg font-black theme-text-primary">{member.performance?.onTimeRate || 0}%</p>
         </div>
         <div className="text-center">
            <p className="text-[10px] font-black text-surface-500 uppercase tracking-[0.2em] mb-1">Tasks</p>
            <p className="text-lg font-black theme-text-primary">{member.performance?.tasksCompleted || 0}</p>
         </div>
      </div>

      <div className="w-full h-1.5 bg-white/5 rounded-full mt-6 overflow-hidden">
         <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${member.performance?.onTimeRate || 0}%` }}
            className="h-full bg-brand-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"
         />
      </div>

      <div className="flex flex-col gap-3 w-full mt-8">
         <button 
           onClick={() => onAssign(member)}
           className="w-full py-4 bg-brand-600 rounded-2xl text-xs font-black uppercase tracking-widest text-white hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/20 flex items-center justify-center gap-2"
         >
           <Zap size={16} /> Assign Work
         </button>
         <div className="flex gap-3">
            <button className="flex-1 py-3 bg-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-surface-400 hover:text-white hover:bg-brand-600 transition-all border border-white/5">Profile</button>
            <button 
              onClick={() => onRemove(member.id || member._id, member.name)}
              className="p-3 bg-white/5 rounded-2xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-white/5 group/del"
            >
              <UserX size={18} className="group-hover/del:scale-110 transition-transform" />
            </button>
         </div>
      </div>
    </div>
  </motion.div>
);

const Team = () => {
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState({ name: '', email: '', role: 'Developer' });
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);
  
  const [removeModal, setRemoveModal] = useState({ show: false, id: null, name: '' });
  const [assignModal, setAssignModal] = useState({ show: false, member: null });
  const [taskData, setTaskData] = useState({ title: '', description: '', projectId: '', deadline: '', priority: 'Medium', files: [] });

  const fetchData = async () => {
    console.log('🔄 REGISTRY_SYNC: Initiating full roster and project scan...');
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
        console.log(`✅ REGISTRY_SYNC: ${unique.length} specialists found.`);
      }

      if (projectsRes.ok) {
        const pData = await projectsRes.json();
        setProjects(pData || []);
        console.log(`✅ REGISTRY_SYNC: ${pData?.length || 0} missions found in Hub.`);
      }
    } catch (err) {
      console.error('❌ REGISTRY_SYNC_FAILURE:', err);
      setError('Failed to fetch team data. Please check connection.');
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
        fetchData(); // Full sync to get the Cloud ID
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
    
    // Append actual files
    if (taskData.files && taskData.files.length > 0) {
      taskData.files.forEach(file => {
        formData.append('attachments', file);
      });
    }

    try {
      const response = await axios.post(`${API_URL}/tasks`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.status === 200 || response.status === 201) {
        setAssignModal({ show: false, member: null });
        setTaskData({ title: '', description: '', projectId: '', deadline: '', priority: 'Medium', files: [] });
        showNotification(`Task assigned to ${assignModal.member.name}`);
      } else {
        showNotification('Error assigning task', true);
      }
    } catch (err) {
      console.error('Task assignment failed:', err);
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-surface-500 font-black uppercase tracking-widest text-xs">Loading Roster...</p>
    </div>
  );

  return (
    <div className="space-y-12 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black theme-text-primary tracking-tighter">Team Roster</h1>
          <p className="text-surface-500 mt-2 font-medium">Manage specialists and track performance metrics.</p>
        </div>
        <button 
          onClick={() => setShowInvite(true)}
          className="bg-brand-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/30 flex items-center gap-2 group"
        >
          <UserPlus size={18} className="group-hover:scale-110 transition-transform" /> Invite Member
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-3xl flex items-center gap-4 text-rose-500 font-bold">
           <AlertTriangle /> {error}
        </div>
      )}

      {members.length === 0 && !error ? (
        <div className="text-center py-20 glass rounded-[40px] border border-white/5">
           <Users size={64} className="text-surface-800 mx-auto mb-6" />
           <h3 className="text-2xl font-black theme-text-primary">No Specialists Found</h3>
           <p className="text-surface-500 mt-2">Start by inviting your first team member.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {members.map((member, i) => (
            <MemberCard 
              key={member.id || member._id || member.email || i} 
              member={member} 
              index={i} 
              onRemove={(id, name) => setRemoveModal({ show: true, id, name })} 
              onAssign={(m) => {
                fetchData(); // Trigger fresh sync
                setAssignModal({ show: true, member: m });
              }}
            />
          ))}
        </div>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {showInvite && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInvite(false)}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass border border-white/10 rounded-[40px] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black theme-text-primary tracking-tighter">Deploy Talent</h2>
                <button onClick={() => setShowInvite(false)} className="p-2 text-surface-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>

              <form onSubmit={handleInvite} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Full Name</label>
                   <input 
                     required
                     value={inviteData.name}
                     onChange={(e) => setInviteData({...inviteData, name: e.target.value})}
                     className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl theme-text-primary focus:outline-none focus:border-brand-500/50" 
                     placeholder="e.g. Sarah Miller"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Email Address</label>
                   <input 
                     required
                     type="email"
                     value={inviteData.email}
                     onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                     className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl theme-text-primary focus:outline-none focus:border-brand-500/50" 
                     placeholder="sarah@nexovtech.com"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Specialization</label>
                   <select 
                     value={inviteData.role}
                     onChange={(e) => setInviteData({...inviteData, role: e.target.value})}
                     className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl theme-text-primary focus:outline-none focus:border-brand-500/50 appearance-none"
                   >
                      <option>Developer</option>
                      <option>Video Editor</option>
                      <option>AI Specialist</option>
                      <option>Security Analyst</option>
                   </select>
                </div>
                <button type="submit" className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/20">Send Activation Invite</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Task Modal */}
      <AnimatePresence>
        {assignModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAssignModal({ show: false, member: null })}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl glass border border-white/10 rounded-[40px] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                   <h2 className="text-3xl font-black theme-text-primary tracking-tighter">Assign Mission</h2>
                   <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] text-brand-500 font-black uppercase tracking-widest">To: {assignModal.member?.name}</p>
                      <button 
                        type="button"
                        onClick={fetchData}
                        className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-full text-[8px] font-black uppercase tracking-widest theme-text-secondary hover:theme-text-primary hover:bg-white/10 transition-all border border-white/5"
                      >
                        <RefreshCw size={10} className={loading ? 'animate-spin' : ''} /> Sync Projects
                      </button>
                   </div>
                </div>
                <button onClick={() => setAssignModal({ show: false, member: null })} className="p-2 text-surface-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>

              <form onSubmit={handleAssignTask} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Task Title</label>
                   <input 
                     required
                     value={taskData.title}
                     onChange={(e) => setTaskData({...taskData, title: e.target.value})}
                     className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl theme-text-primary focus:outline-none focus:border-brand-500/50" 
                     placeholder="e.g. Optimize Database"
                   />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Project Link</label>
                      <select 
                        required
                        value={taskData.projectId}
                        onChange={(e) => setTaskData({...taskData, projectId: e.target.value})}
                        className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl theme-text-primary focus:outline-none focus:border-brand-500/50 appearance-none"
                      >
                          <option value="">Select Project</option>
                          {projects.length > 0 ? (
                            projects.map(p => (
                              <option key={p.id || p._id} value={p.id || p._id} className="theme-bg theme-text-primary">
                                {p.title}
                              </option>
                            ))
                          ) : (
                            <option disabled className="text-surface-700 italic">No Active Projects Found</option>
                          )}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Deadline</label>
                      <input 
                        type="date"
                        required
                        value={taskData.deadline}
                        onChange={(e) => setTaskData({...taskData, deadline: e.target.value})}
                        className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl theme-text-primary focus:outline-none focus:border-brand-500/50" 
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Priority Status</label>
                   <div className="flex gap-4">
                      {['Low', 'Medium', 'High'].map(p => (
                         <button 
                           key={p}
                           type="button"
                           onClick={() => setTaskData({...taskData, priority: p})}
                           className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                              taskData.priority === p 
                              ? 'bg-brand-600 text-white border-brand-500 shadow-lg shadow-brand-600/20' 
                              : 'bg-white/5 text-surface-500 border-white/10 hover:text-white'
                           }`}
                         >
                            {p}
                         </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Reference Files</label>
                   <div className="flex items-center gap-4 p-6 bg-white/5 border border-dashed border-white/10 rounded-2xl relative overflow-hidden">
                      <input 
                        type="file" 
                        multiple 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files);
                          setTaskData(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
                        }}
                      />
                      <Plus className="text-brand-500" />
                      <span className="text-xs text-surface-500 font-bold">Attach briefings ({taskData.files.length} selected)</span>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Mission Briefing</label>
                   <textarea 
                     required
                     value={taskData.description}
                     onChange={(e) => setTaskData({...taskData, description: e.target.value})}
                     className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl theme-text-primary focus:outline-none focus:border-brand-500/50 h-32" 
                     placeholder="Detailed instructions for the specialist..."
                   />
                </div>
                
                <button type="submit" className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/20">Authorize Assignment</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 glass border ${notification.isError ? 'border-rose-500/50' : 'border-brand-500/30'} px-8 py-4 rounded-2xl shadow-2xl theme-text-primary font-bold flex items-center gap-3 z-50 animate-bounce`}>
           {notification.isError ? <AlertTriangle className="text-rose-500" /> : <CheckCircle2 className="text-emerald-500" />} 
           {notification.msg}
        </div>
      )}
    </div>
  );
};

export default Team;
