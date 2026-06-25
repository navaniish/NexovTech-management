const fallbackDb = require('../utils/fallbackDb');
const prisma = require('../config/database');
const OpenAI = require('openai');
const axios = require('axios');
const vectorStore = require('../utils/vectorStore');
const { sendEmail } = require('../utils/mailer');
const { performLiveSearch } = require('../utils/searchHelper');
const socketHub = require('../utils/socketHub');

// Enums mapping helpers for strict schema validation in Prisma
function mapServiceEnum(serviceType) {
  const mapping = {
    'AI Solutions': 'AISolutions',
    'Web Development': 'WebDevelopment',
    'Mobile Applications': 'MobileApplications',
    'Dashboard Systems': 'DashboardSystems',
    'Automation Platforms': 'AutomationPlatforms',
    'Video Editing': 'VideoEditing',
    'AISolutions': 'AISolutions',
    'WebDevelopment': 'WebDevelopment',
    'MobileApplications': 'MobileApplications',
    'DashboardSystems': 'DashboardSystems',
    'AutomationPlatforms': 'AutomationPlatforms',
    'VideoEditing': 'VideoEditing'
  };
  return mapping[serviceType] || 'AISolutions';
}

function mapChannelEnum(channel) {
  const mapping = {
    'linkedin': 'LinkedIn',
    'email': 'Email',
    'whatsapp': 'WhatsApp',
    'LinkedIn': 'LinkedIn',
    'Email': 'Email',
    'WhatsApp': 'WhatsApp'
  };
  return mapping[channel] || 'Email';
}

// Initialize AI Client
let aiClient;
try {
  aiClient = new OpenAI({
    baseURL: process.env.AI_BASE_URL || "https://api.nexovtech.ai/v1",
    apiKey: process.env.AI_API_KEY || 'placeholder',
    timeout: 30000 // 30 seconds timeout to prevent long hangs on slow endpoints
  });
} catch (e) {
  console.warn('⚠️ NEXA AI module offline: Missing OpenAI client setup.');
}

// Helper: Run LLM query
async function runQuery(systemPrompt, userPrompt, options = {}) {
  if (!aiClient || !process.env.AI_API_KEY || process.env.AI_API_KEY === 'placeholder') {
    throw new Error('AI Provider Offline');
  }

  const body = {
    model: process.env.AI_MODEL || "nvidia/nemotron-3-ultra-550b-a55b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 1,
    top_p: 0.95,
    max_tokens: 16384
  };

  if (options.enableThinking) {
    body.extra_body = {
      chat_template_kwargs: { enable_thinking: true },
      reasoning_budget: 16384
    };
  }

  const completion = await aiClient.chat.completions.create(body);

  const choice = completion.choices[0];
  const reasoningContent = choice.message?.reasoning_content || '';
  const content = choice.message?.content || '';

  if (reasoningContent) {
    console.log(`🧠 [NEXA AGENT THINKING PROCESS]:\n${reasoningContent}\n----------------------------------`);
  }

  return content;
}

// 1. LEAD GENERATION ENGINE (DISCOVER)
// 1. LEAD GENERATION ENGINE (DISCOVER)
exports.discoverLeads = async (req, res) => {
  try {
    const { industry, region, limit = 10, sources = ['WebScrape'] } = req.body;

    if (!industry) {
      return res.status(400).json({ message: 'Industry is required' });
    }

    console.log(`🔍 NEXA Lead Scraper executing. Industry: ${industry}, Region: ${region}, Limit: ${limit}`);

    let targetList = [];
    let scraperUsedAi = false;

    // 1. Perform a real-time web search using Yahoo search scraping
    const isGlobal = !region || region.toLowerCase() === 'all countries' || region.toLowerCase() === 'global' || region.toLowerCase() === 'global wide';
    const targetRegionText = isGlobal ? 'all major countries globally (e.g. US, UK, India, Germany, Canada, Singapore, Australia)' : region;
    const searchQuery = `${industry} startups ${isGlobal ? 'globally' : region}`;

    let searchResults = [];
    try {
      searchResults = await performLiveSearch(searchQuery);
    } catch (searchErr) {
      console.warn('⚠️ Web search failed, falling back to LLM direct knowledge:', searchErr.message);
    }

    let resultsContextText = '';
    if (searchResults && searchResults.length > 0) {
      resultsContextText = `Here are real-time live search results from Yahoo search matching the query:\n` +
        searchResults.map((r, idx) => `[Result ${idx + 1}]\nCompany Domain / Website: ${r.url}\nTitle: ${r.title}\nSnippet: ${r.snippet}\n`).join('\n');
    } else {
      resultsContextText = `Note: No direct live search results could be scraped. Fall back to your knowledge of real, existing businesses matching this industry and region.`;
    }

    try {
      const systemPrompt = `You are the NEXA Lead Generation Scraper AI. Your task is to scrape, search and extract REAL, existing businesses matching the requested industry and target region.
You must prioritize extracting and structuring the companies found in the provided live web search results. The company name and web domain (website URL) MUST correspond to real, existing companies from the search results context. If there are not enough companies in the search results context, supplement with real, existing businesses in that industry and region.
You must find real companies (specifically mid-sized or startups), their actual websites, real technologies they use in their stack, realistic company sizes, real emails, phone numbers, and LinkedIn company page URLs.
For contact coordinates (email, phone, contactName), if not present in the search snippet, you should infer realistic professional coordinates (e.g. info@domain, contact@domain, etc.) based on the domain name.
For region "${region}", if it is "All Countries" or "Global" or "Global Wide", return companies from different countries around the world.
Provide precisely ${limit} real companies.

Output ONLY a valid JSON array of objects, each representing a company, conforming to this exact structure:
[
  {
    "name": "Apex Dental Care",
    "web": "apexdentalcare.com",
    "tech": ["React", "WordPress", "Google Analytics"],
    "size": "11-50",
    "country": "United States",
    "contactName": "Dr. Sarah Jenkins",
    "email": "contact@apexdentalcare.com",
    "phone": "+1 (555) 019-2834",
    "linkedinUrl": "https://linkedin.com/company/apex-dental-care"
  }
]
Do NOT wrap the output in markdown code blocks like \`\`\`json. Output ONLY the raw JSON string.`;

      const userPrompt = `Industry: ${industry}
Target Region: ${targetRegionText}
Count: ${limit}

Live Web Search Context:
${resultsContextText}`;

      const responseText = await runQuery(systemPrompt, userPrompt);
      const cleanJson = responseText.trim().substring(responseText.indexOf('['), responseText.lastIndexOf(']') + 1);
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        targetList = parsed;
        scraperUsedAi = true;
        console.log(`✅ Real-time AI Lead scraper successfully extracted ${targetList.length} leads.`);
      } else {
        throw new Error('AI lead scraper returned empty or invalid lead list.');
      }
    } catch (aiErr) {
      console.error('❌ AI lead scraper execution failed:', aiErr.message);
      throw new Error(`Real-time lead scraping failed: ${aiErr.message}`);
    }

    if (targetList.length === 0) {
      throw new Error('Real-time lead scraping failed: AI returned empty lead list.');
    }

    const discoveredLeads = [];
    for (let i = 0; i < Math.min(limit, targetList.length); i++) {
      const target = targetList[i];

      // Check if lead already exists to prevent duplication
      let lead;
      try {
        lead = await prisma.lead.findFirst({
          where: { companyName: target.name }
        });

        if (!lead) {
          lead = await prisma.lead.create({
            data: {
              companyName: target.name,
              website: target.web,
              industry: industry,
              companySize: target.country ? `${target.size} | ${target.country}` : target.size,
              techStack: target.tech || [],
              source: sources[0] || 'WebScrape',
              status: 'Discovered',
              contactName: target.contactName || 'John Doe',
              emails: target.email ? [target.email] : [`info@${target.web}`, `contact@${target.web}`],
              phones: target.phone ? [target.phone] : ['+1 (555) 019-2834'],
              linkedinUrls: target.linkedinUrl ? [target.linkedinUrl] : [`https://linkedin.com/company/${target.name.toLowerCase().replace(/\s+/g, '-')}`]
            }
          });
        }
      } catch (dbErr) {
        console.warn('⚠️ PostgreSQL offline, using fallbackDb:', dbErr.message);
        const existingLeads = await fallbackDb.find('leads', { companyName: target.name });
        lead = existingLeads[0];
        if (!lead) {
          lead = await fallbackDb.save('leads', {
            companyName: target.name,
            website: target.web,
            industry: industry,
            companySize: target.country ? `${target.size} | ${target.country}` : target.size,
            techStack: target.tech,
            source: sources[0],
            status: 'Discovered',
            contactInfo: {
              emails: target.email ? [target.email] : [`info@${target.web}`, `contact@${target.web}`],
              phones: target.phone ? [target.phone] : ['+1 (555) 019-2834'],
              linkedInUrls: target.linkedinUrl ? [target.linkedinUrl] : [`https://linkedin.com/company/${target.name.toLowerCase().replace(/\s+/g, '-')}`],
              primaryContactName: target.contactName || 'John Doe'
            }
          });
        }
      }
      discoveredLeads.push(lead);
    }

    // Process background AI Scoring for all newly discovered leads
    for (let lead of discoveredLeads) {
      exports.scoreLeadById(lead.id || lead._id).catch(scoreErr => {
        console.error(`Scoring failed for lead ${lead.id || lead._id}:`, scoreErr.message);
      });
    }

    res.status(201).json({
      message: `${discoveredLeads.length} leads successfully discovered ${scraperUsedAi ? 'using live AI search' : ''} and scoring triggered.`,
      leads: discoveredLeads,
      usedAi: scraperUsedAi
    });
  } catch (error) {
    console.error('❌ Lead discovery failed:', error);
    res.status(500).json({ message: 'Lead discovery failed', error: error.message });
  }
};

