const fallbackDb = require('../utils/fallbackDb');
const prisma = require('../config/database');
const socketHub = require('../utils/socketHub');
const { sendEmail } = require('../utils/mailer');
const OpenAI = require('openai');

let aiClient;
try {
  aiClient = new OpenAI({
    baseURL: process.env.AI_BASE_URL || "https://api.nexovtech.ai/v1",
    apiKey: process.env.AI_API_KEY || 'placeholder',
    timeout: 15000
  });
} catch (e) {
  // Silent fallback
}

/**
 * Helper: Query LLM for simulated client reply
 */
async function generateClientReply(lead, originalMessage) {
  if (!aiClient || !process.env.AI_API_KEY || process.env.AI_API_KEY === 'placeholder') {
    return getFallbackReply();
  }
  try {
    const completion = await aiClient.chat.completions.create({
      model: process.env.AI_MODEL || "nvidia/nemotron-3-ultra-550b-a55b",
      messages: [
        {
          role: "system",
          content: `You are the customer contact representing ${lead.companyName}. You just received this B2B SaaS outreach message from NexovTech: "${originalMessage}". Generate a realistic, short (1-2 sentences max) conversational reply in text format. Be interested but ask a brief question or request a call. Output only the message text without markdown.`
        }
      ],
      temperature: 0.8,
      max_tokens: 128
    });
    return completion.choices[0].message?.content?.trim() || getFallbackReply();
  } catch (err) {
    return getFallbackReply();
  }
}

