import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Send,
  X,
  Minus,
  Bot,
  User,
  Terminal,
  Zap,
  IndianRupee,
  Users,
  Clock,
  TrendingUp,
} from 'lucide-react';
import API_URL from '../../config';

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Welcome to the NexovTech Command Center. I am your AI Orchestrator. How can I assist your operations today?',
      type: 'text'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCommand = (cmd) => {
    setInput(cmd);
    processCommand(cmd);
  };

  const processCommand = async (text) => {
    if (!text.trim()) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Live AI Processing Logic
    try {
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.content || 'Neural link severed');
      }
      const data = await response.json();

      setMessages(prev => [...prev, { role: 'assistant', content: data.content, type: 'text' }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Uplink Failure: ${err.message}`,
        type: 'text'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full shadow-[0_20px_50px_rgba(139,92,246,0.3)] flex items-center justify-center z-[100] border-2 border-brand-500/50 group overflow-hidden bg-[#020617]"
      >
        <img
          src="/assets/logo.png"
          alt="Nexov AI"
          className="w-10 h-10 object-contain group-hover:scale-110 transition-transform"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#020617]"
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-28 right-8 w-[340px] h-[520px] bg-[#0f172a] border border-white/10 rounded-[32px] shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col z-[101] overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-[#020617] border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center overflow-hidden bg-white/5">
                  <img src="/assets/logo.png" alt="Nexov AI" className="w-6 h-6 object-contain" />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Nexov AI</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Neural Sync</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsOpen(false)} className="p-1.5 text-white/20 hover:text-white transition-colors">
                  <Minus size={16} />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 text-white/20 hover:text-brand-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-[#0f172a]"
            >
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`flex gap-3 max-w-[90%] ${msg.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                    <div className={`w-7 h-7 rounded-full overflow-hidden shrink-0 flex items-center justify-center ${msg.role === 'assistant' ? 'bg-white/5 border border-white/10' : 'bg-white/10 text-brand-400'}`}>
                      {msg.role === 'assistant' ? <img src="/assets/logo.png" className="w-4 h-4 object-contain" /> : <User size={14} />}
                    </div>
                    <div className={`p-3 rounded-2xl text-[11px] font-bold leading-relaxed ${msg.role === 'assistant' ? 'bg-white/5 text-slate-300 border border-white/5' : 'bg-brand-600 text-white shadow-xl'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-3 rounded-2xl flex gap-1">
                    <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-brand-400 rounded-full" />
                    <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-brand-400 rounded-full" />
                    <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-brand-400 rounded-full" />
                  </div>
                </div>
              )}
            </div>

            {/* Shortcuts */}
            <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-t border-white/5 bg-[#020617]/50">
              {[
                { label: 'Payroll', icon: IndianRupee, cmd: 'Generate May payroll' },
                { label: 'Roster', icon: Users, cmd: 'Audit specialist roster' },
                { label: 'Attendance', icon: Clock, cmd: 'Find late check-ins' },
                { label: 'Finance', icon: TrendingUp, cmd: 'Show financial projections' },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCommand(chip.cmd)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg whitespace-nowrap text-[9px] font-black text-white/50 uppercase tracking-widest hover:bg-brand-600 hover:text-white hover:border-brand-500 transition-all"
                >
                  <chip.icon size={10} />
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 bg-[#020617] border-t border-white/10">
              <form
                onSubmit={(e) => { e.preventDefault(); processCommand(input); }}
                className="relative"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a command or ask a question..."
                  className="w-full bg-slate-800/80 border border-slate-600/50 rounded-xl py-3.5 pl-4 pr-12 text-[13px] font-bold text-white outline-none focus:border-brand-500 focus:bg-slate-800 focus:ring-4 focus:ring-brand-500/20 transition-all placeholder:text-slate-400 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-600 rounded-lg text-white hover:bg-brand-500 transition-all shadow-md disabled:opacity-0 disabled:scale-90"
                >
                  <Send size={14} className="ml-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;
