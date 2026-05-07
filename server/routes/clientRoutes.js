const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');

// Get All Clients
router.get('/', async (req, res) => {
  try {
    const clients = await fallbackDb.find('clients', {});
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve client roster' });
  }
});

// Create Client
router.post('/', async (req, res) => {
  try {
    const saved = await fallbackDb.save('clients', req.body);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Failed to register client' });
  }
});

module.exports = router;
