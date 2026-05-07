const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');

// Get My Timesheets
router.get('/', async (req, res) => {
  const { userId } = req.query;
  try {
    const entries = await fallbackDb.find('timesheets', { userId });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve temporal records' });
  }
});

// Submit Timesheet
router.post('/', async (req, res) => {
  try {
    const entry = { ...req.body, submittedAt: new Date(), status: 'Pending' };
    const saved = await fallbackDb.save('timesheets', entry);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Failed to record temporal entry' });
  }
});

module.exports = router;
