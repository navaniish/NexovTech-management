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
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertOctagon,
  Cpu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API_URL from '../../config';

const AIAssistant = () => {
  const { adminLogin, user } = useAuth();
  const navigate = useNavigate();
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
  
  // Admin Login State
  const [authState, setAuthState] = useState('NORMAL'); // NORMAL, AWAITING_EMAIL, AWAITING_PASSWORD, VERIFYING
  const [adminCreds, setAdminCreds] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleCommand = (cmd) => {
    setInput(cmd);
    processCommand(cmd);
  };

  const processCommand = async (text) => {
    if (!text.trim()) return;
    const cleanText = text.trim();

    // 1. Check for Hidden Admin Trigger (Only if not already logged in as admin)
    const triggerPhrases = ['INITIATE OVERRIDE', 'SECURITY ACCESS', 'ROOT_ACCESS', 'ADMIN_LOGIN'];
    if (triggerPhrases.includes(cleanText.toUpperCase()) && (!user || user.role !== 'Admin')) {
      setMessages(prev => [...prev, 
        { role: 'user', content: text },
        { role: 'assistant', content: 'SYSTEM: HIDDEN PROTOCOL DETECTED. INITIALIZING SECURE HANDSHAKE...', type: 'system' }
      ]);
      setInput('');
      setIsTyping(true);
      
      setTimeout(() => {
        setAuthState('AWAITING_EMAIL');
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Identity verification required. Please provide Administrative Email Identifier:', 
          type: 'security' 
        }]);
        setIsTyping(false);
      }, 1500);
      return;
    }

    // 2. Handle Admin Login Flow
    if (authState === 'AWAITING_EMAIL') {
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      setAdminCreds(prev => ({ ...prev, email: cleanText }));
      setInput('');
      setIsTyping(true);
      
      setTimeout(() => {
        setAuthState('AWAITING_PASSWORD');
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Email acknowledged. Enter Security Access Key to proceed:', 
          type: 'security' 
        }]);
        setIsTyping(false);
      }, 800);
      return;
    }

    if (authState === 'AWAITING_PASSWORD') {
      setMessages(prev => [...prev, { role: 'user', content: '••••••••' }]);
      setInput('');
      setAuthState('VERIFYING');
      setIsTyping(true);

      try {
        const result = await adminLogin(adminCreds.email, cleanText);
        if (result.success) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: 'ACCESS GRANTED. AUTHORIZING SYSTEM PRIVILEGES... REDIRECTING TO COMMAND CENTER.', 
            type: 'success' 
          }]);
          setTimeout(() => {
            setIsOpen(false);
            setAuthState('NORMAL');
            navigate('/');
          }, 2000);
        } else {
          throw new Error(result.message);
        }
      } catch (err) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `CRITICAL FAILURE: ${err.message}. Identity check logged. Access restricted.`, 
          type: 'error' 
        }]);
        setAuthState('NORMAL');
        setAdminCreds({ email: '', password: '' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // 3. Standard Chat Flow
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg]
            .filter(m => m.type === 'text')
            .map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) throw new Error('Neural link severed');
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

  const getThemeColors = () => {
    if (authState !== 'NORMAL') {
      return {
        bg: 'bg-black',
        border: 'border-yellow-500/30',
        header: 'bg-[#0a0a05] border-yellow-500/20',
        text: 'text-yellow-500',
        bubble: 'bg-yellow-500/5 text-yellow-200 border-yellow-500/10'
      };
    }
    return {
      bg: 'bg-[#0f172a]',
      border: 'border-white/10',
      header: 'bg-[#020617] border-white/5',
      text: 'text-white',
      bubble: 'bg-white/5 text-slate-300 border-white/5'
    };
  };

  const theme = getThemeColors();

  return (
    <>
      {/* Floating Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center z-[100] border-2 group overflow-hidden transition-colors ${
          authState !== 'NORMAL' ? 'border-yellow-500/50 bg-black' : 'border-brand-500/50 bg-[#020617]'
        }`}
      >
        <div className="relative">
          <img
            src="/assets/logo_nexo.jpeg"
            alt="Nexov AI"
            className={`w-10 h-10 object-contain transition-all duration-500 ${
              authState !== 'NORMAL' ? 'grayscale brightness-150 sepia-[.5] hue-rotate-[10deg]' : 'group-hover:scale-110'
            }`}
          />
          {authState !== 'NORMAL' && (
            <motion.div
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 bg-yellow-500/20 blur-md rounded-full"
            />
          )}
        </div>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`absolute top-1 right-1 w-3 h-3 rounded-full border-2 ${
            authState !== 'NORMAL' ? 'bg-yellow-500 border-black' : 'bg-emerald-500 border-[#020617]'
          }`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className={`fixed bottom-28 right-8 w-[360px] h-[580px] ${theme.bg} border ${theme.border} rounded-[32px] shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col z-[101] overflow-hidden`}
          >
            {/* Header */}
            <div className={`p-4 ${theme.header} border-b flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center overflow-hidden ${authState !== 'NORMAL' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-white/10 bg-white/5'}`}>
                  {authState !== 'NORMAL' ? <ShieldCheck size={20} className="text-yellow-500" /> : <img src="/assets/logo_nexo.jpeg" alt="Nexov AI" className="w-6 h-6 object-contain" />}
                </div>
                <div>
                  <h3 className={`text-[11px] font-black uppercase tracking-widest ${theme.text}`}>
                    {authState !== 'NORMAL' ? 'Secure Override' : 'Nexov Orchestrator'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`w-1 h-1 rounded-full animate-pulse ${authState !== 'NORMAL' ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
                    <span className={`text-[8px] font-black uppercase tracking-widest ${authState !== 'NORMAL' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                      {authState !== 'NORMAL' ? 'Encrypted Link' : 'Neural Sync'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsOpen(false)} className="p-2 text-white/20 hover:text-white transition-colors">
                  <Minus size={16} />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 text-white/20 hover:text-rose-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar"
            >
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`flex gap-3 max-w-[92%] ${msg.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                    <div className={`w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border ${
                      msg.role === 'assistant' 
                        ? (authState !== 'NORMAL' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-white/5 border-white/10') 
                        : 'bg-white/10 text-brand-400'
                    }`}>
                      {msg.role === 'assistant' ? (
                        authState !== 'NORMAL' ? (msg.type === 'error' ? <AlertOctagon size={16} /> : <Terminal size={16} />) : <Cpu size={16} />
                      ) : <User size={16} />}
                    </div>
                    <div className={`p-3.5 rounded-2xl text-[11px] font-bold leading-relaxed border ${
                      msg.role === 'assistant' 
                        ? (msg.type === 'security' || authState !== 'NORMAL' 
                            ? 'bg-yellow-500/5 text-yellow-200 border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.05)]' 
                            : (msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : theme.bubble))
                        : 'bg-brand-600 text-white shadow-xl border-brand-500'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className={`${theme.bubble} p-3 rounded-2xl flex gap-1.5`}>
                    {[0, 1, 2].map(i => (
                      <motion.div 
                        key={i}
                        animate={{ opacity: [0.2, 1, 0.2] }} 
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} 
                        className={`w-1.5 h-1.5 rounded-full ${authState !== 'NORMAL' ? 'bg-yellow-500' : 'bg-brand-400'}`} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className={`p-5 ${theme.header} border-t`}>
              <form
                onSubmit={(e) => { e.preventDefault(); processCommand(input); }}
                className="relative"
              >
                <input
                  type={authState === 'AWAITING_PASSWORD' && !showPass ? 'password' : 'text'}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={authState === 'NORMAL' ? "Type a command..." : (authState === 'AWAITING_EMAIL' ? "Enter Admin Email..." : "Enter Access Key...")}
                  className={`w-full ${authState !== 'NORMAL' ? 'bg-black border-yellow-500/30 focus:border-yellow-500 focus:ring-yellow-500/20' : 'bg-slate-800/80 border-slate-600/50 focus:border-brand-500 focus:ring-brand-500/20'} border rounded-2xl py-4 pl-5 pr-14 text-[13px] font-bold text-white outline-none transition-all shadow-inner`}
                />
                
                {authState === 'AWAITING_PASSWORD' && (
                  <button 
                    type="button" 
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-14 top-1/2 -translate-y-1/2 p-2 text-yellow-500/50 hover:text-yellow-500 transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!input.trim()}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl text-white transition-all shadow-lg disabled:opacity-0 disabled:scale-90 ${
                    authState !== 'NORMAL' ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-brand-600 hover:bg-brand-500'
                  }`}
                >
                  <Send size={16} className="ml-0.5" />
                </button>
              </form>
              
              {authState === 'NORMAL' && (
                <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
                  {[
                    { label: 'Payroll', cmd: 'Audit Payroll' },
                    { label: 'Team', cmd: 'Roster Check' },
                    { label: 'Security', cmd: 'System Status' },
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleCommand(chip.cmd)}
                      className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black text-white/40 uppercase tracking-widest hover:bg-brand-600 hover:text-white hover:border-brand-500 transition-all whitespace-nowrap"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;
