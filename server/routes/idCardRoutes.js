const express = require('express');
const router = express.Router();
const EmployeeCard = require('../models/EmployeeCard');
const User = require('../models/User');
const fallbackDb = require('../utils/fallbackDb');
const crypto = require('crypto');

// POST /idcard/generate — Create/Regenerate ID card
router.post('/generate', async (req, res) => {
  const { userId, expiryDate } = req.body;

  try {
    const user = await fallbackDb.findById('users', userId);
    if (!user) return res.status(404).json({ message: 'Employee not found' });

    const employeeId = user.id?.slice(-8).toUpperCase() || user._id?.toString().slice(-8).toUpperCase();
    const qrToken = crypto.randomBytes(16).toString('hex');

    const cardData = {
      userId,
      employeeId: `NXG-${employeeId}`,
      qrToken,
      issueDate: new Date().toISOString(),
      expiryDate: expiryDate || new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString(),
      status: 'Active'
    };

    // Save to Firestore/Local via fallbackDb
    // Note: fallbackDb uses 'id' for doc ID. We'll use userId or generate one.
    const savedCard = await fallbackDb.save('idcards', cardData);
    
    res.json({ message: 'ID Card generated successfully', card: savedCard });
  } catch (err) {
    console.error('ID_GEN_FAIL:', err);
    res.status(500).json({ message: 'Failed to generate ID Card' });
  }
});

// GET /idcard/:userId — Fetch user's card
router.get('/:userId', async (req, res) => {
  try {
    const cards = await fallbackDb.find('idcards', {});
    const userCard = cards.find(c => c.userId === req.params.userId);
    
    if (!userCard) return res.status(404).json({ message: 'No ID card found for this employee' });
    
    res.json(userCard);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve card' });
  }
});

// GET /idcard/all — Admin: List all cards
router.get('/list/all', async (req, res) => {
  try {
    const cards = await fallbackDb.find('idcards', {});
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve inventory' });
  }
});

// PUT /idcard/update/:cardId — Update status
router.put('/update/:cardId', async (req, res) => {
  const { status } = req.body;
  try {
    const updated = await fallbackDb.update('idcards', req.params.cardId, { status });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update card status' });
  }
});

// PUT /idcard/update-details/:cardId — Update card dates
router.put('/update-details/:cardId', async (req, res) => {
  const { issueDate, expiryDate } = req.body;
  const updates = {};
  if (issueDate !== undefined) updates.issueDate = issueDate;
  if (expiryDate !== undefined) updates.expiryDate = expiryDate;

  try {
    const updated = await fallbackDb.update('idcards', req.params.cardId, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update card details' });
  }
});

// GET /verify/:qrToken — Public verification
router.get('/verify/:qrToken', async (req, res) => {
  try {
    const cards = await fallbackDb.find('idcards', {});
    const card = cards.find(c => c.qrToken === req.params.qrToken);
    
    if (!card) return res.status(404).json({ message: 'Invalid or expired ID card' });
    
    const user = await fallbackDb.findById('users', card.userId);
    if (!user) return res.status(404).json({ message: 'Employee profile not found' });

    res.json({
      name: user.name,
      role: user.role,
      employeeId: card.employeeId,
      status: card.status,
      avatar: user.avatar,
      company: 'NexovTech Management',
      issueDate: card.issueDate,
      expiryDate: card.expiryDate
    });
  } catch (err) {
    res.status(500).json({ message: 'Verification gateway timeout' });
  }
});

module.exports = router;
