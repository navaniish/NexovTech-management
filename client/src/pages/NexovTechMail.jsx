import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Inbox, Send, Star, Trash2, Archive, 
  Search, Plus, Paperclip, MoreVertical, 
  ChevronLeft, ChevronRight, AlertCircle, 
  User, ShieldCheck, Sparkles, SendHorizontal,
  Rocket, Globe, Filter, RefreshCw, X, Bot,
  Shield, Zap, Layers, MessageSquare, Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';

const NexovTechMail = () => {
  const { user } = useAuth();
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [mails, setMails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMail, setSelectedMail] = useState(null);
  const [composing, setComposing] = useState(false);
  const [newMail, setNewMail] = useState({ to: '', subject: '', content: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const folders = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, color: 'text-indigo-500' },
    { id: 'sent', label: 'Sent', icon: Send, color: 'text-emerald-500' },
    { id: 'starred', label: 'Starred', icon: Star, color: 'text-amber-500' },
    { id: 'archived', label: 'Archived', icon: Archive, color: 'text-slate-500' },
    { id: 'trash', label: 'Trash', icon: Trash2, color: 'text-rose-500' },
  ];

  const fetchMails = async () => {
    setLoading(true);
    try {
      const email = user?.companyEmail || user?.email;
      if (!email) return;
      const res = await fetch(`${API_URL}/mail/sent-or-received/${email}`);
      if (res.ok) {
        const data = await res.json();
        const filtered = activeFolder === 'sent' 
          ? data.filter(m => m.from?.toLowerCase() === email.toLowerCase())
          : data.filter(m => m.to?.toLowerCase() === email.toLowerCase());
        setMails(filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    } catch (err) {
      console.error('Mail sync failure');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) fetchMails();
  }, [user?.email, activeFolder]);

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/mail/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMail,
          from: user.companyEmail || user.email,
          senderName: user.name,
          timestamp: new Date()
        })
      });
      if (res.ok) {
        setComposing(false);
        setNewMail({ to: '', subject: '', content: '' });
        fetchMails();
      }
    } catch (err) {
      console.error('Dispatch failed');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] gap-6 animate-in fade-in duration-700">
      
      {/* 1. VIBRANT HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-1">
           <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none italic">Nexus Mail</h1>
           <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Secure Multi-Node Communication Hub</p>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setComposing(true)}
             className="h-14 px-8 bg-slate-900 text-white rounded-2xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-brand-600 transition-all group"
           >
             <Zap size={18} className="text-amber-400 fill-amber-400 group-hover:scale-125 transition-transform" /> 
             Dispatch Message
           </button>
           <button onClick={fetchMails} className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-brand-600 transition-all shadow-xl">
             <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        
        {/* 2. NAVIGATION SIDEBAR */}
        <div className="hidden lg:flex w-64 flex-col gap-3 shrink-0">
           {folders.map(folder => (
             <button
               key={folder.id}
               onClick={() => { setActiveFolder(folder.id); setSelectedMail(null); }}
               className={`h-14 px-6 rounded-2xl flex items-center justify-between transition-all duration-300 group ${
                 activeFolder === folder.id 
                 ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20' 
                 : 'bg-white/50 text-slate-400 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-100 shadow-sm'
               }`}
             >
               <div className="flex items-center gap-4">
                 <folder.icon size={18} className={activeFolder === folder.id ? 'text-brand-400' : `${folder.color} opacity-60 group-hover:opacity-100`} />
                 <span className="text-[11px] font-black uppercase tracking-widest">{folder.label}</span>
               </div>
               {folder.id === 'inbox' && mails.length > 0 && (
                 <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${activeFolder === folder.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {mails.length}
                 </span>
               )}
             </button>
           ))}
           
           <div className="mt-auto glass-card p-6 rounded-[32px] border-slate-100 bg-gradient-to-br from-indigo-50/50 to-white/50">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-600/20">
                 <ShieldCheck size={20} />
              </div>
              <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">Encrypted Line</p>
              <p className="text-[10px] font-medium text-slate-500 leading-relaxed italic opacity-80">"Quantum-grade security protocol active."</p>
           </div>
        </div>

        {/* 3. MESSAGE LIST */}
        <div className={`flex-[1.5] min-w-[380px] glass-card !p-0 rounded-[40px] flex flex-col overflow-hidden border-slate-100 shadow-2xl shadow-slate-200/50 ${selectedMail ? 'hidden xl:flex' : 'flex'}`}>
           <div className="p-6 border-b border-slate-50 bg-white/40 backdrop-blur-xl relative z-10">
              <div className="relative group">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors" size={20} />
                 <input 
                   type="text" 
                   placeholder="SEARCH DISPATCH REGISTRY..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full h-14 bg-white border border-slate-100 rounded-2xl pl-14 pr-6 text-[11px] font-black uppercase tracking-widest text-slate-900 outline-none focus:ring-4 focus:ring-brand-500/10 transition-all placeholder:text-slate-200"
                 />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 bg-slate-50/30">
             {loading ? (
               <div className="h-full flex flex-col items-center justify-center p-20 animate-pulse">
                  <div className="w-20 h-20 bg-indigo-50 rounded-[32px] flex items-center justify-center mb-6">
                    <RefreshCw size={40} className="text-indigo-600 animate-spin" />
                  </div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Syncing Communications...</p>
               </div>
             ) : mails.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center p-20 opacity-30 text-center">
                  <div className="w-24 h-24 bg-slate-100 rounded-[40px] flex items-center justify-center mb-8">
                    <Globe size={56} className="text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Registry Empty</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">No active transmissions detected</p>
               </div>
             ) : (
               mails.map((mail, i) => (
                 <motion.div 
                   key={mail.id || i}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.05 }}
                   onClick={() => setSelectedMail(mail)}
                   className={`group flex items-center gap-4 px-4 py-4 rounded-[28px] cursor-pointer transition-all duration-300 ${
                     selectedMail?.id === mail.id 
                     ? 'bg-slate-900 text-white shadow-2xl scale-[1.02] translate-x-2' 
                     : 'bg-white hover:bg-white hover:shadow-xl border border-slate-50 hover:border-brand-500/20'
                   }`}
                 >
                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:rotate-12 ${
                     selectedMail?.id === mail.id ? 'bg-white/10 text-brand-400' : 'bg-slate-50 text-slate-400'
                   }`}>
                      <User size={24} />
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[11px] font-black uppercase tracking-widest truncate ${selectedMail?.id === mail.id ? 'text-white' : 'text-slate-900'}`}>
                          {activeFolder === 'sent' ? `TO: ${mail.to}` : mail.senderName}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${selectedMail?.id === mail.id ? 'text-white/40' : 'text-slate-300'}`}>
                          {new Date(mail.timestamp).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                        </span>
                     </div>
                     <p className={`text-sm font-bold tracking-tight truncate ${selectedMail?.id === mail.id ? 'text-white/80' : 'text-brand-600'}`}>
                        {mail.subject}
                     </p>
                   </div>
                   <ChevronRight size={18} className={`shrink-0 transition-transform ${selectedMail?.id === mail.id ? 'text-white translate-x-1' : 'text-slate-200 opacity-0 group-hover:opacity-100'}`} />
                 </motion.div>
               ))
             )}
           </div>
        </div>

        {/* 4. MESSAGE VIEW PANEL */}
        <AnimatePresence>
          {selectedMail && (
            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="fixed inset-0 lg:relative lg:inset-auto lg:w-[450px] xl:w-[650px] flex-[2.5] glass-card !p-0 z-[110] flex flex-col overflow-hidden shadow-2xl border-slate-100"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white/40 backdrop-blur-xl">
                <button onClick={() => setSelectedMail(null)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-brand-600 transition-all shadow-lg lg:hidden">
                  <ChevronLeft size={24} />
                </button>
                <div className="flex items-center gap-3 ml-auto">
                   {['star', 'archive', 'trash'].map((act) => (
                     <button key={act} className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-brand-600 hover:shadow-xl transition-all">
                        {act === 'star' ? <Star size={18} /> : act === 'archive' ? <Archive size={18} /> : <Trash2 size={18} />}
                     </button>
                   ))}
                   <div className="w-px h-8 bg-slate-100 mx-2" />
                   <button onClick={() => setSelectedMail(null)} className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-brand-600 transition-colors"><X size={20} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/20">
                <div className="max-w-3xl mx-auto space-y-10">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-[24px] bg-slate-900 flex items-center justify-center text-white text-2xl font-black shadow-2xl">
                        {selectedMail.senderName?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                           <Shield size={14} className="text-brand-600" />
                           <h2 className="text-[10px] font-black text-brand-600 uppercase tracking-[0.3em]">Verified Dispatch</h2>
                        </div>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{selectedMail.senderName}</p>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">{selectedMail.from}</p>
                      </div>
                   </div>
                   
                   <div className="p-10 bg-white rounded-[40px] border border-slate-100 shadow-sm relative">
                      <div className="absolute -top-3 left-10 px-4 py-1 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em]">Transmission Subject</div>
                      <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter mb-8 leading-tight italic">{selectedMail.subject}</h1>
                      <div className="prose prose-slate max-w-none">
                        <p className="text-[16px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedMail.content}</p>
                      </div>
                   </div>

                   {/* AI-ASSISTED INSIGHTS */}
                   <div className="p-8 bg-slate-900 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-50" />
                     <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                        <div className="w-16 h-16 bg-white/10 rounded-[24px] flex items-center justify-center backdrop-blur-xl shrink-0">
                           <Bot size={32} className="text-brand-400" />
                        </div>
                        <div className="flex-1 space-y-4">
                           <div className="flex items-center justify-center md:justify-start gap-3">
                              <Sparkles size={14} className="text-brand-400" />
                              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-400">Intelligence Node</span>
                           </div>
                           <p className="text-[13px] font-medium text-slate-300 leading-relaxed italic">
                             "SECURITY ANALYSIS: This dispatch requires priority routing to the Project Registry. Optimized response path initialized."
                           </p>
                           <div className="flex flex-wrap justify-center md:justify-start gap-3">
                              <button className="px-6 py-3 bg-white/10 hover:bg-white text-[10px] font-black uppercase tracking-widest text-white hover:text-slate-900 rounded-xl transition-all">Quick Reply</button>
                              <button className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-[10px] font-black uppercase tracking-widest text-white rounded-xl transition-all shadow-xl">Push to Registry</button>
                           </div>
                        </div>
                     </div>
                   </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-50 bg-white backdrop-blur-xl flex gap-4">
                <button className="flex-1 h-14 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-900 hover:bg-white hover:border-brand-500/20 transition-all shadow-sm flex items-center justify-center gap-3">
                   <MessageSquare size={18} /> Compose Reply
                </button>
                <button className="w-14 h-14 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-brand-600 transition-all shadow-sm flex items-center justify-center">
                   <Paperclip size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5. COMPOSE INTERFACE */}
      <AnimatePresence>
        {composing && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200]"
              onClick={() => setComposing(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 60 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 60 }}
              className="fixed inset-0 m-auto w-full max-w-2xl h-[700px] z-[210] glass-card !p-0 overflow-hidden flex flex-col shadow-[0_60px_120px_-30px_rgba(0,0,0,0.4)] border-none"
            >
              <div className="p-10 bg-slate-900 text-white flex items-center justify-between relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-r from-brand-600/20 to-transparent opacity-50" />
                 <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-xl">
                       <Rocket size={28} className="text-brand-400" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black uppercase tracking-tighter leading-none italic">New Dispatch</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Initialize secure transmission sequence</p>
                    </div>
                 </div>
                 <button onClick={() => setComposing(false)} className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all relative z-10">
                    <X size={24} />
                 </button>
              </div>
              
              <form onSubmit={handleSend} className="flex-1 flex flex-col bg-white overflow-hidden">
                 <div className="p-10 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="relative">
                       <span className="absolute -top-3 left-4 px-2 bg-white text-[9px] font-black text-slate-400 uppercase tracking-widest z-10">Recipient Node</span>
                       <input 
                        type="text" required value={newMail.to}
                        onChange={e => setNewMail({...newMail, to: e.target.value})}
                        placeholder="COMM@NEXOVTECH.NET"
                        className="w-full h-16 bg-slate-50/50 border border-slate-100 rounded-2xl px-6 pt-2 text-base font-black text-slate-900 placeholder:text-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/20 transition-all outline-none"
                       />
                    </div>
                    
                    <div className="relative">
                       <span className="absolute -top-3 left-4 px-2 bg-white text-[9px] font-black text-slate-400 uppercase tracking-widest z-10">Objective Subject</span>
                       <input 
                        type="text" required value={newMail.subject}
                        onChange={e => setNewMail({...newMail, subject: e.target.value})}
                        placeholder="ENTER DISPATCH OBJECTIVE"
                        className="w-full h-16 bg-slate-50/50 border border-slate-100 rounded-2xl px-6 pt-2 text-base font-black text-brand-600 placeholder:text-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/20 transition-all outline-none italic"
                       />
                    </div>

                    <div className="relative flex-1 min-h-[300px]">
                       <span className="absolute -top-3 left-4 px-2 bg-white text-[9px] font-black text-slate-400 uppercase tracking-widest z-10">Transmission Content</span>
                       <textarea 
                         required value={newMail.content}
                         onChange={e => setNewMail({...newMail, content: e.target.value})}
                         placeholder="INITIALIZE ENTERPRISE DISPATCH SEQUENCE..."
                         className="w-full h-full bg-slate-50/50 border border-slate-100 rounded-[32px] p-8 pt-10 text-[16px] font-medium text-slate-700 leading-relaxed resize-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/20 transition-all outline-none"
                       />
                    </div>
                 </div>

                 <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                       <button type="button" className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-brand-600 hover:shadow-xl transition-all flex items-center justify-center"><Paperclip size={24} /></button>
                       <button type="button" className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-amber-500 hover:shadow-xl transition-all flex items-center justify-center"><Star size={24} /></button>
                    </div>
                    <button 
                      type="submit"
                      className="h-16 px-12 bg-slate-900 text-white rounded-[24px] font-black text-[12px] uppercase tracking-[0.2em] flex items-center gap-5 hover:bg-brand-600 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-slate-900/20"
                    >
                      INITIALIZE DISPATCH <SendHorizontal size={20} />
                    </button>
                 </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NexovTechMail;
