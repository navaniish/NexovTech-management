const tls = require('tls');
const fallbackDb = require('../utils/fallbackDb');
const prisma = require('../config/database');
const { sendEmail } = require('../utils/mailer');
const OpenAI = require('openai');

let aiClient;
try {
  if (process.env.AI_API_KEY && process.env.AI_API_KEY !== 'placeholder') {
    aiClient = new OpenAI({
      baseURL: process.env.AI_BASE_URL || "https://api.nexovtech.ai/v1",
      apiKey: process.env.AI_API_KEY
    });
  }
} catch (e) {
  console.warn('⚠️ [AUTO-REPLY] AI client initialization failed.');
}

/**
 * Parses out the clean email address from standard email headers (e.g. "Name <email@domain.com>" -> "email@domain.com")
 */
function extractEmail(fromHeader) {
  if (!fromHeader) return '';
  const match = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9._-]+)/);
  return match ? match[1].toLowerCase().trim() : fromHeader.toLowerCase().trim();
}

/**
 * Connects to Yahoo IMAP via raw TLS, polls for unseen messages, parses headers and bodies,
 * checks for matching leads, generates AI replies, sends them via Nodemailer SMTP, and marks
 * incoming messages as Seen.
 */
function pollIncomingEmails() {
  return new Promise((resolve, reject) => {
    const host = 'imap.mail.yahoo.com';
    const port = 993;
    const user = process.env.SMTP_USER || 'nexovtech@myyahoo.com';
    const pass = process.env.SMTP_PASS || 'pkbsrivgrabdqbqr';

    if (!user || !pass) {
      console.warn('⚠️ [AUTO-REPLY] Credentials not set in environment.');
      return resolve();
    }

    console.log(`📡 [AUTO-REPLY] Connecting to IMAP server ${host}:${port}...`);
    const socket = tls.connect(port, host, {}, () => {
      console.log('📡 [AUTO-REPLY] Connected to IMAP socket.');
    });

    socket.setEncoding('utf8');

    let cmdCount = 1;
    let currentStep = 'WELCOME';
    let unseenIds = [];
    let currentMailIndex = 0;
    let buffer = '';
    
    // Parsed info for the current message
    let currentMail = {
      id: null,
      from: '',
      subject: '',
      body: ''
    };

    function sendCmd(cmd) {
      const tag = `A${cmdCount++}`;
      socket.write(`${tag} ${cmd}\r\n`);
      return tag;
    }

    socket.on('data', (data) => {
      buffer += data;
      const lines = buffer.split('\r\n');
      
      // Determine if a full IMAP response block is received (ends with tagged completion OK/NO/BAD)
      const lastLine = lines[lines.length - 1];
      if (
        buffer.endsWith('\r\n') || 
        lastLine.includes(' OK ') || 
        lastLine.includes(' NO ') || 
        lastLine.includes(' BAD ')
      ) {
        buffer = '';
      } else {
        buffer = lines.pop();
      }

      for (const line of lines) {
        if (!line.trim()) continue;

        // Log search/fetch markers for debugging
        if (line.includes('* OK') || line.includes('OK completed') || line.startsWith('* SEARCH')) {
          console.log(`📥 [IMAP RAW]: ${line}`);
        }

        if (currentStep === 'WELCOME' && line.includes('* OK')) {
          currentStep = 'LOGIN';
          sendCmd(`LOGIN ${user} ${pass}`);
        } else if (currentStep === 'LOGIN' && line.includes('A1 OK')) {
          currentStep = 'SELECT';
          sendCmd('SELECT INBOX');
        } else if (currentStep === 'SELECT' && line.includes('A2 OK')) {
          currentStep = 'SEARCH';
          sendCmd('SEARCH UNSEEN');
        } else if (currentStep === 'SEARCH') {
          if (line.startsWith('* SEARCH')) {
            const parts = line.split(' ');
            unseenIds = parts.slice(2).filter(x => x.trim().length > 0).map(Number);
          } else if (line.includes('A3 OK')) {
            console.log(`📡 [AUTO-REPLY] Discovered ${unseenIds.length} unseen messages.`);
            if (unseenIds.length > 0) {
              currentStep = 'FETCH_HEADER';
              currentMailIndex = 0;
              currentMail.id = unseenIds[currentMailIndex];
              sendCmd(`FETCH ${currentMail.id} (BODY[HEADER.FIELDS (FROM SUBJECT)])`);
            } else {
              currentStep = 'LOGOUT';
              sendCmd('LOGOUT');
            }
          }
        } else if (currentStep === 'FETCH_HEADER') {
          // Parse Header Fields
          if (line.toLowerCase().startsWith('from:')) {
            currentMail.from = extractEmail(line.substring(5));
          } else if (line.toLowerCase().startsWith('subject:')) {
            currentMail.subject = line.substring(8).trim();
          }
          
          if (line.includes(`A${cmdCount - 1} OK`)) {
            console.log(`📡 [AUTO-REPLY] Parsing Msg #${currentMail.id} from: ${currentMail.from}`);
            currentStep = 'FETCH_BODY';
            sendCmd(`FETCH ${currentMail.id} (BODY[TEXT])`);
          }
        } else if (currentStep === 'FETCH_BODY') {
          // Append line to body if it is not IMAP fetch meta or tags
          if (!line.startsWith('*') && !line.includes(`A${cmdCount - 1} OK`)) {
            currentMail.body += line + '\n';
          }

          if (line.includes(`A${cmdCount - 1} OK`)) {
            // Process the parsed message
            currentStep = 'PROCESS_MAIL';
            processIncomingMail(currentMail)
              .then(() => {
                // Mark message as seen
                currentStep = 'MARK_SEEN';
                sendCmd(`STORE ${currentMail.id} +FLAGS (\\Seen)`);
              })
              .catch((err) => {
                console.error(`❌ [AUTO-REPLY] Error processing mail #${currentMail.id}:`, err.message);
                // Continue to mark seen even if failed to avoid infinite loop on bad data
                currentStep = 'MARK_SEEN';
                sendCmd(`STORE ${currentMail.id} +FLAGS (\\Seen)`);
              });
          }
        } else if (currentStep === 'MARK_SEEN') {
          if (line.includes(`A${cmdCount - 1} OK`)) {
            // Reset current mail state
            currentMail = { id: null, from: '', subject: '', body: '' };
            currentMailIndex++;
            if (currentMailIndex < unseenIds.length) {
              currentStep = 'FETCH_HEADER';
              currentMail.id = unseenIds[currentMailIndex];
              sendCmd(`FETCH ${currentMail.id} (BODY[HEADER.FIELDS (FROM SUBJECT)])`);
            } else {
              currentStep = 'LOGOUT';
              sendCmd('LOGOUT');
            }
          }
        } else if (currentStep === 'LOGOUT' && line.includes(`A${cmdCount - 1} OK`)) {
          socket.end();
          resolve();
        }
      }
    });

    socket.on('end', () => {
      console.log('📡 [AUTO-REPLY] Disconnected from IMAP server.');
      resolve();
    });

    socket.on('error', (err) => {
      console.error('❌ [AUTO-REPLY] IMAP Socket failure:', err.message);
      reject(err);
    });
  });
}