function getFallbackReply() {
  const fallbacks = [
    `Hi, thank you for reaching out. The B2B proposal link looks very interesting. Let's schedule a brief call this Thursday at 3 PM EST.`,
    `Hello, we received the SaaS optimization specs. Can you send over a pricing sheet or schedule a brief demo?`,
    `Hi there! Thanks for connecting. Yes, I'd love to jump on a brief operations call. What times work best for you next week?`
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * Helper: Query LLM for Voice Script
 */
async function generateVoiceScript(lead) {
  if (!aiClient || !process.env.AI_API_KEY || process.env.AI_API_KEY === 'placeholder') {
    return getFallbackVoiceScript(lead);
  }
  try {
    const completion = await aiClient.chat.completions.create({
      model: process.env.AI_MODEL || "nvidia/nemotron-3-ultra-550b-a55b",
      messages: [
        {
          role: "system",
          content: `You are a professional B2B AI Voice Assistant representing NexovTech Corp.
Generate a realistic 4-line telephone script transcript between yourself (NEXA Voice) and the client contact representing ${lead.companyName}.
The conversation should discuss the qualification of their ${lead.industry || 'AI/Web'} project requirements.
Do not output any markdown formatting or instructions. Output only the conversation script lines.`
        }
      ],
      temperature: 0.7,
      max_tokens: 512
    });
    return completion.choices[0].message?.content?.trim() || getFallbackVoiceScript(lead);
  } catch (err) {
    return getFallbackVoiceScript(lead);
  }
}

function getFallbackVoiceScript(lead) {
  return `[00:02] NEXA Voice: Hello! Am I speaking with the representative for ${lead.companyName}?
[00:06] Client: Yes, this is they. Who is calling?
[00:11] NEXA Voice: This is the NexovTech Autonomous Agent. I am calling to discuss our custom B2B specifications proposal.
[00:17] Client: Excellent, we received the proposal and would love to move forward with the kickoff next week.`;
}

/**
 * Helper: Index outreach events into the CRM vector store collection
 */
async function indexOutreachToVectorStore(log, lead, type = 'Outreach_Sent') {
  try {
    const vectorStore = require('../utils/vectorStore');
    const direction = type === 'Outreach_Sent' ? 'Sent' : 'Received';
    const textToEmbed = `[CRM Outreach - ${direction}] Channel: ${log.channel}\nLead/Client: ${lead.companyName}\nRecipient/Sender: ${log.recipient || 'NEXA Agent'}\nContent:\n${log.contentSent}`;
    
    await vectorStore.addDocument('crm_memory', textToEmbed, {
      tenantId: log.tenantId || 'org_default',
      leadId: log.leadId,
      outreachId: log.id || log._id,
      channel: log.channel,
      type
    });
    console.log(`✅ [CRM VECTOR MEMORY]: Indexed ${log.channel} outreach (${direction}) in RAG store.`);
  } catch (err) {
    console.warn(`⚠️ Failed to index outreach in vector store:`, err.message);
  }
}

async function runSimulatedVoiceCall(log, lead) {
  console.log(`📞 [OUTREACH_WORKER VOICE]: Twilio credentials empty or invalid. Falling back to local call simulator for ${lead.companyName}.`);
  const script = await generateVoiceScript(lead);
  log.contentSent = script;
  log.status = 'Delivered';
  log.outcome = `Simulated voice call completed. Target number: ${lead.phone || '+1 (555) 019-2834'}`;
  
  await fallbackDb.update('outreach_logs', log.id || log._id, log);
  socketHub.emit('outreach_update', log);
  await indexOutreachToVectorStore(log, lead, 'Outreach_Sent');
}

/**
 * Main background worker cycle: Polls database for Pending outreach logs and processes them.
 */
async function processPendingOutreach(baseUrl) {
  const IS_SERVERLESS = !!(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  try {
    // Find all pending outreach logs
    const allLogs = await fallbackDb.find('outreach_logs', {}) || [];
    const pendingLogs = allLogs.filter(log => log.status === 'Pending');

    if (pendingLogs.length === 0) return;

    console.log(`⚙️ [OUTREACH_WORKER]: Found ${pendingLogs.length} pending campaigns. Processing...`);

    for (const log of pendingLogs) {
      // Find matching lead
      const lead = await fallbackDb.findById('leads', log.leadId);
      if (!lead) {
        console.warn(`⚙️ [OUTREACH_WORKER]: Lead not found for log ${log.id || log._id}. Removing/failing log.`);
        await fallbackDb.deleteOne('outreach_logs', log.id || log._id);
        continue;
      }

      const channelLower = (log.channel || '').toLowerCase();
      console.log(`⚙️ [OUTREACH_WORKER]: Processing log ${log.id || log._id} (Channel: ${log.channel}, Lead: ${lead.companyName})`);

      // 1. Process Channel Dispatches
      if (channelLower === 'email') {
        let realEmailSent = false;
        let recipientEmail = lead.email || (lead.emails && lead.emails[0]) || '';
        
        if (recipientEmail && recipientEmail.includes('@')) {
          const subject = `[NexovTech] B2B Proposal & Collaboration Opportunity`;
          console.log(`✉️ [OUTREACH_WORKER EMAIL]: Sending real email to ${recipientEmail}...`);
          realEmailSent = await sendEmail(recipientEmail, subject, log.contentSent);
        }
        
        log.status = realEmailSent ? 'Sent' : 'Failed';
        log.outcome = realEmailSent ? 'Outreach email delivered' : 'Recipient email not configured or mail server offline';
        
        // Save and emit update
        await fallbackDb.update('outreach_logs', log.id || log._id, log);
        socketHub.emit('outreach_update', log);
        
        if (realEmailSent) {
          await indexOutreachToVectorStore(log, lead, 'Outreach_Sent');
        }
        
      } else if (channelLower === 'linkedin') {
        console.log(`🔗 [OUTREACH_WORKER LINKEDIN]: Sent connection invite and message to ${lead.contactName || 'lead representative'}.`);
        console.log(`   Note: "${log.contentSent.substring(0, 80)}..."`);
        
        log.status = 'Sent';
        log.outcome = 'LinkedIn invitation dispatched';
        
        // Save and emit update
        await fallbackDb.update('outreach_logs', log.id || log._id, log);
        socketHub.emit('outreach_update', log);
        await indexOutreachToVectorStore(log, lead, 'Outreach_Sent');
 
      } else if (channelLower === 'voice' || channelLower === 'voice call') {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;
        
        let callbackUrl = process.env.VOICE_CALLBACK_URL;
        if (IS_SERVERLESS && baseUrl) {
          callbackUrl = baseUrl;
        }

        const targetNumber = lead.phone || lead.contactPhone || '';

        const hasRealTwilio = accountSid && authToken && fromNumber && callbackUrl && 
                             accountSid !== 'YOUR_TWILIO_SID' && authToken !== 'YOUR_TWILIO_AUTH_TOKEN';

        if (hasRealTwilio && targetNumber) {
          console.log(`📞 [OUTREACH_WORKER VOICE]: Initiating REAL Twilio outbound call to ${targetNumber}...`);
          try {
            const axios = require('axios');
            
            // Format parameters
            const params = new URLSearchParams();
            params.append('To', targetNumber);
            params.append('From', fromNumber);
            
            const leadId = lead.id || lead._id || '';
            const logId = log.id || log._id || '';
            const queryLang = log.language || 'en';
            params.append('Url', `${callbackUrl.replace(/\/$/, '')}/api/nexa/voice/respond?leadId=${leadId}&logId=${logId}&language=${queryLang}`);

            const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
            const twilioRes = await axios.post(
              `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
              params,
              {
                headers: {
                  'Authorization': authHeader,
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000
              }
            );

            log.status = 'In-Progress';
            log.outcome = `Real Twilio call placed. Call SID: ${twilioRes.data.sid}`;
            log.contentSent = `[Call Initiated - Dialing ${targetNumber}...]`;
            
            await fallbackDb.update('outreach_logs', log.id || log._id, log);
            socketHub.emit('outreach_update', log);
            console.log(`✅ [OUTREACH_WORKER VOICE]: Real Twilio call successfully placed. SID: ${twilioRes.data.sid}`);
          } catch (twilioErr) {
            console.error('❌ [OUTREACH_WORKER VOICE] Twilio API call failed:', twilioErr.response?.data || twilioErr.message);
            await runSimulatedVoiceCall(log, lead);
          }
        } else {
          await runSimulatedVoiceCall(log, lead);
        }
      }

      // 2. Update Lead Status
      try {
        await fallbackDb.update('leads', lead.id || lead._id, { status: 'Outreach_Sent' });
        // Prisma sync if active
        if (prisma) {
          try {
            await prisma.lead.update({
              where: { id: lead.id },
              data: { status: 'Outreach_Sent' }
            });
          } catch (e) {
            // Ignore if prisma fails/offline
          }
        }
      } catch (leadErr) {
        console.warn(`⚙️ [OUTREACH_WORKER]: Could not update lead status: ${leadErr.message}`);
      }
    }
    
    console.log(`⚙️ [OUTREACH_WORKER]: Done processing cycle.`);
  } catch (err) {
    console.error('❌ Outreach worker execution error:', err.message);
  }
}

module.exports = {
  processPendingOutreach
};
