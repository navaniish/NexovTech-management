const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');

// Get All Team Members (Admin)
router.get('/', async (req, res) => {
  console.log('👥 TEAM_SYNC: Fetching organization roster...');
  try {
    const users = (await fallbackDb.find('users', {})) || [];
    const masterAdminEmail = 'nexovtech@myyahoo.com';
    
    // Deduplicate by both email fields and exclude Master Admin
    const unique = users.reduce((acc, curr) => {
      const email = (curr.email || curr.companyEmail || '').toLowerCase().trim();
      
      if (!email || email === 'nexovtech@nexovtech.com') return acc;
      
      const isDuplicate = acc.some(item => 
        item.email?.toLowerCase().trim() === email || 
        item.companyEmail?.toLowerCase().trim() === email
      );

      if (!isDuplicate) {
        acc.push({ ...curr, email });
      }
      return acc;
    }, []);

    console.log(`✅ TEAM_SYNC: ${unique.length} verified specialists synchronized.`);
    res.json(unique);
  } catch (err) {
    console.error('❌ TEAM_SYNC_FAILURE:', err.message);
    res.status(500).json({ message: 'Failed to retrieve team intelligence' });
  }
});

// Invite Member (Admin)
router.post('/invite', async (req, res) => {
  const { email, name, role, phone, department } = req.body;
  const userData = {
    name,
    email: email.toLowerCase(),
    role,
    phone,
    department,
    password: 'Nexovtech@123', // Default temporary password
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
  const { id } = req.params;
  try {
    // 1. Fetch user to get email for Firestore employee/credential deletion
    const user = await fallbackDb.findById('users', id);
    const email = user?.email?.toLowerCase();
    
    // 2. Total System Purge: Recursively remove all nodes linked to this specialist
    const collectionsToPurge = [
      'users',           // Primary Profile
      'idcards',         // Digital Identity
      'employees',       // Personnel Registry (by email)
      'documents',       // Vault Files
      'timesheets',      // Work Logs
      'tasks',           // Assigned Ops
      'transactions',    // Financial Ledger
      'loginHistory',    // Security Logs
      'sessions'         // Active Sessions
    ];

    console.log(`🧹 TOTAL_PURGE: Initializing deep wipe for Specialist [${id}] / [${email}]`);

    const purgeTasks = collectionsToPurge.map(async (collection) => {
      try {
        if (collection === 'employees' && email) {
          return fallbackDb.deleteOne('employees', email);
        }
        
        // For other collections, we need to find and delete all items matching userId
        // Note: find and deleteMany would be better, but we follow fallbackDb patterns
        const items = await fallbackDb.find(collection, { userId: id });
        if (items && items.length > 0) {
          return Promise.all(items.map(item => fallbackDb.deleteOne(collection, item.id || item._id)));
        }
        
        // Also try direct ID deletion for users and idcards
        if (collection === 'users' || collection === 'idcards') {
          return fallbackDb.deleteOne(collection, id);
        }
      } catch (err) {
        console.warn(`⚠️ PURGE_WARNING: Failed to clean collection [${collection}]:`, err.message);
      }
    });

    await Promise.all(purgeTasks);

    console.log(`✨ TOTAL_PURGE_COMPLETE: Specialist [${id}] has been fully redacted from the system.`);
    res.json({ message: 'Specialist and all associated mission data fully purged from system.' });
  } catch (err) {
    console.error('❌ TOTAL_PURGE_FAILURE:', err.message);
    res.status(500).json({ message: 'Failed to complete total specialist redaction' });
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
