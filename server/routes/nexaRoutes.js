const express = require('express');
const router = express.Router();
const nexaController = require('../controllers/nexaController');
const { auth } = require('../middleware/auth');
const voiceController = require('../controllers/voiceController');

// Lead Discovery
router.post('/leads/discover', auth, nexaController.discoverLeads);
router.get('/leads', auth, nexaController.getLeads);

// Lead Scoring & manual qualification trigger
router.post('/leads/:id/score', auth, nexaController.manualScoreLead);

// Proposal Generator
router.post('/proposals/generate', auth, nexaController.generateProposal);

// Outreach campaigns (WhatsApp, Email, LinkedIn, Voice)
router.post('/outreach/send', auth, nexaController.sendOutreach);
router.post('/outreach/draft', auth, nexaController.generateOutreachDraft);
router.get('/outreach/logs', auth, nexaController.getOutreachLogs);
router.post('/voice/simulate', auth, voiceController.simulateVoiceCall);

// Business Intelligence Analytics
router.get('/bi/analytics', auth, nexaController.getBIData);

// Vector Memory Inspector Console
router.get('/vector/documents', auth, nexaController.listVectorDocs);
router.post('/vector/documents', auth, nexaController.addCustomVectorDoc);
router.delete('/vector/documents/:id', auth, nexaController.deleteVectorDoc);

// Client Retention Alerts
router.get('/retention/alerts', auth, nexaController.getRetentionAlerts);

// Marketing Content Generator
router.post('/marketing/generate', auth, nexaController.generateMarketingContent);

// B2B Pending Deal Approvals
router.get('/deals/pending', auth, nexaController.getPendingDeals);
router.post('/deals/:id/approve', auth, nexaController.approvePendingDeal);
router.post('/deals/:id/reject', auth, nexaController.rejectPendingDeal);

// Autonomous Project & Employee Automation
const nexaAutomationController = require('../controllers/nexaAutomationController');
router.post('/projects/launch', auth, nexaAutomationController.autoLaunchProject);
router.get('/automation/status', auth, nexaAutomationController.getAutomationData);

// Autonomous Multi-Agent Network
const agentNetworkController = require('../controllers/agentNetworkController');
router.post('/agent/chat', auth, agentNetworkController.handleAgentChat);
router.get('/agent/runs', auth, agentNetworkController.getAgentRuns);
router.post('/agent/run/:runId/approve', auth, agentNetworkController.approveAgentRun);
router.post('/agent/run/:runId/reject', auth, agentNetworkController.rejectAgentRun);

// WhatsApp Integration
const whatsappController = require('../controllers/whatsappController');
router.get('/whatsapp/webhook', whatsappController.handleMetaVerification);
router.post('/whatsapp/webhook', whatsappController.handleMetaMessage);
router.post('/whatsapp/twilio', whatsappController.handleTwilioMessage);
router.post('/whatsapp/simulate', auth, whatsappController.handleSimulatedMessage);

// Public Shared Proposal Portal (Unauthenticated)
router.get('/proposals/shared/:id', nexaController.getSharedProposal);
router.post('/proposals/shared/:id/accept', nexaController.acceptSharedProposal);
router.post('/proposals/shared/:id/chat', nexaController.chatSharedProposal);

module.exports = router;