// 2. LEAD SCORING & QUALIFICATION ENGINE
exports.scoreLeadById = async (leadId) => {
  let lead;
  let useFallbackDb = false;
  try {
    lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });
    if (!lead) useFallbackDb = true;
  } catch (dbErr) {
    console.warn('⚠️ PostgreSQL offline in scoreLeadById, using fallbackDb:', dbErr.message);
    useFallbackDb = true;
  }

  if (useFallbackDb) {
    lead = await fallbackDb.findById('leads', leadId);
  }

  if (!lead) throw new Error('Lead not found');

  let budgetScore = 50;
  let complexityScore = 50;
  let readinessScore = 50;
  let urgencyScore = 50;
  let overallOpportunityScore = 50;
  let aiRecommendation = 'Medium Priority';
  let evaluationLog = 'Fallback scoring applied due to LLM provider offline.';

  const techStackArr = Array.isArray(lead.techStack) ? lead.techStack : (lead.contactInfo ? lead.techStack : []);

  try {
    const systemPrompt = `You are the NEXA Lead Qualification AI. Evaluate business details and output a JSON response. 
    Analyze the company industry, website, size, and tech stack to estimate budget, project complexity, business readiness, and urgency.
    Respond ONLY in strict JSON format:
    {
      "budgetScore": <number 0-100>,
      "complexityScore": <number 0-100>,
      "readinessScore": <number 0-100>,
      "urgencyScore": <number 0-100>,
      "overallOpportunityScore": <number 0-100>,
      "aiRecommendation": "🔥 High Priority" | "Medium Priority" | "Low Priority",
      "reasoning": "<short description explaining the scoring>"
    }`;

    const userPrompt = `
      Company Name: ${lead.companyName}
      Website: ${lead.website}
      Industry: ${lead.industry}
      Company Size: ${lead.companySize}
      Tech Stack: ${Array.isArray(techStackArr) ? techStackArr.join(', ') : ''}
    `;

    const responseText = await runQuery(systemPrompt, userPrompt);
    const parsed = JSON.parse(responseText.trim().substring(responseText.indexOf('{'), responseText.lastIndexOf('}') + 1));

    budgetScore = parsed.budgetScore ?? budgetScore;
    complexityScore = parsed.complexityScore ?? complexityScore;
    readinessScore = parsed.readinessScore ?? readinessScore;
    urgencyScore = parsed.urgencyScore ?? urgencyScore;
    overallOpportunityScore = parsed.overallOpportunityScore ?? overallOpportunityScore;
    aiRecommendation = parsed.aiRecommendation ?? aiRecommendation;
    evaluationLog = parsed.reasoning ?? 'AI assessment processed successfully.';
  } catch (error) {
    console.warn(`⚠️ LLM scoring failed, using algorithmic fallbacks:`, error.message);
    // Algorithmic fallbacks
    if (lead.companySize === '51-200' || lead.companySize === '500+') {
      budgetScore = 85;
      complexityScore = 80;
    }
    if (Array.isArray(techStackArr) && (techStackArr.includes('Next.js') || techStackArr.includes('React'))) {
      readinessScore = 75;
    }
    overallOpportunityScore = Math.round((budgetScore + complexityScore + readinessScore + urgencyScore) / 4);
    if (overallOpportunityScore >= 80) aiRecommendation = '🔥 High Priority';
  }

  let scoreRecord;

  if (!useFallbackDb) {
    try {
      // Update lead status
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'Scored' }
      });

      // Save or update score
      const existingScore = await prisma.leadScore.findFirst({
        where: { leadId: lead.id }
      });

      if (existingScore) {
        scoreRecord = await prisma.leadScore.update({
          where: { id: existingScore.id },
          data: {
            budgetScore,
            complexityScore,
            readinessScore,
            urgencyScore,
            overallOpportunityScore,
            aiRecommendation,
            evaluationLog
          }
        });
      } else {
        scoreRecord = await prisma.leadScore.create({
          data: {
            leadId: lead.id,
            budgetScore,
            complexityScore,
            readinessScore,
            urgencyScore,
            overallOpportunityScore,
            aiRecommendation,
            evaluationLog
          }
        });
      }
    } catch (dbErr) {
      console.warn('⚠️ PostgreSQL write failed in scoreLeadById, falling back to fallbackDb:', dbErr.message);
      useFallbackDb = true;
    }
  }

  if (useFallbackDb) {
    // Update lead status
    await fallbackDb.update('leads', lead.id || lead._id, { status: 'Scored' });

    // Save or update score
    const existingScores = await fallbackDb.find('lead_scores', { leadId: lead.id || lead._id });
    let scoreRecordFallback = existingScores[0];

    if (scoreRecordFallback) {
      scoreRecord = await fallbackDb.update('lead_scores', scoreRecordFallback.id || scoreRecordFallback._id, {
        budgetScore,
        complexityScore,
        readinessScore,
        urgencyScore,
        overallOpportunityScore,
        aiRecommendation,
        evaluationLog
      });
    } else {
      scoreRecord = await fallbackDb.save('lead_scores', {
        leadId: lead.id || lead._id,
        budgetScore,
        complexityScore,
        readinessScore,
        urgencyScore,
        overallOpportunityScore,
        aiRecommendation,
        evaluationLog
      });
    }
  }

  // Trigger autonomous workflow loop in background
  runAutonomousWorkflow(lead, scoreRecord, useFallbackDb).catch(workflowErr => {
    console.error('❌ Autonomous workflow failed:', workflowErr.message);
  });

  return scoreRecord;
};

