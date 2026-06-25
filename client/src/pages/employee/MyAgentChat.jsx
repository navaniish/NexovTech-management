import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Cpu, Zap, Activity, Network, Send, MessageSquare,
  ChevronRight, Clock, ShieldCheck, Target, Database, Sparkles, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';
import { toast } from 'react-hot-toast';

const MyAgentChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Uplink active. I am the NEXA CEO Agent. You can query me or any of my specialist divisions (Project, HR, Finance, Security, Support) to orchestrate tasks or request boilerplates.' }
  ]);
  const [input, setInput] = useState('');
  const [hops, setHops] = useState([]);
  const [sending, setSending] = useState(false);
  const [activeAgent, setActiveAgent] = useState(null);

  const fetchChatHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/nexa/agent/chats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nexov_token') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to load chat history');
      const data = await response.json();

      const loadedMessages = [
        { role: 'assistant', content: 'Uplink active. I am the NEXA CEO Agent. You can query me or any of my specialist divisions (Project, HR, Finance, Security, Support) to orchestrate tasks or request boilerplates.' }
      ];

      const chronData = [...data].reverse();
      chronData.forEach(chat => {
        loadedMessages.push({ role: 'user', content: chat.message });
        loadedMessages.push({ role: 'assistant', content: chat.response, hops: chat.hops });
      });

      setMessages(loadedMessages);
      if (chronData.length > 0) {
        const lastChat = chronData[chronData.length - 1];
        setHops(lastChat.hops || []);
      }
    } catch (err) {
      console.error('⚠️ Could not load persistent agent chat history:', err);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, [user]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setSending(true);
    setHops([]);
    setActiveAgent('ceo');

    try {
      const response = await fetch(`${API_URL}/nexa/agent/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nexov_token') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMessage })
      });

      if (!response.ok) throw new Error('Multi-Agent Network offline');
      const result = await response.json();

      if (result.success) {
        let index = 0;
        const interval = setInterval(() => {
          if (index < result.hops.length) {
            const currentHop = result.hops[index];
            setHops(prev => [...prev, currentHop]);
            const recipient = currentHop.recipient.toLowerCase().replace(' agent', '');
            setActiveAgent(recipient);
            index++;
          } else {
            clearInterval(interval);
            setActiveAgent(null);
            setMessages(prev => [...prev, { role: 'assistant', content: result.response, hops: result.hops }]);
          }
        }, 1000);
      } else {
        throw new Error('Agent network failed to process');
      }
    } catch (err) {
      toast.error('AI Hub Link Failed');
      setMessages(prev => [...prev, { role: 'assistant', content: 'CEO Agent: Critical event loop failure. Connection to specialized division agents severed.' }]);
      setActiveAgent(null);
    } finally {
      setSending(false);
    }
  };

  const promptSuggestions = [
    { title: 'Project Agent', text: 'Generate a clean React Native component boilerplate for task details.' },
    { title: 'HR Agent', text: 'List the active specialist roster roles in our organization.' },
    { title: 'Finance Agent', text: 'Check the total financial budget for active projects.' },
    { title: 'Security Agent', text: 'Explain the zero-trust audit compliance logs of our node.' }
  ];

  return (
    <div className="w-full flex flex-col space-y-6 md:space-y-8 animate-in fade-in duration-1000 max-w-[1440px] mx-auto pb-20">

      {/* 1. HEADER */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 bg-slate-950 p-6 md:p-10 rounded-[24px] md:rounded-[32px] relative overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-500/10 blur-[80px] rounded-full -mr-20 -mt-20" />

        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
              <Network size={20} className="text-white md:size-[24px] animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none italic">
                NEXA <span className="text-indigo-500">AI Hub</span>
              </h1>
              <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Specialist Agentic Workspace</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <span className="px-3.5 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Event Bus Online
          </span>
        </div>
      </section>

      {/* 2. MAIN HUB INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-stretch">

        {/* Left Column: Event Loop Graph & Logs */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* Circular Graph Visualizer */}
          <div className="glass-card !p-6 md:!p-8 border-slate-100/60 shadow-xl flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Network size={16} className="text-indigo-500" /> State Graph Visualizer
                </h3>
                <p className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Glow rings track the active processing node</p>
              </div>
              {activeAgent && (
                <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest animate-pulse">
                  {activeAgent} active
                </span>
              )}
            </div>

            <div className="relative flex justify-center items-center py-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <svg viewBox="0 0 480 480" className="w-full max-w-[340px] md:max-w-[380px]" style={{ filter: 'drop-shadow(0 0 12px rgba(99,102,241,0.06))' }}>
                <defs>
                  <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.8" />
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <filter id="activeGlow">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                <circle cx="240" cy="240" r="220" fill="url(#bgGrad)" stroke="#e2e8f0" strokeWidth="1" />
                <circle cx="240" cy="240" r="140" fill="none" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4,6" />

                {(() => {
                  const agents = [
                    { id: 'hr', label: 'HR', color: '#6366f1', icon: '👥' },
                    { id: 'finance', label: 'Finance', color: '#10b981', icon: '₹' },
                    { id: 'sales', label: 'Sales', color: '#f59e0b', icon: '🎯' },
                    { id: 'marketing', label: 'Marketing', color: '#8b5cf6', icon: '✨' },
                    { id: 'security', label: 'Security', color: '#ef4444', icon: '🛡️' },
                    { id: 'project', label: 'Project', color: '#06b6d4', icon: '📋' },
                    { id: 'support', label: 'Support', color: '#ec4899', icon: '💬' },
                    { id: 'dealings', label: 'Dealings', color: '#f97316', icon: '💼' }
                  ];
                  const r = 170;
                  const cx = 240, cy = 240;
                  const nodeR = 30;

                  return (
                    <>
                      {agents.map((agent, i) => {
                        const angle = (2 * Math.PI * i) / agents.length - Math.PI / 2;
                        const nx = cx + r * Math.cos(angle);
                        const ny = cy + r * Math.sin(angle);
                        const isHopActive = hops.some(h => h.recipient?.toLowerCase().includes(agent.id));
                        const isCurrentlyActive = activeAgent === agent.id;
                        return (
                          <g key={`line-${agent.id}`}>
                            <line
                              x1={cx} y1={cy} x2={nx} y2={ny}
                              stroke={isHopActive ? agent.color : '#e2e8f0'}
                              strokeWidth={isCurrentlyActive ? 2.5 : 1}
                              strokeDasharray={isHopActive ? 'none' : '4,4'}
                              opacity={isHopActive ? 0.9 : 0.4}
                              style={{ transition: 'all 0.5s ease' }}
                            />
                            {isCurrentlyActive && (
                              <circle r="4" fill={agent.color} filter="url(#glow)">
                                <animateMotion dur="1s" repeatCount="indefinite">
                                  <mpath href={`#path-${agent.id}`} />
                                </animateMotion>
                              </circle>
                            )}
                            <path id={`path-${agent.id}`} d={`M ${cx} ${cy} L ${nx} ${ny}`} fill="none" />
                          </g>
                        );
                      })}

                      {agents.map((agent, i) => {
                        const angle = (2 * Math.PI * i) / agents.length - Math.PI / 2;
                        const nx = cx + r * Math.cos(angle);
                        const ny = cy + r * Math.sin(angle);
                        const isActive = activeAgent === agent.id || hops.some(h => h.recipient?.toLowerCase().includes(agent.id));
                        return (
                          <g key={`node-${agent.id}`}>
                            {isActive && (
                              <circle cx={nx} cy={ny} r={nodeR + 6} fill={agent.color} opacity="0.15" filter="url(#activeGlow)">
                                <animate attributeName="r" values={`${nodeR + 4};${nodeR + 10};${nodeR + 4}`} dur="1.5s" repeatCount="indefinite" />
                              </circle>
                            )}
                            <circle cx={nx} cy={ny} r={nodeR}
                              fill={isActive ? agent.color : '#f8fafc'}
                              stroke={agent.color}
                              strokeWidth={isActive ? 3 : 1.5}
                              style={{ transition: 'all 0.4s ease' }}
                            />
                            <text x={nx} y={ny - 3} textAnchor="middle" fontSize="13" dominantBaseline="middle">
                              {agent.icon}
                            </text>
                            <text x={nx} y={ny + 13} textAnchor="middle" fontSize="7" fontWeight="950" fill={isActive ? '#fff' : '#475569'}
                              fontFamily="sans-serif" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {agent.label}
                            </text>
                          </g>
                        );
                      })}

                      <g>
                        {activeAgent === 'ceo' && (
                          <circle cx={cx} cy={cy} r={46} fill="#8b5cf6" opacity="0.2" filter="url(#activeGlow)">
                            <animate attributeName="r" values="42;52;42" dur="1.5s" repeatCount="indefinite" />
                          </circle>
                        )}
                        <circle cx={cx} cy={cy} r={40}
                          fill={activeAgent === 'ceo' ? '#8b5cf6' : '#0f172a'}
                          style={{ transition: 'all 0.4s ease' }}
                        />
                        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" dominantBaseline="middle">🤖</text>
                        <text x={cx} y={cy + 11} textAnchor="middle" fontSize="8" fontWeight="950" fill="#fff"
                          fontFamily="sans-serif" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          CEO
                        </text>
                      </g>
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Event Loop Logs / Terminal */}
          <div className="glass-card p-6 border-slate-100 flex-1 flex flex-col min-h-[220px]">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Event Loop Log Console</h4>
            <div className="flex-1 bg-[#020617] rounded-2xl p-4 font-mono text-[9px] text-emerald-400 overflow-y-auto max-h-[200px] custom-scrollbar space-y-2">
              {hops.length === 0 ? (
                <span className="text-slate-500 italic block">Event bus idle. Awaiting command...</span>
              ) : (
                hops.map((hop, hIdx) => (
                  <div key={hIdx} className="leading-relaxed border-l border-emerald-500/20 pl-3">
                    <span className="text-slate-400">[{new Date(hop.timestamp).toLocaleTimeString()}]</span>{' '}
                    <span className="text-brand-400 font-extrabold">{hop.sender}</span>{' '}
                    <span className="text-white">➔</span>{' '}
                    <span className="text-indigo-400 font-extrabold">{hop.recipient}</span>:{' '}
                    <span className="text-slate-200">{hop.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Chat Console */}
        <div className="lg:col-span-5 glass-card p-6 md:p-8 border-slate-100 flex flex-col justify-between min-h-[500px]">
          <div className="flex flex-col h-full justify-between gap-6">
            <div>
              <h3 className="text-md font-black text-slate-900 tracking-tight flex items-center gap-2 mb-1">
                <Bot size={18} className="text-indigo-600" /> Specialist AI Chat Workspace
              </h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-6">
                Direct B2B multi-agent orchestration
              </p>

              {/* Chat Message Scroll */}
              <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar mb-4 flex flex-col">
                {messages.map((msg, mIdx) => (
                  <div
                    key={mIdx}
                    className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                  >
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      {msg.role === 'user' ? (user?.name || 'Specialist') : 'CEO Agent'}
                    </span>
                    <div className={`p-4 rounded-3xl text-xs font-semibold leading-relaxed shadow-sm ${msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-tr-none'
                        : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-none'
                      }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {sending && hops.length === 0 && (
                  <div className="self-start flex flex-col items-start max-w-[85%]">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">CEO Agent</span>
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Suggestions */}
            <div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Quick Transmission Presets</span>
              <div className="grid grid-cols-2 gap-2">
                {promptSuggestions.map((sug, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => setInput(sug.text)}
                    className="p-3 text-left bg-slate-50 border border-slate-100 hover:border-brand-500/30 rounded-2xl hover:bg-white transition-all duration-300"
                  >
                    <h5 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">{sug.title}</h5>
                    <p className="text-[10px] font-bold text-slate-500 leading-snug line-clamp-2">{sug.text}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="flex gap-3 bg-slate-50 p-2.5 rounded-[24px] border border-slate-100">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask AI agent..."
                disabled={sending}
                className="flex-1 bg-transparent px-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="w-11 h-11 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-brand-600 transition-all shadow-md disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
};

export default MyAgentChat;
