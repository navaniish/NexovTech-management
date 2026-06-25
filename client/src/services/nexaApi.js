import axios from 'axios';
import API_BASE from '../config';

const nexaClient = axios.create({
  baseURL: `${API_BASE}/nexa`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add Firebase Auth token interceptor if credentials exist
nexaClient.interceptors.request.use(async (config) => {
  try {
    // 1. Prefer the backend JWT stored by AuthContext after login
    const nexovToken = localStorage.getItem('nexov_token');
    if (nexovToken) {
      config.headers.Authorization = `Bearer ${nexovToken}`;
      return config;
    }

    // 2. Fallback: try nexov_user object token field
    const storedUser = JSON.parse(localStorage.getItem('nexov_user') || '{}');
    if (storedUser?.token) {
      config.headers.Authorization = `Bearer ${storedUser.token}`;
      return config;
    }

    // 3. Fallback: get a fresh Firebase ID token directly
    const { getAuth } = await import('firebase/auth');
    const firebaseAuth = getAuth();
    if (firebaseAuth.currentUser) {
      const idToken = await firebaseAuth.currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${idToken}`;
    }
  } catch (e) {
    // Silence token fetch failures
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const nexaApi = {
  // 1. Discover Leads
  discoverLeads: async (params) => {
    const response = await nexaClient.post('/leads/discover', params);
    return response.data;
  },

  // Get Leads
  getLeads: async () => {
    const response = await nexaClient.get('/leads');
    return response.data;
  },

  // 2. Score Lead
  scoreLead: async (id) => {
    const response = await nexaClient.post(`/leads/${id}/score`);
    return response.data;
  },

  // 3. Generate Proposal
  generateProposal: async (proposalData) => {
    const response = await nexaClient.post('/proposals/generate', proposalData);
    return response.data;
  },

  // 4. Send Outreach Campaign
  sendOutreach: async (outreachData) => {
    const response = await nexaClient.post('/outreach/send', outreachData);
    return response.data;
  },

  generateOutreachDraft: async (draftData) => {
    const response = await nexaClient.post('/outreach/draft', draftData);
    return response.data;
  },

  getOutreachLogs: async () => {
    const response = await nexaClient.get('/outreach/logs');
    return response.data;
  },

  // 5. Get BI Analytics
  getBIData: async () => {
    const response = await nexaClient.get('/bi/analytics');
    return response.data;
  },

  // 6. Get Client Retention Alerts
  getRetentionAlerts: async () => {
    const response = await nexaClient.get('/retention/alerts');
    return response.data;
  },

  // 7. LinkedIn Integration API (directly using axios for root API_BASE routing)
  getLinkedInStatus: async () => {
    const response = await axios.get(`${API_BASE}/linkedin/status`);
    return response.data;
  },

  disconnectLinkedIn: async () => {
    const response = await axios.post(`${API_BASE}/linkedin/disconnect`);
    return response.data;
  },

  shareLinkedInPost: async (commentary) => {
    const response = await axios.post(`${API_BASE}/linkedin/share`, { commentary });
    return response.data;
  },

  generateMarketingContent: async (contentType, contentCategory, contentTopic) => {
    const response = await nexaClient.post('/marketing/generate', { contentType, contentCategory, contentTopic });
    return response.data;
  },


  // 8. Autonomous Project Binding & Launcher
  getPendingDeals: async () => {
    const response = await nexaClient.get('/deals/pending');
    return response.data;
  },

  approvePendingDeal: async (id) => {
    const response = await nexaClient.post(`/deals/${id}/approve`);
    return response.data;
  },

  rejectPendingDeal: async (id) => {
    const response = await nexaClient.post(`/deals/${id}/reject`);
    return response.data;
  },

  autoLaunchProject: async (bindData) => {
    const response = await nexaClient.post('/projects/launch', bindData);
    return response.data;
  },

  getAutomationStatus: async () => {
    const response = await nexaClient.get('/automation/status');
    return response.data;
  },

  getAutopilotStatus: async () => {
    const response = await nexaClient.get('/automation/autopilot/status');
    return response.data;
  },

  toggleAutopilot: async (enabled) => {
    const response = await nexaClient.post('/automation/autopilot/toggle', { enabled });
    return response.data;
  },

  getExecutiveBriefing: async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const headers = {};
    if (user?.token) {
      headers.Authorization = `Bearer ${user.token}`;
    }
    const response = await axios.get(`${API_BASE}/executive/briefing`, { headers });
    return response.data;
  },

  sendAgentChatMessage: async (message) => {
    const response = await nexaClient.post('/agent/chat', { message });
    return response.data;
  },

  getAgentRuns: async () => {
    const response = await nexaClient.get('/agent/runs');
    return response.data;
  },

  approveAgentRun: async (runId) => {
    const response = await nexaClient.post(`/agent/run/${runId}/approve`);
    return response.data;
  },

  rejectAgentRun: async (runId) => {
    const response = await nexaClient.post(`/agent/run/${runId}/reject`);
    return response.data;
  },

  sendWhatsappSimulatorMessage: async (message) => {
    const response = await nexaClient.post('/whatsapp/simulate', { message });
    return response.data;
  },

  simulateVoiceCall: async (leadId, customPhoneNumber = '', language = 'en', customMessage = '') => {
    const response = await nexaClient.post('/voice/simulate', { leadId, customPhoneNumber, language, customMessage });
    return response.data;
  },

  getZegoToken: async (roomID, userID = '') => {
    const response = await nexaClient.post('/voice/zego-token', { roomID, userID });
    return response.data;
  },


  // 9. Semantic Vector Memory Suite
  listVectorDocs: async (collectionName) => {
    const response = await nexaClient.get('/vector/documents', { params: { collectionName } });
    return response.data;
  },

  addCustomVectorDoc: async (docData) => {
    const response = await nexaClient.post('/vector/documents', docData);
    return response.data;
  },

  deleteVectorDoc: async (id) => {
    const response = await nexaClient.delete(`/vector/documents/${id}`);
    return response.data;
  },

  syncVectorProposals: async () => {
    const response = await nexaClient.post('/vector/sync-proposals');
    return response.data;
  },

  syncVectorOutreach: async () => {
    const response = await nexaClient.post('/vector/sync-outreach');
    return response.data;
  }
};
