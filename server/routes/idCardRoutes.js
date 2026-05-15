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
    // 1. Find user with flexibility (Try ID, Firebase UID, then Email)
    console.log(`🪪 ID_GEN: Request for userId=[${userId}]`);
    const user = (await fallbackDb.findById('users', userId)) || 
                 (await fallbackDb.findOne('users', { firebaseUid: userId })) ||
                 (await fallbackDb.findOne('users', { email: userId }));

    if (!user) {
      console.warn(`❌ ID_GEN: User [${userId}] not found in registry`);
      return res.status(404).json({ message: 'Employee profile not recognized in registry' });
    }

    const employeeId = (user.id || user._id || user.email).toString().slice(-8).toUpperCase();
    const qrToken = crypto.randomBytes(16).toString('hex');

    // Canonical User ID from database (Prefer Firebase UID for absolute cross-portal sync)
    const canonicalUserId = user.firebaseUid || user.id || user._id;
    console.log(`✅ ID_GEN: Resolved user=[${user.email}] canonicalId=[${canonicalUserId}]`);

    const cardData = {
      userId: canonicalUserId,
      email: user.email, // Store email explicitly for lookup
      employeeId: `NXG-${employeeId}`,
      qrToken,
      issueDate: new Date().toISOString(),
      expiryDate: expiryDate || new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString(),
      status: 'Active'
    };

    // Save to Firestore/Local via fallbackDb
    const savedCard = await fallbackDb.save('idcards', { ...cardData, id: canonicalUserId });
    
    res.json({ message: 'ID Card generated successfully', card: savedCard });
  } catch (err) {
    console.error('ID_GEN_FAIL:', err);
    res.status(500).json({ message: 'Failed to generate ID Card' });
  }
});

// GET /idcard/list/all — Admin: List all cards
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
    
    const user = (await fallbackDb.findById('users', card.userId)) || 
                 (await fallbackDb.findOne('users', { firebaseUid: card.userId })) ||
                 (await fallbackDb.findOne('users', { email: card.email }));
    
    if (!user) return res.status(404).json({ message: 'Employee profile not found in registry' });

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

// GET /idcard/:userId — Fetch user's card
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    // 1. Try to find the user first to get their canonical ID
    const user = (await fallbackDb.findById('users', userId)) || 
                 (await fallbackDb.findOne('users', { firebaseUid: userId })) ||
                 (await fallbackDb.findOne('users', { email: userId }));
    
    const targetUserId = user ? (user.id || user._id) : userId;

    // 2. Try direct ID lookup on idcards
    let card = await fallbackDb.findById('idcards', targetUserId);
    
    // 3. Fallback: Search all cards by userId field or original userId
    if (!card) {
      const cards = await fallbackDb.find('idcards', {});
      card = cards.find(c => 
        c.userId === targetUserId || 
        c.id === targetUserId ||
        c.userId === userId ||
        c.id === userId
      );
    }
    
    if (!card) return res.status(404).json({ message: 'No ID card found for this employee' });
    
    res.json({
      ...card,
      userAvatar: user?.avatar || null
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve card' });
  }
});

// DELETE /idcard/:cardId — Admin: Purge ID card
router.delete('/:cardId', async (req, res) => {
  try {
    await fallbackDb.deleteOne('idcards', req.params.cardId);
    res.json({ message: 'Credential purged from registry' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to purge credential' });
  }
});

module.exports = router;