// Helper: Run fully autonomous workflow engine (Section 5.C)
async function runAutonomousWorkflow(lead, scoreRecord, useFallbackDb) {
  const score = scoreRecord.overallOpportunityScore;
  const leadId = lead.id || lead._id;

  if (score < 75) {
    // 1. Archive Lead
    console.log(`🤖 [AUTONOMOUS ENGINE] Lead [${lead.companyName}] Score is ${score} (< 75). Archiving lead.`);
    if (!useFallbackDb) {
      try {
        await prisma.lead.update({ where: { id: leadId }, data: { status: 'Archived' } });
      } catch (err) {
        useFallbackDb = true;
      }
    }
    if (useFallbackDb) {
      await fallbackDb.update('leads', leadId, { status: 'Archived' });
    }
    return;
  }

  // 2. Generate Custom Proposal
  console.log(`🤖 [AUTONOMOUS ENGINE] Lead [${lead.companyName}] Qualified! Score is ${score} (>= 75). Auto-dispatching proposal email...`);
  const serviceType = 'AISolutions';
  const budgetVal = Number(scoreRecord.budgetScore) * 12500 || 400000;

  let proposalText = `PROJECT PROPOSAL FOR ${lead.companyName.toUpperCase()}\n\nService: ${serviceType}\nBudget: ₹${budgetVal.toLocaleString()}\n\nGenerated autonomously by NEXA Agentic AI.`;
  try {
    const systemPrompt = `You are NEXA, the Agentic AI Administrator representing NexovTech Corp. Create a premium tailored project proposal. Make sure all contract values are formatted in Indian Rupees (₹/INR).`;
    const userPrompt = `Draft proposal for: ${lead.companyName}, Budget: ₹${budgetVal.toLocaleString()}`;
    proposalText = await runQuery(systemPrompt, userPrompt);
  } catch (e) {
    // Keep default
  }

  // Save proposal draft
  let proposal;
  if (!useFallbackDb) {
    try {
      proposal = await prisma.proposal.create({
        data: {
          leadId,
          serviceType: 'AISolutions',
          proposalText,
          quotationAmount: budgetVal,
          status: 'Draft'
        }
      });
    } catch (err) {
      useFallbackDb = true;
    }
  }

  if (useFallbackDb) {
    proposal = await fallbackDb.save('proposals', {
      leadId,
      serviceType: 'AISolutions',
      proposalText,
      quotationAmount: budgetVal,
      status: 'Draft',
      tenantId: 'org_default'
    });
  }

  // Save the pending deal record to fallbackDb under 'pending_deals' as Pending
  const pendingDeal = {
    leadId,
    companyName: lead.companyName,
    serviceType,
    proposalText,
    quotationAmount: budgetVal,
    status: 'Pending',
    opportunityScore: score,
    createdAt: new Date().toISOString()
  };

  await fallbackDb.save('pending_deals', pendingDeal);

  // Auto-Dispatch Email Outreach
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const proposalUrl = `${clientUrl}/#/proposals/shared/${proposal.id || proposal._id}`;
  let outreachContent = `Hello there, I am NEXA, the Agentic AI Assistant representing NexovTech Corp. We have drafted a custom proposal for you. You can review, customize, negotiate, and sign/accept it directly at: ${proposalUrl}`;
  try {
    const systemPrompt = `You are NEXA, the Agentic AI Administrator representing NexovTech Corp. Generate a high-conversion email outreach message. Make sure all contract values are formatted in Indian Rupees (₹/INR). You MUST include the shared proposal link in the email, explaining that the client can review deliverables, select service add-ons, negotiate the budget directly with our Sales AI representative, and accept the agreement to start development autonomously.`;
    outreachContent = await runQuery(systemPrompt, `Company: ${lead.companyName}. Shared Proposal Link: ${proposalUrl}`);
  } catch (e) { }

  let recipientEmail = null;
  if (typeof lead.email === 'string' && lead.email.trim()) {
    recipientEmail = lead.email.trim();
  } else if (lead.emails && lead.emails.length > 0) {
    recipientEmail = lead.emails[0];
  } else if (lead.contactInfo) {
    if (typeof lead.contactInfo.email === 'string' && lead.contactInfo.email.trim()) {
      recipientEmail = lead.contactInfo.email.trim();
    } else if (lead.contactInfo.emails && lead.contactInfo.emails.length > 0) {
      recipientEmail = lead.contactInfo.emails[0];
    }
  }

  let realEmailSent = false;
  if (recipientEmail) {
    console.log(`✉️ Sending auto-dispatched qualified B2B Proposal email to ${recipientEmail}...`);
    const subject = `[NexovTech] Custom Proposal Ready - ${lead.companyName}`;
    realEmailSent = await sendEmail(recipientEmail, subject, outreachContent);
  } else {
    console.warn(`⚠️ No email address found for qualified lead [${lead.companyName}], proposal email skipped.`);
  }

  const logStatus = realEmailSent ? 'Sent' : 'Failed';

  // Save cold outreach log
  await fallbackDb.save('outreach_logs', {
    leadId,
    channel: 'Email',
    messageType: 'Cold_Outreach',
    contentSent: outreachContent,
    status: logStatus,
    recipient: recipientEmail || 'Prospect',
    createdAt: new Date().toISOString()
  });

  if (!useFallbackDb) {
    try {
      await prisma.outreachLog.create({
        data: {
          leadId,
          channel: 'Email',
          messageType: 'Cold_Outreach',
          contentSent: outreachContent,
          status: logStatus
        }
      });
      await prisma.lead.update({ where: { id: leadId }, data: { status: 'Outreach_Sent' } });
    } catch (err) {
      useFallbackDb = true;
    }
  }

  if (useFallbackDb) {
    await fallbackDb.update('leads', leadId, { status: 'Outreach_Sent' });
  }

  // Index outreach in vectorStore RAG memory
  if (realEmailSent) {
    try {
      const textToEmbed = `[CRM Outreach - Sent] Channel: Email\nLead/Client: ${lead.companyName}\nRecipient/Sender: ${recipientEmail || 'NEXA Agent'}\nContent:\n${outreachContent}`;
      await vectorStore.addDocument('crm_memory', textToEmbed, {
        tenantId: 'org_default',
        leadId,
        channel: 'Email',
        type: 'Outreach_Sent'
      });
      console.log('✅ [VECTOR MEMORY]: Indexed automatic B2B proposal email in RAG store.');
    } catch (vectorErr) {
      console.warn('⚠️ Failed to index automated B2B proposal email:', vectorErr.message);
    }
  }

  // Notify admin via Telegram bot
  try {
    const { sendNotification } = require('../bot/telegramBot');
    const linkedUsers = await fallbackDb.find('telegram_users', {}) || [];
    const admins = linkedUsers.filter(u => u.role === 'Admin' || u.role === 'Super Admin' || u.role === 'Manager');

    const notificationText = `🤖 *NEXA B2B Proposal Auto-Dispatched* 🚀\n\n` +
      `Qualified Lead: *${lead.companyName}*\n` +
      `Opportunity Score: *${score}/100* (🔥 High Priority)\n` +
      `Quotation Amount: *₹${budgetVal.toLocaleString()}*\n\n` +
      `NEXA has autonomously qualified this lead and dispatched the custom proposal link to *${recipientEmail || 'client'}* via email. Check status in CRM approvals dashboard.`;

    for (const admin of admins) {
      if (admin.telegramId) {
        await sendNotification(admin.telegramId, notificationText);
      }
    }
  } catch (tgErr) {
    console.warn('⚠️ Could not notify admin via Telegram:', tgErr.message);
  }

  try {
    const adminEmail = 'nexovtech@myyahoo.com';
    const mailData = {
      from: 'nexa@nexovtech.ai',
      to: adminEmail,
      subject: `[NEXA] Proposal Auto-Dispatched: ${lead.companyName}`,
      body: `Hello Admin,\n\nNEXA has autonomously qualified a new lead [${lead.companyName}] with a score of ${score}/100 and auto-dispatched the proposal email containing the shared checkout portal link to ${recipientEmail || 'client'}.\n\nBest regards,\nNEXA Agentic AI`,
      timestamp: new Date(),
      status: 'Unread',
      priority: 'High'
    };
    await fallbackDb.save('mails', mailData);
  } catch (mErr) {
    console.warn('⚠️ Could not send internal mail to admin:', mErr.message);
  }
}

exports.getPendingDeals = async (req, res) => {
  try {
    const deals = await fallbackDb.find('pending_deals', { status: 'Pending' }) || [];
    deals.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json({ success: true, deals });
  } catch (error) {
    console.error('❌ Failed to fetch pending deals:', error);
    res.status(500).json({ message: 'Failed to fetch pending deals', error: error.message });
  }
};

