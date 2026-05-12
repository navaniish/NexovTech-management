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
  const [newMail, setNewMail] = useState({ to: '', subject: '', content: '', attachments: [] });
  const [theme, setTheme] = useState('cyber');
  const [searchTerm, setSearchTerm] = useState('');

  const themes = {
    cyber: {
       bg: 'bg-slate-950',
       card: 'bg-slate-900/40 backdrop-blur-3xl border-white/5 text-white',
       accent: 'text-brand-400',
       sidebar: 'bg-black/20',
       itemActive: 'bg-brand-600/20 border border-brand-500/50 text-brand-400 shadow-[0_0_20px_rgba(37,99,235,0.2)]',
       itemInactive: 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
       preview: 'bg-black/20',
       header: 'bg-transparent border-white/5',
       list: 'bg-black/10'
    },
    midnight: {
       bg: 'bg-[#020617]',
       card: 'bg-slate-900/90 border-slate-800 text-slate-200',
       accent: 'text-indigo-400',
       sidebar: 'bg-slate-950',
       itemActive: 'bg-indigo-600 text-white',
       itemInactive: 'text-slate-500 hover:bg-slate-800',
       preview: 'bg-[#0f172a]',
       header: 'bg-slate-950 border-slate-800',
       list: 'bg-slate-900/50'
    },
    minimal: {
       bg: 'bg-slate-50',
       card: 'bg-white border-slate-200 text-slate-900',
       accent: 'text-slate-900',
       sidebar: 'bg-white border-r border-slate-100',
       itemActive: 'bg-slate-900 text-white',
       itemInactive: 'text-slate-400 hover:bg-slate-50',
       preview: 'bg-slate-50',
       header: 'bg-white border-b border-slate-200',
       list: 'bg-white'
    },
    arctic: {
       bg: 'bg-blue-50/50',
       card: 'bg-white/80 backdrop-blur-xl border-blue-100 text-blue-900',
       accent: 'text-blue-600',
       sidebar: 'bg-blue-50/80',
       itemActive: 'bg-blue-600 text-white',
       itemInactive: 'text-blue-400 hover:bg-white',
       preview: 'bg-white/40',
       header: 'bg-white/60 border-blue-100',
       list: 'bg-blue-50/30'
    }
  };

  const t = themes[theme];

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
        const emailLower = email.toLowerCase();
        
        const filtered = data.filter(m => {
          const from = m.from?.toLowerCase();
          const to = m.to?.toLowerCase();
          
          if (activeFolder === 'sent') return from === emailLower;
          if (activeFolder === 'trash') return m.status === 'Deleted';
          if (activeFolder === 'starred') return m.starred && to === emailLower;
          if (activeFolder === 'archived') return m.status === 'Archived' && to === emailLower;
          
          // Default: Inbox
          return to === emailLower && m.status !== 'Deleted' && m.status !== 'Archived';
        });

        setMails(filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    } catch (err) {
      console.error('Mail sync failure:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) fetchMails();
  }, [user?.email, activeFolder]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const MAX_SIZE = 750 * 1024; // 750KB limit to account for Base64 overhead (1MB Firestore limit)
    
    files.forEach(file => {
      if (file.size > MAX_SIZE) {
        alert(`File "${file.name}" is too large. Cloud database limit is 1MB total. Please use a smaller file or a sharing link.`);
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMail(prev => ({
          ...prev,
          attachments: [...prev.attachments, {
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result
          }]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMail.to || !newMail.subject) {
      alert('Recipient and Subject are required.');
      return;
    }

    try {
      const senderEmail = user.companyEmail || user.email;
      const res = await fetch(`${API_URL}/mail/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMail,
          from: senderEmail,
          senderName: user.name || 'Nexov User',
          timestamp: new Date()
        })
      });
      if (res.ok) {
        setComposing(false);
        setNewMail({ to: '', subject: '', content: '', attachments: [] });
        alert('Message dispatched successfully.');
        fetchMails();
      } else {
        const errData = await res.json();
        alert(`Dispatch failed: ${errData.message || 'Server error'}`);
      }
    } catch (err) {
      console.error('Dispatch failed:', err);
      alert('Network error: Could not reach the mail server.');
    }
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-140px)] gap-4 animate-in fade-in duration-700 transition-colors duration-1000 p-4 ${theme === 'cyber' ? 'bg-[#020617]' : theme === 'midnight' ? 'bg-[#0a0a0a]' : 'bg-transparent'}`}>
      
      {/* 1. VIBRANT HEADER */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 px-4 py-3 rounded-[24px] border transition-all duration-500 ${t.card} ${t.header}`}>
        <div className="flex items-center gap-6">
           <h1 className={`text-2xl font-black tracking-tighter leading-none italic ${t.accent}`}>NEXUS MAIL</h1>
           <div className="flex gap-2 p-1 bg-black/20 rounded-lg">
              {Object.keys(themes).map(th => (
                <button 
                  key={th} 
                  onClick={() => setTheme(th)}
                  className={`w-4 h-4 rounded-full transition-all border-2 ${theme === th ? 'scale-110 border-white' : 'opacity-30 hover:opacity-100 border-transparent'}`}
                  style={{ backgroundColor: th === 'cyber' ? '#2563eb' : th === 'midnight' ? '#1e1b4b' : th === 'minimal' ? '#0f172a' : '#bfdbfe' }}
                  title={th.charAt(0).toUpperCase() + th.slice(1)}
                />
              ))}
           </div>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setComposing(true)}
             className={`h-9 px-6 rounded-xl flex items-center gap-3 font-black text-[9px] uppercase tracking-widest transition-all shadow-xl active:scale-95 ${theme === 'cyber' ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}
           >
             <Zap size={12} className={theme === 'cyber' ? 'text-brand-600' : 'text-amber-400'} /> 
             NEW DISPATCH
           </button>
           <button onClick={fetchMails} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-lg ${t.card}`}>
             <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        
        {/* 2. NAVIGATION SIDEBAR */}
        <div className="hidden lg:flex w-48 flex-col gap-2 shrink-0">
           {folders.map(folder => (
             <button
               key={folder.id}
               onClick={() => { setActiveFolder(folder.id); setSelectedMail(null); }}
               className={`h-11 px-4 rounded-xl flex items-center justify-between transition-all duration-300 group ${
                 activeFolder === folder.id 
                 ? t.itemActive
                 : t.itemInactive
               }`}
             >
               <div className="flex items-center gap-4">
                 <folder.icon size={16} className={activeFolder === folder.id ? 'text-current' : `${folder.color} opacity-60 group-hover:opacity-100`} />
                 <span className="text-[10px] font-black uppercase tracking-widest">{folder.label}</span>
               </div>
               {folder.id === 'inbox' && mails.length > 0 && (
                 <span className={`px-2 py-0.5 rounded-md text-[8px] font-black ${activeFolder === folder.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {mails.length}
                 </span>
               )}
             </button>
           ))}
           
           <div className="mt-auto glass-card p-4 rounded-2xl border-slate-100 bg-gradient-to-br from-indigo-50/50 to-white/50">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white mb-3 shadow-lg shadow-indigo-600/20">
                 <ShieldCheck size={16} />
              </div>
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Encrypted Line</p>
              <p className="text-[9px] font-medium text-slate-500 leading-relaxed italic opacity-80">"Quantum-grade security active."</p>
           </div>
        </div>

        {/* 3. MESSAGE LIST */}
        <div className={`flex-[1] min-w-[280px] rounded-[24px] flex flex-col overflow-hidden border transition-all duration-500 shadow-xl ${t.card} ${t.list} ${selectedMail ? 'hidden xl:flex' : 'flex'}`}>
           <div className="p-3 border-b border-slate-50 bg-white/40 backdrop-blur-xl relative z-10">
              <div className="relative group">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors" size={14} />
                 <input 
                   type="text" 
                   placeholder="SEARCH..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full h-8 bg-white border border-slate-100 rounded-lg pl-9 pr-3 text-[8px] font-black uppercase tracking-widest text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/5 transition-all placeholder:text-slate-200"
                 />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 bg-slate-50/30">
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
                   className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                     selectedMail?.id === mail.id 
                     ? 'bg-slate-900 text-white shadow-md' 
                     : 'bg-white hover:bg-slate-50 border border-slate-50'
                   }`}
                 >
                   <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform ${
                     selectedMail?.id === mail.id ? 'bg-white/10 text-brand-400' : 'bg-slate-50 text-slate-400'
                   }`}>
                      <User size={16} />
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[11px] font-black uppercase tracking-widest truncate ${selectedMail?.id === mail.id ? 'text-white' : 'text-slate-900'}`}>
                          {activeFolder === 'sent' ? `TO: ${mail.to}` : mail.senderName}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${selectedMail?.id === mail.id ? 'text-white/40' : 'text-slate-300'}`}>
                          {mail.timestamp && !isNaN(new Date(mail.timestamp).getTime()) ? `${new Date(mail.timestamp).toLocaleDateString([], { day: '2-digit', month: 'short' })} ${new Date(mail.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'PENDING'}
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`fixed inset-0 lg:relative lg:inset-auto flex-[2] rounded-[24px] z-[110] flex flex-col overflow-hidden shadow-2xl transition-all duration-500 border ${t.card} ${t.preview}`}
            >              
              <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-white/40 backdrop-blur-xl">
                <button onClick={() => setSelectedMail(null)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-brand-600 transition-all shadow-lg lg:hidden">
                  <ChevronLeft size={24} />
                </button>
                <div className="flex items-center gap-3 ml-auto">
                   {['star', 'archive', 'trash'].map((act) => (
                     <button key={act} className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-600 transition-all">
                        {act === 'star' ? <Star size={14} /> : act === 'archive' ? <Archive size={14} /> : <Trash2 size={14} />}
                     </button>
                   ))}
                   <div className="w-px h-5 bg-slate-100 mx-1" />
                   <button onClick={() => setSelectedMail(null)} className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-md hover:bg-brand-600 transition-colors"><X size={14} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/20">
                <div className="max-w-3xl mx-auto space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-lg font-black shadow-lg">
                        {selectedMail.senderName?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                           <Shield size={10} className="text-brand-600" />
                           <h2 className="text-[8px] font-black text-brand-600 uppercase tracking-widest">Verified</h2>
                        </div>
                        <p className="text-lg font-black text-slate-900 tracking-tighter leading-none">{selectedMail.senderName}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedMail.from} • {selectedMail.timestamp ? `${new Date(selectedMail.timestamp).toLocaleDateString()} ${new Date(selectedMail.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
                      </div>
                   </div>
                   
                   <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm relative">
                      <div className="absolute -top-2 left-4 px-2 py-0.5 bg-slate-900 text-white rounded-full text-[7px] font-black uppercase tracking-widest">Subject</div>
                      <h1 className="text-base font-black text-slate-900 tracking-tighter mb-2 leading-tight italic">{selectedMail.subject}</h1>
                      <div className="prose prose-slate max-w-none">
                        <p className="text-[13px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap mb-4">{selectedMail.content}</p>
                      </div>
                      
                      {selectedMail.attachments && selectedMail.attachments.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-50">
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                             <Paperclip size={10} /> {selectedMail.attachments.length} Attachments
                           </p>
                           <div className="flex flex-wrap gap-2">
                              {selectedMail.attachments.map((file, idx) => (
                                <a 
                                  key={idx} 
                                  href={file.data} 
                                  download={file.name}
                                  className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-2 hover:bg-white transition-all group"
                                >
                                   <div className="w-6 h-6 bg-indigo-50 rounded flex items-center justify-center text-indigo-500">
                                      <Globe size={12} />
                                   </div>
                                   <div className="min-w-0">
                                      <p className="text-[9px] font-bold text-slate-700 truncate max-w-[120px]">{file.name}</p>
                                      <p className="text-[7px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                   </div>
                                </a>
                              ))}
                           </div>
                        </div>
                      )}
                   </div>

                   {/* AI-ASSISTED INSIGHTS */}
                   <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-xl relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-50" />
                     <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-xl shrink-0">
                           <Bot size={20} className="text-brand-400" />
                        </div>
                        <div className="flex-1 space-y-4">
                           <div className="flex items-center justify-center md:justify-start gap-3">
                              <Sparkles size={14} className="text-brand-400" />
                              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-400">Intelligence Node</span>
                           </div>
                           <p className="text-[11px] font-medium text-slate-300 leading-relaxed italic">
                             "SECURITY ANALYSIS: Dispatch requires priority routing to Project Registry."
                           </p>
                           <div className="flex flex-wrap justify-center md:justify-start gap-2">
                              <button 
                                onClick={() => {
                                  setNewMail({
                                    to: selectedMail.from,
                                    subject: `Re: ${selectedMail.subject}`,
                                    content: `\n\n--- Original Message ---\n${selectedMail.content}`,
                                    attachments: []
                                  });
                                  setComposing(true);
                                }}
                                className="px-4 py-2 bg-white/10 hover:bg-white text-[8px] font-black uppercase tracking-widest text-white hover:text-slate-900 rounded-lg transition-all"
                              >
                                Quick Reply
                              </button>
                              <button className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-[8px] font-black uppercase tracking-widest text-white rounded-lg transition-all shadow-md">Push to Registry</button>
                           </div>
                        </div>
                     </div>
                   </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-50 bg-white backdrop-blur-xl flex gap-3">
                <button 
                  onClick={() => {
                    setNewMail({
                      to: selectedMail.from,
                      subject: `Re: ${selectedMail.subject}`,
                      content: `\n\n--- Original Message ---\n${selectedMail.content}`,
                      attachments: []
                    });
                    setComposing(true);
                  }}
                  className="flex-1 h-10 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-900 hover:bg-white hover:border-brand-500/10 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                   <MessageSquare size={14} /> Compose Reply
                </button>
                <button className="w-10 h-10 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-brand-600 transition-all shadow-sm flex items-center justify-center">
                   <Paperclip size={16} />
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
              className="fixed inset-0 m-auto w-full max-w-xl h-[480px] z-[210] glass-card !p-0 overflow-hidden flex flex-col shadow-2xl border-none"
            >
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-r from-brand-600/20 to-transparent opacity-50" />
                 <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shadow-xl backdrop-blur-xl">
                       <Rocket size={20} className="text-brand-400" />
                    </div>
                    <div>
                       <h3 className="text-lg font-black uppercase tracking-tighter leading-none italic">New Dispatch</h3>
                    </div>
                 </div>
                 <button onClick={() => setComposing(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all relative z-10">
                    <X size={18} />
                 </button>
              </div>
              
              <form onSubmit={handleSend} className="flex-1 flex flex-col bg-white overflow-hidden">
                 <div className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="relative">
                       <span className="absolute -top-2 left-3 px-2 bg-white text-[8px] font-black text-slate-400 uppercase tracking-widest z-10">To</span>
                       <input 
                        type="text" required value={newMail.to}
                        onChange={e => setNewMail({...newMail, to: e.target.value})}
                        placeholder="COMM@NEXOVTECH.NET"
                        className="w-full h-12 bg-slate-50/50 border border-slate-100 rounded-xl px-4 pt-1 text-sm font-black text-slate-900 placeholder:text-slate-200 outline-none"
                       />
                    </div>
                    
                    <div className="relative">
                       <span className="absolute -top-2 left-3 px-2 bg-white text-[8px] font-black text-slate-400 uppercase tracking-widest z-10">Subject</span>
                       <input 
                        type="text" required value={newMail.subject}
                        onChange={e => setNewMail({...newMail, subject: e.target.value})}
                        placeholder="SUBJECT"
                        className="w-full h-12 bg-slate-50/50 border border-slate-100 rounded-xl px-4 pt-1 text-sm font-black text-brand-600 placeholder:text-slate-200 outline-none italic"
                       />
                    </div>

                    <div className="relative flex-1 min-h-[150px]">
                       <span className="absolute -top-2 left-3 px-2 bg-white text-[8px] font-black text-slate-400 uppercase tracking-widest z-10">Content</span>
                       <textarea 
                         required value={newMail.content}
                         onChange={e => setNewMail({...newMail, content: e.target.value})}
                         placeholder="MESSAGE..."
                         className="w-full h-full bg-slate-50/50 border border-slate-100 rounded-2xl p-4 pt-6 text-[14px] font-medium text-slate-700 leading-relaxed resize-none outline-none"
                       />
                    </div>
                 </div>

                  <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-4 shrink-0">
                     {newMail.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                           {newMail.attachments.map((file, idx) => (
                             <div key={idx} className="px-2 py-1 bg-white border border-slate-100 rounded-md flex items-center gap-2">
                                <span className="text-[8px] font-bold text-slate-600 truncate max-w-[100px]">{file.name}</span>
                                <button 
                                  type="button" 
                                  onClick={() => setNewMail(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }))}
                                  className="text-rose-500 hover:text-rose-600"
                                >
                                   <X size={10} />
                                </button>
                             </div>
                           ))}
                        </div>
                     )}
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <label className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-brand-600 transition-all flex items-center justify-center cursor-pointer">
                              <Paperclip size={18} />
                              <input type="file" multiple className="hidden" onChange={handleFileChange} />
                           </label>
                        </div>
                        <button 
                          type="submit"
                          className="h-12 px-8 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-brand-600 transition-all shadow-xl"
                        >
                          SEND DISPATCH <SendHorizontal size={16} />
                        </button>
                     </div>
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
