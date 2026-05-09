const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const useragent = require('useragent');
const fallbackDb = require('../utils/fallbackDb');

// ─── Handlers (Exported for direct mounting) ──────────────────────────────────

const handleSetup = async (req, res) => {
  try {
    const { userId } = req.body || {};
    console.log(`[2FA_SETUP] Initializing for userId: ${userId}`);
    
    if (!userId) return res.status(400).json({ message: 'UserId is required' });

    const user = await fallbackDb.findById('users', userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const secret = speakeasy.generateSecret({ 
      name: `NexovTech (${user.email || user.name || 'System User'})` 
    });
    
    await fallbackDb.update('users', userId, { 
      twoFactorSecret: secret.base32,
      twoFactorEnabled: false
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ qrCodeUrl, secret: secret.base32 });
  } catch (err) {
    console.error('[2FA_SETUP_ERROR]:', err);
    res.status(500).json({ message: 'Error setting up 2FA', error: err.message });
  }
};

const handleVerify = async (req, res) => {
  try {
    const { userId, token } = req.body || {};
    if (!userId || !token) return res.status(400).json({ message: 'UserId and Token are required' });

    const user = await fallbackDb.findById('users', userId);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ message: '2FA setup not initiated' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token
    });

    if (verified) {
      const backupCodes = Array.from({ length: 5 }, () => 
        Math.random().toString(36).substr(2, 8).toUpperCase()
      );
      
      await fallbackDb.update('users', userId, { 
        twoFactorEnabled: true,
        backupCodes
      });
      
      res.json({ message: '2FA enabled successfully', backupCodes });
    } else {
      res.status(400).json({ message: 'Invalid verification token' });
    }
  } catch (err) {
    console.error('2FA Verify Error:', err);
    res.status(500).json({ message: 'Error verifying 2FA' });
  }
};

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post('/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body || {};
    const user = await fallbackDb.findById('users', userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.password) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await fallbackDb.update('users', userId, { 
      password: hashedPassword,
      passwordUpdatedAt: new Date()
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error during password change' });
  }
});

router.post('/2fa/setup', handleSetup);
router.post('/2fa/verify', handleVerify);

router.post('/2fa/disable', async (req, res) => {
  try {
    const { userId, password } = req.body || {};
    const user = await fallbackDb.findById('users', userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid password' });
    }

    await fallbackDb.update('users', userId, { 
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: []
    });

    res.json({ message: '2FA disabled successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error disabling 2FA' });
  }
});

router.get('/login-history/:userId', async (req, res) => {
  try {
    const uid = req.params.userId;
    const history = await fallbackDb.find('loginHistory', {});
    const userHistory = history
      .filter(h => h.userId === uid || h.email === uid)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);
    res.json(userHistory);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching login history' });
  }
});

router.post('/record-login', async (req, res) => {
  try {
    const { userId, status } = req.body || {};
    const agent = useragent.parse(req.headers['user-agent'] || '');
    const historyItem = {
      userId,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      device: agent.device.toString(),
      browser: agent.toAgent(),
      os: agent.os.toString(),
      loginStatus: status,
      location: 'Local Sync',
      timestamp: new Date()
    };
    await fallbackDb.save('loginHistory', historyItem);
    res.status(201).json({ message: 'Login event recorded' });
  } catch (err) {
    res.status(500).json({ message: 'Error recording login event' });
  }
});

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = router;
module.exports.handleSetup = handleSetup;
module.exports.handleVerify = handleVerify;
