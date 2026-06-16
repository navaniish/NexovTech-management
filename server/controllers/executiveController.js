const prisma = require('../config/database');
const fallbackDb = require('../utils/fallbackDb');
const OpenAI = require('openai');

let aiClient;
try {
  aiClient = new OpenAI({
    baseURL: process.env.AI_BASE_URL || "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.AI_API_KEY || 'placeholder',
    timeout: 12000 // 12 seconds timeout
  });
} catch (e) {
  console.warn('⚠️ Executive AI client offline.');
}

async function compileExecutiveBriefingData(tenantId = 'org_default') {
  let attendanceRate = 0;
  let taskCompletionRate = 0;
  let projectSuccessRate = 0;
  let leadConversionRate = 0;
  let activeProjectsCount = 0;
  let totalLeadsCount = 0;
  
  let dbStatus = "PostgreSQL";
  
  // Arrays/Variables for calculations
  let leads = [];
  let tasks = [];
  let projects = [];
  let attendance = [];
  let clients = [];
  let proposals = [];

  try {
    // Try fetching from PostgreSQL via Prisma
    leads = await prisma.lead.findMany() || [];
    proposals = await prisma.proposal.findMany() || [];
    clients = await prisma.client.findMany() || [];
  } catch (dbErr) {
    dbStatus = "Firestore/Fallback";
    console.warn("⚠️ PostgreSQL offline in executiveController, using fallbacks:", dbErr.message);
    leads = await fallbackDb.find('leads', {}) || [];
    proposals = await fallbackDb.find('proposals', {}) || [];
    clients = await fallbackDb.find('clients', {}) || [];
  }

  // Always fetch these from Firestore/fallbackDb since they are not in PostgreSQL schema
  tasks = await fallbackDb.find('tasks', {}) || [];
  projects = await fallbackDb.find('projects', {}) || [];
  attendance = await fallbackDb.find('attendance', {}) || [];

  // 1. Calculate Attendance Rate
  if (attendance.length > 0) {
    const presentOrLate = attendance.filter(r => r.attendanceStatus === 'Present' || r.attendanceStatus === 'Late').length;
    attendanceRate = Math.round((presentOrLate / attendance.length) * 100);
  }

  // 2. Calculate Task Completion Rate
  if (tasks.length > 0) {
    const completedTasks = tasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
    taskCompletionRate = Math.round((completedTasks / tasks.length) * 100);
  }

  // 3. Calculate Project Success/Active rates
  activeProjectsCount = projects.filter(p => p.status === 'Active' || p.status === 'In_Progress').length;
  if (projects.length > 0) {
    const completedProjects = projects.filter(p => p.status === 'Completed' || p.status === 'Finished').length;
    projectSuccessRate = Math.round((completedProjects / projects.length) * 100);
  }

  // 4. Calculate Lead Conversion Rate
  totalLeadsCount = leads.length;
  if (leads.length > 0) {
    const convertedLeads = leads.filter(l => l.status === 'Converted').length;
    leadConversionRate = Math.round((convertedLeads / leads.length) * 100);
  }

  // 5. Calculate AI Business Health Score
  const healthScore = Math.round(
    (attendanceRate * 0.2) + 
    (taskCompletionRate * 0.3) + 
    (projectSuccessRate * 0.3) + 
    (leadConversionRate * 0.2)
  );

  // 6. Revenue Forecasting (30/60/90 Days)
  let projectBaseRevenue = 0;
  projects.forEach(p => {
    const budget = parseFloat(p.budget || p.amount || 0);
    if (p.status === 'Active' || p.status === 'In_Progress') {
      projectBaseRevenue += budget;
    }
  });

  let proposalRevenueEstimate = 0;
  proposals.forEach(prop => {
    const quote = parseFloat(prop.quotationAmount || prop.amount || 0);
    if (prop.status === 'Accepted') {
      proposalRevenueEstimate += quote;
    } else if (prop.status === 'Sent' || prop.status === 'Draft') {
      proposalRevenueEstimate += quote * 0.3; // 30% pipeline weight
    }
  });

  const totalPipeline = projectBaseRevenue + proposalRevenueEstimate;
  const forecast30 = Math.round(totalPipeline * 0.45);
  const forecast60 = Math.round(totalPipeline * 0.75);
  const forecast90 = Math.round(totalPipeline * 1.10);

  // 7. Client Churn Risk Analysis
  const churnRisks = [];
  const today = new Date();
  
  for (const client of clients) {
    let probability = 15;
    let reason = "Client relations active and project checkpoints logged.";
    
    const clientName = client.companyName || "Unknown Client";
    const clientProjects = projects.filter(p => p.clientName === clientName || p.clientId === client.id);
    
    if (clientProjects.length === 0) {
      probability = 65;
      reason = "No active project registered for this client profile.";
    } else {
      let lastUpdatedDate = new Date(client.createdAt || client.updatedAt || today);
      clientProjects.forEach(p => {
        const pDate = new Date(p.updatedAt || p.createdAt || lastUpdatedDate);
        if (pDate > lastUpdatedDate) lastUpdatedDate = pDate;
      });
      
      const diffTime = Math.abs(today - lastUpdatedDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 40) {
        probability = 72;
        reason = `Last active update logged ${diffDays} days ago (exceeding safety threshold of 30 days).`;
      } else if (diffDays > 20) {
        probability = 45;
        reason = `No recent updates logged in the last ${diffDays} days.`;
      }
    }

    if (probability > 20) {
      churnRisks.push({
        clientName,
        probability,
        reason,
        recommendedAction: probability >= 60 
          ? "Auto-schedule account briefing and deploy updated service proposals." 
          : "Dispatch system check-in and request current feedback."
      });
    }
  }

  // 8. Generate AI Strategic Report
  let aiCOOReport = "NEXA AI Systems Online. The executive metrics indicate stable operations. Strategic priority is to qualify the current leads pipeline and check in on inactive projects.";

  if (aiClient && process.env.AI_API_KEY && process.env.AI_API_KEY !== 'placeholder') {
    try {
      const modelName = process.env.AI_MODEL || "meta/llama-3.1-8b-instruct";
      
      const systemPrompt = `You are the NEXA Agentic AI Administrator (NEXA AI Admin) in your executive role as Chief Operating Officer (AI COO) for NexovTech.
Provide a concise, high-impact, professional executive summary of the company's real-time operations, risks, and strategic directions.
Focus strictly on the metrics provided. Maintain an executive, precise, and action-oriented tone. Limit your response to 150 words.`;

      const userPrompt = `Real-time Business Statistics:
- AI Business Health Score: ${healthScore}/100
- Attendance Index: ${attendanceRate}%
- Task Completion rate: ${taskCompletionRate}%
- Project Success rate: ${projectSuccessRate}%
- Lead Conversion index: ${leadConversionRate}%
- Active Campaigns: ${activeProjectsCount} Projects
- 30-Day Revenue Forecast: $${forecast30}
- 60-Day Revenue Forecast: $${forecast60}
- 90-Day Revenue Forecast: $${forecast90}
- Clients Churn Risks Flagged: ${JSON.stringify(churnRisks)}

Identify the main bottleneck, the immediate next action, and a strategic recommendation.`;

      const completion = await aiClient.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 400
      });

      if (completion.choices[0].message.content) {
        aiCOOReport = completion.choices[0].message.content.trim();
      }
    } catch (aiErr) {
      console.error('❌ Executive AI Report generation failed:', aiErr.message);
    }
  }

  return {
    dbStatus,
    healthScore,
    metrics: {
      attendanceRate,
      taskCompletionRate,
      projectSuccessRate,
      leadConversionRate,
      activeProjectsCount,
      totalLeadsCount
    },
    forecasts: {
      days30: forecast30,
      days60: forecast60,
      days90: forecast90
    },
    churnRisks,
    aiCOOReport
  };
}

async function getExecutiveBriefing(req, res) {
  try {
    const briefingData = await compileExecutiveBriefingData(req.tenantId || 'org_default');
    res.json({
      success: true,
      ...briefingData
    });
  } catch (error) {
    console.error('❌ GET_EXECUTIVE_BRIEFING_ERROR:', error);
    res.status(500).json({ success: false, message: 'Failed to generate executive briefing' });
  }
}

module.exports = { getExecutiveBriefing, compileExecutiveBriefingData };
