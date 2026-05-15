const express = require('express');
const router = express.Router();
const axios = require('axios');

// TELEGRAM CONFIGURATION (To be set in environment variables)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID';

/**
 * SENTINEL ALERT BRIDGE
 * Dispatches critical security events to the NexovTech Telegram Node.
 */
router.post('/alert', async (req, res) => {
  const { action, data } = req.body;
  
  const message = `
🚨 *NEXOVTECH SECURITY ALERT* 🚨
--------------------------------
*ACTION:* ${action}
*STATUS:* ${data.status}
*PERFORMED BY:* ${data.performedBy}
*DEVICE:* ${data.deviceInfo?.platform || 'Unknown'}
*TIME:* ${new Date().toLocaleString()}
--------------------------------
[SENTINEL_SHIELD_ACTIVE]
  `;

  try {
    if (TELEGRAM_BOT_TOKEN !== 'YOUR_BOT_TOKEN') {
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      });
      console.log('✅ SENTINEL: Telegram Alert Dispatched.');
    } else {
      console.warn('⚠️ SENTINEL: Telegram Bot Token missing. Alert logged locally only.');
    }
    res.json({ success: true });
  } catch (err) {
    console.error('🔥 SENTINEL_TELEGRAM_FAILURE:', err.message);
    res.status(500).json({ success: false, message: 'Alert bridge failed' });
  }
});

/**
 * CHANGE PASSWORD
 */
router.post('/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  const fallbackDb = require('../utils/fallbackDb');
  const bcrypt = require('bcryptjs');

  try {
    const user = await fallbackDb.findById('users', userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // If user has a password set, verify it
    if (user.password) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await fallbackDb.update('users', userId, { password: hashedPassword });
    
    console.log(`🔑 SENTINEL: Password rotated for node ${userId}`);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('🔥 PASSWORD_SYNC_FAILURE:', err.message);
    res.status(500).json({ message: 'Failed to update credentials' });
  }
});

/**
 * 2FA SETUP - Generate Secret & QR Code
 */
router.post('/2fa/setup', async (req, res) => {
  const { userId } = req.body;
  const fallbackDb = require('../utils/fallbackDb');
  const speakeasy = require('speakeasy');
  const qrcode = require('qrcode');

  try {
    const user = await fallbackDb.findById('users', userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const secret = speakeasy.generateSecret({
      name: `NexovTech: ${user.email}`,
      issuer: 'NexovTech Administration'
    });

    // Save temporary secret to user (not yet enabled)
    await fallbackDb.update('users', userId, { 
      tempTwoFactorSecret: secret.base32 
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      secret: secret.base32,
      qrCodeUrl
    });
  } catch (err) {
    console.error('🔥 2FA_SETUP_FAILURE:', err.message);
    res.status(500).json({ message: '2FA initialization failed' });
  }
});

/**
 * 2FA VERIFY - Enable 2FA after verification
 */
router.post('/2fa/verify', async (req, res) => {
  const { userId, token } = req.body;
  const fallbackDb = require('../utils/fallbackDb');
  const speakeasy = require('speakeasy');

  try {
    const user = await fallbackDb.findById('users', userId);
    if (!user || !user.tempTwoFactorSecret) {
      return res.status(400).json({ message: '2FA setup not initialized' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.tempTwoFactorSecret,
      encoding: 'base32',
      token
    });

    if (verified) {
      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () => Math.random().toString(36).substr(2, 8).toUpperCase());
      
      await fallbackDb.update('users', userId, {
        twoFactorEnabled: true,
        twoFactorSecret: user.tempTwoFactorSecret,
        tempTwoFactorSecret: null,
        backupCodes
      });

      console.log(`🛡️ SENTINEL: 2FA enabled for node ${userId}`);
      res.json({ success: true, backupCodes });
    } else {
      res.status(400).json({ message: 'Invalid verification token' });
    }
  } catch (err) {
    console.error('🔥 2FA_VERIFICATION_FAILURE:', err.message);
    res.status(500).json({ message: 'Verification protocol failed' });
  }
});

/**
 * ADMIN REQUEST HANDLER
 */
router.post('/requests/:id/handle', async (req, res) => {
  const { id } = req.params;
  const { status, adminData } = req.body;
  const fallbackDb = require('../utils/fallbackDb');

  try {
    if (status === 'approved') {
      // 1. Provision Admin Node
      await fallbackDb.save('admins', {
        ...adminData,
        status: 'active',
        createdAt: new Date()
      });
      console.log(`✅ SENTINEL: Admin node provisioned for ${adminData.email}`);
    }

    // 2. Update request status
    await fallbackDb.update('admin_requests', id, { status, updatedAt: new Date() });
    
    res.json({ success: true, message: `Request ${status} successfully.` });
  } catch (err) {
    console.error('🔥 SENTINEL_REQUEST_FAILURE:', err.message);
    res.status(500).json({ success: false, message: 'Failed to handle request' });
  }
});

/**
 * ADMIN NODE REVOCATION
 */
router.delete('/admins/:id', async (req, res) => {
  const { id } = req.params;
  const fallbackDb = require('../utils/fallbackDb');

  try {
    await fallbackDb.deleteOne('admins', id);
    console.log(`🚫 SENTINEL: Admin node ${id} revoked.`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Revocation failed' });
  }
});

module.exports = router;