async function processIncomingMail(mail) {
  const cleanFrom = (mail.from || '').toLowerCase().trim();

  // 1. Skip if it is sent by ourselves to prevent infinite mail loops
  if (cleanFrom === 'nexovtech@myyahoo.com') {
    console.log(`ℹ️ [AUTO-REPLY] Sender is ourselves (${cleanFrom}). Skipping auto-reply to prevent infinite loops.`);
    return;
  }

  // 2. Check if sender is an employee or registered user
  let isEmployeeOrUser = false;
  let employeeDetails = null;
  try {
    const emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { email: { mode: 'insensitive', equals: cleanFrom } },
          { companyEmail: { mode: 'insensitive', equals: cleanFrom } }
        ]
      }
    });
    const usr = await prisma.user.findFirst({
      where: { email: { mode: 'insensitive', equals: cleanFrom } }
    });
    if (emp || usr) {
      isEmployeeOrUser = true;
      employeeDetails = emp || usr;
    }
  } catch (dbErr) {
    // Fallback DB check
    const employees = await fallbackDb.find('employees', {}) || [];
    const users = await fallbackDb.find('users', {}) || [];
    const emp = employees.find(e => e.email?.toLowerCase() === cleanFrom || e.companyEmail?.toLowerCase() === cleanFrom);
    const usr = users.find(u => u.email?.toLowerCase() === cleanFrom);
    if (emp || usr) {
      isEmployeeOrUser = true;
      employeeDetails = emp || usr;
    }
  }

  // 3. Query database/fallbackDb for lead OR construct mock lead if employee/user
  let lead = null;
  if (isEmployeeOrUser) {
    lead = {
      companyName: 'NexovTech Corp',
      industry: 'Technology & AI',
      contactName: employeeDetails?.name || 'Employee'
    };
  } else {
    try {
      lead = await prisma.lead.findFirst({
        where: {
          OR: [
            { emails: { has: cleanFrom } },
            { contactName: { mode: 'insensitive', equals: cleanFrom } }
          ]
        }
      });
    } catch (dbErr) {
      // Fallback DB
      const leads = await fallbackDb.find('leads', {});
      lead = leads.find(l => {
        const emailMatch = l.emails?.some(e => e.toLowerCase() === cleanFrom) || 
                           l.contactInfo?.emails?.some(e => e.toLowerCase() === cleanFrom);
        return emailMatch;
      });
    }
  }

  if (!lead) {
    console.log(`ℹ️ [AUTO-REPLY] Incoming email from ${cleanFrom} does not match any registered B2B lead. Skipping auto-reply.`);
    return;
  }

  const subjectType = isEmployeeOrUser ? 'Employee' : 'Lead';
  console.log(`🎯 [AUTO-REPLY] Match found! ${subjectType}: "${lead.companyName}" (${cleanFrom}). Drafting AI Auto-Reply...`);

  // Generate reply subject
  const replySubject = mail.subject.toLowerCase().startsWith('re:') ? mail.subject : `Re: ${mail.subject}`;

  // 4. Verify contract/proposal approval if there is an active pending deal
  let pendingDeal = null;
  let clientApproved = false;
  let aiEvaluationLog = '';

  if (lead && !isEmployeeOrUser) {
    try {
      const leadIdClean = lead.id || lead._id;
      const deals = await fallbackDb.find('pending_deals', { leadId: leadIdClean, status: 'Pending' }) || [];
      pendingDeal = deals[0];
    } catch (err) {
      console.warn('⚠️ Failed to load pending deals for incoming mail:', err.message);
    }
  }

  if (pendingDeal && aiClient) {
    try {
      console.log(`🤖 [DEAL GATEKEEPER]: Active pending deal found for ${lead.companyName}. Evaluating incoming mail body for contract approval...`);
      const evaluationSystemPrompt = `You are the NEXA Strategic Deal Gatekeeper AI. 
Analyze the client's incoming email response to determine if they are giving explicit permission, approval, or agreement to proceed with the proposed project/work, sign the contract, or accept the budget.
Respond ONLY in this strict JSON format:
{
  "approved": true | false,
  "reasoning": "<short sentence explaining why>"
}`;

      const evaluationUserPrompt = `
Proposed Service: ${pendingDeal.serviceType}
Proposed Quotation: ₹${Number(pendingDeal.quotationAmount).toLocaleString()}
Client Incoming Email:
"${mail.body.substring(0, 1500)}"
`;

      const evalCompletion = await aiClient.chat.completions.create({
        model: process.env.AI_MODEL || "meta/llama-3.1-8b-instruct",
        messages: [
          { role: "system", content: evaluationSystemPrompt },
          { role: "user", content: evaluationUserPrompt }
        ],
        temperature: 0.1,
        max_tokens: 256
      });

      const evalText = evalCompletion.choices[0].message?.content?.trim() || '';
      const parsedEval = JSON.parse(evalText.trim().substring(evalText.indexOf('{'), evalText.lastIndexOf('}') + 1));
      clientApproved = parsedEval.approved === true;
      aiEvaluationLog = parsedEval.reasoning || '';
      console.log(`🤖 [DEAL GATEKEEPER]: Client Approval classification: ${clientApproved}. Reason: ${aiEvaluationLog}`);
    } catch (evalErr) {
      console.error('⚠️ [DEAL GATEKEEPER ERROR] AI deal evaluation failed:', evalErr.message);
    }
  }

  // Draft contextual auto-reply message using the AI model
  let replyContent = '';

  if (clientApproved && pendingDeal) {
    try {
      console.log(`🤖 [DEAL GATEKEEPER]: Approval verified! Triggering autonomous project launch for [${lead.companyName}]...`);
      
      // Update pending deal status
      pendingDeal.status = 'Approved';
      await fallbackDb.save('pending_deals', pendingDeal);

      // Create proposal as Accepted
      const proposal = await fallbackDb.save('proposals', {
        leadId: pendingDeal.leadId,
        serviceType: pendingDeal.serviceType || 'AISolutions',
        proposalText: pendingDeal.proposalText,
        quotationAmount: Number(pendingDeal.quotationAmount),
        status: 'Accepted',
        tenantId: 'org_default'
      });

      // Update lead status to Converted
      await fallbackDb.update('leads', pendingDeal.leadId, { status: 'Converted' });

      // Run autoLaunchProject
      const nexaAutomationController = require('../controllers/nexaAutomationController');
      const mockReq = {
        body: { leadId: pendingDeal.leadId, proposalId: proposal.id || proposal._id }
      };
      let launchedProjectData = null;
      const mockRes = {
        status: (code) => ({ json: (data) => { launchedProjectData = data; } }),
        json: (data) => { launchedProjectData = data; }
      };
      await nexaAutomationController.autoLaunchProject(mockReq, mockRes);

      // Notify via Telegram
      try {
        const { sendNotification } = require('../bot/telegramBot');
        const linkedUsers = await fallbackDb.find('telegram_users', {}) || [];
        const admins = linkedUsers.filter(u => u.role === 'Admin' || u.role === 'Super Admin' || u.role === 'Manager');

        const notificationText = `🤝 *B2B Deal Converted via Email Verification!* 📩\n\n` +
          `Client *${lead.companyName}* approved the proposal via email!\n` +
          `Score: *${pendingDeal.opportunityScore}%* | Value: *₹${Number(pendingDeal.quotationAmount).toLocaleString()}*\n\n` +
          `NEXA has autonomously verified their confirmation, approved the deal, launched the project, generated the invoice, and allocated specialists!`;

        for (const admin of admins) {
          if (admin.telegramId) {
            await sendNotification(admin.telegramId, notificationText);
          }
        }
      } catch (tgErr) {
        console.warn('⚠️ Could not notify admin via Telegram:', tgErr.message);
      }

      // Draft positive confirmation email reply
      replyContent = `Dear ${lead.contactName || 'Client Partner'},\n\nThank you for your confirmation! We have successfully verified your approval to proceed.\n\nOur autonomous system has launched the project, generated your initial setup invoice, and allocated our top engineering specialists to start development immediately.\n\nYou can track the live progress via your portal. An authorized representative will also get in touch shortly.\n\nBest regards,\nNEXA Autonomous Operations\nNexovTech Corp.`;
    } catch (launchErr) {
      console.error('❌ [DEAL GATEKEEPER] Failed to autonomously launch project on email approval:', launchErr.message);
    }
  }

  if (!replyContent && aiClient) {
    try {
      let systemPrompt = '';
      let userPrompt = '';

      if (isEmployeeOrUser) {
        systemPrompt = `You are NEXA, the Agentic AI Administrator representing NexovTech Corp.
Your task is to draft a helpful, professional, and supportive auto-reply to an incoming email from a NexovTech employee/team member.
Operational Protocol:
1. Speak in a helpful, collaborative, and professional internal corporate tone.
2. Address their query or email content directly, providing assistance or confirming receipt as the administrative AI.
3. Do NOT include subject lines, markdown code blocks, HTML tags, or placeholder brackets. Output ONLY the raw text body.`;

        userPrompt = `
Employee Name: ${lead.contactName}
Employee Role: ${employeeDetails?.role || 'Team Member'}
Employee Department: ${employeeDetails?.department || 'Operations'}
Incoming Email Content:
"${mail.body.substring(0, 1000)}"
`;
      } else {
        systemPrompt = `You are NEXA, the Agentic AI Administrator representing NexovTech Corp.
Your task is to draft a helpful, professional, and strategic auto-reply to an incoming email from a B2B sales lead.
Operational Protocol:
1. Speak in a highly professional, executive, and consultative corporate tone.
2. Address their specific email content. Be helpful, clear, and request next steps (like scheduling a brief kickoff or follow-up call).
3. Do NOT include subject lines, markdown code blocks, HTML tags, or placeholder brackets. Output ONLY the raw text body.`;

        userPrompt = `
Lead Company: ${lead.companyName}
Lead Industry: ${lead.industry}
Lead Contact: ${lead.contactName || 'Representative'}
Incoming Email Content:
"${mail.body.substring(0, 1000)}"
`;
      }

      const completion = await aiClient.chat.completions.create({
        model: process.env.AI_MODEL || "meta/llama-3.1-8b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1024
      });

      replyContent = completion.choices[0].message?.content?.trim() || '';
    } catch (aiErr) {
      console.error('❌ [AUTO-REPLY] AI generation failed:', aiErr.message);
    }
  }

  // Fallback draft in case AI fails
  if (!replyContent) {
    if (isEmployeeOrUser) {
      replyContent = `Dear ${lead.contactName || 'Team Member'},\n\nThank you for contacting NexovTech Administration. We have received your email regarding "${mail.subject}" and are reviewing your request.\n\nOur operations team will follow up with you shortly.\n\nBest regards,\nNEXA Agentic Admin\nNexovTech Corp.`;
    } else {
      replyContent = `Dear ${lead.contactName || 'Team'},\n\nThank you for reaching out to NexovTech. We have received your email regarding "${mail.subject}" and are reviewing your request.\n\nOur client coordinator will follow up shortly to schedule a kickoff call.\n\nBest regards,\nNEXA Agentic Admin\nNexovTech Corp.`;
    }
  }

  console.log(`✉️ [AUTO-REPLY] Sending live Nodemailer SMTP reply to: ${cleanFrom}`);
  const replySent = await sendEmail(cleanFrom, replySubject, replyContent);
  console.log(`✉️ [AUTO-REPLY] Reply SMTP status: ${replySent ? 'SUCCESS' : 'FAILED'}`);

  // Save both the incoming email and our reply to the virtual mails history log
  const incomingMailRecord = {
    id: `in_${Date.now()}`,
    from: cleanFrom,
    to: 'nexovtech@myyahoo.com',
    subject: mail.subject,
    content: mail.body.trim(),
    timestamp: new Date(),
    status: 'Unread',
    priority: 'Normal'
  };
  await fallbackDb.save('mails', incomingMailRecord);

  const replyMailRecord = {
    id: `rep_${Date.now()}`,
    from: 'nexovtech@myyahoo.com',
    to: cleanFrom,
    subject: replySubject,
    content: replyContent,
    timestamp: new Date(),
    status: replySent ? 'Sent' : 'Failed',
    priority: 'Normal'
  };
  await fallbackDb.save('mails', replyMailRecord);

  // Save audit log
  const auditDetails = isEmployeeOrUser
    ? `AI Auto-reply successfully sent to employee ${cleanFrom} (${lead.contactName}) in response to: "${mail.subject}" (SMTP: ${replySent})`
    : `AI Auto-reply successfully sent to lead ${cleanFrom} (${lead.companyName}) in response to: "${mail.subject}" (SMTP: ${replySent})`;

  await fallbackDb.save('audit_logs', {
    type: 'MAIL_AUTO_REPLY',
    user: 'nexovtech@myyahoo.com',
    details: auditDetails,
    timestamp: new Date(),
    priority: 'Normal'
  });
}

module.exports = {
  pollIncomingEmails,
  processIncomingMail
};
