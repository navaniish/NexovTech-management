const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');

// GET /notifications — get all notifications for a user (or all for admin)
router.get('/', async (req, res) => {
  const { userId, role } = req.query;
  try {
    const all = await fallbackDb.find('notifications', {});
    let filtered = all;
    
    if (role !== 'Admin' && userId) {
      filtered = all.filter(n => n.userId === userId || n.userId === 'all');
    }
    
    // Sort by most recent
    const sorted = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ message: 'Failed to synchronize alerts' });
  }
});

// POST /notifications — create a notification (Internal use mainly)
router.post('/', async (req, res) => {
  const { userId, title, message, type, link } = req.body;
  try {
    const notification = {
      id: `nt_${Date.now()}`,
      userId: userId || 'all',
      title,
      message,
      type: type || 'info', // info, success, warning, error
      link: link || '',
      read: false,
      createdAt: new Date().toISOString()
    };
    const saved = await fallbackDb.save('notifications', notification);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Alert deployment failed' });
  }
});

// PUT /notifications/:id/read — mark as read
router.put('/:id/read', async (req, res) => {
  try {
    const all = await fallbackDb.find('notifications', {});
    const notification = all.find(n => (n.id || n._id) === req.params.id);
    if (!notification) return res.status(404).json({ message: 'Alert not found' });
    
    const updated = { ...notification, read: true };
    await fallbackDb.save('notifications', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update alert status' });
  }
});

// PUT /notifications/read-all — mark all as read for a user
router.put('/read-all', async (req, res) => {
  const { userId } = req.body;
  try {
    const all = await fallbackDb.find('notifications', {});
    const updatedList = all.map(n => {
      if ((n.userId === userId || n.userId === 'all') && !n.read) {
        return { ...n, read: true };
      }
      return n;
    });
    
    // In our fallbackDb, save handles single items. 
    // This is a bit inefficient but works for now.
    for (const item of updatedList) {
      if (item.read && !all.find(a => a.id === item.id).read) {
        await fallbackDb.save('notifications', item);
      }
    }
    
    res.json({ message: 'All alerts marked as seen' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear alert queue' });
  }
});

// DELETE /notifications/:id — delete a notification
router.delete('/:id', async (req, res) => {
  try {
    await fallbackDb.deleteOne('notifications', req.params.id);
    res.json({ message: 'Alert terminated' });
  } catch (err) {
    res.status(500).json({ message: 'Alert termination failed' });
  }
});

module.exports = router;