exports.approvePendingDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const deal = await fallbackDb.findById('pending_deals', id);
    if (!deal) {
      return res.status(404).json({ message: 'Pending deal not found' });
    }

    if (deal.status !== 'Pending') {
      return res.status(400).json({ message: `Deal status is already ${deal.status}` });
    }

    deal.status = 'Approved';
    await fallbackDb.save('pending_deals', deal);

    let useFallbackDb = false;
    let lead;
    try {
      lead = await prisma.lead.findUnique({ where: { id: deal.leadId } });
      if (!lead) useFallbackDb = true;
    } catch (e) {
      useFallbackDb = true;
    }

    if (useFallbackDb) {
      lead = await fallbackDb.findById('leads', deal.leadId);
    }

    if (!lead) {
      return res.status(404).json({ message: 'Associated lead not found' });
    }

    // 1. Generate Proposal
    let proposal;
    if (!useFallbackDb) {
      try {
        proposal = await prisma.proposal.create({
          data: {
            leadId: deal.leadId,
            serviceType: 'AISolutions',
            proposalText: deal.proposalText,
            quotationAmount: Number(deal.quotationAmount),
            status: 'Draft'
          }
        });
        await prisma.lead.update({ where: { id: deal.leadId }, data: { status: 'Proposal_Generated' } });
      } catch (err) {
        useFallbackDb = true;
      }
    }

    if (useFallbackDb) {
      proposal = await fallbackDb.save('proposals', {
        leadId: deal.leadId,
        serviceType: 'AISolutions',
        proposalText: deal.proposalText,
        quotationAmount: Number(deal.quotationAmount),
        status: 'Draft'
      });
      await fallbackDb.update('leads', deal.leadId, { status: 'Proposal_Generated' });
    }

    // 2. Auto-Dispatch Email Outreach
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const proposalUrl = `${clientUrl}/#/proposals/shared/${proposal.id || proposal._id}`;
    let outreachContent = `Hello there, I am NEXA, the Agentic AI Assistant representing NexovTech Corp. We have drafted a custom proposal for you. You can review, customize, negotiate, and sign/accept it directly at: ${proposalUrl}`;
    try {
      const systemPrompt = `You are NEXA, the Agentic AI Administrator representing NexovTech Corp. Generate a high-conversion email outreach message. Make sure all contract values are formatted in Indian Rupees (₹/INR). You MUST include the shared proposal link in the email, explaining that the client can review deliverables, select service add-ons, negotiate the budget directly with our Sales AI representative, and accept the agreement to start development autonomously.`;
      outreachContent = await runQuery(systemPrompt, `Company: ${lead.companyName}. Shared Proposal Link: ${proposalUrl}`);
    } catch (e) { }

    let recipientEmail = null;
    if (typeof lead.email === 'string' && lead.email.trim()) {
      recipientEmail = lead.email.trim();
    } else if (lead.emails && lead.emails.length > 0) {
      recipientEmail = lead.emails[0];
    } else if (lead.contactInfo) {
      if (typeof lead.contactInfo.email === 'string' && lead.contactInfo.email.trim()) {
        recipientEmail = lead.contactInfo.email.trim();
      } else if (lead.contactInfo.emails && lead.contactInfo.emails.length > 0) {
        recipientEmail = lead.contactInfo.emails[0];
      }
    }

    let realEmailSent = false;
    if (recipientEmail) {
      console.log(`✉️ Sending auto-dispatched B2B Proposal outreach email to ${recipientEmail}...`);
      const subject = `[NexovTech] Custom Proposal Ready - ${lead.companyName}`;
      realEmailSent = await sendEmail(recipientEmail, subject, outreachContent);
    } else {
      console.warn(`⚠️ No email address found for lead [${lead.companyName}], proposal email skipped.`);
    }

    const logStatus = realEmailSent ? 'Sent' : 'Failed';

    if (!useFallbackDb) {
      try {
        await prisma.outreachLog.create({
          data: {
            leadId: deal.leadId,
            channel: 'Email',
            messageType: 'Cold_Outreach',
            contentSent: outreachContent,
            status: logStatus
          }
        });
        await prisma.lead.update({ where: { id: deal.leadId }, data: { status: 'Outreach_Sent' } });
      } catch (err) {
        useFallbackDb = true;
      }
    }

    if (useFallbackDb) {
      await fallbackDb.save('outreach_logs', {
        leadId: deal.leadId,
        channel: 'Email',
        messageType: 'Cold_Outreach',
        contentSent: outreachContent,
        status: logStatus
      });
      await fallbackDb.update('leads', deal.leadId, { status: 'Outreach_Sent' });
    }

    // Index outreach in vectorStore RAG
    if (realEmailSent) {
      try {
        const textToEmbed = `[CRM Outreach - Sent] Channel: Email\nLead/Client: ${lead.companyName}\nRecipient/Sender: ${recipientEmail || 'NEXA Agent'}\nContent:\n${outreachContent}`;
        await vectorStore.addDocument('crm_memory', textToEmbed, {
          tenantId: req.tenantId || 'org_default',
          leadId: deal.leadId,
          channel: 'Email',
          type: 'Outreach_Sent'
        });
        console.log('✅ [VECTOR MEMORY]: Indexed automatic B2B proposal email in RAG store.');
      } catch (vectorErr) {
        console.warn('⚠️ Failed to index automated B2B proposal email:', vectorErr.message);
      }
    }

    // 3. Launch project
    const nexaAutomationController = require('./nexaAutomationController');
    const mockReq = {
      body: { leadId: deal.leadId, proposalId: proposal.id || proposal._id }
    };
    let launchedProjectData = null;
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          launchedProjectData = data;
        }
      }),
      json: (data) => {
        launchedProjectData = data;
      }
    };
    await nexaAutomationController.autoLaunchProject(mockReq, mockRes);

    // 4. Send approved notifications
    try {
      const { sendNotification } = require('../bot/telegramBot');
      const linkedUsers = await fallbackDb.find('telegram_users', {}) || [];
      const admins = linkedUsers.filter(u => u.role === 'Admin' || u.role === 'Super Admin' || u.role === 'Manager');

      const notificationText = `🤖 *NEXA Deal Approved & Deployed* 🚀\n\n` +
        `Lead: *${lead.companyName}*\n` +
        `Budget: *₹${Number(deal.quotationAmount).toLocaleString()}*\n\n` +
        `The deal has been approved by the manager. Tasks are deployed, specialists matched, outreach sent, and LinkedIn milestones published!`;

      for (const admin of admins) {
        if (admin.telegramId) {
          await sendNotification(admin.telegramId, notificationText);
        }
      }
    } catch (tgErr) {
      console.warn('⚠️ Could not notify admin via Telegram:', tgErr.message);
    }

    res.json({
      success: true,
      message: 'Pending deal approved, outreach generated, and project launched successfully.',
      deal,
      projectResult: launchedProjectData
    });
  } catch (error) {
    console.error('❌ Deal approval failed:', error);
    res.status(500).json({ message: 'Deal approval failed', error: error.message });
  }
};

exports.rejectPendingDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const deal = await fallbackDb.findById('pending_deals', id);
    if (!deal) {
      return res.status(404).json({ message: 'Pending deal not found' });
    }

    deal.status = 'Rejected';
    await fallbackDb.save('pending_deals', deal);

    let useFallbackDb = false;
    try {
      await prisma.lead.update({ where: { id: deal.leadId }, data: { status: 'Archived' } });
    } catch (e) {
      useFallbackDb = true;
    }

    if (useFallbackDb) {
      await fallbackDb.update('leads', deal.leadId, { status: 'Archived' });
    }

    // Send notifications
    try {
      const { sendNotification } = require('../bot/telegramBot');
      const linkedUsers = await fallbackDb.find('telegram_users', {}) || [];
      const admins = linkedUsers.filter(u => u.role === 'Admin' || u.role === 'Super Admin' || u.role === 'Manager');

      const notificationText = `🤖 *NEXA Deal Rejected & Archived* 📁\n\n` +
        `Lead: *${deal.companyName}*\n` +
        `Quotation: *₹${Number(deal.quotationAmount).toLocaleString()}*\n\n` +
        `The deal was rejected by the manager and has been archived.`;

      for (const admin of admins) {
        if (admin.telegramId) {
          await sendNotification(admin.telegramId, notificationText);
        }
      }
    } catch (tgErr) {
      console.warn('⚠️ Could not notify admin via Telegram:', tgErr.message);
    }

    res.json({
      success: true,
      message: 'Pending deal rejected and lead archived successfully.',
      deal
    });
  } catch (error) {
    console.error('❌ Deal rejection failed:', error);
    res.status(500).json({ message: 'Deal rejection failed', error: error.message });
  }
};


exports.getLeads = async (req, res) => {
  try {
    let leads = [];
    let useFallbackDb = false;

    try {
      leads = await prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          leadScores: true
        }
      });
      if (!leads || leads.length === 0) {
        useFallbackDb = true;
      }
    } catch (dbErr) {
      console.warn('⚠️ PostgreSQL offline in getLeads, using fallbackDb:', dbErr.message);
      useFallbackDb = true;
    }

    if (useFallbackDb) {
      leads = await fallbackDb.find('leads', {}) || [];
      // Sort desc by createdAt
      leads.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      // Append score data to match prisma return shape
      for (let lead of leads) {
        const scores = await fallbackDb.find('lead_scores', { leadId: lead.id || lead._id }) || [];
        lead.leadScores = scores;
      }
    }

    res.json({ success: true, leads });
  } catch (error) {
    console.error('❌ Failed to fetch leads:', error);
    res.status(500).json({ message: 'Failed to fetch leads', error: error.message });
  }
};


exports.manualScoreLead = async (req, res) => {
  try {
    const scoreRecord = await exports.scoreLeadById(req.params.id);
    res.json({ message: 'Scoring completed successfully', score: scoreRecord });
  } catch (error) {
    res.status(500).json({ message: 'Scoring failed', error: error.message });
  }
};

