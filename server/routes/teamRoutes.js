const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');

// Get All Team Members (Admin)
router.get('/', async (req, res) => {
  console.log('👥 TEAM_SYNC: Fetching organization roster...');
  try {
    const users = await fallbackDb.find('users', {});
    // Deduplicate by email
    const unique = (users || []).reduce((acc, curr) => {
      const email = curr.email?.toLowerCase();
      if (email && !acc.find(item => item.email?.toLowerCase() === email)) {
        acc.push({ ...curr, email });
      } else if (!email) {
        acc.push(curr);
      }
      return acc;
    }, []);
    console.log(`✅ TEAM_SYNC: ${unique.length} specialists synchronized from cloud.`);
    res.json(unique);
  } catch (err) {
    console.error('❌ TEAM_SYNC_FAILURE:', err.message);
    res.status(500).json({ message: 'Failed to retrieve team intelligence' });
  }
});

// Invite Member (Admin)
router.post('/invite', async (req, res) => {
  const { email, name, role } = req.body;
  const userData = {
    name,
    email: email.toLowerCase(),
    role,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name + Date.now()}`,
    performance: { tasksCompleted: 0, onTimeRate: 100, rating: 5 },
    createdAt: new Date()
  };

  try {
    const saved = await fallbackDb.save('users', userData);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Failed to dispatch invitation' });
  }
});

// Remove Member (Admin)
router.delete('/:id', async (req, res) => {
  try {
    await fallbackDb.deleteOne('users', req.params.id);
    res.json({ message: 'Specialist removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to revoke specialist access' });
  }
});

// Get Specialist Documents (Vault)
router.get('/:id/documents', async (req, res) => {
  try {
    const docs = await fallbackDb.find('documents', { userId: req.params.id });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to access document vault' });
  }
});

// Upload Document to Vault
router.post('/:id/documents', async (req, res) => {
  const { name, type, size } = req.body;
  const docData = {
    userId: req.params.id,
    name,
    type,
    size,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    createdAt: new Date()
  };

  try {
    const saved = await fallbackDb.save('documents', docData);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Document archiving failed' });
  }
});

// Remove Document
router.delete('/documents/:docId', async (req, res) => {
  try {
    await fallbackDb.deleteOne('documents', req.params.docId);
    res.json({ message: 'Document purged from vault' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to purge document' });
  }
});

module.exports = router;
