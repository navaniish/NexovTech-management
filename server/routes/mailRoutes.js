const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');
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
  console.warn('⚠️ AI client initialization failed in mailRoutes.js.');
}

// GET Inbox for current user
router.get('/inbox/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const mails = await fallbackDb.find('mails', {});
    const inbox = mails.filter(m => m.to?.toLowerCase() === email.toLowerCase() || m.bcc?.includes(email.toLowerCase()));
    res.json(inbox.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  } catch (err) {
    res.status(500).json({ message: 'Mail server disruption' });
  }
});

// GET Sent Mails
router.get('/sent/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const mails = await fallbackDb.find('mails', {});
    const sent = mails.filter(m => m.from?.toLowerCase() === email.toLowerCase());
    res.json(sent.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  } catch (err) {
    res.status(500).json({ message: 'Mail server disruption' });
  }
});

// GET All Mail (Sent or Received)
router.get('/sent-or-received/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const emailLower = email.toLowerCase();
    
    // Fetch user to find alternative identities
    const user = await fallbackDb.findOne('users', { email: emailLower });
    const altEmail = user?.companyEmail?.toLowerCase();
    
    const mails = await fallbackDb.find('mails', {});
    const activity = mails.filter(m => {
      const from = m.from?.toLowerCase();
      const to = m.to?.toLowerCase();
      const bcc = m.bcc?.map(b => b.toLowerCase()) || [];
      
      return from === emailLower || to === emailLower || bcc.includes(emailLower) ||
             (altEmail && (from === altEmail || to === altEmail || bcc.includes(altEmail)));
    });
    
    res.json(activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  } catch (err) {
    res.status(500).json({ message: 'Mail server disruption' });
  }
});

// GET Drafts
router.get('/drafts/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const mails = await fallbackDb.find('mails', {});
    const drafts = mails.filter(m => m.from?.toLowerCase() === email.toLowerCase() && m.status === 'Draft');
    res.json(drafts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  } catch (err) {
    res.status(500).json({ message: 'Mail server disruption' });
  }
});

// POST Save Draft
router.post('/draft', async (req, res) => {
  try {
    const mailData = {
      ...req.body,
      id: Date.now().toString(),
      timestamp: new Date(),
      status: 'Draft'
    };
    const saved = await fallbackDb.save('mails', mailData);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Draft save failed' });
  }
});

// POST Send Mail
router.post('/send', async (req, res) => {
  try {
    let emailContent = req.body.content || '';
    let emailSubject = req.body.subject || '';

    // 1. Optional AI Drafting Integration
    if (req.body.useAI && req.body.prompt && aiClient) {
      console.log(`🤖 AI_WRITER: Generating mail content for prompt: "${req.body.prompt}"`);
      try {
        const systemPrompt = `You are NEXA, the Agentic AI Administrator representing NexovTech Corp.
Your task is to write a clean, professional email body based on the user's prompt.
Operational Protocol:
1. Speak in a professional, executive, and analytical corporate tone.
2. Keep the email body concise and actionable.
3. Output ONLY the raw text body of the email. Do NOT include subject lines, markdown code blocks, HTML tags, or placeholder brackets.`;

        const completion = await aiClient.chat.completions.create({
          model: process.env.AI_MODEL || "nvidia/nemotron-3-ultra-550b-a55b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: req.body.prompt }
          ],
          temperature: 0.7,
          max_tokens: 1024
        });
        
        const aiGeneratedContent = completion.choices[0].message?.content;
        if (aiGeneratedContent) {
          emailContent = aiGeneratedContent.trim();
        }
      } catch (aiErr) {
        console.error('⚠️ AI drafting failed, using original content:', aiErr.message);
      }
    }

    // 2. Dispatch REAL SMTP Nodemailer email
    console.log(`✉️ Dispatched Real Mail to: ${req.body.to}`);
    const realEmailSent = await sendEmail(
      req.body.to,
      emailSubject,
      emailContent
    );

    // 3. Save mail record to internal inbox/outbox history log
    const mailData = {
      ...req.body,
      content: emailContent,
      id: Date.now().toString(),
      timestamp: new Date(),
      status: realEmailSent ? 'Unread' : 'Failed', // if real mail succeeds, show Unread in recipient's virtual inbox
      priority: req.body.priority || 'Normal'
    };
    const saved = await fallbackDb.save('mails', mailData);
    
    // Create Audit Log Entry
    await fallbackDb.save('audit_logs', {
      type: 'MAIL_DISPATCH',
      user: req.body.from,
      details: `Dispatched real/internal mail: ${emailSubject} to ${req.body.to} (SMTP Dispatched: ${realEmailSent})`,
      timestamp: new Date(),
      priority: req.body.priority || 'Normal'
    });

    res.json({
      ...saved,
      emailDispatched: realEmailSent
    });
  } catch (err) {
    console.error('❌ Mail dispatch endpoint failure:', err.message);
    res.status(500).json({ message: 'Mail delivery failed', error: err.message });
  }
});

// GET Unread Count
router.get('/unread-count/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const emailLower = email.toLowerCase();
    
    const user = await fallbackDb.findOne('users', { email: emailLower });
    const altEmail = user?.companyEmail?.toLowerCase();
    
    const mails = await fallbackDb.find('mails', {});
    const unread = mails.filter(m => {
      const to = m.to?.toLowerCase();
      return (to === emailLower || (altEmail && to === altEmail)) && m.status === 'Unread';
    });
    
    res.json({ count: unread.length });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

module.exports = router;