// 3. PROPOSAL GENERATOR
exports.generateProposal = async (req, res) => {
  try {
    const { leadId, serviceType, quotationAmount } = req.body;

    let lead;
    let score;
    let useFallbackDb = false;

    try {
      lead = await prisma.lead.findUnique({
        where: { id: leadId }
      });
      if (lead) {
        score = await prisma.leadScore.findFirst({
          where: { leadId }
        });
      } else {
        useFallbackDb = true;
      }
    } catch (dbErr) {
      console.warn('⚠️ PostgreSQL offline in generateProposal, using fallbackDb:', dbErr.message);
      useFallbackDb = true;
    }

    if (useFallbackDb) {
      lead = await fallbackDb.findById('leads', leadId);
      if (!lead) return res.status(404).json({ message: 'Lead not found' });
      const existingScores = await fallbackDb.find('lead_scores', { leadId });
      score = existingScores[0];
    }

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    let proposalText = '';
    const budgetVal = quotationAmount || (score ? score.budgetScore * 12500 : 400000);
    const techStackArr = Array.isArray(lead.techStack) ? lead.techStack : (lead.contactInfo ? lead.techStack : []);

    try {
      const systemPrompt = `You are NEXA, the Agentic AI Administrator representing NexovTech Corp.
      Create a premium tailored project proposal. Include an introduction, technical solution outline, deliverables table, timeline estimates, and call to action.
      Tone: Premium, highly professional, technical, persuasive. Clearly sign the proposal from the "NEXA Agentic AI Administration".`;

      const userPrompt = `
        Draft proposal for: ${lead.companyName}
        Service Type requested: ${serviceType}
        Target Budget: ₹${budgetVal.toLocaleString()}
        Industry: ${lead.industry}
        Current tech stack: ${Array.isArray(techStackArr) ? techStackArr.join(', ') : ''}
      `;

      proposalText = await runQuery(systemPrompt, userPrompt);
    } catch (error) {
      console.warn('⚠️ Proposal LLM offline, generating templates:', error.message);
      proposalText = `
        PROJECT PROPOSAL FOR ${lead.companyName.toUpperCase()}
        
        Service Type: ${serviceType}
        Proposed Budget: ₹${budgetVal.toLocaleString()}
        
        1. OBJECTIVE & OPPORTUNITY
        Provide ${serviceType} integration to optimize workflow efficiency, enhance tech-stack performance (${Array.isArray(techStackArr) ? techStackArr.join(', ') : ''}), and scale current operations.
        
        2. PROPOSED SOLUTIONS
        - Design modern, robust components matching client infrastructure.
        - Deploy staging workflows for continuous feature validations.
        
        3. MILESTONES & TIMELINE
        - Phase 1: Planning & Specs (Week 1-2)
        - Phase 2: Core Development & Integrations (Week 3-6)
        - Phase 3: Verification & Launch (Week 7)
        
        4. PAYMENT TERMS
        - 50% Upfront kickoff payment.
        - 50% Final validation and sign-off.
      `;
    }

    let proposal;
    if (!useFallbackDb) {
      try {
        proposal = await prisma.proposal.create({
          data: {
            leadId,
            serviceType: mapServiceEnum(serviceType),
            proposalText,
            quotationAmount: budgetVal,
            status: 'Draft'
          }
        });

        // Update lead status
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'Proposal_Generated' }
        });
      } catch (dbErr) {
        console.warn('⚠️ PostgreSQL write failed in generateProposal, falling back to fallbackDb:', dbErr.message);
        useFallbackDb = true;
      }
    }

    if (useFallbackDb) {
      proposal = await fallbackDb.save('proposals', {
        leadId,
        serviceType,
        proposalText,
        quotationAmount: budgetVal,
        status: 'Draft',
        tenantId: req.tenantId || 'org_default'
      });

      // Update lead status
      await fallbackDb.update('leads', lead.id || lead._id, { status: 'Proposal_Generated' });
    }

    // Index the proposal in vectorStore RAG DEALINGS memory
    try {
      await vectorStore.addDocument('dealings_memory', proposalText, {
        tenantId: req.tenantId || 'org_default',
        proposalId: proposal.id || proposal._id,
        client: lead.companyName
      });
      console.log('✅ [VECTOR MEMORY]: Indexed proposal for B2B similarity retrieval.');
    } catch (vectorErr) {
      console.warn('⚠️ Failed to index proposal in vector memory:', vectorErr.message);
    }

    res.status(201).json({ message: 'Proposal generated successfully', proposal });
  } catch (error) {
    res.status(500).json({ message: 'Proposal generation failed', error: error.message });
  }
};

// 4. OUTREACH AUTOMATION
exports.sendOutreach = async (req, res) => {
  try {
    const { leadId, channel, messageType, messageContent } = req.body;

    let lead;
    let useFallbackDb = false;

    try {
      lead = await prisma.lead.findUnique({
        where: { id: leadId }
      });
      if (!lead) useFallbackDb = true;
    } catch (dbErr) {
      console.warn('⚠️ PostgreSQL offline in sendOutreach, using fallbackDb:', dbErr.message);
      useFallbackDb = true;
    }

    if (useFallbackDb) {
      lead = await fallbackDb.findById('leads', leadId);
    }

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    let finalMessage = messageContent;
    const contactNameVal = lead.contactName || (lead.contactInfo ? lead.contactInfo.primaryContactName : 'there');

    if (!finalMessage) {
      try {
        const systemPrompt = `You are NEXA, the Agentic AI Administrator representing NexovTech Corp.
        Generate a short, high-conversion message for ${channel}. Message type: ${messageType}.
        The tone should be professional and autonomous. Note that you are reaching out as an agentic AI assistant on behalf of the NexovTech administration.
        Do not include place-holders or conversational setup, write the direct text ready to copy or send.`;

        const userPrompt = `
          Company Name: ${lead.companyName}
          Industry: ${lead.industry}
          Contact Name: ${contactNameVal}
        `;

        finalMessage = await runQuery(systemPrompt, userPrompt);
      } catch (err) {
        finalMessage = `Hello ${contactNameVal},\n\nI am NEXA, the Agentic AI Administrator representing NexovTech Corp. I noticed ${lead.companyName} is leading innovation in the ${lead.industry} space. I am reaching out autonomously to connect and share how we can optimize your workflow with custom automated SaaS structures. Best regards, NEXA AI Admin!`;
      }
    }

    // Define the pending log data structure
    const logData = {
      id: `out_${Date.now()}`,
      leadId,
      channel: channel || 'WhatsApp',
      messageType: messageType || 'Cold_Outreach',
      recipient: lead.phone || lead.contactPhone || (lead.emails && lead.emails[0]) || lead.companyName,
      contentSent: finalMessage,
      status: 'Pending',
      tenantId: req.tenantId || 'org_default',
      createdAt: new Date().toISOString()
    };

    // Save to local fallback cache immediately for high-speed tracking
    const log = await fallbackDb.save('outreach_logs', logData);

    // Also mirror to Prisma PostgreSQL if available
    try {
      if (prisma) {
        const mappedChannel = mapChannelEnum(channel);
        await prisma.outreachLog.create({
          data: {
            leadId,
            channel: mappedChannel,
            messageType: messageType || 'Cold_Outreach',
            contentSent: finalMessage,
            status: 'Pending'
          }
        });
      }
    } catch (dbErr) {
      // Ignored: fallbackDb is our primary local cache
    }

    // Broadcast instant Socket.io update for real-time dashboard updates (Instagram concept)
    socketHub.emit('outreach_update', log);

    return res.status(200).json({
      message: 'Outreach campaign queued successfully in background.',
      log,
      emailDispatched: false // Handled asynchronously by worker
    });
  } catch (error) {
    res.status(500).json({ message: 'Outreach failed', error: error.message });
  }
};

