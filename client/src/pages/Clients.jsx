import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Filter, Plus, Trash2, Mail, Globe, History,
  TrendingUp, MoreVertical, CheckCircle2, X, AlertTriangle, Briefcase,
  FileText, IndianRupee, Download, Loader2, Zap, ShieldCheck,
  RefreshCw, Cpu, Bot, ChevronRight, FileDown, Phone, MessageSquare, Send
} from 'lucide-react';

import API_URL from '../config';
import { nexaApi } from '../services/nexaApi';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid
} from 'recharts';
import { useChat } from '../context/ChatContext';
import { toast } from 'react-hot-toast';

const Clients = () => {
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'discovery' | 'gateway'
  const { socket } = useChat();
  const [selectedLog, setSelectedLog] = useState(null);
  const [chatInputText, setChatInputText] = useState('');
  const [sendingChatReply, setSendingChatReply] = useState(false);

  // Roster Tab States
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);

  // Modals State
  const [deleteModal, setDeleteModal] = useState({ show: false, clientId: null, clientName: '' });
  const [addModal, setAddModal] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState({ show: false, clientName: '', amount: '', description: '' });
  const [newClient, setNewClient] = useState({ name: '', email: '', businessType: 'Enterprise', serviceType: 'AI Solutions' });

  // Discovery Tab States
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [industry, setIndustry] = useState('healthcare');
  const [regionPreset, setRegionPreset] = useState('All Countries');
  const [region, setRegion] = useState('All Countries');
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('All');

  // Lead Conversion states
  const [selectedLead, setSelectedLead] = useState(null);
  const [serviceType, setServiceType] = useState('AI Solutions');
  const [quotationAmount, setQuotationAmount] = useState('');
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [generatedProposal, setGeneratedProposal] = useState(null);

  // Outreach Panel states
  const [activeOutreachChannel, setActiveOutreachChannel] = useState('Email');
  const [customPrompt, setCustomPrompt] = useState('');
  const [language, setLanguage] = useState('en');
  const [outreachContent, setOutreachContent] = useState('');
  const [sendingOutreach, setSendingOutreach] = useState(false);
  const [draftingOutreach, setDraftingOutreach] = useState(false);

  // Gateway Tab States
  const [pendingDeals, setPendingDeals] = useState([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [outreachLogs, setOutreachLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Fetch Core Lists
  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/clients`);
      if (!response.ok) throw new Error('Failed to retrieve corporate accounts');
      const data = await response.json();
      setClients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const data = await nexaApi.getLeads();
      if (data.success && data.leads) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.error('Failed to retrieve leads:', err.message);
    } finally {
      setLoadingLeads(false);
    }
  };

  const fetchPendingDeals = async () => {
    setLoadingDeals(true);
    try {
      const data = await nexaApi.getPendingDeals();
      if (data.success && data.deals) {
        setPendingDeals(data.deals);
      }
    } catch (err) {
      console.error('Failed to retrieve pending deals:', err.message);
    } finally {
      setLoadingDeals(false);
    }
  };

  const fetchOutreachLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await nexaApi.getOutreachLogs();
      if (data) {
        setOutreachLogs(Array.isArray(data) ? data : (data.logs || []));
      }
    } catch (err) {
      console.error('Failed to retrieve outreach logs:', err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchLeads();
    fetchPendingDeals();
    fetchOutreachLogs();
  }, []);

  useEffect(() => {
    if (socket) {
      console.log('📡 OMNICHANNEL MONITOR (CLIENTS): Listening to real-time sync updates.');
      
      socket.on('outreach_update', (updatedLog) => {
        console.log('📡 OMNICHANNEL MONITOR (CLIENTS): Real-time update received:', updatedLog);
        
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

      return () => {
        socket.off('outreach_update');
      };
    }
  }, [socket]);

  // Handlers for Active Clients
  const handleAddClient = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      });
      if (response.ok) {
        const saved = await response.json();
        setClients([saved, ...clients]);
        setAddModal(false);
        setNewClient({ name: '', email: '', businessType: 'Enterprise', serviceType: 'AI Solutions' });
        showNotification({ text: 'Enterprise client onboarded successfully.' });
      } else {
        showNotification({ text: 'Onboarding failed. Please check parameters.', isError: true });
      }
    } catch (err) {
      showNotification({ text: 'Server connection failed.', isError: true });
    }
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/finance/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...invoiceModal, amount: Number(invoiceModal.amount) })
      });
      if (response.ok) {
        const saved = await response.json();
        setInvoiceModal({ show: false, clientName: '', amount: '', description: '' });
        showNotification({
          text: 'Invoice generated successfully!',
          action: () => window.open(`${API_URL}/finance/invoices/${saved._id}/pdf`, '_blank'),
          actionText: 'Download PDF'
        });
      } else {
        showNotification({ text: 'Invoice forging failed.', isError: true });
      }
    } catch (err) {
      showNotification({ text: 'Server connection failed.', isError: true });
    }
  };

  const confirmDelete = async () => {
    const { clientId } = deleteModal;
    try {
      const response = await fetch(`${API_URL}/clients/${clientId}`, { method: 'DELETE' });
      if (response.ok) {
        setClients(clients.filter(c => c._id !== clientId));
        showNotification({ text: 'Client removed successfully from the system.' });
      } else {
        showNotification({ text: 'De-authorization failed.', isError: true });
      }
    } catch (err) {
      showNotification({ text: 'Server connection failed.', isError: true });
    } finally {
      setDeleteModal({ show: false, clientId: null, clientName: '' });
    }
  };

  // Handlers for Lead Acquisition
  const handleDiscoverLeads = async (e) => {
    e.preventDefault();
    setScraping(true);
    showNotification({ text: 'Executing B2B scraping campaign...' });
    try {
      const result = await nexaApi.discoverLeads({ industry, region, limit: 5 });
      showNotification({ text: result.message || 'Scrape completed successfully.' });
      fetchLeads();
      fetchPendingDeals();
    } catch (err) {
      showNotification({ text: 'Lead scraping campaign failed.', isError: true });
    } finally {
      setScraping(false);
    }
  };

  const handleScoreLead = async (leadId) => {
    showNotification({ text: 'Computing lead qualification metrics...' });
    try {
      const result = await nexaApi.scoreLead(leadId);
      showNotification({ text: `Opportunity scored: ${result.score?.overallOpportunityScore || 50}%` });
      fetchLeads();
      fetchPendingDeals();
    } catch (err) {
      showNotification({ text: 'Lead qualification scoring failed.', isError: true });
    }
  };

  const handleGenerateProposal = async () => {
    if (!selectedLead) return;
    setGeneratingProposal(true);
    try {
      const result = await nexaApi.generateProposal({
        leadId: selectedLead.id || selectedLead._id,
        serviceType,
        quotationAmount: Number(quotationAmount)
      });
      showNotification({ text: 'Tailored proposal generated successfully.' });
      setGeneratedProposal(result.proposal);
      fetchLeads();
      fetchPendingDeals();
    } catch (err) {
      showNotification({ text: 'Proposal generation failed.', isError: true });
    } finally {
      setGeneratingProposal(false);
    }
  };

  const handleLoadOutreachDraft = async () => {
    if (!selectedLead) return;
    setDraftingOutreach(true);
    try {
      const result = await nexaApi.generateOutreachDraft({
        leadId: selectedLead.id || selectedLead._id,
        channel: activeOutreachChannel,
        customPrompt,
        language
      });
      setOutreachContent(result.draft || result.message || '');
    } catch (err) {
      showNotification({ text: 'Failed to draft custom outreach.', isError: true });
    } finally {
      setDraftingOutreach(false);
    }
  };

  const handleSendOutreach = async () => {
    if (!selectedLead || !outreachContent) return;
    setSendingOutreach(true);
    try {
      await nexaApi.sendOutreach({
        leadId: selectedLead.id || selectedLead._id,
        channel: activeOutreachChannel,
        messageType: 'Cold_Outreach',
        messageContent: outreachContent
      });
      showNotification({ text: 'Outreach campaign queued successfully.' });
      setOutreachContent('');
      setSelectedLead(null);
      fetchLeads();
      fetchOutreachLogs();
    } catch (err) {
      showNotification({ text: 'Outreach dispatch failed.', isError: true });
    } finally {
      setSendingOutreach(false);
    }
  };

  const handleSendChatReply = async (e) => {
    e.preventDefault();
    if (!chatInputText.trim() || sendingChatReply || !selectedLog) return;
    
    setSendingChatReply(true);
    try {
      await nexaApi.sendOutreach({
        leadId: selectedLog.leadId,
        channel: selectedLog.channel,
        messageType: 'Cold_Outreach',
        messageContent: chatInputText
      });
      setChatInputText('');
      showNotification({ text: 'Outbound response queued successfully.' });
      fetchOutreachLogs();
    } catch (err) {
      showNotification({ text: 'Failed to send outbound reply.', isError: true });
    } finally {
      setSendingChatReply(false);
    }
  };

  const handleApprovePendingDeal = async (dealId) => {
    showNotification({ text: 'Authorizing deal. Launching repository and invoices...' });
    try {
      const result = await nexaApi.approvePendingDeal(dealId);
      showNotification({ text: 'Deal approved! Project launched & LinkedIn posted.' });
      fetchPendingDeals();
      fetchClients();
      fetchLeads();
      fetchOutreachLogs();
    } catch (err) {
      showNotification({ text: 'Failed to deploy pending deal.', isError: true });
    }
  };

  const handleRejectPendingDeal = async (dealId) => {
    if (!window.confirm('Are you sure you want to archive this contract proposal?')) return;
    try {
      await nexaApi.rejectPendingDeal(dealId);
      showNotification({ text: 'Deal rejected & lead archived.' });
      fetchPendingDeals();
      fetchLeads();
    } catch (err) {
      showNotification({ text: 'Failed to reject deal.', isError: true });
    }
  };

  // Helper Excel/CSV exporter
  const handleExportLeadsToCSV = () => {
    const headers = [
      'Company Name',
      'Website',
      'Industry',
      'Company Size',
      'Tech Stack',
      'Contact Name',
      'Email',
      'Phone',
      'LinkedIn URL',
      'Opportunity Score',
      'Status'
    ];

    const rows = leads.map(lead => {
      const name = lead.companyName || '';
      const techStack = Array.isArray(lead.techStack) ? lead.techStack.join('; ') : '';
      const email = lead.emails?.[0] || (lead.contactInfo?.emails?.[0] || '');
      const phone = lead.phones?.[0] || (lead.contactInfo?.phones?.[0] || '');
      const linkedin = lead.linkedinUrls?.[0] || (lead.contactInfo?.linkedInUrls?.[0] || '');
      const score = lead.leadScores?.[0]?.overallOpportunityScore || '';
      const status = lead.status || '';
      const contactName = lead.contactName || (lead.contactInfo?.primaryContactName || '');

      return [
        `"${name.replace(/"/g, '""')}"`,
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

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `NEXA_Leads_Acquisitions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification({ text: 'Leads dataset exported to CSV successfully.' });
  };

  const showNotification = (data) => {
    setNotification(data);
    setTimeout(() => setNotification(null), 5000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Converted': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Lead': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getFlagEmoji = (countryName) => {
    if (!countryName) return '🌎';
    const c = countryName.toLowerCase();
    if (c.includes('united states') || c.includes('us')) return '🇺🇸';
    if (c.includes('united kingdom') || c.includes('uk')) return '🇬🇧';
    if (c.includes('india')) return '🇮🇳';
    if (c.includes('germany')) return '🇩🇪';
    if (c.includes('canada')) return '🇨🇦';
    if (c.includes('australia')) return '🇦🇺';
    if (c.includes('singapore')) return '🇸🇬';
    return '🌎';
  };

  const analytics = React.useMemo(() => {
    const industryEstimates = {
      healthcare: 600000,
      fintech: 750000,
      logistics: 500000,
      ecommerce: 450000,
      agency: 300000,
    };

    const industryTotals = {};
    const industryCounts = {};

    Object.keys(industryEstimates).forEach(ind => {
      industryTotals[ind] = 0;
      industryCounts[ind] = 0;
    });

    let totalPipeline = 0;
    let convertedCount = 0;

    const funnelCounts = {
      Discovered: 0,
      Scored: 0,
      OutreachSent: 0,
      Converted: 0
    };

    leads.forEach(lead => {
      const ind = (lead.industry || '').toLowerCase();
      const score = lead.leadScores?.[0]?.overallOpportunityScore || 50;
      const baseVal = industryEstimates[ind] || 400000;
      const projectedVal = baseVal * (score / 100);

      if (lead.status !== 'Archived') {
        industryTotals[ind] = (industryTotals[ind] || 0) + projectedVal;
        industryCounts[ind] = (industryCounts[ind] || 0) + 1;
        totalPipeline += projectedVal;
      }

      if (lead.status === 'Discovered') {
        funnelCounts.Discovered++;
      } else if (lead.status === 'Scored') {
        funnelCounts.Scored++;
      } else if (lead.status === 'Outreach_Sent' || lead.status === 'Proposal_Generated') {
        funnelCounts.OutreachSent++;
      } else if (lead.status === 'Converted') {
        funnelCounts.Converted++;
        convertedCount++;
      }
    });

    const pipelineData = Object.keys(industryTotals).map(ind => ({
      name: ind.charAt(0).toUpperCase() + ind.slice(1),
      value: Math.round(industryTotals[ind]),
      count: industryCounts[ind]
    }));

    const funnelData = [
      { stage: 'Discovered', count: funnelCounts.Discovered, fill: '#6366f1' },
      { stage: 'Qualified', count: funnelCounts.Scored, fill: '#8b5cf6' },
      { stage: 'Outreach Sent', count: funnelCounts.OutreachSent, fill: '#f59e0b' },
      { stage: 'Converted', count: funnelCounts.Converted, fill: '#10b981' }
    ];

    const distributionData = Object.keys(industryCounts).map(ind => ({
      name: ind.charAt(0).toUpperCase() + ind.slice(1),
      value: industryCounts[ind]
    })).filter(item => item.value > 0);

    return {
      pipelineData,
      funnelData,
      distributionData,
      totalPipeline,
      convertedCount,
      totalLeadsCount: leads.length
    };
  }, [leads]);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.businessType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLeads = leads.filter(l => {
    const nameVal = typeof l.companyName === 'object' && l.companyName ? l.companyName.name : l.companyName || '';
    const matchesSearch = nameVal.toLowerCase().includes(leadSearchTerm.toLowerCase()) ||
      (l.website || '').toLowerCase().includes(leadSearchTerm.toLowerCase());
    const matchesStatus = leadStatusFilter === 'All' || l.status === leadStatusFilter;
    
    // Only show high qualifications (score >= 80) or newly discovered leads (not yet evaluated)
    const score = l.leadScores?.[0]?.overallOpportunityScore || null;
    const isHighQual = score === null || score >= 80;
    
    return matchesSearch && matchesStatus && isHighQual;
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 size={48} className="text-brand-500 animate-spin" />
      <p className="text-surface-500 font-black uppercase tracking-widest text-xs">Accessing Client Roster...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20 glass rounded-[40px] border border-rose-500/20">
      <AlertTriangle size={64} className="text-rose-500 mx-auto mb-6" />
      <h3 className="text-2xl font-black text-slate-100">Directory Unreachable</h3>
      <p className="text-surface-500 mt-2">{error}</p>
      <button onClick={fetchClients} className="mt-8 px-8 py-3 bg-brand-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all">Retry Link</button>
    </div>
  );

  return (
    <div className="space-y-12 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">Client Portfolio</h1>
          <p className="text-surface-500 mt-2 font-medium">Acquire B2B client contracts and monitor CRM active pipelines.</p>
        </div>

        {activeTab === 'roster' && (
          <button
            onClick={() => setAddModal(true)}
            className="bg-brand-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/30 flex items-center gap-3 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Onboard Manual Account
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-8">
        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'roster' ? 'border-brand-600 text-slate-900 dark:text-slate-100 font-bold' : 'border-transparent text-surface-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
        >
          Active Clients Roster
        </button>

        <button
          onClick={() => setActiveTab('discovery')}
          className={`pb-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'discovery' ? 'border-brand-600 text-slate-900 dark:text-slate-100 font-bold' : 'border-transparent text-surface-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
        >
          Client Acquisition AI (Scraper)
        </button>

        <button
          onClick={() => setActiveTab('gateway')}
          className={`pb-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 relative ${activeTab === 'gateway' ? 'border-brand-600 text-slate-900 dark:text-slate-100 font-bold' : 'border-transparent text-surface-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
        >
          Pending Deals Gateway
          {pendingDeals.length > 0 && (
            <span className="absolute top-0 -right-4 w-4 h-4 bg-rose-500 text-white rounded-full text-[8px] flex items-center justify-center font-black animate-pulse">
              {pendingDeals.length}
            </span>
          )}
        </button>
      </div>

      {/* Roster Tab View */}
      {activeTab === 'roster' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Toolbar */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-600 group-focus-within:text-brand-400 transition-colors" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by client company name, service vertical..."
                className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/30 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
            <button className="p-4 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl text-surface-500 hover:text-slate-900 dark:hover:text-slate-100 transition-all">
              <Filter size={20} />
            </button>
          </div>

          {/* Table */}
          <div className="glass-light rounded-[40px] border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.04]">
                  <th className="px-8 py-6 text-[10px] font-black text-surface-500 uppercase tracking-widest">Client Identity</th>
                  <th className="px-8 py-6 text-[10px] font-black text-surface-500 uppercase tracking-widest">Service Vertical</th>
                  <th className="px-8 py-6 text-[10px] font-black text-surface-500 uppercase tracking-widest">Engagement Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-surface-500 uppercase tracking-widest text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center text-surface-500 font-bold">No active corporate clients found.</td>
                  </tr>
                ) : filteredClients.map((client) => (
                  <tr key={client._id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.04] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-neon-blue flex items-center justify-center text-white font-black text-xl shadow-lg">
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{client.name}</p>
                          <p className="text-[10px] text-surface-500 font-black uppercase tracking-widest">{client.businessType || 'Enterprise'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-bold text-sm">
                        <Globe size={14} className="text-brand-500" /> {client.serviceType || 'Custom Solutions'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(client.status || 'Active')}`}>
                        {client.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => setInvoiceModal({ show: true, clientName: client.name, amount: '', description: '' })}
                          className="p-3 bg-brand-500/10 hover:bg-brand-500/20 rounded-xl text-brand-400 transition-colors"
                          title="Generate Invoice"
                        >
                          <FileText size={18} />
                        </button>
                        <button className="p-3 bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-surface-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                          <Mail size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ show: true, clientId: client._id, clientName: client.name })}
                          className="p-3 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-rose-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Discovery Tab View */}
      {activeTab === 'discovery' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

          {/* === REAL-TIME VISUAL ANALYTICS DASHBOARD === */}
          <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                  <TrendingUp size={20} className="text-brand-500" /> Real-Time Pipeline Analytics
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-1">Live metrics computed from scraped B2B prospect database.</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-2xl">
                <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">
                  {analytics.totalLeadsCount} Prospects Tracked
                </span>
              </div>
            </div>

            {/* KPI Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Pipeline Value', value: `₹${(analytics.totalPipeline / 100000).toFixed(1)}L`, sub: 'Projected Revenue', color: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-200' },
                { label: 'Total Prospects', value: analytics.totalLeadsCount, sub: 'All Statuses', color: '#8b5cf6', bg: 'bg-violet-50', border: 'border-violet-200' },
                { label: 'Conversions', value: analytics.convertedCount, sub: 'Qualified → Converted', color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                { label: 'Conversion Rate', value: analytics.totalLeadsCount > 0 ? `${Math.round((analytics.convertedCount / analytics.totalLeadsCount) * 100)}%` : '0%', sub: 'Lead → Client', color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200' }
              ].map((kpi, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass-light p-5 rounded-[24px] border ${kpi.border} shadow-sm flex flex-col gap-1`}
                >
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{kpi.label}</span>
                  <span className="text-2xl font-black text-slate-100" style={{ color: kpi.color }}>{kpi.value}</span>
                  <span className="text-[10px] font-semibold text-slate-400">{kpi.sub}</span>
                </motion.div>
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Chart 1: Pipeline by Industry (Area Chart) */}
              <div className="glass-light p-6 rounded-[28px] border border-white/10 shadow-xl">
                <h4 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <IndianRupee size={14} className="text-indigo-500" /> Projected Pipeline
                </h4>
                <p className="text-[10px] text-slate-400 font-medium mb-5">Estimated revenue by niche segment</p>
                {analytics.pipelineData.filter(d => d.value > 0).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-36 text-slate-300">
                    <TrendingUp size={32} className="mb-2" />
                    <span className="text-[10px] font-bold uppercase">No pipeline data yet</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={analytics.pipelineData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pipelineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                      <Tooltip
                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 }}
                        formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Projected']}
                      />
                      <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fill="url(#pipelineGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Chart 2: Conversion Funnel (Bar Chart) */}
              <div className="glass-light p-6 rounded-[28px] border border-white/10 shadow-xl">
                <h4 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Zap size={14} className="text-amber-500" /> Conversion Funnel
                </h4>
                <p className="text-[10px] text-slate-400 font-medium mb-5">Lead progression through pipeline stages</p>
                {analytics.funnelData.every(d => d.count === 0) ? (
                  <div className="flex flex-col items-center justify-center h-36 text-slate-300">
                    <Zap size={32} className="mb-2" />
                    <span className="text-[10px] font-bold uppercase">No funnel data yet</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={analytics.funnelData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} barSize={26}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="stage" tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 }}
                        formatter={(value) => [value, 'Leads']}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {analytics.funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Chart 3: Niche Distribution (Horizontal mini-bars) */}
              <div className="glass-light p-6 rounded-[28px] border border-white/10 shadow-xl">
                <h4 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Cpu size={14} className="text-violet-500" /> Niche Distribution
                </h4>
                <p className="text-[10px] text-slate-400 font-medium mb-5">Active prospects by industry segment</p>
                {analytics.distributionData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-36 text-slate-300">
                    <Cpu size={32} className="mb-2" />
                    <span className="text-[10px] font-bold uppercase">No industry data yet</span>
                  </div>
                ) : (
                  <div className="space-y-3 mt-2">
                    {(() => {
                      const maxVal = Math.max(...analytics.distributionData.map(d => d.value), 1);
                      const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4'];
                      return analytics.distributionData.map((item, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-300">{item.name}</span>
                            <span className="text-[10px] font-black text-slate-400">{item.value} lead{item.value !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(item.value / maxVal) * 100}%` }}
                              transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: colors[i % colors.length] }}
                            />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* === SCRAPER & LEADS SECTION === */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Scraper Input Form */}
            <div className="glass-light p-8 rounded-[32px] border border-slate-200 dark:border-white/10 shadow-xl h-fit">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight mb-6 flex items-center gap-2">
                <Search size={18} className="text-brand-500" /> B2B Target Crawler
              </h3>

              <form onSubmit={handleDiscoverLeads} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest">Industry Domain</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
                  >
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="healthcare">Healthcare & Medical Clinics</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="ecommerce">E-Commerce Enterprises</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="agency">Agencies & Consulting</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="fintech">Financial Technologies (FinTech)</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="logistics">Supply Chain & Logistics</option>
                  </select>
                </div>

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
                    className="w-full p-4 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
                  >
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="All Countries">🌎 Global (All Regions)</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="United States">🇺🇸 United States</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="United Kingdom">🇬🇧 United Kingdom</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="India">🇮🇳 India</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="Germany">🇩🇪 Germany</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="Singapore">🇸🇬 Singapore</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="custom">🔍 Custom Location...</option>
                  </select>
                </div>

                {regionPreset === 'custom' && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-surface-500 uppercase tracking-widest">Enter Region/City Name</label>
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="e.g. London, UK or Bengaluru, India"
                      className="w-full p-4 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 transition-all"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={scraping}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white p-4 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-xl shadow-brand-600/20 font-bold"
                >
                  {scraping ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Scanning Web Directories...
                    </>
                  ) : (
                    <>
                      <Zap size={16} /> Execute Campaign Scrape
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right: Crawled Prospect Lists & Actions */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-light p-8 rounded-[32px] border border-slate-200 dark:border-white/10 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Discovered Sales Leads</h3>
                    <p className="text-xs text-slate-400 font-medium">B2B sales prospects scraped and qualified autonomously.</p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={handleExportLeadsToCSV}
                      className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-emerald-100 hover:text-emerald-800 transition-all shadow-sm"
                    >
                      <FileDown size={14} /> Export CSV
                    </button>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      <input
                        type="text"
                        value={leadSearchTerm}
                        onChange={(e) => setLeadSearchTerm(e.target.value)}
                        placeholder="Search leads..."
                        className="pl-8 pr-4 py-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 w-36"
                      />
                    </div>

                    <select
                      value={leadStatusFilter}
                      onChange={(e) => setLeadStatusFilter(e.target.value)}
                      className="p-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                    >
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="All">All Statuses</option>
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="Discovered">Discovered</option>
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="Scored">Scored</option>
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="Proposal_Generated">Proposal Generated</option>
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="Outreach_Sent">Outreach Sent</option>
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="Converted">Converted</option>
                    </select>
                  </div>
                </div>

                {loadingLeads ? (
                  <div className="flex justify-center py-20">
                    <Loader2 size={32} className="text-brand-500 animate-spin" />
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Bot size={48} className="text-surface-300 mx-auto mb-4" />
                    <p className="text-xs text-surface-500 font-bold uppercase tracking-wide">No leads matched search filters.</p>
                    <p className="text-[10px] text-surface-400 mt-1">Initiate a scraper crawl to discover new prospects.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] font-black">
                          <th className="pb-3">Company Details</th>
                          <th className="pb-3">Contact Person</th>
                          <th className="pb-3">Opportunity Index</th>
                          <th className="pb-3">Conversion Status</th>
                          <th className="pb-3 text-right">Operations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {filteredLeads.map((lead) => {
                          const [sizeVal, countryVal] = (lead.companySize || '').includes(' | ')
                             ? lead.companySize.split(' | ')
                             : [lead.companySize, 'Global'];

                          const score = lead.leadScores?.[0]?.overallOpportunityScore || null;

                          return (
                            <tr key={lead.id || lead._id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.04] transition-all group">
                              <td className="py-4">
                                <div className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                                  <span>{getFlagEmoji(countryVal)}</span>
                                  <span className="truncate max-w-[140px]">{lead.companyName}</span>
                                </div>
                                <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5 mt-1">
                                  <Globe size={10} />
                                  <a href={`https://${lead.website}`} target="_blank" rel="noreferrer" className="hover:underline hover:text-brand-600">{lead.website}</a>
                                  <span className="text-slate-350 dark:text-white/10">|</span>
                                  <span>{sizeVal} employees</span>
                                </div>
                              </td>
                              <td className="py-4">
                                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[120px]">
                                  {lead.contactName || lead.contactInfo?.primaryContactName || 'Sales Representative'}
                                </div>
                                <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
                                  {lead.emails?.[0] || lead.contactInfo?.emails?.[0] || 'info@domain.com'}
                                </div>
                              </td>
                              <td className="py-4">
                                {score !== null ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-12 bg-slate-150 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${score >= 80 ? 'bg-gradient-to-r from-orange-400 to-rose-500' : 'bg-brand-500'}`}
                                        style={{ width: `${score}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-800 dark:text-slate-200">
                                      {score}% {score >= 80 && '🔥'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-400 italic">Not evaluated</span>
                                )}
                              </td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide border ${lead.status === 'Scored'
                                    ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                                    : lead.status === 'Proposal_Generated'
                                       ? 'bg-brand-500/10 text-brand-600 border-brand-500/20'
                                       : lead.status === 'Outreach_Sent'
                                         ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                         : lead.status === 'Converted'
                                           ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                           : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
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
                                      setQuotationAmount(score ? String(score * 12500) : '400000');
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

              {/* selected lead panel */}
              {selectedLead && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-light p-8 rounded-[32px] border border-white/10 shadow-xl space-y-6"
                >
                  <div className="flex justify-between items-center pb-4 border-b border-white/10">
                    <div>
                      <h4 className="text-sm font-black text-slate-100 tracking-tight">
                        Lead Actions: {selectedLead.companyName}
                      </h4>
                      <p className="text-[10px] text-surface-400">Initiate custom proposal drafting or custom outreach templates.</p>
                    </div>
                    <button
                      onClick={() => setSelectedLead(null)}
                      className="text-xs font-black text-surface-400 hover:text-gray-950 uppercase"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Proposal Gen Form */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={14} className="text-brand-500" /> B2B Proposal Creator
                      </h5>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-surface-500 uppercase tracking-widest">Select Target Service</label>
                          <select
                            value={serviceType}
                            onChange={(e) => setServiceType(e.target.value)}
                            className="w-full p-3 bg-white/[0.04] border border-gray-200 rounded-xl text-xs font-bold text-white focus:outline-none"
                          >
                            <option value="AI Solutions">AI Solutions</option>
                            <option value="Web Development">Web Development</option>
                            <option value="Mobile Applications">Mobile Applications</option>
                            <option value="Dashboard Systems">Dashboard Systems</option>
                            <option value="Automation Platforms">Automation Platforms</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-surface-500 uppercase tracking-widest">Contract Valuation (₹)</label>
                          <input
                            type="number"
                            value={quotationAmount}
                            onChange={(e) => setQuotationAmount(e.target.value)}
                            className="w-full p-3 bg-white/[0.04] border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                          />
                        </div>

                        <button
                          onClick={handleGenerateProposal}
                          disabled={generatingProposal}
                          className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                          {generatingProposal ? 'Drafting Proposal...' : 'Compile B2B Proposal'}
                        </button>
                      </div>

                      {generatedProposal && (
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 mt-4">
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle2 size={12} /> Tailored Proposal Generated
                          </span>
                          <div className="max-h-48 overflow-y-auto p-2 border border-slate-200 bg-white rounded-lg text-[9px] font-semibold font-mono whitespace-pre-wrap leading-relaxed text-slate-200">
                            {generatedProposal.proposalText}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold">Proposal has been indexed in deals memory.</p>
                        </div>
                      )}
                    </div>

                    {/* Outreach Drafting Panel */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
                        <Mail size={14} className="text-brand-500" /> Outreach Campaign Manager
                      </h5>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {['Email', 'LinkedIn'].map((ch) => (
                            <button
                              key={ch}
                              type="button"
                              onClick={() => setActiveOutreachChannel(ch)}
                              className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${activeOutreachChannel === ch
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-transparent text-slate-400 border-slate-200 hover:text-slate-100 hover:border-slate-300'
                                }`}
                            >
                              {ch}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-surface-500 uppercase tracking-widest">Language Target</label>
                            <select
                              value={language}
                              onChange={(e) => setLanguage(e.target.value)}
                              className="w-full p-2.5 bg-white/[0.04] border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                            >
                              <option value="en">English (US/UK)</option>
                              <option value="hi">Hindi (हिन्दी)</option>
                              <option value="te">Telugu (తెలుగు)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-surface-500 uppercase tracking-widest">Custom Prompts</label>
                            <input
                              type="text"
                              value={customPrompt}
                              onChange={(e) => setCustomPrompt(e.target.value)}
                              placeholder="Add core hooks..."
                              className="w-full p-2.5 bg-white/[0.04] border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                            />
                          </div>
                        </div>

                        <button
                          onClick={handleLoadOutreachDraft}
                          disabled={draftingOutreach}
                          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          {draftingOutreach ? 'Composing Draft...' : 'Forge Outreach Draft'}
                        </button>

                        {outreachContent && (
                          <div className="space-y-2 mt-4">
                            <label className="text-[9px] font-black text-surface-500 uppercase tracking-widest">Verify Message Content</label>
                            <textarea
                              value={outreachContent}
                              onChange={(e) => setOutreachContent(e.target.value)}
                              rows={4}
                              className="w-full p-3 bg-white/[0.04] border border-white/10 rounded-xl text-xs font-semibold focus:outline-none leading-relaxed text-gray-800"
                            />

                            <button
                              onClick={handleSendOutreach}
                              disabled={sendingOutreach}
                              className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                            >
                              {sendingOutreach ? 'Queuing outreach...' : 'Deploy Cold Outreach'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Gateway Tab View */}
      {activeTab === 'gateway' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Pending Deals List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-light p-8 rounded-[32px] border-2 border-brand-500/20 shadow-xl bg-gradient-to-br from-brand-500/5 via-transparent to-transparent space-y-6">
              <div>
                <span className="px-2 py-0.5 bg-brand-500/10 text-brand-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-brand-500/20 animate-pulse">
                  HITL Review Gateway
                </span>
                <h3 className="text-xl font-black text-slate-100 tracking-tight mt-2 flex items-center gap-2">
                  <ShieldCheck className="text-brand-500" size={24} /> B2B Contract Approvals
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Deals qualified autonomously by AI. Approval creates the repository, matching team assignments, and Stripe invoice links.
                </p>
              </div>

              {loadingDeals ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="text-brand-500 animate-spin" size={24} />
                </div>
              ) : pendingDeals.length === 0 ? (
                <div className="text-center py-12 bg-white/40 rounded-2xl border border-slate-200">
                  <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">All qualified contracts cleared.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingDeals.map((deal) => (
                    <div key={deal.id || deal._id} className="p-5 bg-white border border-white/10 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest">{deal.serviceType}</span>
                            <h4 className="text-sm font-black text-slate-100 mt-0.5">{deal.companyName}</h4>
                          </div>
                          <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 rounded-lg text-[9px] font-black">
                            Opportunity: {deal.opportunityScore}%
                          </span>
                        </div>

                        <div className="p-3 bg-white/[0.04] border border-white/10 rounded-xl max-h-32 overflow-y-auto">
                          <pre className="text-[9px] font-semibold text-gray-750 whitespace-pre-wrap font-mono leading-relaxed">
                            {deal.proposalText}
                          </pre>
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold text-slate-100 border-t border-white/10 pt-3">
                          <span className="text-surface-400 text-[10px]">Quoted Amount:</span>
                          <span className="text-brand-600 font-black text-sm">₹{Number(deal.quotationAmount).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <button
                          onClick={() => handleApprovePendingDeal(deal.id || deal._id)}
                          className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all font-bold"
                        >
                          Approve & Launch
                        </button>
                        <button
                          onClick={() => handleRejectPendingDeal(deal.id || deal._id)}
                          className="px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all font-bold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Outreach log status tracker */}
          <div className="glass-light p-8 rounded-[32px] border border-white/10 shadow-xl space-y-6">
            <h3 className="text-lg font-black text-slate-100 tracking-tight flex items-center gap-2">
              <History size={18} className="text-brand-500" /> Outreach Campaign Logs
            </h3>
            <p className="text-xs text-slate-400 font-medium">Monitoring dispatch logs and feedback loops from cold outreach initiatives.</p>

            {loadingLogs ? (
              <div className="flex justify-center py-10">
                <Loader2 className="text-brand-500 animate-spin animate-spin" size={24} />
              </div>
            ) : outreachLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs italic font-bold">No campaign logs recorded yet.</div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {outreachLogs.slice(0, 15).map((log, idx) => {
                  const isSelected = selectedLog && (
                    (log.id && log.id === selectedLog.id) ||
                    (log._id && log._id === selectedLog._id) ||
                    (log.leadId === selectedLog.leadId && log.createdAt === selectedLog.createdAt)
                  );
                  return (
                    <div
                      key={log.id || idx}
                      onClick={() => setSelectedLog(log)}
                      className={`p-4 rounded-xl space-y-2 cursor-pointer transition-all duration-300 border ${
                        isSelected
                          ? 'bg-brand-500/10 border-brand-500 shadow-sm'
                          : 'bg-slate-50 border-slate-100 hover:border-brand-500/40 hover:bg-brand-500/5'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                          log.channel === 'Email' ? 'bg-indigo-50 text-indigo-600' :
                          log.channel === 'WhatsApp' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-sky-50 text-sky-600'
                        }`}>
                          {log.channel}
                        </span>
                        <span className="text-[8px] text-slate-400 font-bold">
                          {new Date(log.createdAt || log.date || Date.now()).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 font-bold truncate">To: {log.recipient || 'Prospect Client'}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed italic">"{log.contentSent}"</p>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                        <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{log.messageType || 'Outreach'}</span>
                        <span className={`text-[9px] font-black uppercase ${
                          log.status === 'Sent' || log.status === 'Delivered' || log.status === 'Read'
                            ? 'text-emerald-500'
                            : 'text-amber-500 animate-pulse'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Add Client Modal */}
      <AnimatePresence>
        {addModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddModal(false)}
              className="absolute inset-0 bg-white/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass border border-gray-200 rounded-[40px] p-10 shadow-2xl z-10"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black text-slate-100 tracking-tighter">Onboard Client</h2>
                <button onClick={() => setAddModal(false)} className="p-2 text-surface-500 hover:text-slate-100 transition-colors"><X size={24} /></button>
              </div>

              <form onSubmit={handleAddClient} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Company Name</label>
                  <input
                    required
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    className="w-full px-6 py-4 bg-white/[0.04] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-brand-500/50"
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Email Address</label>
                  <input
                    required
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    className="w-full px-6 py-4 bg-white/[0.04] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-brand-500/50"
                    placeholder="ops@acme.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Tier</label>
                    <select
                      value={newClient.businessType}
                      onChange={(e) => setNewClient({ ...newClient, businessType: e.target.value })}
                      className="w-full px-4 py-4 bg-white/[0.04] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 appearance-none cursor-pointer"
                    >
                      <option>Enterprise</option>
                      <option>Startup</option>
                      <option>SME</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Vertical</label>
                    <select
                      value={newClient.serviceType}
                      onChange={(e) => setNewClient({ ...newClient, serviceType: e.target.value })}
                      className="w-full px-4 py-4 bg-white/[0.04] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 appearance-none cursor-pointer"
                    >
                      <option>AI Solutions</option>
                      <option>Web Development</option>
                      <option>Cybersecurity</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/20 font-bold">Authorize Onboarding</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Generator Modal */}
      <AnimatePresence>
        {invoiceModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInvoiceModal({ ...invoiceModal, show: false })}
              className="absolute inset-0 bg-white/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl glass border border-gray-200 rounded-[40px] p-10 shadow-2xl z-10"
            >
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-black text-slate-100 tracking-tighter">Forge Invoice</h2>
                  <p className="text-xs text-brand-500 font-black uppercase tracking-widest mt-1">For: {invoiceModal.clientName}</p>
                </div>
                <button onClick={() => setInvoiceModal({ ...invoiceModal, show: false })} className="p-2 text-surface-500 hover:text-slate-100 transition-colors"><X size={24} /></button>
              </div>

              <form onSubmit={handleGenerateInvoice} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Amount (INR)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-600" size={16} />
                      <input
                        required
                        type="number"
                        value={invoiceModal.amount}
                        onChange={(e) => setInvoiceModal({ ...invoiceModal, amount: e.target.value })}
                        className="w-full pl-10 pr-6 py-4 bg-white/[0.04] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 font-bold"
                        placeholder="e.g. 85000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Payment Terms</label>
                    <select className="w-full px-6 py-4 bg-white/[0.04] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 appearance-none cursor-pointer">
                      <option>Net 15</option>
                      <option>Net 30</option>
                      <option>Due on Receipt</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Billable Services</label>
                  <textarea
                    required
                    value={invoiceModal.description}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, description: e.target.value })}
                    className="w-full px-6 py-4 bg-white/[0.04] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 h-32 leading-relaxed"
                    placeholder="Specify deliverables..."
                  />
                </div>
                <button type="submit" className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/20 font-bold">Authorize & Dispatch PDF</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteModal({ show: false, clientId: null, clientName: '' })}
              className="absolute inset-0 bg-white/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass border border-gray-200 rounded-[40px] p-10 shadow-2xl text-center z-10"
            >
              <div className="w-20 h-20 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-rose-500/20 animate-bounce">
                <AlertTriangle size={40} />
              </div>
              <h2 className="text-3xl font-black text-slate-100 tracking-tighter mb-4">Confirm Removal</h2>
              <p className="text-surface-500 text-sm font-medium leading-relaxed mb-10">
                Are you sure you want to remove <span className="text-slate-100 font-bold">{deleteModal.clientName}</span> from the system?
              </p>
              <div className="flex gap-4">
                <button onClick={() => setDeleteModal({ show: false, clientId: null, clientName: '' })} className="flex-1 py-4 bg-white/[0.04] text-surface-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:text-slate-100 transition-all border border-white/10 font-bold">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-500 transition-all shadow-xl shadow-rose-600/30 font-bold">Delete Account</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Chat Drawer */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-[110] flex justify-end font-sans">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            />
            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-white shadow-2xl z-10 flex flex-col border-l border-slate-200/60"
            >
              {selectedLog.channel === 'LinkedIn' ? (
                /* LinkedIn Mockup Header */
                <div className="bg-[#0077b5] text-white p-6 flex items-center justify-between shadow-md relative shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-sky-300/35 overflow-hidden">
                      <Users size={22} className="text-sky-200" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black leading-tight flex items-center gap-1">
                        {selectedLog.recipient || 'LinkedIn Connection'} <span className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-ping" />
                      </h4>
                      <span className="text-[10px] text-sky-200/90 font-medium block">LinkedIn Direct Message</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                /* Standard / Email Header */
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 backdrop-blur-md shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600">
                      <Mail size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm tracking-tight text-slate-200">
                        {selectedLog.recipient || 'Prospect Client'}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5 uppercase tracking-wider">
                        {selectedLog.channel} Campaign Outpost
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-100 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              {/* Chat Thread Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 relative bg-slate-550/5">
                <div className="space-y-4 z-10 relative">
                  {outreachLogs
                    .filter(l => l.leadId === selectedLog.leadId && l.channel === selectedLog.channel)
                    .sort((a, b) => new Date(a.createdAt || a.date || 0) - new Date(b.createdAt || b.date || 0))
                    .map((logItem, idx) => {
                      const isIncoming = logItem.messageType === 'Incoming_Response';
                      return (
                        <div
                          key={logItem.id || idx}
                          className={`flex flex-col max-w-[85%] ${
                            isIncoming ? 'self-start items-start' : 'self-end items-end ml-auto'
                          }`}
                        >
                          <div
                            className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm relative ${
                              isIncoming
                                ? 'bg-white text-slate-855 rounded-tl-none border border-slate-150'
                                : selectedLog.channel === 'LinkedIn'
                                ? 'bg-[#0077b5] text-white rounded-tr-none shadow-md shadow-sky-600/10'
                                : 'bg-brand-600 text-white rounded-tr-none shadow-md shadow-brand-600/10'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{logItem.contentSent || logItem.messageContent}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1.5 text-[8px] ${isIncoming ? 'text-slate-400' : 'text-white/60'}`}>
                              <span>
                                {new Date(logItem.createdAt || logItem.date || Date.now()).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {!isIncoming && (
                                <span className="flex">
                                  {logItem.status === 'Sent' && <span>✓</span>}
                                  {(logItem.status === 'Delivered' || logItem.status === 'Read') && (
                                    <span className="text-white">✓✓</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  
                  {sendingChatReply && (
                    <div className="self-start flex flex-col items-start max-w-[85%]">
                      <div className="bg-white border border-slate-150 p-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Input Bar */}
              <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                <form onSubmit={handleSendChatReply} className="flex gap-2 items-center">
                  <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-full px-5 py-2.5 flex items-center shadow-inner focus-within:border-brand-500/50 transition-all">
                    <input
                      type="text"
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      placeholder={`Reply to ${selectedLog.recipient || 'prospect'}...`}
                      disabled={sendingChatReply}
                      className="flex-1 bg-transparent border-none outline-none text-xs font-semibold text-slate-200 placeholder-slate-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!chatInputText.trim() || sendingChatReply}
                    className="p-3 bg-brand-600 hover:bg-brand-500 text-white rounded-full shadow-md transition-all flex items-center justify-center shrink-0 disabled:opacity-40"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-10 left-1/2 glass border border-brand-500/30 px-8 py-4 rounded-3xl shadow-2xl text-slate-100 font-bold flex items-center gap-6 z-50"
          >
            <div className="flex items-center gap-3">
              {notification.isError ? <AlertTriangle className="text-rose-500" /> : <CheckCircle2 className="text-emerald-500" />}
              <span className="text-sm">{notification.text}</span>
            </div>
            {notification.action && (
              <button
                onClick={notification.action}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg text-white"
              >
                <Download size={14} /> {notification.actionText}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Clients;
