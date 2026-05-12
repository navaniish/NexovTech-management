const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');

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
    const mailData = {
      ...req.body,
      id: Date.now().toString(),
      timestamp: new Date(),
      status: 'Unread',
      priority: req.body.priority || 'Normal'
    };
    const saved = await fallbackDb.save('mails', mailData);
    
    // Create Audit Log Entry
    await fallbackDb.save('audit_logs', {
      type: 'MAIL_DISPATCH',
      user: req.body.from,
      details: `Dispatched internal mail: ${req.body.subject} to ${req.body.to}`,
      timestamp: new Date(),
      priority: req.body.priority || 'Normal'
    });

    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Mail delivery failed' });
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