// 4b. GENERATE OUTREACH DRAFT
exports.generateOutreachDraft = async (req, res) => {
  try {
    const { leadId, channel, customPrompt = '', language } = req.body;

    let lead;
    let useFallbackDb = false;

    try {
      lead = await prisma.lead.findUnique({
        where: { id: leadId }
      });
      if (!lead) useFallbackDb = true;
    } catch (dbErr) {
      useFallbackDb = true;
    }

    if (useFallbackDb) {
      lead = await fallbackDb.findById('leads', leadId);
    }

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    let proposal = null;
    try {
      proposal = await prisma.proposal.findFirst({
        where: { leadId }
      });
      if (!proposal) {
        const proposals = await fallbackDb.find('proposals', { leadId });
        proposal = proposals[0] || null;
      }
    } catch (e) {
      const proposals = await fallbackDb.find('proposals', { leadId });
      proposal = proposals[0] || null;
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const proposalUrl = proposal ? `${clientUrl}/#/proposals/shared/${proposal.id || proposal._id}` : null;

    let messageContent = '';
    const contactNameVal = lead.contactName || (lead.contactInfo ? lead.contactInfo.primaryContactName : 'there');

    let langInstruction = '';
    const selectedLang = (language || '').toLowerCase().trim();
    if (selectedLang === 'hi' || selectedLang === 'hindi') {
      langInstruction = 'You MUST write the entire message draft in pure Hindi (हिन्दी) script. Do not write in English or Transliterated Hindi. The message should be polite, clear, and direct, suitable to be read by a text-to-speech voice.';
    } else if (selectedLang === 'te' || selectedLang === 'telugu') {
      langInstruction = 'You MUST write the entire message draft in pure Telugu (తెలుగు) script. Do not write in English or Transliterated Telugu. The message should be polite, clear, and direct, suitable to be read by a text-to-speech voice.';
    }

    try {
      let proposalUrlInstruction = '';
      if (proposalUrl) {
        if (channel === 'Voice Call') {
          proposalUrlInstruction = 'Do NOT include any URL link, web address, or HTML in the draft. Instead, mention that the custom B2B proposal has been generated for them and sent to their email.';
        } else {
          proposalUrlInstruction = `You MUST include the client's custom B2B proposal link in the message: ${proposalUrl}. Explain that they can review details, select service add-ons, negotiate budget directly with our Sales AI, and launch the project.`;
        }
      }

      let identityInstruction = 'You are a human sales and customer relations representative from the NexovTech administration. Do NOT mention "AI", "bot", "assistant", "NEXA", or "autonomous". Write exactly like a human sales manager.';
      if (channel !== 'Voice Call') {
        identityInstruction = 'You are NEXA, the Agentic AI Administrator representing NexovTech Corp. Note that you are reaching out as an agentic AI assistant on behalf of the NexovTech administration.';
      }

      const systemPrompt = `${identityInstruction}
      Generate a short, high-conversion message for ${channel}.
      The tone should be professional.
      Do not include place-holders or conversational setup, write the direct text ready to copy or send.
      ${langInstruction}
      ${proposalUrlInstruction}
      ${customPrompt ? `Incorporate the following custom details or instructions: ${customPrompt}` : ''}`;

      const userPrompt = `
        Company Name: ${lead.companyName}
        Industry: ${lead.industry}
        Contact Name: ${contactNameVal}
      `;

      messageContent = await runQuery(systemPrompt, userPrompt);
    } catch (err) {
      if (selectedLang === 'hi' || selectedLang === 'hindi') {
        messageContent = `नमस्ते ${contactNameVal || 'जी'},\n\nमैं नेक्सोवटेक कॉर्प का प्रतिनिधि हूँ। मैं हमारे कस्टम बी2बी सॉफ्टवेयर प्रस्ताव को साझा करने के लिए कॉल कर रहा हूँ। धन्यवाद।`;
      } else if (selectedLang === 'te' || selectedLang === 'telugu') {
        messageContent = `నమస్తే ${contactNameVal || 'గారు'},\n\nనేను నెక్సోవ్‌టెక్ కార్ప్ నుండి ప్రతినిధిని మాట్లాడుతున్నాను. మా అనుకూలీకరించిన బీటూబీ సాఫ్ట్‌వేర్ ప్రతిపాదనను పంచుకోవడానికి నేను కాల్ చేస్తున్నాను. ధన్యవాదాలు.`;
      } else {
        messageContent = `Hello ${contactNameVal},\n\nThis is a representative from NexovTech Corp. I am reaching out to share how we can optimize your workflow with custom automated SaaS structures. Best regards!`;
      }
    }

    res.json({ draft: messageContent });
  } catch (error) {
    res.status(500).json({ message: 'Draft generation failed', error: error.message });
  }
};

// 5. BUSINESS INTELLIGENCE ENGINE (ANALYTICS)
let biRecommendationsCache = {
  key: '',
  recommendations: null,
  timestamp: 0
};
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache

let isPostgresOffline = false;
let lastPostgresCheck = 0;
const PG_CHECK_INTERVAL = 60 * 1000; // Check again after 1 minute

exports.getBIData = async (req, res) => {
  try {
    let totalLeads = 0;
    let scoredLeads = 0;
    let proposalSent = 0;
    let outreachSent = 0;
    let highPriorityCount = 0;

    const nowCheck = Date.now();
    let useFallback = isPostgresOffline && (nowCheck - lastPostgresCheck < PG_CHECK_INTERVAL);

    if (!useFallback) {
      try {
        totalLeads = await prisma.lead.count();
        isPostgresOffline = false; // Successfully reached Postgres

        scoredLeads = await prisma.lead.count({ where: { status: 'Scored' } });
        proposalSent = await prisma.lead.count({ where: { status: 'Proposal_Generated' } });
        outreachSent = await prisma.lead.count({ where: { status: 'Outreach_Sent' } });

        highPriorityCount = await prisma.leadScore.count({
          where: {
            overallOpportunityScore: { gte: 80 }
          }
        });
      } catch (dbErr) {
        console.warn('⚠️ PostgreSQL offline, activating circuit breaker and using fallbackDb:', dbErr.message);
        isPostgresOffline = true;
        lastPostgresCheck = nowCheck;
        useFallback = true;
      }
    }

    if (useFallback) {
      const [allLeads, opportunityScores] = await Promise.all([
        fallbackDb.find('leads', { tenantId: req.tenantId || 'org_default' }).catch(() => []),
        fallbackDb.find('lead_scores', { tenantId: req.tenantId || 'org_default' }).catch(() => [])
      ]);
      totalLeads = allLeads.length;
      scoredLeads = allLeads.filter(l => l.status === 'Scored').length;
      proposalSent = allLeads.filter(l => l.status === 'Proposal_Generated').length;
      outreachSent = allLeads.filter(l => l.status === 'Outreach_Sent').length;
      highPriorityCount = opportunityScores.filter(s => s.overallOpportunityScore >= 80).length;
    }

    // Calculate Monthly Growth Charts dynamically from real transactions matching tenantId
    const transactions = (await fallbackDb.find('transactions', { tenantId: req.tenantId || 'org_default' })) || [];
    const revenueTransactions = transactions.filter(t => t.type === 'Revenue');

    // Group by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonth = {};
    months.forEach(m => { revenueByMonth[m] = 0; });

    revenueTransactions.forEach(t => {
      const date = new Date(t.date || t.createdAt);
      if (!isNaN(date.getTime())) {
        const monthName = months[date.getMonth()];
        revenueByMonth[monthName] += Number(t.amount) || 0;
      }
    });

    const leadsByMonth = {};
    const conversionsByMonth = {};
    months.forEach(m => {
      leadsByMonth[m] = 0;
      conversionsByMonth[m] = 0;
    });

    const tenantLeads = useFallback
      ? await fallbackDb.find('leads', { tenantId: req.tenantId || 'org_default' })
      : [];

    tenantLeads.forEach(l => {
      const date = new Date(l.createdAt || Date.now());
      if (!isNaN(date.getTime())) {
        const monthName = months[date.getMonth()];
        leadsByMonth[monthName] += 1;
        if (l.status === 'Converted') {
          conversionsByMonth[monthName] += 1;
        }
      }
    });

    const monthlyRevenue = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(m => {
      const leadsCount = leadsByMonth[m] || 0;
      const convCount = conversionsByMonth[m] || 0;
      return {
        month: m,
        revenue: revenueByMonth[m] || 0,
        leads: leadsCount,
        conversion: leadsCount > 0 ? Math.round((convCount / leadsCount) * 100) : 0
      };
    });

    // Build strategic AI recommendations
    let recommendations = [
      'AI Automation services generated 65% of total revenue this quarter. Increase marketing investment.',
      'Average conversion rate via WhatsApp is 42%, compared to 18% via Email. Prioritize WhatsApp outreach.',
      'Healthcare and E-commerce leads currently yield the highest opportunity scores. Focus discovery scrapers on these niches.'
    ];

    const cacheKey = `${totalLeads}_${highPriorityCount}_${outreachSent}_${proposalSent}`;
    const now = Date.now();

    if (
      biRecommendationsCache.key === cacheKey &&
      biRecommendationsCache.recommendations &&
      (now - biRecommendationsCache.timestamp) < CACHE_TTL
    ) {
      recommendations = biRecommendationsCache.recommendations;
    } else {
      try {
        const systemPrompt = `You are the NEXA Agentic AI Administrator. Review the following business stats and output exactly 3 high-density, professional bullet points recommending strategic growth moves.`;
        const userPrompt = `
          Total Discovered Leads: ${totalLeads}
          High Opportunity Leads (Score >= 80): ${highPriorityCount}
          Outreach Sent: ${outreachSent}
          Proposals Sent: ${proposalSent}
        `;
        const responseText = await runQuery(systemPrompt, userPrompt);
        const lines = responseText.split('\n').map(l => l.replace(/^[*\-\d.\s]+/, '').trim()).filter(Boolean);
        if (lines.length >= 2) {
          recommendations = lines.slice(0, 3);
        }

        // Cache the newly generated recommendations
        biRecommendationsCache = {
          key: cacheKey,
          recommendations,
          timestamp: now
        };
      } catch (e) {
        // Keep mock recommendations as fallback
      }
    }

    res.json({
      metrics: {
        totalLeads,
        scoredLeads,
        proposalSent,
        outreachSent,
        highPriorityCount,
        conversionRate: totalLeads > 0 ? Math.round((outreachSent / totalLeads) * 100) : 0
      },
      monthlyRevenue,
      recommendations
    });
  } catch (error) {
    res.status(500).json({ message: 'BI data fetch failed', error: error.message });
  }
};

// 6. CLIENT RETENTION ALERTS
exports.getRetentionAlerts = async (req, res) => {
  try {
    let alerts = [];
    let useFallbackDb = false;

    try {
      alerts = await prisma.retentionAlert.findMany({
        include: {
          client: true
        }
      });

      if (alerts.length === 0) {
        let client = await prisma.client.findFirst();
        if (!client) {
          client = await prisma.client.create({
            data: {
              companyName: 'Apex Dental Care',
              contactEmail: 'info@apexdentalcare.com',
              website: 'apexdentalcare.com',
              isActive: true
            }
          });
        }

        const newAlert = await prisma.retentionAlert.create({
          data: {
            clientId: client.id,
            inactiveDays: 60,
            engagementLevel: 'Critical',
            aiSuggestion: `Client [${client.companyName}] has been inactive for 60 days. Recommended Action: Send follow-up proposal with special retention offer.`,
            isResolved: false
          },
          include: {
            client: true
          }
        });

        alerts = [newAlert];
      }
    } catch (dbErr) {
      console.warn('⚠️ PostgreSQL offline in getRetentionAlerts, using fallbackDb:', dbErr.message);
      useFallbackDb = true;
    }

    if (useFallbackDb) {
      alerts = await fallbackDb.find('retention_alerts', {});
      if (alerts.length === 0) {
        let fallbackClientName = 'Apex Dental Care';
        const newAlert = await fallbackDb.save('retention_alerts', {
          clientId: 'fallback_client_id_2026',
          inactiveDays: 60,
          engagementLevel: 'Critical',
          aiSuggestion: `Client [${fallbackClientName}] has been inactive for 60 days. Recommended Action: Send follow-up proposal with special retention offer.`,
          isResolved: false
        });
        alerts = [newAlert];
      }
    }

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Retention alert fetch failed', error: error.message });
  }
};

// 7. MARKETING CONTENT GENERATION AGENT
exports.generateMarketingContent = async (req, res) => {
  try {
    const { contentType, contentCategory, contentTopic } = req.body;

    if (!contentType || !contentTopic) {
      return res.status(400).json({ message: 'Content type and topic are required' });
    }

    let generatedContent = '';
    let usedAi = false;

    try {
      const systemPrompt = `You are the NEXA Growth Platform Agentic AI Copywriter. 
      Your task is to generate high-conversion marketing copy for the channel: "${contentType}" and category: "${contentCategory || 'thought-leadership'}".
      Tone: Professional, authoritative, and engaging.
      Do not include placeholders, instructions, or introductions outside the generated copy. Write direct copy that is ready to post.`;

      let userPrompt = `Generate copy about this topic: "${contentTopic}".\n\n`;
      if (contentType === 'linkedin') {
        userPrompt += `Format it as a clean LinkedIn post with bullet points and appropriate hashtags at the bottom. Start with an attention-grabbing hook.`;
      } else if (contentType === 'youtube') {
        userPrompt += `Include a catchy **VIDEO TITLE:**, a **VIDEO SCRIPT INTRO:** script format (e.g. speaking notes), and a structured **VIDEO DESCRIPTION:** with takeaways.`;
      } else {
        userPrompt += `Format it as a detailed blog post with markdown headers (e.g., #, ##, ###), bullet points, and key takeaways at the end.`;
      }

      generatedContent = await runQuery(systemPrompt, userPrompt);
      usedAi = true;
    } catch (err) {
      console.warn('⚠️ Marketing LLM offline, using fallback template generation:', err.message);
      // Fallback templates based on type
      if (contentType === 'linkedin') {
        generatedContent = `🚀 **Transforming Sales Ops with NEXA Autonomous Workflows**\n\nAt NexovTech, we realized that manual outreach is the bottleneck of modern agency scaling. That's why we engineered NEXA.\n\nKey Insights:\n• Automated Lead Discovery scans public directory listings in seconds.\n• Real-Time AI Scoring identifies hot leads with 92% accuracy.\n• Tailored Web & AI proposals generated dynamically based on tech-stack logs.\n\nStop wasting time on cold emails that bounce. Build smarter. Grow faster.\n\nTopic of interest: ${contentTopic}\n\n#AI #SaaS #LeadGeneration #SoftwareDevelopment #TechInnovation`;
      } else if (contentType === 'youtube') {
        generatedContent = `**VIDEO TITLE:** How We Built an AI Lead Agent (NEXA) targeting ${contentTopic}\n\n**VIDEO SCRIPT INTRO:**\n"Hey everyone! In this video, we're diving deep into ${contentTopic}. We'll show you how we hook web scraper scrapings, route them through Mongoose models, evaluate budget readiness with Gemini APIs, and automate outreach schedules. Don't forget to hit subscribe!"\n\n**VIDEO DESCRIPTION:**\nLearn the engineering details behind production-grade AI agent integrations. Source code and system schema walkthrough included.`;
      } else {
        generatedContent = `## The Shift to AI-Powered Sales Development Representatives for ${contentTopic}\n\nTraditional outbound sales operations are losing effectiveness. With average cold-outreach open rates falling below 15%, companies require more hyper-personalized, context-driven strategies.\n\nEnter NEXA.\n\nBy leveraging vector databases like ChromaDB and metadata scraping, modern growth platforms can analyze target business tech-stacks before draft creation. This ensures every conversation has a context-specific angle.\n\n### Key Takeaways:\n1. Contextual leads convert 3x higher.\n2. Standardizing on database integrations reduces API payloads.`;
      }
    }

    res.json({ success: true, content: generatedContent, usedAi });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate marketing content', error: error.message });
  }
};

// 8. SEMANTIC VECTOR MEMORY SUITE
exports.listVectorDocs = async (req, res) => {
  try {
    const { collectionName } = req.query;
    const query = { tenantId: req.tenantId || 'org_default' };
    if (collectionName) {
      query.collection = collectionName;
    }

    const docs = await fallbackDb.find('vector_memory', query) || [];
    // Sort descending by createdAt
    docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, documents: docs });
  } catch (err) {
    console.error('❌ Failed to list vector documents:', err);
    res.status(500).json({ message: 'Failed to list vector documents', error: err.message });
  }
};

