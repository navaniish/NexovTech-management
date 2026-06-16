const express = require('express');
const router = express.Router();
const linkedinController = require('../controllers/linkedinController');

// Start LinkedIn OAuth login flow
router.get('/auth', linkedinController.redirectToAuth);

// LinkedIn callback handler
router.get('/callback', linkedinController.handleCallback);

// Retrieve page connection details
router.get('/status', linkedinController.getStatus);

// Share a post on the company page
router.post('/share', linkedinController.sharePost);

// Auto‑reply to comments on company posts (AI powered)
router.post('/auto-reply', linkedinController.autoReply);

// Disconnect the company page integration
router.post('/disconnect', linkedinController.disconnect);

module.exports = router;
