const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');

// Get Recruitment Summary (Dashboard)
router.get('/summary', async (req, res) => {
  try {
    const candidates = await fallbackDb.find('recruitment', {});
    
    const stats = {
      activeVacancies: 3,
      totalApplicants: candidates.length,
      interviews: candidates.filter(c => c.status === 'Interview').length,
      hiringVelocity: '12 Days'
    };

    res.json({ candidates: candidates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), stats });
  } catch (err) {
    res.status(500).json({ message: 'Recruitment intelligence unavailable' });
  }
});

// Add Candidate
router.post('/candidates', async (req, res) => {
  const { name, role, status, score } = req.body;
  const candidate = {
    id: `can_${Date.now()}`,
    name,
    role,
    status: status || 'Applied',
    score: score || 0,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
    createdAt: new Date().toISOString()
  };

  try {
    const saved = await fallbackDb.save('recruitment', candidate);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Candidate registration failed' });
  }
});

// Update Candidate Status
router.put('/candidates/:id', async (req, res) => {
  try {
    const all = await fallbackDb.find('recruitment', {});
    const candidate = all.find(c => (c._id || c.id) === req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const updated = { ...candidate, ...req.body };
    await fallbackDb.save('recruitment', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Candidate update failed' });
  }
});

module.exports = router;
