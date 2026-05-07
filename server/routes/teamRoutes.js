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

module.exports = router;