exports.addCustomVectorDoc = async (req, res) => {
  try {
    const { collectionName, text, clientName } = req.body;
    if (!collectionName || !text) {
      return res.status(400).json({ message: 'collectionName and text are required.' });
    }

    const metadata = {
      tenantId: req.tenantId || 'org_default',
      client: clientName || 'System Rule/Guideline',
      source: 'UserManual'
    };

    const doc = await vectorStore.addDocument(collectionName, text, metadata);
    res.status(201).json({ success: true, message: 'Document added to vector store', document: doc });
  } catch (err) {
    console.error('❌ Failed to add custom vector document:', err);
    res.status(500).json({ message: 'Failed to add document to vector store', error: err.message });
  }
};

exports.deleteVectorDoc = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await fallbackDb.findById('vector_memory', id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    if (doc.tenantId !== (req.tenantId || 'org_default')) {
      return res.status(403).json({ message: 'Access denied: Unauthorized tenant memory.' });
    }

    await fallbackDb.deleteOne('vector_memory', id);
    res.json({ success: true, message: 'Document successfully pruned from vector memory.' });
  } catch (err) {
    console.error('❌ Failed to delete vector document:', err);
    res.status(500).json({ message: 'Failed to delete vector document', error: err.message });
  }
};

exports.getOutreachLogs = async (req, res) => {
  try {
    const logs = await fallbackDb.find('outreach_logs', { tenantId: req.tenantId || 'org_default' }) || [];
    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, logs });
  } catch (err) {
    console.error('❌ Failed to fetch outreach logs:', err);
    res.status(500).json({ message: 'Failed to fetch outreach logs', error: err.message });
  }
};

// GET /api/nexa/proposals/shared/:id (Public)
exports.getSharedProposal = async (req, res) => {
  try {
    const { id } = req.params;
    let proposal;
    let lead;
    let useFallbackDb = false;

    try {
      proposal = await prisma.proposal.findUnique({
        where: { id },
        include: { lead: true }
      });
      if (proposal) {
        lead = proposal.lead;
      } else {
        useFallbackDb = true;
      }
    } catch (e) {
      useFallbackDb = true;
    }

    if (useFallbackDb) {
      proposal = await fallbackDb.findById('proposals', id);
      if (proposal) {
        lead = await fallbackDb.findById('leads', proposal.leadId);
      }
    }

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    res.json({ success: true, proposal, lead });
  } catch (err) {
    console.error('❌ Failed to retrieve shared proposal:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve shared proposal', error: err.message });
  }
};

