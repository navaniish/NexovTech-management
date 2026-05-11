const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');
const generalUpload = require('../middleware/generalUpload');

// POST Upload Document/Asset
router.post('/upload', generalUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const fileUrl = `/uploads/documents/${req.file.filename}`;
    res.json({ 
      url: fileUrl, 
      filename: req.file.originalname,
      mimetype: req.file.mimetype 
    });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

// GET Message History for a Channel or Direct Conversation
router.get('/messages/:room', async (req, res) => {
  try {
    const { room } = req.params;
    const messages = await fallbackDb.find('messages', {});
    // Filter messages for the specific room (could be a projectId, channelName, or combined userIds)
    const filtered = messages.filter(m => m.room === room).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: 'Communication array offline' });
  }
});

// POST Send Message (Manual fallback if socket is disconnected)
router.post('/messages', async (req, res) => {
  try {
    const messageData = {
      ...req.body,
      timestamp: new Date()
    };
    const saved = await fallbackDb.save('messages', messageData);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Message delivery failed' });
  }
});

// GET Announcements
router.get('/announcements', async (req, res) => {
  try {
    const announcements = await fallbackDb.find('announcements', {});
    res.json(announcements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  } catch (err) {
    res.status(500).json({ message: 'Announcement relay failed' });
  }
});

// POST Broadcast Announcement (Admin Only)
router.post('/announcements', async (req, res) => {
  try {
    const announcement = {
      ...req.body,
      timestamp: new Date()
    };
    const saved = await fallbackDb.save('announcements', announcement);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Broadcast failed' });
  }
});

module.exports = router;
