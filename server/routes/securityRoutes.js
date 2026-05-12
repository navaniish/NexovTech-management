const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const fallbackDb = require('../utils/fallbackDb');
const jwt = require('jsonwebtoken');
const useragent = require('useragent');
const requestIp = require('request-ip');
const geoip = require('geoip-lite');

// Middleware to verify JWT
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Authorization required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid session' });
  }
};

// 1. Generate 2FA Secret & QR Code
router.post('/2fa/setup', auth, async (req, res) => {
  try {
    const user = await fallbackDb.findById('users', req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found in Registry' });

    const secret = speakeasy.generateSecret({ 
      name: `NexovTech:${user.email || 'Admin'}`,
      issuer: 'NexovTech'
    });
    
    if (!secret.otpauth_url) throw new Error('Failed to generate OTP Auth URL');

    const qrCodeData = await QRCode.toDataURL(secret.otpauth_url);

    await fallbackDb.update('users', user.id, { temp2FASecret: secret.base32 });

    res.json({ secret: secret.base32, qrCode: qrCodeData });
  } catch (err) {
    res.status(500).json({ message: 'Failed to initialize 2FA' });
  }
});

// 2. Verify and Enable 2FA
router.post('/2fa/verify', auth, async (req, res) => {
  const { token } = req.body;
  try {
    const user = await fallbackDb.findById('users', req.user.id);
    if (!user || !user.temp2FASecret) return res.status(400).json({ message: '2FA setup not initiated' });

    const verified = speakeasy.totp.verify({
      secret: user.temp2FASecret,
      encoding: 'base32',
      token
    });

    if (verified) {
      const backupCodes = Array.from({ length: 8 }, () => Math.random().toString(36).substr(2, 10).toUpperCase());
      
      await fallbackDb.update('users', user.id, {
        twoFactorEnabled: true,
        twoFactorSecret: user.temp2FASecret,
        temp2FASecret: null,
        backupCodes: backupCodes
      });

      const agent = useragent.parse(req.headers['user-agent']);
      const ip = requestIp.getClientIp(req);
      const geo = geoip.lookup(ip);

      await fallbackDb.save('security_logs', {
        userId: user.id,
        action: '2fa_enabled',
        ipAddress: ip,
        device: agent.device.toString(),
        browser: agent.toAgent(),
        location: geo ? { city: geo.city, country: geo.country } : { city: 'Unknown' },
        createdAt: new Date()
      });

      res.json({ message: '2FA enabled successfully', backupCodes });
    } else {
      res.status(400).json({ message: 'Invalid OTP token' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Verification failed' });
  }
});

// 3. Disable 2FA
router.post('/2fa/disable', auth, async (req, res) => {
  const { token } = req.body;
  try {
    const user = await fallbackDb.findById('users', req.user.id);
    if (!user || !user.twoFactorEnabled) return res.status(400).json({ message: '2FA not enabled' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token
    });

    if (verified) {
      await fallbackDb.update('users', user.id, {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: []
      });

      await fallbackDb.save('security_logs', {
        userId: user.id,
        action: '2fa_disabled',
        status: 'Warning',
        createdAt: new Date()
      });

      res.json({ message: '2FA disabled successfully' });
    } else {
      res.status(400).json({ message: 'Invalid OTP token' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to disable 2FA' });
  }
});

// 4. Get Security Logs
router.get('/logs', auth, async (req, res) => {
  try {
    const logs = await fallbackDb.find('security_logs', { userId: req.user.id });
    res.json(logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50));
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve security logs' });
  }
});

// 5. Get Trusted Devices
router.get('/devices', auth, async (req, res) => {
  try {
    const devices = await fallbackDb.find('trusted_devices', { userId: req.user.id });
    res.json(devices);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve devices' });
  }
});

// 6. Delete Device
router.delete('/devices/:id', auth, async (req, res) => {
  try {
    await fallbackDb.remove('trusted_devices', req.params.id);
    res.json({ message: 'Device revoked successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to revoke device' });
  }
});

// 7. Admin: Get ALL Security Logs
router.get('/admin/logs', auth, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
  try {
    const logs = await fallbackDb.find('security_logs', {});
    res.json(logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 100));
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve global audit trail' });
  }
});

// 8. Admin: Get ALL Users Security Status
router.get('/admin/users-status', auth, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
  try {
    const users = await fallbackDb.find('users', {});
    const statusData = users.map(u => ({
      id: u.id || u._id,
      name: u.name,
      email: u.email,
      twoFactorEnabled: u.twoFactorEnabled || false,
      role: u.role
    }));
    res.json(statusData);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve user statuses' });
  }
});

// 9. Regenerate Backup Codes
router.post('/2fa/regenerate-backup-codes', auth, async (req, res) => {
  try {
    const user = await fallbackDb.findById('users', req.user.id);
    if (!user || !user.twoFactorEnabled) return res.status(400).json({ message: '2FA not active' });

    const backupCodes = Array.from({ length: 8 }, () => Math.random().toString(36).substr(2, 10).toUpperCase());
    await fallbackDb.update('users', user.id, { backupCodes });

    res.json({ message: 'Backup codes regenerated', backupCodes });
  } catch (err) {
    res.status(500).json({ message: 'Regeneration failed' });
  }
});

// 10. Session Integrity Check
router.get('/session-check', auth, async (req, res) => {
  res.json({ status: 'Valid', timestamp: new Date(), node: req.headers['user-agent'] });
});

module.exports = router;