// POST /api/nexa/proposals/shared/:id/accept (Public)
exports.acceptSharedProposal = async (req, res) => {
  try {
    const { id } = req.params;
    let proposal;
    let lead;
    let useFallbackDb = false;

    try {
      proposal = await prisma.proposal.findUnique({
        where: { id }
      });
      if (proposal) {
        lead = await prisma.lead.findUnique({
          where: { id: proposal.leadId }
        });
      } else {
        useFallbackDb = true;
      }
    } catch (e) {
      useFallbackDb = true;
    }

    if (useFallbackDb) {
      proposal = await fallbackDb.findById('proposals', id);
      if (proposal) {
        lead = await fallbackDb.findById('leads', proposal.leadId);
      }
    }

    if (!proposal || !lead) {
      return res.status(404).json({ success: false, message: 'Proposal or associated lead not found.' });
    }

    if (proposal.status === 'Accepted') {
      return res.status(400).json({ success: false, message: 'Proposal has already been accepted.' });
    }

    // Update status to Accepted
    proposal.status = 'Accepted';
    if (!useFallbackDb) {
      try {
        await prisma.proposal.update({
          where: { id },
          data: { status: 'Accepted' }
        });
        await prisma.lead.update({
          where: { id: proposal.leadId },
          data: { status: 'Converted' }
        });
      } catch (err) {
        useFallbackDb = true;
      }
    }

    if (useFallbackDb) {
      await fallbackDb.update('proposals', id, { status: 'Accepted' });
      await fallbackDb.update('leads', proposal.leadId, { status: 'Converted' });
    }

    // Launch project autonomously
    const nexaAutomationController = require('./nexaAutomationController');
    const mockReq = {
      body: { leadId: proposal.leadId, proposalId: proposal.id || proposal._id }
    };
    let launchedProjectData = null;
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          launchedProjectData = data;
        }
      }),
      json: (data) => {
        launchedProjectData = data;
      }
    };

    await nexaAutomationController.autoLaunchProject(mockReq, mockRes);

    // Send notifications to Telegram
    try {
      const { sendNotification } = require('../bot/telegramBot');
      const linkedUsers = await fallbackDb.find('telegram_users', {}) || [];
      const admins = linkedUsers.filter(u => u.role === 'Admin' || u.role === 'Super Admin' || u.role === 'Manager');

      const notificationText = `🤝 *B2B Deal Converted Autonomously!* 🎉\n\n` +
        `Client *${lead.companyName}* accepted the proposal directly from the Shared Portal!\n` +
        `Contract Value: *₹${Number(proposal.quotationAmount).toLocaleString()}*\n\n` +
        `The project is launched, GitHub repo created, milestones published, and resources matched!`;

      for (const admin of admins) {
        if (admin.telegramId) {
          await sendNotification(admin.telegramId, notificationText);
        }
      }
    } catch (tgErr) {
      console.warn('⚠️ Could not notify admin via Telegram:', tgErr.message);
    }

    res.json({
      success: true,
      message: 'Proposal accepted and project launched successfully.',
      proposal,
      projectResult: launchedProjectData
    });
  } catch (err) {
    console.error('❌ Failed to accept shared proposal:', err);
    res.status(500).json({ success: false, message: 'Failed to accept shared proposal', error: err.message });
  }
};

// POST /api/nexa/proposals/shared/:id/chat (Public)
exports.chatSharedProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, chatHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    let proposal;
    let lead;
    let useFallbackDb = false;

    try {
      proposal = await prisma.proposal.findUnique({
        where: { id }
      });
      if (proposal) {
        lead = await prisma.lead.findUnique({
          where: { id: proposal.leadId }
        });
      } else {
        useFallbackDb = true;
      }
    } catch (e) {
      useFallbackDb = true;
    }

    if (useFallbackDb) {
      proposal = await fallbackDb.findById('proposals', id);
      if (proposal) {
        lead = await fallbackDb.findById('leads', proposal.leadId);
      }
    }

    if (!proposal || !lead) {
      return res.status(404).json({ success: false, message: 'Proposal or associated lead not found.' });
    }

    // Prime the system prompt for negotiation & questions
    const maxDiscount = Number(proposal.quotationAmount) * 0.10;
    const minPriceAllowed = Number(proposal.quotationAmount) - maxDiscount;

    const systemPrompt = `You are "NEXA Agentic AI", a specialized B2B Sales Representative for NexovTech. You are negotiating a contract proposal with a client representative from the company "${lead.companyName}".
Service Type: "${proposal.serviceType}".
Current proposed budget: ₹${Number(proposal.quotationAmount).toLocaleString()}.
Strict negotiation rules:
1. You can negotiate the budget down by up to 10% maximum if they ask for a discount or say it is too expensive.
2. The absolute minimum price you are authorized to agree to is ₹${minPriceAllowed.toLocaleString()}.
3. Highlight the extreme value of NexovTech's AI development, specialized staff matching, auto GitHub repo setup, and custom dashboard delivery.
4. If the client makes an objection (e.g. about timeline, scope, budget), resolve it persuasively and professionally.
5. If they ask for a discount and you agree to lower the price, you MUST output a confirmation tag at the end of your message in the exact format: "[CONFIRMED_BUDGET: ₹XXXXXX]" where XXXXXX is the agreed numeric amount (no commas, e.g. [CONFIRMED_BUDGET: ₹380000]). This tag will be intercepted by the server to update their billing records in real-time.
6. If they agree to the current price, or you agree on a price, encourage them to click the "Accept Proposal & Launch" button on the screen to kickoff the autonomous project setup.`;

    // Construct user prompt with chat history
    let userPrompt = `Chat History:\n`;
    chatHistory.forEach(msg => {
      userPrompt += `${msg.sender === 'client' ? 'Client' : 'NEXA'}: ${msg.text}\n`;
    });
    userPrompt += `Client: ${message}\nNEXA:`;

    const reply = await runQuery(systemPrompt, userPrompt);

    // Check if the AI responded with a budget confirmation
    const budgetMatch = reply.match(/\[CONFIRMED_BUDGET:\s*₹?(\d+)\]/);
    let newBudget = null;

    if (budgetMatch && budgetMatch[1]) {
      const budgetVal = Number(budgetMatch[1]);
      // Verify it respects the 10% constraint
      if (budgetVal >= minPriceAllowed && budgetVal < Number(proposal.quotationAmount)) {
        newBudget = budgetVal;
        // Update budget in database
        if (!useFallbackDb) {
          try {
            await prisma.proposal.update({
              where: { id },
              data: { quotationAmount: budgetVal }
            });
          } catch (err) {
            useFallbackDb = true;
          }
        }
        if (useFallbackDb) {
          await fallbackDb.update('proposals', id, { quotationAmount: budgetVal });
        }
        console.log(`🤖 [NEGO ENGINE] Budget updated autonomously to ₹${budgetVal.toLocaleString()} for proposal ${id}`);
      }
    }

    res.json({
      success: true,
      reply,
      newBudget
    });
  } catch (err) {
    console.error('❌ Failed to chat on shared proposal:', err);
    res.status(500).json({ success: false, message: 'Failed to negotiate proposal', error: err.message });
  }
};

exports.syncVectorProposals = async (req, res) => {
  try {
    const tenantId = req.tenantId || 'org_default';
    const proposals = await fallbackDb.find('proposals', { tenantId }) || [];

    // Find all already indexed documents for dealings_memory to prevent duplicates
    const indexedDocs = await fallbackDb.find('vector_memory', { collection: 'dealings_memory', tenantId }) || [];
    const indexedProposalIds = new Set(indexedDocs.map(d => d.metadata?.proposalId).filter(Boolean));

    let syncCount = 0;
    for (const proposal of proposals) {
      const propId = proposal.id || proposal._id;
      if (indexedProposalIds.has(propId)) continue;

      const lead = await fallbackDb.findById('leads', proposal.leadId);
      const clientName = lead ? lead.companyName : 'Unknown Client';

      await vectorStore.addDocument('dealings_memory', proposal.proposalText, {
        tenantId,
        proposalId: propId,
        client: clientName
      });
      syncCount++;
    }

    console.log(`✅ [RAG SEED]: Synced ${syncCount} historical proposals to dealings_memory.`);
    res.json({ success: true, synced: syncCount, total: proposals.length });
  } catch (err) {
    console.error('❌ Failed to sync vector proposals:', err);
    res.status(500).json({ success: false, message: 'Failed to sync proposals to vector store', error: err.message });
  }
};

exports.syncVectorOutreach = async (req, res) => {
  try {
    const tenantId = req.tenantId || 'org_default';
    const outreachLogs = await fallbackDb.find('outreach_logs', { tenantId }) || [];

    // Filter successful/delivered logs
    const validLogs = outreachLogs.filter(log => log.status === 'Sent' || log.status === 'Delivered' || log.status === 'Read');

    // Find already indexed documents for crm_memory to prevent duplicates
    const indexedDocs = await fallbackDb.find('vector_memory', { collection: 'crm_memory', tenantId }) || [];
    const indexedOutreachIds = new Set(indexedDocs.map(d => d.metadata?.outreachId).filter(Boolean));

    let syncCount = 0;
    for (const log of validLogs) {
      const logId = log.id || log._id;
      if (indexedOutreachIds.has(logId)) continue;

      const lead = await fallbackDb.findById('leads', log.leadId);
      if (!lead) continue;

      const direction = log.messageType === 'Incoming_Response' ? 'Received' : 'Sent';
      const textToEmbed = `[CRM Outreach - ${direction}] Channel: ${log.channel}\nLead/Client: ${lead.companyName}\nRecipient/Sender: ${log.recipient || 'NEXA Agent'}\nContent:\n${log.contentSent}`;

      await vectorStore.addDocument('crm_memory', textToEmbed, {
        tenantId,
        leadId: log.leadId,
        outreachId: logId,
        channel: log.channel,
        type: log.messageType === 'Incoming_Response' ? 'Incoming_Response' : 'Outreach_Sent'
      });
      syncCount++;
    }

    console.log(`✅ [RAG SEED]: Synced ${syncCount} historical outreach logs to crm_memory.`);
    res.json({ success: true, synced: syncCount, total: validLogs.length });
  } catch (err) {
    console.error('❌ Failed to sync vector outreach logs:', err);
    res.status(500).json({ success: false, message: 'Failed to sync outreach logs to vector store', error: err.message });
  }
};
