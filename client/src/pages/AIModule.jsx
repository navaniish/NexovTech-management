import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Cpu, 
  Zap, 
  Activity, 
  TrendingUp, 
  Users, 
  DollarSign, 
  IndianRupee,
  Percent, 
  Briefcase, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Search,
  Globe,
  Layers,
  Send,
  Mail,
  MessageSquare,
  FileText,
  FileDown,
  BookOpen,
  LayoutGrid,
  CheckCircle,
  Copy,
  Link,
  ChevronRight,
  Share2,
  Play,
  Pause,
  Square,
  Phone,
  PhoneCall,
  Clock,
  ShieldCheck,
  Target,
  Database,
  Trash2,
  Plus,
  Edit3,
  Volume2,
  Mic,
  Network
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { nexaApi } from '../services/nexaApi';
import { toast } from 'react-hot-toast';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc';
import { useChat } from '../context/ChatContext';
import API_BASE from '../config';

// Brand icon fallbacks since they are not exported by this version of lucide-react
const Linkedin = Share2;
const Youtube = Play;

const AIModule = () => {
  const { socket } = useChat();

  // ZEGOCLOUD Web Speech recognition & synthesis states
  const [voiceTranscript, setVoiceTranscript] = useState([]);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const transcriptEndRef = useRef(null);

  const zegoConnectedRef = useRef(false);
  const agentSpeakingRef = useRef(false);
  const voiceLanguageRef = useRef('en');

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [voiceTranscript]);

  const [activeTab, setActiveTab] = useState('ceo'); // 'ceo', 'sales', 'marketing', 'network', 'whatsapp', 'memory', 'voice'
  const [biData, setBiData] = useState(null);
  const [retentionAlerts, setRetentionAlerts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [pendingDeals, setPendingDeals] = useState([]);
  const [loadingPendingDeals, setLoadingPendingDeals] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);

  // Outreach composer states
  const [activeOutreachChannel, setActiveOutreachChannel] = useState(null);
  const [outreachDraft, setOutreachDraft] = useState('');
  const [generatingOutreachDraft, setGeneratingOutreachDraft] = useState(false);
  const [customOutreachPrompt, setCustomOutreachPrompt] = useState('');
  const [sendingOutreach, setSendingOutreach] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState('en');
  const [whatsappInputs, setWhatsappInputs] = useState({});
  const [linkedinInputs, setLinkedinInputs] = useState({});

  // New state variables for LinkedIn and Project/Employee Automation
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [linkedinCompany, setLinkedinCompany] = useState('');
  const [checkingLinkedin, setCheckingLinkedin] = useState(false);
  const [publishingToLinkedIn, setPublishingToLinkedIn] = useState(false);
  const [automationStats, setAutomationStats] = useState(null);
  const [launchingProject, setLaunchingProject] = useState(false);
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [togglingAutopilot, setTogglingAutopilot] = useState(false);
  
  // Multi-Agent Network States
  const [networkMessages, setNetworkMessages] = useState([
    { role: 'assistant', content: 'Autonomous Multi-Agent Network online. Speak to the CEO Agent to orchestrate strategic actions across HR, Finance, Sales, Marketing, Security, Project, Support, and Dealings divisions.' }
  ]);
  const [networkInput, setNetworkInput] = useState('');
  const [agentHops, setAgentHops] = useState([]);
  const [sendingNetworkMessage, setSendingNetworkMessage] = useState(false);
  const [activeAgent, setActiveAgent] = useState(null);
  const [pendingRuns, setPendingRuns] = useState([]);

  // RAG Memory Console States
  const [vectorDocs, setVectorDocs] = useState([]);
  const [vectorLoading, setVectorLoading] = useState(false);
  const [vectorSearch, setVectorSearch] = useState('');
  const [newDocText, setNewDocText] = useState('');
  const [newDocCollection, setNewDocCollection] = useState('company_knowledge');
  const [newDocClient, setNewDocClient] = useState('');
  const [addingDoc, setAddingDoc] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [syncingProposals, setSyncingProposals] = useState(false);
  const [syncingOutreach, setSyncingOutreach] = useState(false);

  // Voice Waveform Player States
  const [outreachLogs, setOutreachLogs] = useState([]);
  const [selectedCallLog, setSelectedCallLog] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const waveCanvasRef = useRef(null);
  const waveAnimRef = useRef(null);
  const playIntervalRef = useRef(null);

  // ZEGOCLOUD WebRTC Calling States and Refs
  const zegoEngineRef = useRef(null);
  const zegoLocalStreamRef = useRef(null);
  const zegoPublishedStreamIdRef = useRef(null);
  const zegoRoomIdRef = useRef('');

  const [zegoRoomID, setZegoRoomID] = useState(`room_${Math.floor(1000 + Math.random() * 9000)}`);
  const [zegoUserID, setZegoUserID] = useState(`admin_${Math.floor(1000 + Math.random() * 9000)}`);
  const [zegoConnected, setZegoConnected] = useState(false);
  const [zegoConnecting, setZegoConnecting] = useState(false);
  const [zegoMuted, setZegoMuted] = useState(false);
  const [zegoActiveUsers, setZegoActiveUsers] = useState([]);
  const [zegoLocalStream, setZegoLocalStream] = useState(null);
  const [zegoPublishedStreamId, setZegoPublishedStreamId] = useState(null);


  // WhatsApp Simulator States
  const [whatsappMessages, setWhatsappMessages] = useState([
    { id: 1, sender: 'assistant', text: 'NEXA Agentic AI Administrator is online on WhatsApp. Ask me anything about corporate operations, roster checklists, cash flow audits, or tasks.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'read' }
  ]);
  const [whatsappInput, setWhatsappInput] = useState('');
  const [sendingWhatsappMessage, setSendingWhatsappMessage] = useState(false);

  
  // Lead discovery form inputs
  const [industry, setIndustry] = useState('healthcare');
  const [region, setRegion] = useState('All Countries');
  const [regionPreset, setRegionPreset] = useState('All Countries');
  
  // Local leads list searching/filtering states
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('All');

  // Proposal generation state
  const [serviceType, setServiceType] = useState('AI Solutions');
  const [quotationAmount, setQuotationAmount] = useState(400000);
  const [generatedProposal, setGeneratedProposal] = useState(null);
  const [generatingProposal, setGeneratingProposal] = useState(false);

  // Marketing content state
  const [contentType, setContentType] = useState('linkedin');
  const [contentCategory, setContentCategory] = useState('thought-leadership');
  const [contentTopic, setContentTopic] = useState('Building Autonomous Agentic AI Pipelines for SaaS');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatingContent, setGeneratingContent] = useState(false);

  // Synchronize refs to avoid stale closures in Web Speech callbacks
  useEffect(() => {
    zegoConnectedRef.current = zegoConnected;
  }, [zegoConnected]);

  useEffect(() => {
    agentSpeakingRef.current = agentSpeaking;
  }, [agentSpeaking]);

  useEffect(() => {
    voiceLanguageRef.current = voiceLanguage;
  }, [voiceLanguage]);

  // Socket.io real-time syncing for high-speed updates (Instagram concept)
  useEffect(() => {
    if (socket) {
      console.log('📡 OMNICHANNEL MONITOR: Listening to real-time sync updates.');
      
      socket.on('outreach_update', (updatedLog) => {
        console.log('📡 OMNICHANNEL MONITOR: Real-time update received:', updatedLog);
        
        // Update outreachLogs state dynamically
        setOutreachLogs(prev => {
          const exists = prev.some(l => (l.id && l.id === updatedLog.id) || (l._id && l._id === updatedLog._id));
          if (exists) {
            return prev.map(l => ((l.id && l.id === updatedLog.id) || (l._id && l._id === updatedLog._id)) ? updatedLog : l);
          } else {
            return [updatedLog, ...prev];
          }
        });

        // Trigger lead status update in current local state
        if (updatedLog.leadId) {
          setLeads(prev => prev.map(l => (l.id === updatedLog.leadId || l._id === updatedLog.leadId) ? { ...l, status: 'Outreach_Sent' } : l));
        }

        // Show toast alert on new inbound response
        if (updatedLog.status === 'Read' && updatedLog.messageType === 'Incoming_Response') {
          toast.success(`New client response from ${updatedLog.recipient || 'Outreach target'}!`, { icon: '💬' });
        }
      });

      socket.on('agent_run_update', (updatedRun) => {
        console.log('📡 AGENT RUN: Real-time update received:', updatedRun);
        setPendingRuns(prev => {
          if (updatedRun.status === 'Pending_Approval') {
            const exists = prev.some(r => r.id === updatedRun.id);
            if (exists) {
              return prev.map(r => r.id === updatedRun.id ? updatedRun : r);
            } else {
              return [updatedRun, ...prev];
            }
          } else {
            return prev.filter(r => r.id !== updatedRun.id);
          }
        });

        if (updatedRun.status === 'Completed') {
          fetchInitialData();
          setNetworkMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'user' && lastMsg.content === updatedRun.message) {
              return [...prev, {
                role: 'assistant',
                content: updatedRun.state.response,
                hops: updatedRun.state.hops
              }];
            }
            return prev;
          });
          if (updatedRun.state && updatedRun.state.hops) {
            setAgentHops(updatedRun.state.hops);
          }
        }
      });

      return () => {
        socket.off('outreach_update');
        socket.off('agent_run_update');
      };
    }
  }, [socket]);

  useEffect(() => {
    fetchInitialData(true);
    zegoRoomIdRef.current = zegoRoomID;

    // Check for LinkedIn OAuth redirect messages (errors or success states)
    const params = new URLSearchParams(window.location.search);
    const errorMsg = params.get('error');
    const linkedinStatus = params.get('linkedin');
    const companyName = params.get('company');

    if (errorMsg) {
      toast.error(`LinkedIn Integration Error: ${decodeURIComponent(errorMsg)}`, { duration: 8000 });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (linkedinStatus === 'connected') {
      toast.success(`Successfully connected to LinkedIn: ${decodeURIComponent(companyName || 'Feed')}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => {
      // Cleanup Zego call on unmount
      if (zegoEngineRef.current) {
        try {
          if (zegoPublishedStreamIdRef.current) {
            zegoEngineRef.current.stopPublishingStream(zegoPublishedStreamIdRef.current);
          }
          if (zegoLocalStreamRef.current) {
            zegoEngineRef.current.destroyStream(zegoLocalStreamRef.current);
          }
          zegoEngineRef.current.logoutRoom(zegoRoomIdRef.current);
        } catch (e) {
          console.error("Zego unmount cleanup error:", e);
        }
      }
    };
  }, []);

  const fetchAgentRuns = async () => {
    try {
      const runs = await nexaApi.getAgentRuns();
      setPendingRuns(runs.filter(r => r.status === 'Pending_Approval') || []);
    } catch (e) {
      console.warn('Failed to fetch pending agent runs:', e);
    }
  };

  const handleApproveAgentRun = async (runId) => {
    const loader = toast.loading('Authorizing agent action and resuming loop...');
    try {
      const result = await nexaApi.approveAgentRun(runId);
      if (result.success) {
        toast.success('Agent run authorized and resumed!', { id: loader });
        setPendingRuns(prev => prev.filter(r => r.id !== runId));
        if (result.status === 'Completed' || result.response) {
          setNetworkMessages(prev => [...prev, {
            role: 'assistant',
            content: result.response,
            hops: result.hops
          }]);
          setAgentHops(result.hops || []);
        }
      } else {
        throw new Error(result.message || 'Failed to approve');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Approval failed.', { id: loader });
    }
  };

  const handleRejectAgentRun = async (runId) => {
    const loader = toast.loading('Declining agent action and aborting run...');
    try {
      const result = await nexaApi.rejectAgentRun(runId);
      if (result.success) {
        toast.success('Agent run declined and aborted.', { id: loader });
        setPendingRuns(prev => prev.filter(r => r.id !== runId));
      } else {
        throw new Error(result.message || 'Failed to reject');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Rejection failed.', { id: loader });
    }
  };

  const fetchInitialData = async (isFirstLoad = false) => {
    if (isFirstLoad) {
      setLoading(true);
    }
    try {
      const [data, alerts, authStatus, autoStatus, leadsResult, pendingDealsResult, autopilotRes] = await Promise.all([
        nexaApi.getBIData(),
        nexaApi.getRetentionAlerts(),
        nexaApi.getLinkedInStatus().catch(() => ({ connected: false })),
        nexaApi.getAutomationStatus().catch(() => null),
        nexaApi.getLeads().catch(() => ({ leads: [] })),
        nexaApi.getPendingDeals().catch(() => ({ deals: [] })),
        nexaApi.getAutopilotStatus().catch(() => ({ enabled: false }))
      ]);

      if (data) setBiData(data);
      if (alerts) setRetentionAlerts(alerts);
      if (leadsResult && leadsResult.leads) setLeads(leadsResult.leads);
      if (pendingDealsResult && pendingDealsResult.deals) setPendingDeals(pendingDealsResult.deals);
      
      if (authStatus && authStatus.connected) {
        setLinkedinConnected(true);
        setLinkedinCompany(authStatus.companyName);
      } else {
        setLinkedinConnected(false);
        setLinkedinCompany('');
      }

      if (autoStatus) setAutomationStats(autoStatus);
      if (autopilotRes) setAutopilotEnabled(autopilotRes.enabled);
      await fetchAgentRuns();
    } catch (err) {
      console.warn('NEXA integration scan failed.', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutopilot = async () => {
    setTogglingAutopilot(true);
    const loader = toast.loading(autopilotEnabled ? 'Deactivating NEXA Autopilot...' : 'Activating NEXA Autopilot...');
    try {
      const result = await nexaApi.toggleAutopilot(!autopilotEnabled);
      setAutopilotEnabled(result.enabled);
      toast.success(result.enabled ? 'NEXA Autopilot Active (24/7 background mode enabled)' : 'NEXA Autopilot Disabled (Idle)', { id: loader });
      fetchInitialData();
    } catch (err) {
      toast.error('Failed to toggle Autopilot mode.', { id: loader });
    } finally {
      setTogglingAutopilot(false);
    }
  };

  const handleConnectLinkedIn = (useCompany = false) => {
    window.location.href = `${API_BASE}/linkedin/auth?useCompany=${useCompany}`;
  };

  const handleSendNetworkMessage = async (e) => {
    if (e) e.preventDefault();
    if (!networkInput.trim() || sendingNetworkMessage) return;

    const userMessage = networkInput.trim();
    setNetworkInput('');
    setNetworkMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setSendingNetworkMessage(true);
    setAgentHops([]);
    setActiveAgent('ceo');

    try {
      const result = await nexaApi.sendAgentChatMessage(userMessage);
      if (result.success) {
        // Run animation of the event loop hops
        let index = 0;
        const interval = setInterval(() => {
          if (index < result.hops.length) {
            const currentHop = result.hops[index];
            setAgentHops(prev => [...prev, currentHop]);
            
            // Highlight current active agent based on recipient
            const recipient = currentHop.recipient.toLowerCase().replace(' agent', '');
            setActiveAgent(recipient);
            
            index++;
          } else {
            clearInterval(interval);
            setActiveAgent(null);
            // Append final assistant response
            setNetworkMessages(prev => [...prev, { role: 'assistant', content: result.response, hops: result.hops }]);
          }
        }, 1200);
      } else {
        throw new Error('Failed to run agent network');
      }
    } catch (err) {
      toast.error('Multi-Agent Network communication failure.');
      setNetworkMessages(prev => [...prev, { role: 'assistant', content: 'CEO Agent: Critical event loop failure. Connection to specialized division agents severed.' }]);
      setActiveAgent(null);
    } finally {
      setSendingNetworkMessage(false);
    }
  };

  const handleSendWhatsappMessage = async (e) => {
    if (e) e.preventDefault();
    if (!whatsappInput.trim() || sendingWhatsappMessage) return;

    const userText = whatsappInput.trim();
    setWhatsappInput('');
    
    // Add User bubble
    const userMsgId = Date.now();
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setWhatsappMessages(prev => [...prev, {
      id: userMsgId,
      sender: 'user',
      text: userText,
      time: currentTime,
      status: 'sent'
    }]);

    setSendingWhatsappMessage(true);
    setAgentHops([]);
    setActiveAgent('ceo');

    // Simulate sending checkmarks progression: sent -> delivered
    setTimeout(() => {
      setWhatsappMessages(prev => prev.map(m => m.id === userMsgId ? { ...m, status: 'delivered' } : m));
    }, 400);

    try {
      const result = await nexaApi.sendWhatsappSimulatorMessage(userText);
      
      // Simulate blue tick (read status) once API replies
      setWhatsappMessages(prev => prev.map(m => m.id === userMsgId ? { ...m, status: 'read' } : m));

      if (result.success) {
        let index = 0;
        const interval = setInterval(() => {
          if (index < result.hops.length) {
            const currentHop = result.hops[index];
            setAgentHops(prev => [...prev, currentHop]);
            const recipient = currentHop.recipient.toLowerCase().replace(' agent', '');
            setActiveAgent(recipient);
            index++;
          } else {
            clearInterval(interval);
            setActiveAgent(null);
            
            // Add Assistant bubble
            setWhatsappMessages(prev => [...prev, {
              id: Date.now() + 1,
              sender: 'assistant',
              text: result.response,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'read'
            }]);
          }
        }, 1200);
      } else {
        throw new Error('Failed to run agent loop');
      }
    } catch (err) {
      toast.error('WhatsApp gateway sync failed.');
      setWhatsappMessages(prev => [...prev, {
        id: Date.now() + 2,
        sender: 'assistant',
        text: '⚠️ System Error: Unable to synchronize message payload with the WhatsApp Cloud Interface.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read'
      }]);
      setActiveAgent(null);
    } finally {
      setSendingWhatsappMessage(false);
    }
  };


  const handleDisconnectLinkedIn = async () => {
    const loader = toast.loading('Disconnecting LinkedIn company page...');
    try {
      await nexaApi.disconnectLinkedIn();
      setLinkedinConnected(false);
      setLinkedinCompany('');
      toast.success('LinkedIn disconnected.', { id: loader });
    } catch (err) {
      toast.error('Failed to disconnect LinkedIn page.', { id: loader });
    }
  };

  const handlePublishToLinkedIn = async () => {
    if (!generatedContent) return;
    setPublishingToLinkedIn(true);
    const loader = toast.loading('Posting update to LinkedIn Company Page...');
    try {
      await nexaApi.shareLinkedInPost(generatedContent);
      toast.success('Shared live on LinkedIn Feed!', { id: loader });
    } catch (err) {
      const serverErrorMsg = err.response?.data?.error?.message || err.response?.data?.message || err.response?.data?.error || err.message;
      toast.error(`Failed to post to LinkedIn: ${serverErrorMsg}`, { id: loader, duration: 6000 });
    } finally {
      setPublishingToLinkedIn(false);
    }
  };

  const handleAutoLaunchProject = async () => {
    if (!selectedLead) return;
    setLaunchingProject(true);
    const loader = toast.loading('AI Agent initializing project deployment...');
    try {
      const result = await nexaApi.autoLaunchProject({
        leadId: selectedLead.id || selectedLead._id,
        proposalId: generatedProposal?.id
      });
      toast.success('Project launched autonomously!', { id: loader });
      setSelectedLead(null);
      setGeneratedProposal(null);
      fetchInitialData();
    } catch (err) {
      toast.error('Autonomous project launch failed.', { id: loader });
    } finally {
      setLaunchingProject(false);
    }
  };

  const handleApprovePendingDeal = async (id) => {
    const loader = toast.loading('AI Agent launching project deployment...');
    try {
      const result = await nexaApi.approvePendingDeal(id);
      if (result.success) {
        toast.success(result.message || 'Deal approved and pipeline launched autonomously!', { id: loader });
        fetchInitialData();
      } else {
        throw new Error(result.message || 'Failed to approve deal');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Autonomous deal approval failed.', { id: loader });
    }
  };

  const handleRejectPendingDeal = async (id) => {
    const loader = toast.loading('Archiving and rejecting deal...');
    try {
      const result = await nexaApi.rejectPendingDeal(id);
      if (result.success) {
        toast.success(result.message || 'Deal rejected and lead archived.', { id: loader });
        fetchInitialData();
      } else {
        throw new Error(result.message || 'Failed to reject deal');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Deal rejection failed.', { id: loader });
    }
  };

  // ─── RAG Memory Console Handlers ───────────────────────────────────────────
  const fetchVectorDocs = async () => {
    setVectorLoading(true);
    try {
      const result = await nexaApi.listVectorDocs(newDocCollection);
      setVectorDocs(result.documents || []);
    } catch (err) {
      toast.error('Failed to fetch vector memory.');
    } finally {
      setVectorLoading(false);
    }
  };

  const handleAddVectorDoc = async () => {
    if (!newDocText.trim()) return;
    setAddingDoc(true);
    const loader = toast.loading('Seeding document to RAG memory...');
    try {
      await nexaApi.addCustomVectorDoc({
        collectionName: newDocCollection,
        text: newDocText,
        clientName: newDocClient
      });
      toast.success('Document seeded to vector store successfully!', { id: loader });
      setNewDocText('');
      setNewDocClient('');
      fetchVectorDocs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to seed document.', { id: loader });
    } finally {
      setAddingDoc(false);
    }
  };

  const handleDeleteVectorDoc = async (docId) => {
    if (!docId) return;
    setDeletingDocId(docId);
    const loader = toast.loading('Pruning document from memory...');
    try {
      await nexaApi.deleteVectorDoc(docId);
      toast.success('Document pruned from vector memory.', { id: loader });
      setVectorDocs(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Pruning failed.', { id: loader });
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleSyncProposals = async () => {
    setSyncingProposals(true);
    const loader = toast.loading('Syncing historical proposals to RAG dealings_memory...');
    try {
      const res = await nexaApi.syncVectorProposals();
      if (res.success) {
        toast.success(`Successfully synced ${res.synced} proposals to vector store!`, { id: loader });
        fetchVectorDocs();
      } else {
        throw new Error(res.message || 'Sync failed');
      }
    } catch (err) {
      toast.error(`Sync proposals failed: ${err.message}`, { id: loader });
    } finally {
      setSyncingProposals(false);
    }
  };

  const handleSyncOutreach = async () => {
    setSyncingOutreach(true);
    const loader = toast.loading('Syncing historical outreach logs to RAG crm_memory...');
    try {
      const res = await nexaApi.syncVectorOutreach();
      if (res.success) {
        toast.success(`Successfully synced ${res.synced} outreach logs to vector store!`, { id: loader });
        fetchVectorDocs();
      } else {
        throw new Error(res.message || 'Sync failed');
      }
    } catch (err) {
      toast.error(`Sync outreach logs failed: ${err.message}`, { id: loader });
    } finally {
      setSyncingOutreach(false);
    }
  };

  // ─── Voice Outreach Logs Handlers ──────────────────────────────────────────
  const fetchOutreachLogs = async () => {
    try {
      const result = await nexaApi.getOutreachLogs();
      setOutreachLogs(result.logs || []);
    } catch (err) {
      toast.error('Failed to fetch outreach logs.');
    }
  };

  const handleExportLeadsToCSV = () => {
    if (filteredLeads.length === 0) {
      toast.error('No leads available to export.');
      return;
    }

    // Define CSV Headers
    const headers = [
      'Company Name',
      'Website',
      'Industry',
      'Company Size',
      'Tech Stack',
      'Contact Name',
      'Primary Email',
      'Phone',
      'LinkedIn URL',
      'Opportunity Score',
      'Status'
    ];

    // Map lead records to CSV rows
    const rows = filteredLeads.map(lead => {
      const companyName = typeof lead.companyName === 'object' && lead.companyName ? lead.companyName.name : lead.companyName || '';
      const techStack = Array.isArray(lead.techStack) ? lead.techStack.join('; ') : '';
      const email = lead.emails?.[0] || (lead.contactInfo?.emails?.[0] || '');
      const phone = lead.phones?.[0] || (lead.contactInfo?.phones?.[0] || '');
      const linkedin = lead.linkedinUrls?.[0] || (lead.contactInfo?.linkedInUrls?.[0] || '');
      const score = lead.leadScores?.[0]?.overallOpportunityScore || '';
      const status = lead.status || '';
      const contactName = lead.contactName || (lead.contactInfo?.primaryContactName || '');

      return [
        `"${companyName.replace(/"/g, '""')}"`,
        `"${(lead.website || '').replace(/"/g, '""')}"`,
        `"${(lead.industry || '').replace(/"/g, '""')}"`,
        `"${(lead.companySize || '').replace(/"/g, '""')}"`,
        `"${techStack.replace(/"/g, '""')}"`,
        `"${contactName.replace(/"/g, '""')}"`,
        `"${email.replace(/"/g, '""')}"`,
        `"${phone.replace(/"/g, '""')}"`,
        `"${linkedin.replace(/"/g, '""')}"`,
        `"${score}"`,
        `"${status}"`
      ];
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `NEXA_Leads_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Leads exported to Excel/CSV sheet successfully!');
  };

  // 1. Scraping & discovery trigger
  const handleDiscoverLeads = async (e) => {
    e.preventDefault();
    setScraping(true);
    try {
      const result = await nexaApi.discoverLeads({ industry, region, limit: 5 });
      toast.success(result.message || 'Leads discovered successfully.');
      if (result.leads) {
        setLeads(result.leads);
        // Refresh dashboard metrics
        fetchInitialData();
      }
    } catch (err) {
      toast.error('Lead discovery campaign failed.');
    } finally {
      setScraping(false);
    }
  };

  // 2. Score Lead manually
  const handleScoreLead = async (leadId) => {
    const loader = toast.loading('Calculating opportunity index...');
    try {
      const result = await nexaApi.scoreLead(leadId);
      toast.success('Lead scoring finalized.', { id: loader });
      // Refresh current discovery list
      setLeads(leads.map(l => (l.id === leadId || l._id === leadId) ? { ...l, status: 'Scored' } : l));
      fetchInitialData();
    } catch (err) {
      toast.error('AI scoring sync failed.', { id: loader });
    }
  };

  // 3. Generate Service Proposal
  const handleGenerateProposal = async () => {
    if (!selectedLead) return;
    setGeneratingProposal(true);
    try {
      const result = await nexaApi.generateProposal({
        leadId: selectedLead.id || selectedLead._id,
        serviceType,
        quotationAmount
      });
      toast.success('Proposal generated successfully.');
      setGeneratedProposal(result.proposal);
      // Update local lead status
      setLeads(leads.map(l => (l.id === selectedLead.id || l._id === selectedLead._id) ? { ...l, status: 'Proposal_Generated' } : l));
    } catch (err) {
      toast.error('Proposal compile protocol failed.');
    } finally {
      setGeneratingProposal(false);
    }
  };

  const handleLoadOutreachDraft = async (channel, customDetails = '', overrideLang = null) => {
    if (!selectedLead) return;
    setActiveOutreachChannel(channel);
    if (channel === 'Voice Call') {
      setCustomOutreachPrompt(selectedLead.phone || selectedLead.contactPhone || (selectedLead.contactInfo && selectedLead.contactInfo.phone) || '');
    }
    setGeneratingOutreachDraft(true);
    setOutreachDraft('');
    try {
      const result = await nexaApi.generateOutreachDraft({
        leadId: selectedLead.id || selectedLead._id,
        channel,
        customPrompt: customDetails,
        language: overrideLang || voiceLanguage
      });
      setOutreachDraft(result.draft || '');
    } catch (err) {
      toast.error('Failed to generate outreach draft.');
    } finally {
      setGeneratingOutreachDraft(false);
    }
  };

  const handleSendOutreach = async () => {
    if (!selectedLead || !activeOutreachChannel) return;
    if (activeOutreachChannel !== 'Voice Call' && !outreachDraft) return;
    
    const targetChannel = activeOutreachChannel;
    const targetDraft = outreachDraft;
    const targetLeadId = selectedLead.id || selectedLead._id;
    const targetLeadName = typeof selectedLead.companyName === 'object' && selectedLead.companyName ? selectedLead.companyName.name : selectedLead.companyName;

    // 1. OPTIMISTIC UPDATE: Generate temporary log immediately for high-speed feel (Instagram concept)
    const optimisticLog = {
      id: `optimistic_${Date.now()}`,
      leadId: targetLeadId,
      channel: targetChannel === 'Voice Call' ? 'voice' : targetChannel,
      recipient: targetChannel === 'Voice Call' 
        ? (customOutreachPrompt || selectedLead.phone || targetLeadName)
        : (targetChannel === 'Email' ? (selectedLead.emails?.[0] || 'Email') : targetLeadName),
      contentSent: targetDraft,
      outcome: 'Queueing dispatch asynchronously...',
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    // Prepend to current outreach logs list instantly
    setOutreachLogs(prev => [optimisticLog, ...prev]);

    // Close panel and reset states instantly (Optimistic UI)
    setSelectedLead(null);
    setActiveOutreachChannel(null);
    setOutreachDraft('');
    setCustomOutreachPrompt('');

    // Trigger success notification immediately
    toast.success(`Outreach campaign dispatched successfully!`);

    // Jump to the Outreach Monitor tab immediately so they can see the real-time queue worker tick
    setActiveTab('voice');

    // 2. Issuing asynchronous backend dispatch in the background
    try {
      if (targetChannel === 'Voice Call') {
        const targetNum = customOutreachPrompt || '';
        await nexaApi.simulateVoiceCall(
          targetLeadId,
          targetNum,
          voiceLanguage,
          targetDraft
        );
      } else {
        await nexaApi.sendOutreach({
          leadId: targetLeadId,
          channel: targetChannel,
          messageType: 'Cold_Outreach',
          messageContent: targetDraft
        });
      }
      
      // Update local leads list status
      setLeads(prevLeads => prevLeads.map(l => (l.id === targetLeadId || l._id === targetLeadId) ? { ...l, status: 'Outreach_Sent' } : l));
    } catch (err) {
      console.error('Outreach background dispatch failed:', err);
      // Revert optimistic log or mark as failed
      setOutreachLogs(prev => prev.map(l => l.id === optimisticLog.id ? { ...l, status: 'Failed', outcome: 'Transmission error' } : l));
      toast.error('Outreach background dispatch failed.');
    }
  };

  // ZEGOCLOUD Voice Call Room Handlers
  const initZego = async (roomID) => {
    if (zegoEngineRef.current) return zegoEngineRef.current;
    
    const zegoAppId = 1087042515; 
    const zegoServerURL = "wss://webliveroom1087042515-api.coolzcloud.com/ws";
    
    const zg = new ZegoExpressEngine(zegoAppId, zegoServerURL);
    zegoEngineRef.current = zg;
    
    zg.on('roomStateUpdate', (room, state, errorCode, extendedData) => {
      console.log('Zego roomStateUpdate:', room, state, errorCode);
      if (state === 'CONNECTED') {
        setZegoConnected(true);
        setZegoConnecting(false);
      } else if (state === 'DISCONNECTED') {
        setZegoConnected(false);
        setZegoConnecting(false);
      }
    });
    
    zg.on('roomUserUpdate', (room, updateType, userList) => {
      console.log('Zego roomUserUpdate:', updateType, userList);
      if (updateType === 'ADD') {
        setZegoActiveUsers(prev => {
          const uids = userList.map(u => u.userID);
          const filtered = prev.filter(uid => !uids.includes(uid));
          return [...filtered, ...uids];
        });
        toast.success(`User ${userList[0].userName || userList[0].userID} joined WebRTC Call.`);
      } else if (updateType === 'DELETE') {
        const deletedIds = userList.map(u => u.userID);
        setZegoActiveUsers(prev => prev.filter(uid => !deletedIds.includes(uid)));
      }
    });
    
    zg.on('roomStreamUpdate', async (room, updateType, streamList) => {
      console.log('Zego roomStreamUpdate:', updateType, streamList);
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
            audioEl.play().catch(e => console.error("Error playing remote audio:", e));
            toast.success(`Connected to remote speaker: ${stream.user.userName || stream.user.userID}`);
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

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    window.speechSynthesis.cancel();
  };

  const startSpeechRecognition = () => {
    stopSpeechRecognition();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    
    // Map voiceLanguage (en, en-in, hi, te) to BCP-47 tags
    let langTag = 'en-US';
    if (voiceLanguageRef.current === 'hi') langTag = 'hi-IN';
    else if (voiceLanguageRef.current === 'te') langTag = 'te-IN';
    else if (voiceLanguageRef.current === 'en-in') langTag = 'en-IN';
    rec.lang = langTag;

    rec.onresult = async (event) => {
      const resultIndex = event.resultIndex;
      const transcriptText = event.results[resultIndex][0].transcript.trim();
      if (!transcriptText) return;

      console.log("🎙️ Zego call user voice captured:", transcriptText);
      setVoiceTranscript(prev => [...prev, { sender: 'user', text: transcriptText }]);

      // Stop recognition temporarily during agent response and speech synthesis
      rec.stop();

      try {
        // Show thinking indicator for AI
        setZegoActiveUsers(prev => prev.includes("NEXA Voice Agent (AI)") ? prev : ["NEXA Voice Agent (AI)", ...prev]);
        setZegoConnecting(true);

        const res = await nexaApi.sendAgentChatMessage(`[Live Voice Call Consultation Room] The user said: "${transcriptText}". Respond to them in the same language. Keep your response extremely short (1 to 2 sentences max, 30 words max), natural, conversational, and direct. Do not write in markdown. Do not repeat their input.`);
        
        setZegoConnecting(false);
        
        if (res.success && res.response) {
          const reply = res.response;
          setVoiceTranscript(prev => [...prev, { sender: 'agent', text: reply }]);
          
          setAgentSpeaking(true);
          const utterance = new SpeechSynthesisUtterance(reply);
          utterance.lang = langTag;
          
          utterance.onend = () => {
            setAgentSpeaking(false);
            if (zegoConnectedRef.current) {
              try { rec.start(); } catch (e) {}
            }
          };
          
          utterance.onerror = () => {
            setAgentSpeaking(false);
            if (zegoConnectedRef.current) {
              try { rec.start(); } catch (e) {}
            }
          };

          window.speechSynthesis.speak(utterance);
        } else {
          throw new Error("Empty agent response");
        }
      } catch (err) {
        console.error("Zego call voice agent error:", err);
        setZegoConnecting(false);
        setAgentSpeaking(false);
        if (zegoConnectedRef.current) {
          try { rec.start(); } catch (e) {}
        }
      }
    };

    rec.onerror = (e) => {
      console.warn("Speech recognition error:", e.error);
    };

    rec.onend = () => {
      // Auto-restart if call is still active and agent is not speaking
      if (zegoConnectedRef.current && !agentSpeakingRef.current) {
        try {
          rec.start();
        } catch (err) {}
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      console.error("Speech recognition startup failed:", e);
    }
  };

  const handleJoinZegoCall = async () => {
    if (!zegoRoomID.trim()) {
      toast.error("Please enter or generate a Room ID.");
      return;
    }
    
    setZegoConnecting(true);
    const loader = toast.loading("Authorizing token and joining Zego voice channel...");
    
    try {
      const zg = await initZego(zegoRoomID);
      if (!zg) {
        setZegoConnecting(false);
        toast.dismiss(loader);
        return;
      }
      
      // Get token from backend
      const tokenRes = await nexaApi.getZegoToken(zegoRoomID, zegoUserID);
      if (!tokenRes || !tokenRes.token) {
        throw new Error("Invalid Zego token received from server.");
      }
      
      // Login Room
      await zg.loginRoom(zegoRoomID, tokenRes.token, { userID: zegoUserID, userName: `Admin representative (${zegoUserID})` }, { userUpdate: true });
      
      // Create local audio stream
      const localStream = await zg.createStream({ camera: { audio: true, video: false } });
      setZegoLocalStream(localStream);
      zegoLocalStreamRef.current = localStream;
      
      // Publish local audio stream
      const streamID = `stream_${zegoUserID}_${Date.now()}`;
      await zg.startPublishingStream(streamID, localStream);
      setZegoPublishedStreamId(streamID);
      zegoPublishedStreamIdRef.current = streamID;
      
      setZegoConnected(true);
      setZegoConnecting(false);
      
      // Auto-add voice agent to calling list (represented as active remote user)
      setZegoActiveUsers(["NEXA Voice Agent (AI)"]);
      setVoiceTranscript([{ sender: 'agent', text: voiceLanguage === 'hi' ? 'नमस्ते! मैं नेक्सा वॉयस एजेंट हूँ। मैं आपकी कैसे मदद कर सकता हूँ?' : voiceLanguage === 'te' ? 'నమస్తే! నేను నెక్సా వాయిస్ ఏజెంట్‌ని. నేను మీకు ఎలా సహాయపడగలను?' : 'Hello! I am the NEXA Voice Agent. How can I assist you with your business operations today?' }]);

      // Start capturing speech
      startSpeechRecognition();

      toast.success("Voice channel connected successfully! Microphone is live.", { id: loader });
    } catch (err) {
      console.error("Zego join room failed:", err);
      toast.error(`Zego connection failed: ${err.message}`, { id: loader });
      setZegoConnecting(false);
      setZegoConnected(false);
    }
  };

  const handleDisconnectZegoCall = async () => {
    // Stop capturing speech
    stopSpeechRecognition();

    try {
      const zg = zegoEngineRef.current;
      if (zg) {
        if (zegoPublishedStreamId) {
          zg.stopPublishingStream(zegoPublishedStreamId);
        }
        if (zegoLocalStream) {
          zg.destroyStream(zegoLocalStream);
        }
        await zg.logoutRoom(zegoRoomID);
      }
      
      setZegoConnected(false);
      setZegoLocalStream(null);
      setZegoPublishedStreamId(null);
      setZegoActiveUsers([]);
      zegoLocalStreamRef.current = null;
      zegoPublishedStreamIdRef.current = null;
      toast.success("Disconnected from WebRTC voice channel.");
    } catch (err) {
      console.error("Zego call disconnection failed:", err);
      toast.error("Failed to disconnect from Zego channel.");
    }
  };

  const handleToggleMuteZego = () => {
    if (!zegoEngineRef.current || !zegoLocalStream) return;
    const nextMute = !zegoMuted;
    zegoEngineRef.current.mutePublishStreamAudio(zegoLocalStream, nextMute);
    setZegoMuted(nextMute);
    toast.success(nextMute ? "Microphone muted." : "Microphone active.");
  };

  // 5. Generate Marketing Content
  const handleGenerateMarketing = async () => {
    setGeneratingContent(true);
    setGeneratedContent('');
    try {
      const result = await nexaApi.generateMarketingContent(contentType, contentCategory, contentTopic);
      if (result.success && result.content) {
        setGeneratedContent(result.content);
        toast.success(result.usedAi ? 'Marketing material generated by Agent AI.' : 'Marketing template loaded.');
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      toast.error('Content marketing agent failed to generate.');
    } finally {
      setGeneratingContent(false);
    }
  };


  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getFlagEmoji = (countryName) => {
    const mapping = {
      'united states': '🇺🇸',
      'us': '🇺🇸',
      'united kingdom': '🇬🇧',
      'uk': '🇬🇧',
      'india': '🇮🇳',
      'germany': '🇩🇪',
      'canada': '🇨🇦',
      'australia': '🇦🇺',
      'singapore': '🇸🇬',
      'japan': '🇯🇵'
    };
    return mapping[(countryName || '').toLowerCase().trim()] || '🌎';
  };

  const filteredLeads = leads.filter(lead => {
    const company = (typeof lead.companyName === 'object' && lead.companyName ? lead.companyName.name : lead.companyName || '').toLowerCase();
    const tech = (Array.isArray(lead.techStack) ? lead.techStack : []).join(' ').toLowerCase();
    const [_, derivedCountry] = (lead.companySize || '').includes(' | ')
      ? lead.companySize.split(' | ')
      : [lead.companySize, 'Global'];
    const country = (derivedCountry || '').toLowerCase();
    const searchMatch = company.includes(leadSearchTerm.toLowerCase()) || 
                        tech.includes(leadSearchTerm.toLowerCase()) ||
                        country.includes(leadSearchTerm.toLowerCase());

    const statusMatch = leadStatusFilter === 'All' || lead.status === leadStatusFilter;

    // Only show high qualifications (score >= 80) or newly discovered leads (not yet evaluated)
    const score = lead.leadScores?.[0]?.overallOpportunityScore || null;
    const isHighQual = score === null || score >= 80;

    return searchMatch && statusMatch && isHighQual;
  });

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto px-4">
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-brand-500/10 text-brand-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-500/20">
              Agentic Hub Active
            </span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
              autopilotEnabled 
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 animate-pulse' 
                : 'bg-gray-500/10 text-gray-500 border-gray-200/20'
            }`}>
              Autopilot: {autopilotEnabled ? '24/7 Active' : 'Idle'}
            </span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter mt-2 flex items-center gap-3">
            <Bot className="text-brand-600 animate-pulse" size={36} /> NEXA Growth Platform
          </h1>
          <p className="text-surface-500 font-medium mt-1">NexovTech's intelligent virtual business partner & lead generation pipeline.</p>
        </div>

        {/* Autopilot and Switcher Container */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Autopilot Premium Control Switch */}
          <button 
            disabled={togglingAutopilot}
            onClick={handleToggleAutopilot}
            className={`px-4 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              autopilotEnabled 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-lg shadow-emerald-500/20 animate-pulse' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm'
            }`}
          >
            <Cpu size={16} className={autopilotEnabled ? 'animate-spin' : ''} />
            {autopilotEnabled ? 'Autopilot Active' : 'Enable Autopilot'}
          </button>

          {/* Tab Role Switcher */}
          <div className="flex bg-gray-50 border border-gray-200/60 p-1.5 rounded-2xl shadow-inner gap-1 flex-wrap">
            {[
              { id: 'ceo', label: 'CEO / Founder', icon: TrendingUp },
              { id: 'sales', label: 'Sales Hub', icon: Briefcase },
              { id: 'marketing', label: 'Marketing AI', icon: Sparkles },
              { id: 'network', label: 'SVG Event Loop', icon: Network },
              { id: 'voice', label: 'Outreach Monitor', icon: Send },
              { id: 'memory', label: 'Memory Console', icon: Database }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setGeneratedProposal(null);
                    setSelectedLead(null);
                    if (tab.id === 'memory') fetchVectorDocs();
                    if (tab.id === 'voice') fetchOutreachLogs();
                    if (tab.id === 'network') fetchAgentRuns();
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                    activeTab === tab.id 
                      ? 'bg-white text-brand-600 shadow-md shadow-brand-600/5' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <RefreshCw size={40} className="text-brand-500 animate-spin" />
          <p className="text-xs uppercase font-black tracking-widest text-surface-500">Synchronizing Growth Ledgers...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* CEO DASHBOARD VIEW */}
          {activeTab === 'ceo' && biData && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-10"
            >
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: 'Total Leads', val: biData.metrics.totalLeads, desc: 'Scraped & Index targets', icon: Users, color: 'text-brand-500 bg-brand-500/10 border-brand-500/20' },
                  { title: 'Qualified (Hot)', val: biData.metrics.highPriorityCount, desc: 'Opportunity >= 80%', icon: Zap, color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
                  { title: 'Outreach Sent', val: biData.metrics.outreachSent, desc: 'Campaign deliveries', icon: Send, color: 'text-neon-blue bg-neon-blue/10 border-neon-blue/20' },
                  { title: 'Conversion Rate', val: `${biData.metrics.conversionRate}%`, desc: 'Average outreach success', icon: Percent, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' }
                ].map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <div key={i} className="glass-light p-6 rounded-3xl border border-gray-100 shadow-xl flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-black text-surface-500 uppercase tracking-widest">{card.title}</span>
                        <h3 className="text-3xl font-black text-gray-900 mt-1">{card.val}</h3>
                        <p className="text-[10px] text-surface-400 mt-1 font-medium">{card.desc}</p>
                      </div>
                      <div className={`p-4 rounded-2xl border ${card.color}`}>
                        <Icon size={24} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BI Chart & Decisions Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Analytics Chart */}
                <div className="lg:col-span-2 glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">Growth & Revenue Forecasts</h3>
                      <p className="text-xs text-surface-400 font-medium">Historical lead index vs billing targets.</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-[10px] font-bold">
                      +24.8% MoM
                    </span>
                  </div>

                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={biData.monthlyRevenue}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Executive Decisions Panel */}
                <div className="glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl flex flex-col">
                  <h3 className="text-lg font-black text-gray-900 tracking-tight mb-4 flex items-center gap-2">
                    <Cpu size={18} className="text-brand-500" /> Executive AI Advisory
                  </h3>
                  <div className="space-y-4 flex-1">
                    {biData.recommendations.map((rec, i) => (
                      <div key={i} className="p-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl flex gap-3">
                        <Sparkles size={20} className="text-brand-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-gray-800 leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Client Retention & Risk Center */}
              <div className="glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <AlertTriangle className="text-yellow-500" size={20} /> Client Retention Scanner
                    </h3>
                    <p className="text-xs text-surface-400 font-medium">Automatic alerts based on invoice frequency and task activity.</p>
                  </div>
                  <span className="px-2 py-1 bg-red-500/10 text-red-600 border border-red-500/20 rounded-full text-[10px] font-black uppercase">
                    Risk Found
                  </span>
                </div>

                <div className="space-y-4">
                  {retentionAlerts.map((alert, i) => (
                    <div key={i} className="p-5 border border-gray-100 bg-gray-50/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-red-500/10 text-red-600 border border-red-500/20 rounded-lg text-[9px] font-black uppercase">
                            {alert.engagementLevel} Engagement
                          </span>
                          <span className="text-xs font-bold text-gray-900">Inactive: {alert.inactiveDays} Days</span>
                        </div>
                        <p className="text-xs font-medium text-surface-600 mt-2">{alert.aiSuggestion}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setActiveTab('sales');
                          toast('Draft retention proposal in Sales tab.');
                        }}
                        className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 align-self-start md:align-self-center"
                      >
                        Initiate Campaign <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Automation Bindings Panel */}
              {automationStats && automationStats.totalBoundProjects > 0 && (
                <div className="glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <Cpu className="text-emerald-500" size={20} /> Active AI Automation Bindings
                      </h3>
                      <p className="text-xs text-surface-400 font-medium">Projects launched and managed autonomously by the AI Agent.</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase">
                      {automationStats.totalBoundProjects} Bound
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {automationStats.bindings.map((bind, idx) => (
                      <div key={idx} className="p-5 border border-gray-100 bg-gray-50/50 rounded-2xl space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest">Linked Client</span>
                            <h4 className="text-sm font-black text-gray-900 mt-1">
                              {typeof bind.companyName === 'object' && bind.companyName ? bind.companyName.name : bind.companyName}
                            </h4>
                          </div>
                          <span className="px-2 py-0.5 bg-brand-500/10 text-brand-600 border border-brand-500/20 rounded-lg text-[9px] font-black">
                            {bind.progress}% Done
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] font-black text-surface-500 uppercase tracking-widest">Autonomous Project Name</span>
                          <p className="text-xs font-semibold text-gray-800 mt-0.5">{bind.projectName}</p>
                        </div>

                        <div>
                          <span className="text-[9px] font-black text-surface-500 uppercase tracking-widest">Matched Specialists</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {bind.team.map((member, mIdx) => (
                              <span key={mIdx} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[9px] font-bold text-gray-700">
                                {member.name} ({member.role})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* SALES HUB VIEW */}
          {activeTab === 'sales' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Scraper / Discovery Hub */}
              <div className="glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl h-fit">
                <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6 flex items-center gap-2">
                  <Search size={18} className="text-brand-500" /> Discovery Scraper Form
                </h3>
                <form onSubmit={handleDiscoverLeads} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest">Industry Niche</label>
                    <select 
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none focus:border-brand-500 transition-all"
                    >
                      <option value="healthcare">Healthcare & Clinics</option>
                      <option value="ecommerce">E-Commerce Stores</option>
                      <option value="agency">Agencies & Consulting</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest">Target Region</label>
                      <select 
                        value={regionPreset}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRegionPreset(val);
                          if (val !== 'custom') {
                            setRegion(val);
                          } else {
                            setRegion('');
                          }
                        }}
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none focus:border-brand-500 transition-all"
                      >
                        <option value="All Countries">🌎 All Countries (Global Wide)</option>
                        <option value="United States">🇺🇸 United States</option>
                        <option value="United Kingdom">🇬🇧 United Kingdom</option>
                        <option value="India">🇮🇳 India</option>
                        <option value="Germany">🇩🇪 Germany</option>
                        <option value="Canada">🇨🇦 Canada</option>
                        <option value="Australia">🇦🇺 Australia</option>
                        <option value="Singapore">🇸🇬 Singapore</option>
                        <option value="custom">🔍 Custom Region/Country...</option>
                      </select>
                    </div>

                    {regionPreset === 'custom' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enter Custom Country/City</label>
                        <input 
                          type="text" 
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          placeholder="e.g. Tokyo, Japan or California, US"
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none focus:border-brand-500 transition-all"
                        />
                      </motion.div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={scraping}
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white p-4 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-xl shadow-brand-600/20"
                  >
                    {scraping ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" /> Crawling Directories...
                      </>
                    ) : (
                      <>
                        <Zap size={16} /> Execute Campaign Scrape
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Lead Table List */}
              <div className="lg:col-span-2 space-y-6">
                {/* Pending Approvals Gateway */}
                {pendingDeals && pendingDeals.length > 0 && (
                  <div className="glass-light p-8 rounded-[32px] border-2 border-brand-500/20 shadow-xl bg-gradient-to-br from-brand-500/5 via-transparent to-transparent space-y-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-brand-500/10 text-brand-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-brand-500/20 animate-pulse">
                          HITL Gate Active
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight mt-1 flex items-center gap-2">
                        <ShieldCheck className="text-brand-500" size={20} /> Pending Approvals Gateway
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Proposed B2B contract deals awaiting manager authorization. Approving launches the project, assigns specialists, and posts live milestones.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {pendingDeals.map((deal) => (
                        <div key={deal.id || deal._id} className="p-5 bg-white border border-gray-150 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest">{deal.serviceType}</span>
                                <h4 className="text-sm font-black text-slate-900 mt-0.5">{deal.companyName}</h4>
                              </div>
                              <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 rounded-lg text-[9px] font-black">
                                Opportunity: {deal.opportunityScore}%
                              </span>
                            </div>

                            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl max-h-32 overflow-y-auto">
                              <pre className="text-[9px] font-semibold text-gray-750 whitespace-pre-wrap font-mono leading-relaxed">
                                {deal.proposalText}
                              </pre>
                            </div>

                            <div className="flex items-center justify-between text-xs font-bold text-gray-900 border-t border-gray-100 pt-3">
                              <span className="text-surface-400 text-[10px]">Estimated Value:</span>
                              <span className="text-brand-600 font-black text-sm">₹{Number(deal.quotationAmount).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex gap-2.5">
                            <button
                              onClick={() => handleApprovePendingDeal(deal.id || deal._id)}
                              className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              Approve Deployment
                            </button>
                            <button
                              onClick={() => handleRejectPendingDeal(deal.id || deal._id)}
                              className="px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">Discovered Opportunities</h3>
                      <p className="text-xs text-slate-400 font-medium">Qualified B2B sales pipeline targets indexed globally.</p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={handleExportLeadsToCSV}
                        className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-emerald-100 hover:text-emerald-800 transition-all shadow-sm"
                        title="Export current leads to Excel spreadsheet (CSV)"
                      >
                        <FileDown size={14} /> Export
                      </button>

                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <input
                          type="text"
                          value={leadSearchTerm}
                          onChange={(e) => setLeadSearchTerm(e.target.value)}
                          placeholder="Search leads..."
                          className="pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-500 w-36"
                        />
                      </div>

                      <select
                        value={leadStatusFilter}
                        onChange={(e) => setLeadStatusFilter(e.target.value)}
                        className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-500"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Discovered">Discovered</option>
                        <option value="Scored">Scored</option>
                        <option value="Proposal_Generated">Proposal Generated</option>
                        <option value="Outreach_Sent">Outreach Sent</option>
                      </select>
                    </div>
                  </div>
                  
                  {filteredLeads.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <Bot size={48} className="text-surface-300 mx-auto mb-4" />
                      <p className="text-xs text-surface-500 font-bold uppercase tracking-wide">No leads match search filter.</p>
                      <p className="text-[10px] text-surface-400 mt-1 font-medium">Try typing a different keyword or running another discovery scrape.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[9px] font-black">
                            <th className="pb-3 text-left">Company Info</th>
                            <th className="pb-3 text-left">Contact Info</th>
                            <th className="pb-3 text-left">AI Score</th>
                            <th className="pb-3 text-left">Status</th>
                            <th className="pb-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLeads.map((lead) => {
                            const [sizeVal, countryVal] = (lead.companySize || '').includes(' | ')
                              ? lead.companySize.split(' | ')
                              : [lead.companySize, 'Global'];

                            const primaryScore = lead.leadScores?.[0]?.overallOpportunityScore || null;

                            return (
                              <tr key={lead.id || lead._id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all group">
                                <td className="py-4">
                                  <div className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                                    <span>{getFlagEmoji(countryVal)}</span>
                                    <span className="truncate max-w-[150px]">{typeof lead.companyName === 'object' && lead.companyName ? lead.companyName.name : lead.companyName}</span>
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-bold flex items-center gap-1.5 mt-1">
                                    <Globe size={10} /> 
                                    <a href={`https://${lead.website}`} target="_blank" rel="noreferrer" className="hover:underline hover:text-brand-600">{lead.website}</a>
                                    <span className="text-slate-200">|</span>
                                    <span>{sizeVal} emp</span>
                                  </div>
                                </td>
                                <td className="py-4">
                                  <div className="font-bold text-slate-700 text-xs truncate max-w-[120px]">
                                    {lead.contactName || lead.contactInfo?.primaryContactName || 'Primary Lead Contact'}
                                  </div>
                                  <div className="text-[9px] text-slate-400 mt-0.5">
                                    {lead.emails?.[0] || lead.contactInfo?.emails?.[0] || 'contact@lead.com'}
                                  </div>
                                </td>
                                <td className="py-4">
                                  {primaryScore !== null ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                          className={`h-full rounded-full ${primaryScore >= 80 ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-brand-500'}`} 
                                          style={{ width: `${primaryScore}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] font-black text-slate-800">
                                        {primaryScore}% {primaryScore >= 80 && '🔥'}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] font-bold text-slate-400 italic">Not qualified</span>
                                  )}
                                </td>
                                <td className="py-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide border ${
                                    lead.status === 'Scored' 
                                      ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                                      : lead.status === 'Proposal_Generated'
                                      ? 'bg-brand-500/10 text-brand-600 border-brand-500/20'
                                      : lead.status === 'Outreach_Sent'
                                      ? 'bg-neon-blue/10 text-neon-blue-600 border-neon-blue/20'
                                      : lead.status === 'Archived'
                                      ? 'bg-slate-100 text-slate-500 border-slate-200'
                                      : 'bg-gray-100 text-gray-600 border-gray-200'
                                  }`}>
                                    {lead.status.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-4 text-right">
                                  {lead.status === 'Discovered' ? (
                                    <button
                                      onClick={() => handleScoreLead(lead.id || lead._id)}
                                      className="bg-yellow-500 hover:bg-yellow-400 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all"
                                    >
                                      Qualify
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setSelectedLead(lead);
                                        setGeneratedProposal(null);
                                      }}
                                      className="bg-brand-600 hover:bg-brand-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ml-auto"
                                    >
                                      Select <ChevronRight size={10} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Selected Lead Actions Panel */}
                {selectedLead && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl space-y-6"
                  >
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                      <div>
                        <h4 className="text-sm font-black text-gray-900 tracking-tight">
                          Lead Actions: {typeof selectedLead.companyName === 'object' && selectedLead.companyName ? selectedLead.companyName.name : selectedLead.companyName}
                        </h4>
                        <p className="text-[10px] text-surface-400">Initiate proposal development and automated sales channels.</p>
                      </div>
                      <button 
                        onClick={() => setSelectedLead(null)}
                        className="text-xs font-black text-surface-400 hover:text-gray-950 uppercase"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left: Proposal Trigger Form */}
                      <div className="space-y-4">
                        <h5 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                          <FileText size={14} className="text-brand-500" /> Core Proposal Creator
                        </h5>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-surface-500 uppercase tracking-widest">Select Target Service</label>
                            <select 
                              value={serviceType}
                              onChange={(e) => setServiceType(e.target.value)}
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
                            >
                              <option value="AI Solutions">AI Solutions</option>
                              <option value="Web Development">Web Development</option>
                              <option value="Mobile Applications">Mobile Applications</option>
                              <option value="Dashboard Systems">Dashboard Systems</option>
                              <option value="Automation Platforms">Automation Platforms</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-surface-500 uppercase tracking-widest">Target Quotation (₹)</label>
                            <input 
                              type="number" 
                              value={quotationAmount}
                              onChange={(e) => setQuotationAmount(Number(e.target.value))}
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
                            />
                          </div>
                          <button
                            onClick={handleGenerateProposal}
                            disabled={generatingProposal}
                            className="w-full bg-brand-600 hover:bg-brand-500 text-white p-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                          >
                            {generatingProposal ? 'Compiling Proposal...' : 'Assemble AI Proposal'}
                          </button>
                        </div>
                      </div>

                      {/* Right: Autonomous Actions & Direct Outreach */}
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <h5 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <Cpu size={14} className="text-emerald-500 animate-pulse" /> AI Autonomous Actions
                          </h5>
                          <button
                            onClick={handleAutoLaunchProject}
                            disabled={launchingProject || (selectedLead.status !== 'Proposal_Generated' && selectedLead.status !== 'Scored')}
                            className="w-full p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-md shadow-emerald-600/10"
                          >
                            <Play size={14} /> Autonomous Project Launch
                          </button>
                          <p className="text-[9px] text-surface-400 font-medium leading-relaxed">
                            Autonomously generates project specs, schedules team assignment allocations matching skillsets/workloads, and schedules milestone broadcasts on LinkedIn.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <h5 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <Send size={14} className="text-neon-blue" /> Direct Outreach Channels
                          </h5>
                          <div className="grid grid-cols-1 gap-2">
                            {[
                              { label: 'LinkedIn Connection request', icon: Linkedin, channel: 'LinkedIn', color: 'bg-[#0077b5] text-white hover:bg-[#006297]' },
                              { label: 'Hyper-Personalized Cold Email', icon: Mail, channel: 'Email', color: 'bg-gray-800 text-white hover:bg-gray-700' },
                              { label: 'WhatsApp Business Offer', icon: MessageSquare, channel: 'WhatsApp', color: 'bg-[#25D366] text-white hover:bg-[#1ebd59]' },
                              { label: 'Simulate Outbound AI Voice Call', icon: PhoneCall, channel: 'Voice Call', color: 'bg-emerald-600 text-white hover:bg-emerald-500' }
                            ].map((item, idx) => {
                              const Icon = item.icon;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleLoadOutreachDraft(item.channel)}
                                  className={`w-full p-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all ${item.color} ${activeOutreachChannel === item.channel ? 'ring-2 ring-brand-500' : ''}`}
                                >
                                  <Icon size={16} /> {item.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Outreach Draft Composer */}
                    {activeOutreachChannel && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-6 bg-brand-500/5 border border-brand-500/10 rounded-2xl space-y-4 mt-6"
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-brand-500/10">
                          <h5 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <Send size={14} className="text-brand-600 animate-pulse" /> AI {activeOutreachChannel} Draft Composer
                          </h5>
                          <button 
                            onClick={() => {
                              setActiveOutreachChannel(null);
                              setOutreachDraft('');
                              setCustomOutreachPrompt('');
                            }}
                            className="text-[10px] font-black text-surface-400 hover:text-gray-900 uppercase"
                          >
                            Close Composer
                          </button>
                        </div>

                        {generatingOutreachDraft ? (
                          <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <RefreshCw size={24} className="text-brand-500 animate-spin" />
                            <p className="text-[10px] uppercase font-black tracking-widest text-surface-500">Drafting personalized hook...</p>
                          </div>
                        ) : activeOutreachChannel === 'Voice Call' ? (
                          <div className="space-y-4">
                            <div className="p-4 bg-white/50 border border-gray-100 rounded-xl space-y-2">
                              <p className="text-xs font-semibold text-slate-755 leading-relaxed">
                                NEXA Voice represents NexovTech autonomously. If your Vapi, Retell AI, or Twilio environment keys are configured, a real telephone call is placed to the number below. Otherwise, a local simulation script will be generated.
                              </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-surface-500 uppercase tracking-widest">Outbound Phone Number</label>
                                <input
                                  type="text"
                                  value={customOutreachPrompt}
                                  onChange={(e) => setCustomOutreachPrompt(e.target.value)}
                                  placeholder="Enter target phone number (e.g., +919876543210)"
                                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-brand-500 transition-all"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-surface-500 uppercase tracking-widest">Voice Language</label>
                                <select
                                  value={voiceLanguage}
                                  onChange={(e) => {
                                    const nextLang = e.target.value;
                                    setVoiceLanguage(nextLang);
                                    handleLoadOutreachDraft('Voice Call', '', nextLang);
                                  }}
                                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
                                >
                                  <option value="en">English (US)</option>
                                  <option value="en-in">English (India)</option>
                                  <option value="hi">Hindi (हिन्दी)</option>
                                  <option value="te">Telugu (తెలుగు)</option>
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-surface-500 uppercase tracking-widest">Speech Script (Optional)</label>
                              <textarea
                                value={outreachDraft}
                                onChange={(e) => setOutreachDraft(e.target.value)}
                                placeholder="Enter custom message to speak (e.g., नमस्ते, यह नेक्सा है...)"
                                rows={4}
                                className="w-full p-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-brand-500 transition-all font-sans leading-relaxed"
                              />
                            </div>
                            <button
                              onClick={handleSendOutreach}
                              disabled={sendingOutreach || !customOutreachPrompt.trim()}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-emerald-600/10"
                            >
                              <PhoneCall size={14} /> Dispatch Outbound Call
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-surface-500 uppercase tracking-widest">AI Message Content</label>
                              <textarea
                                value={outreachDraft}
                                onChange={(e) => setOutreachDraft(e.target.value)}
                                rows={6}
                                className="w-full p-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-brand-500 transition-all font-sans leading-relaxed"
                                placeholder="Write or edit outreach draft..."
                              />
                            </div>

                            <div className="space-y-1.5 bg-white p-4 rounded-xl border border-gray-100">
                              <label className="text-[8px] font-black text-surface-500 uppercase tracking-widest">Instruct AI to Rewrite / Add Details</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={customOutreachPrompt}
                                  onChange={(e) => setCustomOutreachPrompt(e.target.value)}
                                  placeholder="e.g. Add a reference to mobile dev, mention John as reference"
                                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleLoadOutreachDraft(activeOutreachChannel, customOutreachPrompt)}
                                  className="px-4 py-2 bg-gray-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-gray-700 transition-all"
                                >
                                  Regenerate
                                </button>
                              </div>
                            </div>

                            <button
                              onClick={handleSendOutreach}
                              disabled={sendingOutreach || !outreachDraft}
                              className="w-full bg-brand-600 hover:bg-brand-500 text-white p-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                              <Send size={14} /> Send connection Campaign
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Proposal Display */}
                    {generatedProposal && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-3"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-surface-500 uppercase tracking-widest">AI Draft Result</span>
                          <div className="flex gap-4">
                            <button 
                              onClick={() => {
                                const proposalId = generatedProposal.id || generatedProposal._id;
                                const shareLink = `${window.location.origin}/#/proposals/shared/${proposalId}`;
                                navigator.clipboard.writeText(shareLink);
                                toast.success('Shareable B2B Proposal link copied to clipboard!');
                              }}
                              className="text-indigo-600 text-xs font-bold flex items-center gap-1 hover:text-indigo-500"
                            >
                              <Link size={12} /> Copy Share Link
                            </button>
                            <button 
                              onClick={() => copyToClipboard(generatedProposal.proposalText)}
                              className="text-brand-600 text-xs font-bold flex items-center gap-1 hover:text-brand-500"
                            >
                              <Copy size={12} /> Copy Text
                            </button>
                          </div>
                        </div>
                        <pre className="text-[10px] text-gray-800 whitespace-pre-wrap font-mono leading-relaxed bg-white p-4 rounded-xl border border-gray-100 max-h-60 overflow-y-auto">
                          {generatedProposal.proposalText}
                        </pre>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* MARKETING AI VIEW */}
          {activeTab === 'marketing' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Marketing Prompt controls */}
              <div className="glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl h-fit">
                <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6 flex items-center gap-2">
                  <Bot size={18} className="text-brand-500" /> Marketing Intelligence
                </h3>

                {/* LinkedIn Connection Widget */}
                <div className="p-4 bg-gray-50 border border-gray-200/60 rounded-2xl mb-6 space-y-3">
                  <h4 className="text-[10px] font-black text-surface-500 uppercase tracking-widest flex items-center gap-2">
                    <Share2 size={12} className="text-[#0077b5]" /> LinkedIn Page Integration
                  </h4>
                  {linkedinConnected ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-black text-gray-900">
                        <span className="flex items-center gap-1.5 text-[10px]">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                          Linked: {linkedinCompany}
                        </span>
                        <button 
                          onClick={handleDisconnectLinkedIn}
                          className="text-[10px] font-black text-red-500 hover:text-red-400 uppercase tracking-wider"
                        >
                          Disconnect
                        </button>
                      </div>
                      <p className="text-[9px] text-surface-400 font-medium leading-relaxed">
                        Autonomous Admin mode enabled. Updates are scheduled and shared automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button 
                        onClick={() => handleConnectLinkedIn(false)}
                        className="w-full bg-[#0077b5] hover:bg-[#006297] text-white p-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
                      >
                        Connect Personal Profile
                      </button>
                      <button 
                        onClick={() => handleConnectLinkedIn(true)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
                      >
                        Connect Company Page
                      </button>
                      <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                        Personal Profile is recommended and instantly available. Company Page requires approved Community Management API access.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest">Platform Target</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                        { id: 'youtube', label: 'YouTube', icon: Youtube },
                        { id: 'blog', label: 'Blog Article', icon: BookOpen }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setContentType(item.id)}
                          className={`p-3 rounded-xl border text-[10px] font-black uppercase flex flex-col items-center gap-2 transition-all ${
                            contentType === item.id 
                              ? 'bg-brand-600/10 border-brand-500 text-brand-600' 
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          <item.icon size={16} /> {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest">Content Category</label>
                    <select
                      value={contentCategory}
                      onChange={(e) => setContentCategory(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none"
                    >
                      <option value="thought-leadership">Thought Leadership</option>
                      <option value="case-study">Case Studies</option>
                      <option value="technical">Technical Articles</option>
                      <option value="update">Company Updates</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest">Campaign Topic</label>
                    <textarea
                      rows={3}
                      value={contentTopic}
                      onChange={(e) => setContentTopic(e.target.value)}
                      placeholder="Input campaign focus topic..."
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleGenerateMarketing}
                    disabled={generatingContent}
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white p-4 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {generatingContent ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" /> Drafting Post...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} /> Compile Campaigns
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Output & Campaign Metrics */}
              <div className="lg:col-span-2 space-y-6">
                {/* Generation Output */}
                <div className="glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl min-h-[250px] flex flex-col justify-between">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4 gap-4">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Draft Workspace</h3>
                    {generatedContent && (
                      <div className="flex items-center gap-3">
                        {linkedinConnected && contentType === 'linkedin' && (
                          <button
                            onClick={handlePublishToLinkedIn}
                            disabled={publishingToLinkedIn}
                            className="bg-[#0077b5] hover:bg-[#006297] text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Share2 size={12} /> {publishingToLinkedIn ? 'Publishing...' : 'Publish Live'}
                          </button>
                        )}
                        <button
                          onClick={() => copyToClipboard(generatedContent)}
                          className="text-brand-600 text-xs font-bold flex items-center gap-1 hover:text-brand-500"
                        >
                          <Copy size={14} /> Copy Draft
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    {generatingContent ? (
                      <div className="h-full flex items-center justify-center py-10">
                        <RefreshCw size={32} className="text-brand-500 animate-spin" />
                      </div>
                    ) : generatedContent ? (
                      <div className="text-xs font-medium text-gray-800 leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-200/60 whitespace-pre-wrap font-mono">
                        {generatedContent}
                      </div>
                    ) : (
                      <div className="text-center py-16 text-surface-400">
                        <Sparkles size={40} className="mx-auto mb-3 opacity-50" />
                        <p className="text-xs font-bold uppercase tracking-wider">Workspace is Empty</p>
                        <p className="text-[10px] mt-1 font-medium">Select criteria and trigger compilation to build material.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Campaign Metrics Simulation */}
                <div className="glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl">
                  <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6">Omnichannel Engagement Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { label: 'LinkedIn Impressions', val: '45.2K', sub: '+12.4% vs last week', color: 'text-brand-500' },
                      { label: 'YouTube Content CTR', val: '6.4%', sub: 'Avg view duration: 4:12', color: 'text-[#ff0000]' },
                      { label: 'Inbound Blog Leads', val: '124', sub: 'Conversion rate: 4.8%', color: 'text-emerald-500' }
                    ].map((stat, idx) => (
                      <div key={idx} className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                        <span className="text-[9px] font-black text-surface-500 uppercase tracking-widest">{stat.label}</span>
                        <h4 className={`text-2xl font-black mt-2 ${stat.color}`}>{stat.val}</h4>
                        <p className="text-[9px] text-surface-400 mt-1 font-medium">{stat.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* MULTI-AGENT NETWORK VIEW - SVG Event Loop Visualizer */}
          {activeTab === 'network' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
            >
              {/* Left Column: SVG Circular Agent Graph */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* SVG Interactive Event Loop Visualizer */}
                <div className="glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <Network size={18} className="text-brand-500 animate-pulse" /> Agentic Event Loop Visualizer
                      </h3>
                      <p className="text-xs text-surface-400 font-medium">Live SVG graph — glowing pulses trace multi-agent execution hops.</p>
                    </div>
                    {activeAgent && (
                      <span className="px-3 py-1 bg-brand-500/10 text-brand-600 border border-brand-500/20 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                        {activeAgent.toUpperCase()} PROCESSING
                      </span>
                    )}
                  </div>

                  {/* SVG Circular Force Graph */}
                  <div className="relative flex justify-center items-center">
                    <svg viewBox="0 0 480 480" className="w-full max-w-[440px]" style={{ filter: 'drop-shadow(0 0 12px rgba(139,92,246,0.08))' }}>
                      <defs>
                        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#f5f3ff" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.4" />
                        </radialGradient>
                        {/* Pulse glow filter */}
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <filter id="activeGlow">
                          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                      </defs>

                      {/* Background circle */}
                      <circle cx="240" cy="240" r="220" fill="url(#bgGrad)" stroke="#e2e8f0" strokeWidth="1" />
                      <circle cx="240" cy="240" r="140" fill="none" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4,6" />
                      <circle cx="240" cy="240" r="60" fill="none" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2,4" />

                      {/* Render agents in a circle + CEO in center */}
                      {(() => {
                        const agents = [
                          { id: 'hr',       label: 'HR',        color: '#6366f1', icon: '👥' },
                          { id: 'finance',  label: 'Finance',   color: '#10b981', icon: '₹'  },
                          { id: 'sales',    label: 'Sales',     color: '#f59e0b', icon: '🎯' },
                          { id: 'marketing',label: 'Marketing', color: '#8b5cf6', icon: '✨' },
                          { id: 'security', label: 'Security',  color: '#ef4444', icon: '🛡️' },
                          { id: 'project',  label: 'Project',   color: '#06b6d4', icon: '📋' },
                          { id: 'support',  label: 'Support',   color: '#ec4899', icon: '💬' },
                          { id: 'dealings', label: 'Dealings',  color: '#f97316', icon: '💼' }
                        ];
                        const r = 170;
                        const cx = 240, cy = 240;
                        const nodeR = 32;

                        return (
                          <>
                            {/* Connection lines from CEO to each outer node */}
                            {agents.map((agent, i) => {
                              const angle = (2 * Math.PI * i) / agents.length - Math.PI / 2;
                              const nx = cx + r * Math.cos(angle);
                              const ny = cy + r * Math.sin(angle);
                              const isHopActive = agentHops.some(h => h.recipient?.toLowerCase().includes(agent.id));
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
                                  {/* Animated pulse dot traveling along the line */}
                                  {isCurrentlyActive && (
                                    <circle r="4" fill={agent.color} filter="url(#glow)" opacity="0.9">
                                      <animateMotion dur="1s" repeatCount="indefinite">
                                        <mpath href={`#path-${agent.id}`} />
                                      </animateMotion>
                                    </circle>
                                  )}
                                  <path id={`path-${agent.id}`} d={`M ${cx} ${cy} L ${nx} ${ny}`} fill="none" />
                                </g>
                              );
                            })}

                            {/* Outer Agent Nodes */}
                            {agents.map((agent, i) => {
                              const angle = (2 * Math.PI * i) / agents.length - Math.PI / 2;
                              const nx = cx + r * Math.cos(angle);
                              const ny = cy + r * Math.sin(angle);
                              const isActive = activeAgent === agent.id || agentHops.some(h => h.recipient?.toLowerCase().includes(agent.id));
                              return (
                                <g key={`node-${agent.id}`} style={{ cursor: 'pointer' }}>
                                  {/* Glow ring for active agents */}
                                  {isActive && (
                                    <circle cx={nx} cy={ny} r={nodeR + 8} fill={agent.color} opacity="0.15" filter="url(#activeGlow)">
                                      <animate attributeName="r" values={`${nodeR+6};${nodeR+12};${nodeR+6}`} dur="1.5s" repeatCount="indefinite" />
                                      <animate attributeName="opacity" values="0.15;0.3;0.15" dur="1.5s" repeatCount="indefinite" />
                                    </circle>
                                  )}
                                  <circle cx={nx} cy={ny} r={nodeR}
                                    fill={isActive ? agent.color : '#f8fafc'}
                                    stroke={agent.color}
                                    strokeWidth={isActive ? 3 : 1.5}
                                    filter={isActive ? 'url(#glow)' : 'none'}
                                    style={{ transition: 'all 0.4s ease' }}
                                  />
                                  <text x={nx} y={ny - 4} textAnchor="middle" fontSize="14" dominantBaseline="middle" style={{ userSelect: 'none' }}>
                                    {agent.icon}
                                  </text>
                                  <text x={nx} y={ny + 14} textAnchor="middle" fontSize="8" fontWeight="800" fill={isActive ? '#fff' : '#374151'}
                                    fontFamily="sans-serif" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {agent.label}
                                  </text>
                                </g>
                              );
                            })}

                            {/* CEO Center Node */}
                            <g>
                              {activeAgent === 'ceo' && (
                                <circle cx={cx} cy={cy} r={52} fill="#8b5cf6" opacity="0.2" filter="url(#activeGlow)">
                                  <animate attributeName="r" values="50;60;50" dur="1.5s" repeatCount="indefinite" />
                                  <animate attributeName="opacity" values="0.15;0.35;0.15" dur="1.5s" repeatCount="indefinite" />
                                </circle>
                              )}
                              <circle cx={cx} cy={cy} r={45}
                                fill={activeAgent === 'ceo' ? '#8b5cf6' : '#1e1b4b'}
                                filter={activeAgent === 'ceo' ? 'url(#activeGlow)' : 'none'}
                                style={{ transition: 'all 0.4s ease' }}
                              />
                              <text x={cx} y={cy - 8} textAnchor="middle" fontSize="20" dominantBaseline="middle">🤖</text>
                              <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff"
                                fontFamily="sans-serif" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                CEO
                              </text>
                              <text x={cx} y={cy + 24} textAnchor="middle" fontSize="7" fill="#a5b4fc"
                                fontFamily="sans-serif" style={{ letterSpacing: '0.04em' }}>
                                ORCHESTRATOR
                              </text>
                            </g>
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                {/* Pending Approvals Card */}
                {pendingRuns && pendingRuns.length > 0 && (
                  <div className="glass-light p-6 rounded-[32px] border-2 border-yellow-500/20 shadow-xl bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent space-y-4">
                    <div>
                      <span className="px-2.5 py-0.5 bg-yellow-500/10 text-yellow-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-yellow-500/20 animate-pulse">
                        Action Authorization Required
                      </span>
                      <h3 className="text-sm font-black text-gray-900 tracking-tight mt-1 flex items-center gap-1.5">
                        ⚠️ Agent approvals gate
                      </h3>
                      <p className="text-[10px] text-surface-500 font-medium">
                        These high-value actions are held securely. Authorizing runs them on active API executors.
                      </p>
                    </div>
                    <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                      {pendingRuns.map((run) => (
                        <div key={run.id} className="p-4 bg-white border border-gray-150 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest">
                                {run.state?.approvalData?.agent?.toUpperCase()} AGENT
                              </span>
                              <h4 className="text-xs font-black text-slate-900 mt-0.5">
                                Action: {run.state?.approvalData?.action}
                              </h4>
                            </div>
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-lg text-[9px] font-black uppercase">
                              Waiting
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-600 leading-relaxed font-semibold">
                            "{run.state?.approvalData?.reason || 'Reason not provided.'}"
                          </p>
                          {run.state?.approvalData?.params && (
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 space-y-1 font-mono text-[9px]">
                              <span className="font-sans font-black text-[8px] text-gray-400 uppercase block">Parameters:</span>
                              {Object.entries(run.state.approvalData.params).map(([k, v]) => (
                                <div key={k} className="flex justify-between">
                                  <span className="text-gray-400">{k}:</span>
                                  <span className="text-slate-800 font-extrabold">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2.5 pt-2 border-t border-gray-100">
                            <button
                              onClick={() => handleApproveAgentRun(run.id)}
                              className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                            >
                              Approve & Resume
                            </button>
                            <button
                              onClick={() => handleRejectAgentRun(run.id)}
                              className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Event Loop Logs / Terminal */}
                <div className="glass-light p-6 rounded-[32px] border border-gray-100 shadow-xl flex-1 flex flex-col min-h-[200px]">
                  <h4 className="text-[10px] font-black text-surface-500 uppercase tracking-widest mb-4">Event Loop Communication Hub</h4>
                  <div className="flex-1 bg-[#020617] rounded-2xl p-4 font-mono text-[9px] text-emerald-400 overflow-y-auto max-h-[220px] custom-scrollbar space-y-2.5">
                    {agentHops.length === 0 ? (
                      <span className="text-slate-500 italic block">Event bus idle. Awaiting instruction request...</span>
                    ) : (
                      agentHops.map((hop, hIdx) => (
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
              <div className="lg:col-span-5 glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl flex flex-col justify-between min-h-[450px]">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2 mb-2">
                      <Bot size={18} className="text-brand-500 animate-pulse" /> CEO Orchestrator Console
                    </h3>
                    <p className="text-xs text-surface-400 font-medium mb-6">
                      Direct strategic alignment with CEO Agent. Queries are routed dynamically using internal event loops.
                    </p>

                    {/* Chat Message Scroll */}
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar mb-6 flex flex-col">
                      {networkMessages.map((msg, mIdx) => (
                        <div 
                          key={mIdx} 
                          className={`flex flex-col max-w-[85%] ${
                            msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'
                          }`}
                        >
                          <span className="text-[7px] font-black text-surface-400 uppercase tracking-widest mb-1">
                            {msg.role === 'user' ? 'Real Admin' : 'CEO Agent'}
                          </span>
                          <div 
                            className={`p-3.5 rounded-2xl text-xs font-bold leading-relaxed border ${
                              msg.role === 'user' 
                                ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-600/10' 
                                : 'bg-gray-50 text-gray-800 border-gray-200/60'
                            }`}
                          >
                            <div>{msg.content}</div>
                            {msg.hops && msg.hops.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200/60 text-[9px] text-surface-500 space-y-1">
                                <span className="font-black uppercase tracking-wider block">Agent Consultation Path:</span>
                                <div className="flex flex-wrap items-center gap-1">
                                  {msg.hops.map((hop, idx) => (
                                    <React.Fragment key={idx}>
                                      <span className="px-1.5 py-0.5 bg-brand-500/10 text-brand-600 rounded font-black">
                                        {hop.sender.replace(' Agent', '')}
                                      </span>
                                      {idx < msg.hops.length - 1 && <ArrowRight size={8} className="text-slate-400" />}
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {sendingNetworkMessage && (
                        <div className="self-start flex flex-col items-start max-w-[85%] animate-pulse">
                          <span className="text-[7px] font-black text-surface-400 uppercase tracking-widest mb-1">CEO Agent</span>
                          <div className="bg-gray-50 border border-gray-200/60 p-3.5 rounded-2xl flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:0.4s]"></span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chat Input form */}
                  <form onSubmit={handleSendNetworkMessage} className="relative mt-auto">
                    <input
                      type="text"
                      value={networkInput}
                      onChange={(e) => setNetworkInput(e.target.value)}
                      placeholder="Ask CEO to audit roster, check cash flow, list tasks..."
                      disabled={sendingNetworkMessage}
                      className="w-full p-4 pr-12 bg-gray-50 border border-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none rounded-2xl text-xs font-bold text-gray-900 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!networkInput.trim() || sendingNetworkMessage}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all disabled:opacity-40"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}


          {/* VOICE CAMPAIGN WAVEFORM PLAYER */}
          {activeTab === 'voice' && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <div className="glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <PhoneCall size={18} className="text-emerald-500" /> Omnichannel Campaign Monitor
                    </h3>
                    <p className="text-xs text-surface-400 font-medium">Live dispatch tracking across voice, messaging, and email.</p>
                  </div>
                  <button
                    onClick={fetchOutreachLogs}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <RefreshCw size={12} /> Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Outreach Logs Sidebar */}
                  <div className="lg:col-span-4 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                    {outreachLogs.length === 0 ? (
                      <div className="text-center py-16 text-surface-400">
                        <Phone size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-xs font-bold uppercase tracking-wider">No campaign dispatches logged yet</p>
                        <p className="text-[10px] mt-1 font-medium">Campaign status updates appear here in real-time once campaigns are triggered.</p>
                      </div>
                    ) : (
                      (() => {
                        // Sort logs descending by createdAt
                        const sortedLogs = [...outreachLogs].sort((a, b) => {
                          const dateA = new Date(a.createdAt || 0);
                          const dateB = new Date(b.createdAt || 0);
                          return dateB - dateA;
                        });

                        // Helper to map channel to visual icon
                        const getChannelIcon = (chName) => {
                          const name = (chName || '').toLowerCase();
                          if (name.includes('whatsapp')) return MessageSquare;
                          if (name.includes('linkedin_post') || name.includes('feed')) return Share2;
                          if (name.includes('linkedin')) return Linkedin;
                          if (name.includes('email')) return Mail;
                          return Phone;
                        };

                        return sortedLogs.map((log, idx) => {
                          const Icon = getChannelIcon(log.channel);
                          const isSelected = (selectedCallLog?.id && selectedCallLog.id === log.id) || (selectedCallLog?._id && selectedCallLog._id === log._id);
                          const recipient = log.recipient || log.recipientName || log.companyName || 'Outreach Target';
                          
                          return (
                            <button
                              key={`${log.id || 'log'}_${idx}`}
                              onClick={() => {
                                setSelectedCallLog(log);
                                setIsPlaying(false);
                                setPlayProgress(0);
                                setCallDuration(Math.floor(Math.random() * 100) + 40); // 40-140s
                                if (waveAnimRef.current) cancelAnimationFrame(waveAnimRef.current);

                                // Automatically align the Zego Room ID with this specific client room for incoming real calls
                                const matchLead = leads.find(l => l.id === log.leadId || l._id === log.leadId);
                                const compName = matchLead?.companyName || log.companyName || log.recipientName || '';
                                const cleanComp = typeof compName === 'object' && compName ? compName.name : compName;
                                if (cleanComp) {
                                  const derivedRoom = `room_${cleanComp.toLowerCase().replace(/\s+/g, '')}`;
                                  setZegoRoomID(derivedRoom);
                                  zegoRoomIdRef.current = derivedRoom;
                                }
                              }}
                              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                                isSelected
                                  ? 'border-brand-500 bg-brand-500/5 shadow-md'
                                  : 'border-gray-100 bg-white hover:bg-gray-50 shadow-sm'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  isSelected ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  <Icon size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-gray-900 truncate">{recipient}</p>
                                  <p className="text-[9px] text-surface-400 font-medium truncate">
                                    {log.channel || 'Outreach'} • {new Date(log.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  log.status === 'Delivered' || log.status === 'delivered' || log.status === 'Sent' || log.status === 'sent' || log.status === 'Read' || log.status === 'read'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : log.status === 'Pending' || log.status === 'pending'
                                    ? 'bg-amber-100 text-amber-700 animate-pulse'
                                    : 'bg-rose-100 text-rose-700'
                                }`}>{log.status || 'sent'}</span>
                              </div>
                            </button>
                          );
                        });
                      })()
                    )}
                  </div>

                  {/* Dynamic Campaign Details & Channel Previewer */}
                  <div className="lg:col-span-8">
                    {(() => {
                      // Find latest version of the selected log to get real-time state changes
                      const activeLog = outreachLogs.find(l => (l.id && l.id === selectedCallLog?.id) || (l._id && l._id === selectedCallLog?._id)) || selectedCallLog;
                      if (!activeLog) {
                        return (
                          <div className="glass-light p-12 rounded-[28px] border border-gray-100 shadow-inner flex flex-col items-center justify-center h-[400px] text-surface-400">
                            <Mic size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-700">Select a Campaign Log</p>
                            <p className="text-[10px] mt-1 font-medium text-center max-w-xs">Choose a dispatch record from the list to view real-time delivery logs, chat scripts, or interactive previews.</p>
                          </div>
                        );
                      }

                      const channelLower = (activeLog.channel || '').toLowerCase();

                      // 1. WhatsApp Chat Screen Mockup
                      if (channelLower === 'whatsapp') {
                        const leadWhatsAppLogs = outreachLogs
                          .filter(l => l.leadId === activeLog.leadId && (l.channel || '').toLowerCase() === 'whatsapp')
                          .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

                        return (
                          <div className="w-full flex flex-col h-[480px] bg-[#efeae2] rounded-[24px] overflow-hidden border border-gray-200 relative shadow-lg">
                            <div className="absolute inset-0 bg-[#efeae2] opacity-[0.05] pointer-events-none" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')" }} />
                            
                            {/* WhatsApp Chat Header */}
                            <div className="bg-[#075E54] text-white p-3 flex items-center justify-between shadow-md z-10">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs uppercase text-emerald-400 border border-emerald-400/20">
                                  {activeLog.recipient ? activeLog.recipient.substring(0, 2) : 'WA'}
                                </div>
                                <div>
                                  <h4 className="text-xs font-black leading-tight">
                                    {activeLog.recipient || 'Outreach Target'}
                                  </h4>
                                  <span className="text-[8px] text-emerald-200/90 font-medium block">WhatsApp Cloud Delivery Hub</span>
                                </div>
                              </div>
                              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[8px] font-black uppercase tracking-wider">
                                {activeLog.status || 'delivered'}
                              </span>
                            </div>

                            {/* Chat Thread */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 flex flex-col custom-scrollbar z-10">
                              {leadWhatsAppLogs.map((msg, mIdx) => {
                                const isIncoming = msg.messageType === 'Incoming_Response';
                                return (
                                  <div
                                    key={mIdx}
                                    className={`flex flex-col max-w-[85%] ${
                                      isIncoming ? 'self-start items-start animate-fade-in' : 'self-end items-end'
                                    }`}
                                  >
                                    <div
                                      className={`p-3 rounded-2xl text-[10px] font-semibold leading-relaxed shadow-sm relative ${
                                        isIncoming 
                                          ? 'bg-white text-slate-800 rounded-tl-none border border-slate-100' 
                                          : 'bg-[#dcf8c6] text-slate-800 rounded-tr-none'
                                      }`}
                                    >
                                      <div className="whitespace-pre-wrap">{msg.contentSent}</div>
                                      <div className="flex items-center justify-end gap-1 mt-1 text-[7px] text-slate-400 font-bold">
                                        <span>{new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        {!isIncoming && (
                                          <span className="flex">
                                            {msg.status === 'Pending' || msg.status === 'pending' ? (
                                              <span className="text-slate-300">✓</span>
                                            ) : (
                                              <span className="text-[#34b7f1] font-black">✓✓</span>
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Live Chat Input */}
                            <form 
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const text = whatsappInputs[activeLog.leadId] || '';
                                if (!text.trim()) return;
                                setWhatsappInputs(prev => ({ ...prev, [activeLog.leadId]: '' }));
                                try {
                                  await nexaApi.sendOutreach({
                                    leadId: activeLog.leadId,
                                    channel: 'WhatsApp',
                                    messageType: 'Cold_Outreach',
                                    messageContent: text
                                  });
                                  toast.success('WhatsApp reply queued.');
                                  fetchOutreachLogs();
                                } catch (err) {
                                  toast.error('Failed to send WhatsApp message.');
                                }
                              }}
                              className="p-3 bg-[#f0f0f0] border-t border-slate-200/50 flex gap-2 items-center z-10 relative"
                            >
                              <input
                                type="text"
                                value={whatsappInputs[activeLog.leadId] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setWhatsappInputs(prev => ({ ...prev, [activeLog.leadId]: val }));
                                }}
                                placeholder="Type WhatsApp reply..."
                                className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-full text-xs font-semibold text-gray-800 placeholder-slate-400 outline-none"
                              />
                              <button
                                type="submit"
                                className="p-2 bg-[#128C7E] hover:bg-[#075E54] text-white rounded-full transition-all flex items-center justify-center shrink-0"
                              >
                                <Send size={12} />
                              </button>
                            </form>

                            {/* Info Footer */}
                            <div className="p-3 bg-[#f0f0f0] border-t border-slate-200/50 text-[9px] text-slate-500 font-semibold text-center italic z-10">
                              ⚙️ Outreach Log Status: {activeLog.outcome || 'Asynchronous WhatsApp delivery sequence verified.'}
                            </div>
                          </div>
                        );
                      }

                      // 2. LinkedIn Chat Messenger Mockup
                      if (channelLower === 'linkedin') {
                        const leadLinkedInLogs = outreachLogs
                          .filter(l => l.leadId === activeLog.leadId && (l.channel || '').toLowerCase() === 'linkedin')
                          .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

                        return (
                          <div className="w-full flex flex-col h-[480px] bg-slate-50 rounded-[24px] overflow-hidden border border-gray-200 shadow-lg">
                            {/* LinkedIn Header */}
                            <div className="bg-[#0a66c2] text-white p-3 flex items-center justify-between shadow-md z-10">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs uppercase border border-white/10">
                                  {activeLog.recipient ? activeLog.recipient.substring(0, 1) : 'LI'}
                                </div>
                                <div>
                                  <h4 className="text-xs font-black leading-tight flex items-center gap-1.5">
                                    {activeLog.recipient || 'LinkedIn Contact'}
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                  </h4>
                                  <span className="text-[8px] text-blue-200/90 font-medium block">Direct Cold Invitation Messenger</span>
                                </div>
                              </div>
                              <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-200 rounded-full text-[8px] font-black uppercase tracking-wider">
                                {activeLog.status || 'Sent'}
                              </span>
                            </div>

                            {/* Chat Thread */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 flex flex-col custom-scrollbar">
                              {leadLinkedInLogs.map((msg, mIdx) => {
                                const isIncoming = msg.messageType === 'Incoming_Response';
                                return (
                                  <div
                                    key={mIdx}
                                    className={`flex flex-col max-w-[85%] ${
                                      isIncoming ? 'self-start items-start animate-fade-in' : 'self-end items-end'
                                    }`}
                                  >
                                    <div
                                      className={`p-3 rounded-2xl text-[10px] font-semibold leading-relaxed shadow-sm relative border ${
                                        isIncoming 
                                          ? 'bg-white text-slate-800 rounded-tl-none border-gray-200' 
                                          : 'bg-blue-50/70 text-slate-800 rounded-tr-none border-blue-100/50'
                                      }`}
                                    >
                                      <div className="whitespace-pre-wrap">{msg.contentSent}</div>
                                      <div className="flex items-center justify-end gap-1 mt-1 text-[7px] text-slate-400 font-bold">
                                        <span>{new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Live Chat Input */}
                            <form 
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const text = linkedinInputs[activeLog.leadId] || '';
                                if (!text.trim()) return;
                                setLinkedinInputs(prev => ({ ...prev, [activeLog.leadId]: '' }));
                                try {
                                  await nexaApi.sendOutreach({
                                    leadId: activeLog.leadId,
                                    channel: 'LinkedIn',
                                    messageType: 'Cold_Outreach',
                                    messageContent: text
                                  });
                                  toast.success('LinkedIn connection message sent.');
                                  fetchOutreachLogs();
                                } catch (err) {
                                  toast.error('Failed to send LinkedIn message.');
                                }
                              }}
                              className="p-3 bg-slate-100 border-t border-slate-200/50 flex gap-2 items-center z-10 relative"
                            >
                              <input
                                type="text"
                                value={linkedinInputs[activeLog.leadId] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLinkedinInputs(prev => ({ ...prev, [activeLog.leadId]: val }));
                                }}
                                placeholder="Type LinkedIn reply..."
                                className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-full text-xs font-semibold text-gray-800 placeholder-slate-400 outline-none"
                              />
                              <button
                                type="submit"
                                className="p-2 bg-[#0a66c2] hover:bg-[#004182] text-white rounded-full transition-all flex items-center justify-center shrink-0"
                              >
                                <Send size={12} />
                              </button>
                            </form>

                            {/* Info Footer */}
                            <div className="p-3 bg-slate-100 border-t border-slate-200/50 text-[9px] text-slate-500 font-semibold text-center italic">
                              ⚙️ LinkedIn Log Status: {activeLog.outcome || 'Simulated LinkedIn cold messaging script processed.'}
                            </div>
                          </div>
                        );
                      }

                      // 3. SMTP Mailer Envelope Pane
                      if (channelLower === 'email') {
                        return (
                          <div className="w-full flex flex-col h-[480px] bg-white rounded-[24px] overflow-hidden border border-gray-200 shadow-lg">
                            {/* Email Client Header */}
                            <div className="bg-slate-900 text-white p-4 border-b border-slate-800 flex justify-between items-center shadow-md">
                              <div className="flex items-center gap-2">
                                <Mail size={16} className="text-violet-400" />
                                <span className="text-xs font-black uppercase tracking-wider">SMTP Transaction Monitor</span>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                activeLog.status === 'Sent' || activeLog.status === 'sent' 
                                  ? 'bg-emerald-500/20 text-emerald-300' 
                                  : activeLog.status === 'Pending' || activeLog.status === 'pending'
                                  ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {activeLog.status || 'Pending'}
                              </span>
                            </div>

                            {/* Email Fields */}
                            <div className="p-4 bg-slate-50 border-b border-gray-100 space-y-2 text-[10px] font-semibold text-gray-700">
                              <div className="flex">
                                <span className="w-16 text-gray-400 font-black uppercase">Recipient:</span>
                                <span className="text-gray-900 font-bold">{activeLog.recipient || 'recipient@domain.com'}</span>
                              </div>
                              <div className="flex">
                                <span className="w-16 text-gray-400 font-black uppercase">Sender:</span>
                                <span className="text-gray-500">nexa.ai@nexovtech.ai</span>
                              </div>
                              <div className="flex">
                                <span className="w-16 text-gray-400 font-black uppercase">Subject:</span>
                                <span className="text-slate-800 font-extrabold">[NexovTech] B2B Proposal & Collaboration Opportunity</span>
                              </div>
                            </div>

                            {/* Email Message Content */}
                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar font-medium text-gray-700 text-xs leading-relaxed whitespace-pre-wrap bg-white">
                              {activeLog.contentSent || "SMTP server preparing cold outreach mail envelope..."}
                            </div>

                            {/* Outcome Footer */}
                            <div className="p-3.5 bg-slate-50 border-t border-gray-100 text-[9px] text-slate-500 font-bold">
                              <span className="text-slate-400 font-black uppercase">SMTP LOG:</span> {activeLog.outcome || 'Transmission pending worker dispatch...'}
                            </div>
                          </div>
                        );
                      }

                      // 4. LinkedIn Social Post Card
                      if (channelLower === 'linkedin_post') {
                        return (
                          <div className="w-full bg-white rounded-[24px] border border-gray-200 shadow-lg p-5 space-y-4 max-h-[480px] overflow-y-auto custom-scrollbar">
                            {/* Feed Header */}
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                                  NT
                                </div>
                                <div>
                                  <h5 className="text-xs font-black text-gray-900 flex items-center gap-1 hover:text-blue-600 cursor-pointer leading-tight">
                                    NexovTech Corp <span className="text-[9px] text-slate-400 font-medium">• 1st</span>
                                  </h5>
                                  <p className="text-[8px] text-slate-400 font-medium mt-0.5">B2B SaaS Automation & AI Agentic Networks</p>
                                  <p className="text-[8px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                    Just now • <Globe size={8} />
                                  </p>
                                </div>
                              </div>
                              <button className="text-slate-450 hover:text-slate-650 font-black text-xs">•••</button>
                            </div>

                            {/* Commentary Text */}
                            <p className="text-[11px] font-semibold text-gray-800 leading-relaxed whitespace-pre-wrap">
                              {activeLog.contentSent || "Commentary text loading..."}
                            </p>

                            {/* Decorative Social Stats */}
                            <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-[8px] text-slate-400 font-bold">
                              <div className="flex items-center gap-1.5">
                                <span className="flex -space-x-1">
                                  <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[7px] border border-white">👍</span>
                                  <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[7px] border border-white">❤️</span>
                                  <span className="w-4 h-4 rounded-full bg-yellow-500 text-white flex items-center justify-center text-[7px] border border-white">👏</span>
                                </span>
                                <span>124 likes</span>
                              </div>
                              <div>
                                <span>12 comments • 8 reposts</span>
                              </div>
                            </div>

                            {/* Interaction Buttons Bar */}
                            <div className="border-t border-gray-100 pt-2 flex items-center justify-around text-slate-500 font-black text-[9px] uppercase tracking-wider">
                              <button className="flex items-center gap-1.5 hover:bg-slate-50 p-2 rounded transition-all">
                                <span>👍</span> Like
                              </button>
                              <button className="flex items-center gap-1.5 hover:bg-slate-50 p-2 rounded transition-all">
                                <span>💬</span> Comment
                              </button>
                              <button className="flex items-center gap-1.5 hover:bg-slate-50 p-2 rounded transition-all">
                                <span>🔁</span> Repost
                              </button>
                              <button className="flex items-center gap-1.5 hover:bg-slate-50 p-2 rounded transition-all">
                                <span>✉️</span> Send
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // 5. Default Fallback: Voice Call Waveform & Script Transcription
                      return (
                        <div className="glass-light p-6 rounded-[28px] border border-gray-100 shadow-inner flex flex-col gap-6">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-600/20">
                              <Volume2 size={28} className="text-white animate-pulse" />
                            </div>
                            <h4 className="text-sm font-black text-gray-900">{activeLog.recipient || activeLog.recipientName || activeLog.companyName || 'Outreach Call'}</h4>
                            <p className="text-[10px] text-surface-400 font-medium mt-0.5">
                              {activeLog.channel || 'Voice Campaign'} • Duration: {Math.floor(callDuration / 60)}:{String(callDuration % 60).padStart(2, '0')}
                            </p>
                          </div>

                          {/* Canvas Waveform */}
                          <div className="relative bg-[#0f172a] rounded-2xl p-4 overflow-hidden shadow-inner">
                            <canvas
                              ref={waveCanvasRef}
                              width={320}
                              height={80}
                              className="w-full"
                            />
                            {/* Progress overlay line */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-brand-400 opacity-80 transition-all"
                              style={{ left: `${playProgress}%` }}
                            />
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden cursor-pointer"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                setPlayProgress((x / rect.width) * 100);
                              }}
                            >
                              <div
                                className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full transition-all"
                                style={{ width: `${playProgress}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-surface-400 font-medium">
                              <span>{Math.floor((playProgress / 100) * callDuration / 60)}:{String(Math.floor((playProgress / 100) * callDuration) % 60).padStart(2, '0')}</span>
                              <span>{Math.floor(callDuration / 60)}:{String(callDuration % 60).padStart(2, '0')}</span>
                            </div>
                          </div>

                          {/* Playback Controls */}
                          <div className="flex items-center justify-center gap-4">
                            <button
                              onClick={() => { setPlayProgress(0); setIsPlaying(false); }}
                              className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
                            >
                              <Square size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setIsPlaying(prev => !prev);
                                if (!isPlaying && waveCanvasRef.current) {
                                  const canvas = waveCanvasRef.current;
                                  const ctx = canvas.getContext('2d');
                                  const draw = () => {
                                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                                    ctx.fillStyle = '#0f172a';
                                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                                    const bars = 60;
                                    const barW = canvas.width / bars;
                                    for (let i = 0; i < bars; i++) {
                                      const height = (Math.sin(i * 0.5 + Date.now() * 0.005) * 0.5 + 0.5) * 60 + 10;
                                      const active = (i / bars) * 100 <= playProgress;
                                      ctx.fillStyle = active
                                        ? `hsl(${250 + i * 2},80%,65%)`
                                        : 'rgba(148,163,184,0.3)';
                                      ctx.beginPath();
                                      ctx.roundRect(i * barW + 2, (canvas.height - height) / 2, barW - 4, height, 2);
                                      ctx.fill();
                                    }
                                    waveAnimRef.current = requestAnimationFrame(draw);
                                  };
                                  draw();
                                  playIntervalRef.current = setInterval(() => {
                                    setPlayProgress(prev => {
                                      if (prev >= 100) {
                                        clearInterval(playIntervalRef.current);
                                        setIsPlaying(false);
                                        cancelAnimationFrame(waveAnimRef.current);
                                        return 100;
                                      }
                                      return prev + (100 / callDuration);
                                    });
                                  }, 1000);
                                } else {
                                  clearInterval(playIntervalRef.current);
                                  cancelAnimationFrame(waveAnimRef.current);
                                }
                              }}
                              className="w-14 h-14 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-600/30 transition-all"
                            >
                              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                            </button>
                            <button
                              onClick={() => { setPlayProgress(100); setIsPlaying(false); }}
                              className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
                            >
                              <Activity size={14} />
                            </button>
                          </div>

                          {/* Voice Call Transcription */}
                          <div className="space-y-2 mt-2">
                            <span className="text-[9px] font-black text-surface-500 uppercase tracking-widest block">Call Script & Live Transcription</span>
                            <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-[10px] font-mono whitespace-pre-wrap leading-relaxed max-h-[160px] overflow-y-auto custom-scrollbar border border-slate-800">
                              {activeLog.contentSent || "Transcribing voice call stream..."}
                            </div>
                          </div>

                          {/* Call Metadata */}
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: 'Duration', val: `${Math.floor(callDuration / 60)}m ${callDuration % 60}s` },
                              { label: 'Channel', val: activeLog.channel || 'Voice' },
                              { label: 'Status', val: activeLog.status || 'Sent' }
                            ].map((m, i) => (
                              <div key={i} className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[8px] font-black text-surface-400 uppercase tracking-widest">{m.label}</p>
                                <p className="text-[11px] font-black text-gray-900 mt-1 capitalize">{m.val}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ZEGOCLOUD Real-Time WebRTC Calling Section */}
                <div className="mt-8 glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl bg-gradient-to-br from-white via-white to-violet-50/20">
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
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${zegoConnected ? 'bg-emerald-400' : 'bg-violet-400'}`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${zegoConnected ? 'bg-emerald-500' : 'bg-violet-500'}`}></span>
                        </span>
                        <h4 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                          ZEGOCLOUD WebRTC Consultation & Calling Portal
                        </h4>
                      </div>
                      <p className="text-xs text-surface-400 font-medium mt-1">
                        Connect live over WebRTC with clients, leads or team representatives instantly.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-lg">
                        SDK Status: {zegoConnected ? 'Connected' : zegoConnecting ? 'Connecting...' : 'Idle'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Dialer / Controls Card */}
                    <div className="lg:col-span-1 p-6 bg-gray-50/80 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">Room ID (WebRTC Channel)</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={zegoRoomID}
                              onChange={(e) => {
                                setZegoRoomID(e.target.value);
                                zegoRoomIdRef.current = e.target.value;
                              }}
                              disabled={zegoConnected || zegoConnecting}
                              placeholder="e.g. nexov_consult_123"
                              className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                            />
                            <button
                              onClick={() => {
                                const newId = `room_${Math.floor(1000 + Math.random() * 9000)}`;
                                setZegoRoomID(newId);
                                zegoRoomIdRef.current = newId;
                              }}
                              disabled={zegoConnected || zegoConnecting}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-brand-600 hover:text-brand-500 disabled:opacity-40"
                              title="Generate random Room ID"
                            >
                              <RefreshCw size={14} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">Caller User ID</label>
                          <input
                            type="text"
                            value={zegoUserID}
                            disabled={true}
                            className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="mt-6">
                        {!zegoConnected ? (
                          <button
                            onClick={handleJoinZegoCall}
                            disabled={zegoConnecting}
                            className="w-full py-3 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                          >
                            {zegoConnecting ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <PhoneCall size={14} />
                                Start Live Call Room
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={handleToggleMuteZego}
                              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                                zegoMuted
                                  ? 'bg-amber-500/10 border-amber-500 text-amber-700 hover:bg-amber-500/20'
                                  : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <Mic size={14} />
                              {zegoMuted ? 'Unmute Mic' : 'Mute Mic'}
                            </button>
                            <button
                              onClick={handleDisconnectZegoCall}
                              className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-red-600/20"
                            >
                              <Square size={14} />
                              Leave Room
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Calling Interface Visualizer & Active Streams */}
                    <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[220px]">
                      <div>
                        <h5 className="text-xs font-black text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                          <Activity size={14} className="text-brand-500" /> Room Feed & Connected Streamers
                        </h5>
                        
                        {!zegoConnected ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center text-surface-400">
                            <Mic size={36} className="opacity-20 mb-2" />
                            <p className="text-xs font-semibold">WebRTC call channel is currently inactive.</p>
                            <p className="text-[10px] text-surface-400 mt-1 max-w-sm">
                              Enter a Room ID and launch the room to publish your microphone stream and start receiving client streams.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-brand-50/50 rounded-xl border border-brand-100">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center">
                                  <Mic size={12} className={zegoMuted ? "opacity-40" : "animate-pulse"} />
                                </div>
                                <div>
                                  <p className="text-xs font-black text-gray-900">Admin Representative (You)</p>
                                  <p className="text-[9px] text-surface-400 font-medium">Local Microphone Stream • {zegoMuted ? 'Muted' : 'Active'}</p>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 rounded-full animate-pulse">
                                Live Publishing
                              </span>
                            </div>

                            {/* Remote Users/Streams list */}
                            {zegoActiveUsers.length === 0 ? (
                              <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100 text-surface-400">
                                <p className="text-[10px] font-semibold">Waiting for lead representative or event participant to join...</p>
                                <p className="text-[9px] text-surface-400 mt-0.5">Share Room ID: <span className="font-bold text-gray-900">{zegoRoomID}</span> to invite others.</p>
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                {zegoActiveUsers.map(uid => {
                                  const isAI = uid === "NEXA Voice Agent (AI)";
                                  return (
                                    <div key={uid} className={`flex flex-col p-3 rounded-xl border transition-all ${
                                      isAI 
                                        ? 'border-brand-500/20 bg-brand-500/[0.02] shadow-sm' 
                                        : 'border-gray-200 bg-gray-50'
                                    }`}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                            isAI ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600'
                                          }`}>
                                            {isAI ? (
                                              <Bot size={14} className={agentSpeaking ? "animate-pulse" : ""} />
                                            ) : (
                                              <Volume2 size={12} className="animate-bounce" />
                                            )}
                                          </div>
                                          <div>
                                            <p className="text-xs font-black text-gray-900">{uid}</p>
                                            <p className="text-[9px] text-surface-400 font-medium">
                                              {isAI ? 'Autonomous Web Speech Agent' : 'Remote Participant joined room'}
                                            </p>
                                          </div>
                                        </div>
                                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full ${
                                          isAI 
                                            ? (agentSpeaking ? 'bg-brand-100 text-brand-700 animate-pulse' : 'bg-violet-100 text-violet-700')
                                            : 'bg-brand-100 text-brand-700 font-extrabold'
                                        }`}>
                                          {isAI ? (agentSpeaking ? 'Speaking...' : 'Listening...') : 'Receiving Audio'}
                                        </span>
                                      </div>

                                      {/* If AI is speaking, render a small inline soundwave */}
                                      {isAI && agentSpeaking && (
                                        <div className="mt-2.5 flex items-center gap-1 h-3.5 pl-11 justify-start">
                                          {[1, 2, 3, 4, 5, 6, 7].map(j => (
                                            <span
                                              key={j}
                                              className="w-0.5 bg-brand-500 rounded-full animate-soundwave"
                                              style={{
                                                height: `${Math.floor(Math.random() * 10) + 4}px`,
                                                animationDelay: `${j * 0.06}s`
                                              }}
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Live AI Speech Conversation Transcript Widget */}
                            <div className="mt-4 pt-4 border-t border-gray-200/60">
                              <h5 className="text-[10px] font-black text-gray-900 mb-2 uppercase tracking-wider flex items-center gap-2">
                                <MessageSquare size={12} className="text-brand-500" /> Live AI Speech Consultation Transcript
                              </h5>
                              <div className="bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 h-[150px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
                                {voiceTranscript.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                                    <Mic size={18} className="opacity-20 mb-1" />
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Microphone stream is live</p>
                                    <p className="text-[8px] max-w-xs mt-0.5">Start speaking into your microphone to transcribe voice turns and trigger AI responses.</p>
                                  </div>
                                ) : (
                                  voiceTranscript.map((t, idx) => (
                                    <div key={idx} className={`flex gap-1.5 max-w-[90%] ${
                                      t.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start animate-fade-in'
                                    }`}>
                                      <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[8px] font-black uppercase ${
                                        t.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-brand-600 text-white'
                                      }`}>
                                        {t.sender === 'user' ? 'U' : 'AI'}
                                      </div>
                                      <div className={`p-2.5 rounded-xl text-[9.5px] font-semibold leading-relaxed ${
                                        t.sender === 'user'
                                          ? 'bg-indigo-950/80 text-indigo-200 rounded-tr-none border border-indigo-900/60'
                                          : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60'
                                      }`}>
                                        {t.text}
                                      </div>
                                    </div>
                                  ))
                                )}
                                <div ref={transcriptEndRef} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Live visualizer soundwave (CSS) */}
                      {zegoConnected && !zegoMuted && (
                        <div className="mt-4 flex items-center gap-1.5 justify-center h-8">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(i => (
                            <span
                              key={i}
                              className="w-1 bg-gradient-to-t from-brand-500 to-violet-500 rounded-full transition-all animate-soundwave"
                              style={{
                                height: `${Math.floor(Math.random() * 24) + 6}px`,
                                animationDelay: `${i * 0.08}s`
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* RAG MEMORY CONSOLE */}
          {activeTab === 'memory' && (
            <motion.div
              key="memory"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Header + Stats */}
              <div className="glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <Database size={18} className="text-violet-500" /> Admin RAG Memory Console
                    </h3>
                    <p className="text-xs text-surface-400 font-medium">Inspect, seed, search, and prune the semantic vector knowledge base.</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button
                      onClick={fetchVectorDocs}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      <RefreshCw size={12} /> Refresh
                    </button>
                    <button
                      onClick={handleSyncProposals}
                      disabled={syncingProposals}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-violet-100 disabled:opacity-50"
                    >
                      {syncingProposals ? <RefreshCw size={12} className="animate-spin" /> : <Database size={12} />}
                      Sync Proposals
                    </button>
                    <button
                      onClick={handleSyncOutreach}
                      disabled={syncingOutreach}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-100 disabled:opacity-50"
                    >
                      {syncingOutreach ? <RefreshCw size={12} className="animate-spin" /> : <Layers size={12} />}
                      Sync Outreach Logs
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    type="text"
                    placeholder="Semantic search across vector memory..."
                    value={vectorSearch}
                    onChange={(e) => setVectorSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                {/* Collection Filter Badges */}
                <div className="flex gap-2 flex-wrap mb-4">
                  {['All', 'company_knowledge', 'dealings_memory', 'crm_memory', 'client_proposals', 'outreach_templates', 'security_rules'].map(coll => (
                    <button
                      key={coll}
                      onClick={() => setNewDocCollection(coll === 'All' ? 'company_knowledge' : coll)}
                      className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                        (coll === 'All' ? newDocCollection === 'company_knowledge' : newDocCollection === coll)
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {coll}
                    </button>
                  ))}
                </div>

                {/* Document List */}
                {vectorLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw size={24} className="text-brand-500 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                    {vectorDocs
                      .filter(doc => {
                        const q = vectorSearch.toLowerCase();
                        if (!q) return true;
                        return (doc.text || '').toLowerCase().includes(q) ||
                               (doc.collection || '').toLowerCase().includes(q) ||
                               (doc.metadata?.client || '').toLowerCase().includes(q);
                      })
                      .map((doc, idx) => (
                        <motion.div
                          key={doc.id || idx}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="flex gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all group"
                        >
                          <div className="w-10 h-10 bg-violet-50 border border-violet-100 rounded-xl flex items-center justify-center shrink-0">
                            <FileText size={14} className="text-violet-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[8px] font-black text-brand-600 uppercase tracking-widest bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
                                  {doc.collection || 'company_knowledge'}
                                </span>
                                {doc.metadata?.client && (
                                  <span className="ml-1 text-[8px] font-black text-surface-400 uppercase tracking-widest">
                                    • {doc.metadata.client}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteVectorDoc(doc.id)}
                                disabled={deletingDocId === doc.id}
                                className="p-1.5 text-surface-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
                              >
                                {deletingDocId === doc.id
                                  ? <RefreshCw size={12} className="animate-spin" />
                                  : <Trash2 size={12} />}
                              </button>
                            </div>
                            <p className="text-[11px] font-medium text-gray-700 mt-2 leading-relaxed line-clamp-2">{doc.text}</p>
                            <p className="text-[9px] text-surface-300 mt-1.5 font-medium">
                              {doc.createdAt ? new Date(doc.createdAt).toLocaleString() : 'Seeded manually'}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    {vectorDocs.length === 0 && (
                      <div className="text-center py-16 text-surface-400">
                        <Database size={40} className="mx-auto mb-3 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-wider">Memory is Empty</p>
                        <p className="text-[10px] mt-1 font-medium">Seed the first RAG document using the form below.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Manual Seed Form */}
              <div className="glass-light p-8 rounded-[32px] border border-gray-100 shadow-xl">
                <h4 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2 mb-6">
                  <Plus size={16} className="text-emerald-500" /> Manually Seed RAG Document
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-surface-500 uppercase tracking-widest">Collection Name</label>
                    <select
                      value={newDocCollection}
                      onChange={e => setNewDocCollection(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
                    >
                      <option value="company_knowledge">company_knowledge</option>
                      <option value="client_proposals">client_proposals</option>
                      <option value="outreach_templates">outreach_templates</option>
                      <option value="security_rules">security_rules</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-surface-500 uppercase tracking-widest">Client / Context Tag (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Corp, System Guideline..."
                      value={newDocClient}
                      onChange={e => setNewDocClient(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[8px] font-black text-surface-500 uppercase tracking-widest">Document Content</label>
                    <textarea
                      placeholder="Enter the knowledge document text that NEXA should remember and retrieve contextually..."
                      value={newDocText}
                      onChange={e => setNewDocText(e.target.value)}
                      rows={4}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none resize-none"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddVectorDoc}
                  disabled={addingDoc || !newDocText.trim()}
                  className="mt-4 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-md shadow-brand-600/20 disabled:opacity-50"
                >
                  {addingDoc ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                  {addingDoc ? 'Seeding to Vector Store...' : 'Seed to RAG Memory'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default AIModule;
