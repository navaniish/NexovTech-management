import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Bot, DollarSign, Calendar, ShieldCheck, 
  Cpu, Send, CheckCircle2, ChevronRight, Download, 
  Sparkles, RefreshCw, MessageSquare, Plus, HelpCircle, 
  TrendingUp, Award, AlertTriangle, Mic, Phone, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc';
import API_URL from '../config';

const SharedProposal = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState(null);
  const [lead, setLead] = useState(null);
  const [price, setPrice] = useState(0);
  const [basePrice, setBasePrice] = useState(0);

  // Add-on options selection
  const [selectedAddons, setSelectedAddons] = useState([]);
  const addonsList = [
    { id: 'seo', name: 'SEO & Copywriting Content Campaign', price: 35000, desc: 'AI-guided search index indexing and content marketing templates.' },
    { id: 'sec', name: 'Enterprise Zero-Trust Security Audit', price: 100000, desc: 'Complete penetration test, anomaly detection rules, and geofencing checks.' },
    { id: 'cloud', name: 'Multi-Tenant Cloud Deploy & Monitoring', price: 80000, desc: 'Docker/Kubernetes staging, live health status gauges, and load balancing.' },
    { id: 'support', name: '24/7 AI-Agent Customer Helpdesk Support', price: 50000, desc: 'Auto-reply support portal with dynamic ticket priorities.' }
  ];

  // Chat/Negotiation State
  const [chatOpen, setChatOpen] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { sender: 'nexa', text: 'Hello! I am NEXA, your dedicated virtual sales representative. Feel free to ask questions about our tech stack, deliverables, or timeline, or request a budget adjustment here.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Digital Signature
  const [signatureName, setSignatureName] = useState('');
  const [isSigned, setIsSigned] = useState(false);

  // Launch Simulation State
  const [launching, setLaunching] = useState(false);
  const [launchStep, setLaunchStep] = useState(0);
  const [launchedSuccessfully, setLaunchedSuccessfully] = useState(false);

  const chatEndRef = useRef(null);

  // ZEGOCLOUD WebRTC Calling States and Refs
  const zegoEngineRef = useRef(null);
  const zegoLocalStreamRef = useRef(null);
  const zegoPublishedStreamIdRef = useRef(null);

  const [zegoConnected, setZegoConnected] = useState(false);
  const [zegoConnecting, setZegoConnecting] = useState(false);
  const [zegoMuted, setZegoMuted] = useState(false);
  const [zegoActiveUsers, setZegoActiveUsers] = useState([]);
  const [zegoLocalStream, setZegoLocalStream] = useState(null);
  const [zegoPublishedStreamId, setZegoPublishedStreamId] = useState(null);

  const initZego = async (roomID) => {
    if (zegoEngineRef.current) return zegoEngineRef.current;
    
    const zegoAppId = 1087042515; 
    const zegoServerURL = "wss://webliveroom1087042515-api.coolzcloud.com/ws";
    
    const zg = new ZegoExpressEngine(zegoAppId, zegoServerURL);
    zegoEngineRef.current = zg;
    
    zg.on('roomStateUpdate', (room, state, errorCode, extendedData) => {
      if (state === 'CONNECTED') {
        setZegoConnected(true);
        setZegoConnecting(false);
      } else if (state === 'DISCONNECTED') {
        setZegoConnected(false);
        setZegoConnecting(false);
      }
    });
    
    zg.on('roomUserUpdate', (room, updateType, userList) => {
      if (updateType === 'ADD') {
        setZegoActiveUsers(prev => {
          const uids = userList.map(u => u.userID);
          const filtered = prev.filter(uid => !uids.includes(uid));
          return [...filtered, ...uids];
        });
        toast.success("Representative connected to voice line!");
      } else if (updateType === 'DELETE') {
        const deletedIds = userList.map(u => u.userID);
        setZegoActiveUsers(prev => prev.filter(uid => !deletedIds.includes(uid)));
      }
    });
    
    zg.on('roomStreamUpdate', async (room, updateType, streamList) => {
      if (updateType === 'ADD') {
        for (let i = 0; i < streamList.length; i++) {
          const stream = streamList[i];
          try {
            const remoteStream = await zg.startPlayingStream(stream.streamID);
            let audioEl = document.getElementById(`audio_${stream.streamID}`);
            if (!audioEl) {
              audioEl = document.createElement('audio');
              audioEl.id = `audio_${stream.streamID}`;
              audioEl.autoplay = true;
              document.body.appendChild(audioEl);
            }
            audioEl.srcObject = remoteStream;
            audioEl.play().catch(e => console.error("Error playing audio stream:", e));
          } catch (err) {
            console.error('Failed to play remote stream:', err);
          }
        }
      } else if (updateType === 'DELETE') {
        for (let i = 0; i < streamList.length; i++) {
          const stream = streamList[i];
          zg.stopPlayingStream(stream.streamID);
          const audioEl = document.getElementById(`audio_${stream.streamID}`);
          if (audioEl) audioEl.remove();
        }
      }
    });

    return zg;
  };

  const handleJoinZegoCall = async () => {
    if (!lead) return;
    const roomID = `room_${lead.companyName.toLowerCase().replace(/\s+/g, '')}`;
    const guestUserID = `client_${Math.floor(1000 + Math.random() * 9000)}`;
    
    setZegoConnecting(true);
    const loader = toast.loading("Establishing voice channel with representative...");
    
    try {
      const zg = await initZego(roomID);
      if (!zg) {
        setZegoConnecting(false);
        toast.dismiss(loader);
        return;
      }
      
      // Get token from backend public endpoint
      const tokenRes = await axios.post(`${API_URL}/nexa/voice/zego-token-public`, { roomID, userID: guestUserID });
      if (!tokenRes.data || !tokenRes.data.token) {
        throw new Error("Invalid token received from server.");
      }
      
      await zg.loginRoom(roomID, tokenRes.data.token, { userID: guestUserID, userName: `Client (${lead.companyName})` }, { userUpdate: true });
      
      const localStream = await zg.createStream({ camera: { audio: true, video: false } });
      setZegoLocalStream(localStream);
      zegoLocalStreamRef.current = localStream;
      
      const streamID = `stream_${guestUserID}_${Date.now()}`;
      await zg.startPublishingStream(streamID, localStream);
      setZegoPublishedStreamId(streamID);
      zegoPublishedStreamIdRef.current = streamID;
      
      setZegoConnected(true);
      setZegoConnecting(false);
      toast.success("Voice line active! Microphone connected.", { id: loader });
    } catch (err) {
      console.error("Zego join room failed:", err);
      toast.error(`Failed to join voice channel: ${err.message}`, { id: loader });
      setZegoConnecting(false);
      setZegoConnected(false);
    }
  };

  const handleDisconnectZegoCall = async () => {
    if (!lead) return;
    const roomID = `room_${lead.companyName.toLowerCase().replace(/\s+/g, '')}`;
    try {
      const zg = zegoEngineRef.current;
      if (zg) {
        if (zegoPublishedStreamId) {
          zg.stopPublishingStream(zegoPublishedStreamId);
        }
        if (zegoLocalStream) {
          zg.destroyStream(zegoLocalStream);
        }
        await zg.logoutRoom(roomID);
      }
      
      setZegoConnected(false);
      setZegoLocalStream(null);
      setZegoPublishedStreamId(null);
      setZegoActiveUsers([]);
      zegoLocalStreamRef.current = null;
      zegoPublishedStreamIdRef.current = null;
      toast.success("Disconnected from voice channel.");
    } catch (err) {
      console.error("Zego disconnect failed:", err);
      toast.error("Failed to close voice line.");
    }
  };

  const handleToggleMuteZego = () => {
    if (!zegoEngineRef.current || !zegoLocalStream) return;
    const nextMute = !zegoMuted;
    zegoEngineRef.current.mutePublishStreamAudio(zegoLocalStream, nextMute);
    setZegoMuted(nextMute);
    toast.success(nextMute ? "Microphone muted." : "Microphone active.");
  };

  // Add cleanup useEffect
  useEffect(() => {
    return () => {
      if (zegoEngineRef.current) {
        try {
          const roomID = `room_${lead?.companyName?.toLowerCase()?.replace(/\s+/g, '') || ''}`;
          if (zegoPublishedStreamIdRef.current) {
            zegoEngineRef.current.stopPublishingStream(zegoPublishedStreamIdRef.current);
          }
          if (zegoLocalStreamRef.current) {
            zegoEngineRef.current.destroyStream(zegoLocalStreamRef.current);
          }
          if (roomID) {
            zegoEngineRef.current.logoutRoom(roomID);
          }
        } catch (e) {
          console.error("Zego unmount cleanup error:", e);
        }
      }
    };
  }, [lead]);

  useEffect(() => {
    fetchProposalDetails();
  }, [id]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const fetchProposalDetails = async () => {
    try {
      const res = await axios.get(`${API_URL}/nexa/proposals/shared/${id}`);
      if (res.data.success) {
        setProposal(res.data.proposal);
        setLead(res.data.lead);
        const amount = Number(res.data.proposal.quotationAmount);
        setBasePrice(amount);
        setPrice(amount);
      } else {
        toast.error('Failed to load proposal details.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Proposal not found or network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddonToggle = (addon) => {
    if (selectedAddons.includes(addon.id)) {
      setSelectedAddons(selectedAddons.filter(item => item !== addon.id));
      setPrice(prev => prev - addon.price);
    } else {
      setSelectedAddons([...selectedAddons, addon.id]);
      setPrice(prev => prev + addon.price);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userMsg = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { sender: 'client', text: userMsg }]);
    setChatLoading(true);

    try {
      const res = await axios.post(`${API_URL}/nexa/proposals/shared/${id}/chat`, {
        message: userMsg,
        chatHistory: chatHistory.filter(h => h.text !== '')
      });

      if (res.data.success) {
        setChatHistory(prev => [...prev, { sender: 'nexa', text: res.data.reply }]);
        
        if (res.data.newBudget) {
          const discountDiff = basePrice - res.data.newBudget;
          setBasePrice(res.data.newBudget);
          setPrice(prev => res.data.newBudget + selectedAddons.reduce((acc, curr) => acc + (addonsList.find(a => a.id === curr)?.price || 0), 0));
          toast.success(`🎉 Proposal budget successfully negotiated! Adjusted to ₹${res.data.newBudget.toLocaleString()}`, { duration: 5000 });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Negotiation engine encountered an issue.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleAcceptProposal = async () => {
    if (!signatureName.trim()) {
      toast.error('Please type your full name to sign this agreement.');
      return;
    }
    setLaunching(true);
    setLaunchStep(1);

    // Run a high-tech simulated deployment progress
    const steps = [
      'Establishing connection with NexovTech command loops...',
      'Provisioning secure B2B private GitHub Repository...',
      'Matching optimal staff roster to technology requirements...',
      'Generating and assigning Jira milestone development tasks...',
      'Registering project metrics on zero-trust security channels...',
      'Broadcasting official project kickoff milestones to LinkedIn...'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLaunchStep(i + 2);
    }

    try {
      const res = await axios.post(`${API_URL}/nexa/proposals/shared/${id}/accept`);
      if (res.data.success) {
        setLaunchedSuccessfully(true);
        setIsSigned(true);
        toast.success('🎉 Proposal accepted and project autonomously deployed!');
      } else {
        toast.error('Deployment verification failed.');
        setLaunching(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Autonomous deployment server error.');
      setLaunching(false);
    }
  };

  const handleDownloadPDF = () => {
    const printContent = `
      NEXOVTECH CORP - SERVICE PROPOSAL AGREEMENT
      ===========================================
      Client: ${lead?.companyName}
      Industry: ${lead?.industry}
      Proposed Service: ${proposal?.serviceType}
      Final Contract Value: ₹${price.toLocaleString()}
      
      -------------------------
      PROPOSAL BRIEFING:
      ${proposal?.proposalText}
      
      -------------------------
      ADD-ON MODULES SELECTED:
      ${selectedAddons.length > 0 ? selectedAddons.map(a => `- ${addonsList.find(add => add.id === a)?.name} (+₹${addonsList.find(add => add.id === a)?.price.toLocaleString()})`).join('\n') : 'None'}
      
      -------------------------
      SIGNATURE:
      Signed digitally by: ${signatureName}
      Date: ${new Date().toLocaleDateString()}
      Transaction Verification ID: SHARED-PRP-${proposal?.id}
    `;

    const blob = new Blob([printContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NexovTech_Proposal_${lead?.companyName.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Proposal document downloaded.');
  };

  const cleanAndMergeProposalText = (text) => {
    if (!text) return '';
    
    // Normalize newlines
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const mergedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let currentLine = lines[i].trim();
      
      // If current line has an odd number of "**" (meaning one is unclosed)
      // and the next line has at least one "**"
      const asterisksCount = (currentLine.match(/\*\*/g) || []).length;
      if (asterisksCount % 2 === 1 && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.startsWith('**') || nextLine.endsWith('**') || nextLine.includes('**')) {
          // Merge them! Strip consecutive newlines and extra asterisks
          // If the next line starts with "**", strip it to avoid duplicates like "****"
          let cleanedNext = nextLine;
          if (cleanedNext.startsWith('**')) {
            cleanedNext = cleanedNext.substring(2).trim();
          }
          currentLine = `${currentLine}** ${cleanedNext}`;
          i++; // skip next line
        }
      }
      
      mergedLines.push(currentLine);
    }
    
    return mergedLines.join('\n');
  };

  const parseInlineFormatting = (text) => {
    if (!text) return '';
    const parts = text.split('**');
    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        if (!part.trim()) return null;
        return <strong key={idx} className="font-extrabold text-slate-900">{part}</strong>;
      }
      return part.replace(/\*/g, '');
    });
  };

  const renderFormattedProposalText = (text) => {
    if (!text) return null;
    
    const mergedText = cleanAndMergeProposalText(text);
    const sections = mergedText.split('\n');
    
    return (
      <div className="space-y-5">
        {sections.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-2" />;
          
          // Large Headers (# Title)
          if (trimmed.startsWith('# ')) {
            return (
              <h2 key={idx} className="text-xl md:text-2xl font-extrabold text-slate-900 pt-5 pb-1.5 border-b border-slate-100 font-jakarta flex items-center gap-2">
                <span className="w-1 h-5 bg-indigo-650 rounded-full" />
                {trimmed.replace('# ', '')}
              </h2>
            );
          }
          
          // Sub-headers (## Title or ### Title)
          if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-base font-bold text-slate-800 pt-3.5 font-jakarta flex items-center gap-1.5">
                <ChevronRight size={14} className="text-indigo-500" />
                {trimmed.replace(/^###?\s+/, '')}
              </h3>
            );
          }
          
          // Bullet list items
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-3 py-0.5">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                <p className="text-slate-650 text-sm leading-relaxed">{trimmed.replace(/^[\-\*]\s+/, '')}</p>
              </div>
            );
          }
          
          // Custom bold key-value matcher (e.g. **Project Title** Enhanced customer platform)
          const kvMatch = trimmed.match(/^\*\*(.*?)\*\*[:\s]*(.*)/);
          if (kvMatch) {
            const key = kvMatch[1].trim();
            const value = kvMatch[2].trim();
            if (key.length < 25 && value.length < 100) {
              return (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-100 transition-colors my-1.5">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">{key}</span>
                  <span className="text-xs font-bold text-slate-850">{value}</span>
                </div>
              );
            }
          }
          
          // Bold emphasis paragraphs
          if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            return (
              <p key={idx} className="text-sm font-bold text-slate-800 bg-indigo-50/50 px-4 py-2.5 rounded-xl border border-indigo-100/50 leading-relaxed">
                {trimmed.replace(/\*\*/g, '')}
              </p>
            );
          }
          
          // Key-Value pairs that might not have bolding
          if (trimmed.includes(':') && !trimmed.startsWith('http') && trimmed.split(':')[0].length < 25) {
            const parts = trimmed.split(':');
            const key = parts[0].trim();
            const value = parts.slice(1).join(':').trim();
            return (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-100 transition-colors my-1.5">
                <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">{key}</span>
                <span className="text-xs font-bold text-slate-800">{value}</span>
              </div>
            );
          }
          
          // Regular paragraph
          return (
            <p key={idx} className="text-slate-650 text-xs md:text-sm leading-relaxed font-normal">
              {parseInlineFormatting(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-655 rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-slate-700 font-extrabold tracking-tight font-jakarta text-sm">Secure Connection Active</p>
          <p className="text-slate-450 text-[10px] font-bold uppercase tracking-wider">Loading Shared B2B Proposal Portal...</p>
        </div>
      </div>
    );
  }

  if (!proposal || !lead) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 border border-rose-100 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-xl font-bold text-slate-800 font-jakarta tracking-tight">Proposal Expired or Missing</h1>
        <p className="text-slate-400 text-xs mt-2 max-w-sm font-semibold leading-relaxed">
          The requested B2B proposal link is invalid or has expired. Please contact Navaneeswar Daggupati for assistance.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-x-hidden relative pb-12">
      {/* Dynamic Google Fonts Import for custom styling */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Alex+Brush&display=swap');
        
        .font-jakarta {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .font-playfair {
          font-family: 'Playfair Display', serif;
        }
        .font-signature {
          font-family: 'Alex Brush', cursive;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Abstract Modern Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-70 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-5/40 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-5/30 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10 relative z-10 flex flex-col gap-8 font-jakarta">
        
        {/* Header Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
              <img src="/assets/logo_nexo.jpeg" alt="NexovTech Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-indigo-950 font-jakarta tracking-tight leading-tight">NexovTech Corp</h2>
              <p className="text-[9px] text-slate-450 font-bold uppercase tracking-widest leading-none">B2B Deal Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownloadPDF}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Download size={13} /> Download copy
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-8 md:p-12 text-white shadow-lg border border-slate-800">
          {/* Background visuals */}
          <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[90px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 bg-white/10 text-white rounded-full text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm border border-white/5">
                  Secure Shared Room
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm border ${
                  proposal.status === 'Accepted' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20' 
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/20'
                }`}>
                  Status: {proposal.status}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-jakarta leading-tight">
                Project Agreement for <span className="text-indigo-300 font-playfair italic font-normal">{lead.companyName}</span>
              </h1>
              <p className="text-slate-350 text-xs md:text-sm max-w-lg leading-relaxed font-light">
                Explore your tailored technological scope, align terms live with our team, and sign off online to initiate zero-delay provisioning.
              </p>
            </div>
            
            <div className="flex-shrink-0 bg-white/5 backdrop-blur-md rounded-2xl p-5.5 border border-white/10 space-y-3.5 min-w-[250px] shadow-inner">
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Lead Entity</div>
              <div className="text-base font-bold text-white leading-tight">{lead.companyName}</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-350">
                <span className="font-semibold text-indigo-200">{lead.industry || 'B2B Client'}</span>
                {lead.companySize && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-indigo-400" />
                    <span>{lead.companySize} Size</span>
                  </>
                )}
              </div>
              <div className="h-px bg-white/15 my-2" />
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Calendar size={13} className="text-indigo-300" />
                <span>Prepared: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {launchedSuccessfully ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 md:p-14 rounded-[32px] border border-emerald-100 bg-emerald-50/20 flex flex-col items-center justify-center text-center gap-6 shadow-sm"
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center shadow-inner">
              <CheckCircle2 size={32} />
            </div>
            <div className="space-y-2 max-w-xl">
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-800 font-jakarta">Project Authorized & Provisioned!</h2>
              <p className="text-xs md:text-sm text-slate-650 leading-relaxed font-medium">
                Thank you for accepting the proposal. The autonomous agent network has completed configuration. Developers are assigned, tasks are dispatched, and code repositories have been initialized.
              </p>
            </div>
            <div className="p-6 bg-white border border-slate-100 rounded-2xl text-left w-full max-w-md space-y-3 shadow-md shadow-slate-100/50">
              <div className="flex justify-between text-xs font-semibold text-slate-500 border-b border-slate-100 pb-2">
                <span>Contract Value:</span>
                <span className="text-indigo-650 font-bold">₹{price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-500 border-b border-slate-100 pb-2">
                <span>Authorized Signee:</span>
                <span className="text-slate-800 font-bold">{signatureName}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-500 pb-1">
                <span>Roster Status:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1"><ShieldCheck size={13} /> Active & Staffed</span>
              </div>
            </div>
          </motion.div>
        ) : launching ? (
          <div className="p-8 md:p-14 rounded-[32px] border border-slate-100 bg-white flex flex-col items-center justify-center text-center gap-8 min-h-[400px] shadow-sm">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <Bot size={20} className="text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="space-y-3 max-w-md">
              <h3 className="text-lg font-bold text-slate-800 font-jakarta tracking-tight">Initializing Platform Pipelines</h3>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Executing workflow step {launchStep} of 6...</p>
              
              <div className="h-1.5 w-60 bg-slate-100 rounded-full overflow-hidden mx-auto mt-4">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-1000"
                  style={{ width: `${(launchStep / 6) * 100}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 text-[11px] font-bold font-mono text-indigo-700 max-w-md w-full">
              {launchStep === 1 && "Establishing connection with NexovTech command loops..."}
              {launchStep === 2 && "Provisioning secure B2B private GitHub Repository..."}
              {launchStep === 3 && "Matching optimal staff roster to technology requirements..."}
              {launchStep === 4 && "Generating and assigning Jira milestone development tasks..."}
              {launchStep === 5 && "Registering project metrics on zero-trust security channels..."}
              {launchStep === 6 && "Broadcasting official project kickoff milestones to LinkedIn..."}
              {launchStep > 6 && "Finalizing verification..."}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Col: Proposal details & Customizer */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Proposal Document Body Card */}
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 md:p-10 space-y-8 relative overflow-hidden">
                {/* Decorative border ribbon */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div className="space-y-1">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <FileText className="text-indigo-500" size={13} /> Proposal Contract Agreement
                    </h3>
                    <p className="text-lg font-extrabold text-slate-900 font-jakarta tracking-tight">Contract Specifications & Scope</p>
                  </div>
                  <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-150">
                    ID: PRP-{proposal.id}
                  </span>
                </div>
                
                {/* Properly formatted text */}
                <div className="prose max-w-none text-slate-700 font-jakarta leading-relaxed">
                  {renderFormattedProposalText(proposal.proposalText)}
                </div>
              </div>

              {/* Service Customizer */}
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="text-purple-500 animate-pulse" size={13} /> Modular Integrations
                  </h3>
                  <h4 className="text-lg font-extrabold text-slate-900 font-jakarta tracking-tight mt-1">Configure Add-on Deliverables</h4>
                  <p className="text-xs text-slate-505 mt-1 leading-relaxed">
                    Personalize your solution architecture. Select optional features below to expand or target specific project outcomes.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addonsList.map((addon) => {
                    const isSelected = selectedAddons.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        onClick={() => handleAddonToggle(addon)}
                        className={`p-5 text-left border rounded-2xl transition-all flex flex-col justify-between gap-4 ${
                          isSelected 
                            ? 'bg-indigo-50/40 border-indigo-200 shadow-sm shadow-indigo-50/50' 
                            : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className={`text-xs font-bold font-jakarta leading-tight ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>{addon.name}</h4>
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-extrabold tracking-wider uppercase flex-shrink-0 ${
                              isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-505'
                            }`}>
                              {isSelected ? 'Selected' : 'Add'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {addon.desc}
                          </p>
                        </div>
                        <div className={`text-xs font-bold pt-2.5 border-t w-full ${isSelected ? 'border-indigo-100 text-indigo-600' : 'border-slate-200 text-slate-650'}`}>
                          +₹{addon.price.toLocaleString()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Digital Signature & Acceptance */}
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Award className="text-emerald-500" size={13} /> Authorization & Sign-off
                  </h3>
                  <h4 className="text-lg font-extrabold text-slate-900 font-jakarta tracking-tight mt-1">E-Sign & Activate Project</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Once satisfied with the terms and customizations, authorize this contract using a secure, legally-binding electronic signature.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Type Full Name to Authorize</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={signatureName}
                        onChange={(e) => setSignatureName(e.target.value)}
                        placeholder="e.g. Sarah Jenkins"
                        className="w-full p-4 bg-slate-50 border border-slate-250 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all font-jakarta shadow-sm"
                      />
                      
                      {signatureName && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-signature text-indigo-650 select-none pointer-events-none pr-2">
                          {signatureName}
                        </div>
                      )}
                    </div>
                  </div>

                  {signatureName && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Signature Preview</span>
                      <div className="text-4xl font-signature text-indigo-650 py-2 border-b border-dashed border-slate-300 text-center select-none">
                        {signatureName}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal text-center">Digitally signed via NexovTech Secure Portal</p>
                    </div>
                  )}

                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 text-[11px] font-semibold text-slate-650 leading-relaxed font-jakarta">
                    By submitting, you agree to secure execution of the <span className="text-indigo-600 font-bold">₹{price.toLocaleString()}</span> total project budget. Our deployment loops will launch immediately to provision codebases and resources.
                  </div>

                  <button
                    onClick={handleAcceptProposal}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-750 hover:from-emerald-500 hover:to-emerald-700 text-white p-4 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-100 hover:shadow-lg"
                  >
                    Accept Proposal & Initialize Project
                  </button>
                </div>
              </div>
            </div>

            {/* Right Col: Price summary widget & AI Negotiation Chatbot */}
            <div className="space-y-8">
              
              {/* Cost Summary Card */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Investment Summary</h3>
                
                <div className="space-y-3.5">
                  <div className="flex justify-between text-xs font-medium text-slate-500">
                    <span>Base Deliverables:</span>
                    <span className="text-slate-800 font-bold">₹{basePrice.toLocaleString()}</span>
                  </div>
                  
                  {selectedAddons.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Configured Upgrades:</div>
                      {selectedAddons.map(addonId => {
                        const addon = addonsList.find(a => a.id === addonId);
                        return (
                          <div key={addonId} className="flex justify-between text-[11px] font-semibold text-indigo-650 pl-2">
                            <span className="truncate max-w-[170px]">{addon.name}</span>
                            <span>+₹{addon.price.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm font-bold text-slate-700 pt-4 border-t border-slate-150 font-jakarta">
                    <span>Grand Total:</span>
                    <div className="text-right">
                      <div className="text-indigo-650 text-2xl font-black font-jakarta">₹{price.toLocaleString()}</div>
                      <div className="text-[9px] text-slate-400 font-normal uppercase tracking-wider mt-0.5">All-inclusive INR</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consultant Team Profile Card */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Solutions Partner</h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src="/assets/admin_dp.jpg" 
                      alt="Navaneeswar Daggupati" 
                      className="w-12 h-12 rounded-full object-cover border border-slate-150 shadow-sm"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200"; // fallback professional headshot
                      }}
                    />
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Navaneeswar Daggupati</h4>
                    <p className="text-[10px] text-slate-500 font-semibold leading-tight">Technical Director, NexovTech</p>
                    <p className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1">
                      Solutions Roster Lead
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed italic">
                  "Ready to align details or talk budget. Connect with me directly via our audio hotline, or negotiate terms in real-time with our sales AI assistant."
                </p>
              </div>

              {/* WebRTC Live Audio Card */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <style>{`
                  @keyframes soundwave {
                    0%, 100% { transform: scaleY(1); }
                    50% { transform: scaleY(2.2); }
                  }
                  .animate-soundwave {
                    animation: soundwave 1.2s ease-in-out infinite;
                    transform-origin: center;
                  }
                `}</style>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${zegoConnected ? 'bg-emerald-400' : 'bg-indigo-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${zegoConnected ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
                    </span>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Direct Voice Line</h3>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md tracking-wider ${
                    zegoConnected ? 'bg-emerald-50 text-emerald-750 font-bold' : zegoConnecting ? 'bg-amber-50 text-amber-700 animate-pulse' : 'bg-slate-100 text-slate-505'
                  }`}>
                    {zegoConnected ? 'Connected' : zegoConnecting ? 'Connecting...' : 'Offline'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Join a secure, latency-free voice channel to speak directly with Navaneeswar right from your browser.
                </p>

                {!zegoConnected ? (
                  <button
                    onClick={handleJoinZegoCall}
                    disabled={zegoConnecting}
                    className="w-full py-3 bg-gradient-to-r from-indigo-655 to-indigo-750 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-indigo-100 hover:shadow-lg"
                  >
                    {zegoConnecting ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        Connecting line...
                      </>
                    ) : (
                      <>
                        <Phone size={13} />
                        Call Representative
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Mic size={13} className={zegoMuted ? "text-slate-400" : "text-emerald-500 animate-pulse"} />
                        <span className="text-xs font-bold text-slate-700">
                          {zegoMuted ? 'Muted' : 'Voice Link Active'}
                        </span>
                      </div>
                      
                      {zegoConnected && !zegoMuted && (
                        <div className="flex items-center gap-1 justify-center h-4 pr-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <span
                              key={i}
                              className="w-0.5 bg-indigo-500 rounded-full transition-all animate-soundwave"
                              style={{
                                height: `${Math.floor(Math.random() * 10) + 3}px`,
                                animationDelay: `${i * 0.08}s`
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleToggleMuteZego}
                        className={`flex-1 py-2.5 border rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                          zegoMuted 
                            ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' 
                            : 'bg-indigo-55 border-indigo-150 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        {zegoMuted ? 'Unmute' : 'Mute'}
                      </button>
                      <button
                        onClick={handleDisconnectZegoCall}
                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Negotiation Card */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col h-[520px] justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                        <Bot size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider leading-tight">NEXA Sales Advisor</h4>
                        <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> AI Assistant • Online
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
                  {chatHistory.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex flex-col max-w-[85%] ${
                        msg.sender === 'client' ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <div className={`p-3.5 rounded-2xl text-xs font-medium leading-relaxed ${
                        msg.sender === 'client' 
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm shadow-indigo-100' 
                          : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/50'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-2 items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-2 animate-pulse">
                      <RefreshCw size={12} className="animate-spin text-indigo-500" /> NEXA is processing...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick Prompts */}
                <div className="flex flex-wrap gap-1.5 pb-3">
                  <button 
                    type="button"
                    onClick={() => { setChatMessage("Can you offer a 10% discount on the base project?"); }}
                    className="text-[10px] font-semibold text-slate-500 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1.5 rounded-full border border-slate-150 transition-colors"
                  >
                    Request Discount
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setChatMessage("What is our tech stack and timeline for delivery?"); }}
                    className="text-[10px] font-semibold text-slate-500 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1.5 rounded-full border border-slate-150 transition-colors"
                  >
                    Ask Timeline & Stack
                  </button>
                </div>

                <form onSubmit={handleSendChatMessage} className="flex gap-2 pt-3 border-t border-slate-100 font-jakarta">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ask NEXA or negotiate price..."
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="submit"
                    className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-md shadow-indigo-150"
                  >
                    <Send size={13} />
                  </button>
                </form>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default SharedProposal;
