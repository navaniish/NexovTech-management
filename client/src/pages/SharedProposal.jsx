import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Bot, DollarSign, Calendar, ShieldCheck, 
  Cpu, Send, CheckCircle2, ChevronRight, Download, 
  Sparkles, RefreshCw, MessageSquare, Plus, HelpCircle, 
  TrendingUp, Award, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
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
      const res = await axios.get(`${API_URL}/proposals/shared/${id}`);
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
      const res = await axios.post(`${API_URL}/proposals/shared/${id}/chat`, {
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
      const res = await axios.post(`${API_URL}/proposals/shared/${id}/accept`);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-brand-500/10 border-t-brand-600 rounded-full animate-spin" />
        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Loading Tailored Proposal Portal...</p>
      </div>
    );
  }

  if (!proposal || !lead) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle size={64} className="text-red-500 mb-6 animate-pulse" />
        <h1 className="text-2xl font-black text-white uppercase tracking-widest">Proposal Missing</h1>
        <p className="text-slate-400 text-xs mt-2 max-w-sm uppercase font-bold tracking-widest leading-relaxed">
          The requested B2B proposal link is invalid or has expired.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden relative">
      {/* Abstract Neon Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-16 relative z-10 flex flex-col gap-10">
        
        {/* Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                Interactive B2B Portal
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                Status: {proposal.status}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-none">
              Project Agreement Proposal
            </h1>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              Tailored specifically for <span className="text-white font-black">{lead.companyName}</span>
            </p>
          </div>
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
          >
            <Download size={14} /> Download Copy
          </button>
        </header>

        {launchedSuccessfully ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 md:p-16 rounded-[40px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent flex flex-col items-center justify-center text-center gap-6"
          >
            <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full flex items-center justify-center animate-bounce-slow">
              <CheckCircle2 size={48} />
            </div>
            <div className="space-y-2 max-w-xl">
              <h2 className="text-3xl font-black uppercase tracking-widest text-white">Project Activated!</h2>
              <p className="text-sm text-slate-300 leading-relaxed font-semibold">
                Thank you for accepting the proposal. The autonomous agent network has completed configuration. Developers are assigned, tasks are dispatched, and code repositories have been initialized.
              </p>
            </div>
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl text-left w-full max-w-md space-y-3">
              <div className="flex justify-between text-xs font-bold text-slate-400 border-b border-slate-800 pb-2">
                <span>Contract Value:</span>
                <span className="text-brand-400 font-black">₹{price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-b border-slate-800 pb-2">
                <span>Signee:</span>
                <span className="text-white font-black">{signatureName}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 pb-1">
                <span>Status:</span>
                <span className="text-emerald-400 font-black flex items-center gap-1"><ShieldCheck size={12} /> Active</span>
              </div>
            </div>
          </motion.div>
        ) : launching ? (
          <div className="p-8 md:p-16 rounded-[40px] border border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center text-center gap-8 min-h-[400px]">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-brand-500/10 border-t-brand-500 rounded-full animate-spin" />
              <Bot size={28} className="text-brand-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="space-y-3 max-w-md">
              <h3 className="text-xl font-black uppercase tracking-widest">Autonomous Deployment</h3>
              <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Executing workflow step {launchStep} of 6...</p>
              
              <div className="h-1.5 w-60 bg-slate-800 rounded-full overflow-hidden mx-auto mt-4">
                <div 
                  className="h-full bg-brand-500 transition-all duration-1000"
                  style={{ width: `${(launchStep / 6) * 100}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-900 text-[11px] font-bold font-mono text-brand-400 max-w-md w-full">
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
              
              {/* Card 1: Proposal Text Display */}
              <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[32px] space-y-6">
                <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                  <FileText className="text-brand-500" size={18} /> Contract Specifications
                </h3>
                <div className="prose prose-invert max-w-none text-sm text-slate-300 font-medium leading-relaxed bg-slate-950/50 p-6 rounded-2xl border border-slate-850 overflow-y-auto max-h-[500px] font-sans whitespace-pre-wrap">
                  {proposal.proposalText}
                </div>
              </div>

              {/* Card 2: Custom Option Selector */}
              <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[32px] space-y-6">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="text-indigo-400 animate-pulse" size={18} /> Service Customizer
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
                    Select additional integrations to customize this contract's scope in real-time.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addonsList.map((addon) => {
                    const isSelected = selectedAddons.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        onClick={() => handleAddonToggle(addon)}
                        className={`p-5 text-left border rounded-2xl transition-all flex flex-col justify-between gap-3 ${
                          isSelected 
                            ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                            : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-xs font-black text-white">{addon.name}</h4>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${
                              isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-850 text-slate-400'
                            }`}>
                              {isSelected ? 'Added' : 'Add'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                            {addon.desc}
                          </p>
                        </div>
                        <div className="text-xs font-black text-indigo-400 border-t border-slate-800 pt-2 w-full mt-2">
                          +₹{addon.price.toLocaleString()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card 3: Digital Signature & Acceptance */}
              <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[32px] space-y-6">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                    <Award className="text-emerald-500" size={18} /> Authorize Agreement
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
                    Sign digitally and activate autonomous agent deployment pipelines.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type Full Name to Sign</label>
                    <input
                      type="text"
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-brand-500 transition-all font-mono"
                    />
                  </div>

                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-900 text-[10px] font-bold text-slate-400 leading-relaxed font-mono">
                    By typing your name, you acknowledge that you accept the final quote amount of <span className="text-brand-400 font-black">₹{price.toLocaleString()}</span> and authorize NexovTech Corp to begin provisioning the project's codebase, resources, and specialist allocations immediately.
                  </div>

                  <button
                    onClick={handleAcceptProposal}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-600/10"
                  >
                    Accept Proposal & Launch Development
                  </button>
                </div>
              </div>
            </div>

            {/* Right Col: Price summary widget & AI Negotiation Chatbot */}
            <div className="space-y-8">
              
              {/* Cost Summary Card */}
              <div className="p-8 bg-gradient-to-b from-slate-900/60 to-slate-900/40 border border-slate-800 rounded-[32px] space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Total Contract Valuation</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>Base Proposal:</span>
                    <span className="text-white font-black">₹{basePrice.toLocaleString()}</span>
                  </div>
                  
                  {selectedAddons.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Add-ons:</div>
                      {selectedAddons.map(addonId => {
                        const addon = addonsList.find(a => a.id === addonId);
                        return (
                          <div key={addonId} className="flex justify-between text-[11px] font-bold text-indigo-300 pl-2">
                            <span className="truncate max-w-[150px]">{addon.name}</span>
                            <span>+₹{addon.price.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-lg font-black text-white pt-4 border-t border-slate-800">
                    <span>Total Amount:</span>
                    <span className="text-brand-400 text-2xl font-black">₹{price.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Chat Negotiation Card */}
              <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[32px] flex flex-col h-[500px] justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center animate-pulse">
                        <Bot size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">NEXA Sales AI</h4>
                        <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
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
                      <div className={`p-3.5 rounded-2xl text-[11px] font-semibold leading-relaxed ${
                        msg.sender === 'client' 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-2 items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-2">
                      <RefreshCw size={12} className="animate-spin" /> NEXA is typing...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendChatMessage} className="flex gap-2 pt-3 border-t border-slate-850">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Negotiate or ask questions..."
                    className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    className="p-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all"
                  >
                    <Send size={14} />
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
