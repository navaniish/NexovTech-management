import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Hash, MessageSquare, Users, Search, 
  Paperclip, Smile, MoreVertical, Bell, 
  Megaphone, Plus, Sparkles, ShieldCheck 
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';

const Communication = () => {
  const { user } = useAuth();
  const { 
    messages, activeRoom, joinRoom, sendMessage, 
    sendTyping, typingUsers, announcements, broadcastAnnouncement 
  } = useChat();

  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'announcements'
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);

  const channels = [
    { id: 'general', name: 'general', icon: Hash, desc: 'Company-wide discussion' },
    { id: 'engineering', name: 'engineering', icon: Hash, desc: 'Tech & Architecture' },
    { id: 'design-team', name: 'design-team', icon: Hash, desc: 'Visuals & UI/UX' },
    { id: 'announcements', name: 'broadcasts', icon: Megaphone, desc: 'Official updates' },
  ];

  useEffect(() => {
    if (activeRoom) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
            Communication Hub <Sparkles size={24} className="text-brand-400" />
          </h1>
          <p className="text-xs md:text-sm theme-text-secondary mt-1">Real-time enterprise collaboration ecosystem</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-brand-600 text-white' : 'bg-gray-50 text-gray-400 hover:bg-white/10'}`}
          >
            Messenger
          </button>
          <button 
            onClick={() => setActiveTab('announcements')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'announcements' ? 'bg-brand-600 text-white' : 'bg-gray-50 text-gray-400 hover:bg-white/10'}`}
          >
            Broadcasts
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Sidebar - Channels */}
        <div className="hidden lg:flex w-72 flex-col gap-4">
          <div className="theme-card rounded-[32px] p-6 flex-1 flex flex-col gap-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <input 
                type="text" 
                placeholder="Search registry..." 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-11 pr-4 text-xs focus:outline-none focus:border-brand-500/50"
              />
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between px-2 mb-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Channels</h3>
                  <Plus size={14} className="text-gray-400 cursor-pointer hover:text-gray-900" />
                </div>
                <div className="space-y-1">
                  {channels.map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => joinRoom(channel.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeRoom === channel.id ? 'bg-brand-600/10 text-brand-400' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                      <channel.icon size={18} />
                      <span className="text-xs font-black tracking-tight">{channel.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between px-2 mb-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Specialists</h3>
                </div>
                {/* Mock DMs for now */}
                <div className="space-y-1">
                  {['Sarah Chen', 'David Miller', 'Nexov AI'].map(name => (
                    <button
                      key={name}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                      <span className="text-xs font-bold tracking-tight">{name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' ? (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 theme-card rounded-[32px] flex flex-col overflow-hidden"
              >
                {/* Chat Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-600/10 rounded-2xl text-brand-400">
                      <Hash size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black tracking-tight">#{activeRoom}</h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Secure Encrypted Channel</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400">
                    <Bell size={18} className="cursor-pointer hover:text-gray-900" />
                    <Users size={18} className="cursor-pointer hover:text-gray-900" />
                    <MoreVertical size={18} className="cursor-pointer hover:text-gray-900" />
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {messages.map((msg, i) => {
                    const isMe = msg.sender?.id === (user?.id || user?._id);
                    return (
                      <div key={i} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-brand-600 shrink-0 shadow-lg">
                          <img 
                            src={msg.sender?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender?.name}`} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className={`max-w-[70%] space-y-1 ${isMe ? 'items-end' : ''}`}>
                          <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{msg.sender?.name}</span>
                            <span className="text-[8px] font-bold text-gray-300">{formatTime(msg.timestamp)}</span>
                            {msg.sender?.role === 'Admin' && <ShieldCheck size={10} className="text-brand-400" />}
                          </div>
                          <div className={`px-5 py-3 rounded-3xl text-sm leading-relaxed ${isMe ? 'bg-brand-600 text-white rounded-tr-none shadow-xl shadow-brand-600/10' : 'bg-gray-50 text-white/90 rounded-tl-none border border-gray-100'}`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Typing Indicator */}
                {Object.keys(typingUsers).length > 0 && (
                  <div className="px-8 py-2 text-[9px] font-black uppercase tracking-widest text-brand-400 animate-pulse">
                    {Object.values(typingUsers).join(', ')} is typing...
                  </div>
                )}

                {/* Input Area */}
                <div className="p-6 pt-2">
                  <form 
                    onSubmit={handleSend}
                    className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-[24px] p-2 focus-within:border-brand-500/30 transition-all shadow-inner"
                  >
                    <button type="button" className="p-3 text-gray-300 hover:text-gray-900 transition-colors"><Paperclip size={20} /></button>
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => { setInput(e.target.value); sendTyping(); }}
                      placeholder={`Message #${activeRoom}...`}
                      className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-900 placeholder:text-gray-300"
                    />
                    <button type="button" className="p-3 text-gray-300 hover:text-gray-900 transition-colors"><Smile size={20} /></button>
                    <button 
                      type="submit"
                      disabled={!input.trim()}
                      className="p-3 bg-brand-600 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-600/20"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="announcements"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar"
              >
                {user?.role === 'Admin' && (
                  <div className="theme-card rounded-[32px] p-8 border border-brand-500/20 bg-brand-600/[0.03]">
                    <h3 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
                      Broadcast New Update <Megaphone size={20} className="text-brand-400" />
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="Announcement Title"
                        className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:outline-none focus:border-brand-500/50"
                      />
                      <select className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:outline-none focus:border-brand-500/50">
                        <option value="Medium">Priority: Normal</option>
                        <option value="High">Priority: High (Urgent)</option>
                        <option value="Low">Priority: Low</option>
                      </select>
                      <textarea 
                        placeholder="What's the official update?"
                        className="md:col-span-2 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm h-32 focus:outline-none focus:border-brand-500/50"
                      />
                      <div className="md:col-span-2 flex justify-end">
                        <button className="px-8 py-3 bg-brand-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">
                          Broadcast to Roster
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {announcements.map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="theme-card rounded-[32px] p-6 md:p-8 flex items-start gap-6 relative overflow-hidden"
                    >
                      {item.priority === 'High' && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 shadow-[0_0_15px_#f43f5e]" />
                      )}
                      <div className={`p-4 rounded-2xl shrink-0 ${item.priority === 'High' ? 'bg-rose-500/10 text-rose-400' : 'bg-brand-600/10 text-brand-400'}`}>
                        <Bell size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md ${item.priority === 'High' ? 'bg-rose-500/10 text-rose-400' : 'bg-brand-600/10 text-brand-400'}`}>
                            {item.priority} Priority
                          </span>
                          <span className="text-[10px] font-bold theme-text-secondary">{new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-xl font-black tracking-tight">{item.title}</h3>
                        <p className="text-sm theme-text-secondary mt-3 leading-relaxed">{item.content}</p>
                        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100">
                          <div className="w-6 h-6 rounded-lg bg-surface-800" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Broadcasted by {item.sender}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Communication;


