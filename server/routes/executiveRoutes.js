const express = require('express');
const router = express.Router();
const executiveController = require('../controllers/executiveController');

// GET AI Executive Command Center briefing details
router.get('/briefing', executiveController.getExecutiveBriefing);

module.exports = router;
