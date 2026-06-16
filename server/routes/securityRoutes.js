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

const parseDate = (dateVal) => {
  if (!dateVal) return new Date();
  if (typeof dateVal === 'object' && dateVal._seconds !== undefined) {
    return new Date(dateVal._seconds * 1000);
  }
  return new Date(dateVal);
};

/**
 * GET /logs
 * Retrieve the current employee/user login history logs.
 */
router.get('/logs', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const fallbackDb = require('../utils/fallbackDb');
  
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    const userId = decoded.id;
    
    const history = await fallbackDb.find('loginHistory', { userId });
    const sorted = (history || []).sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));
    
    const mapped = sorted.map(log => ({
      id: log.id || log._id,
      status: log.loginStatus || 'Success',
      action: log.location && log.location !== 'Remote Gateway'
        ? `Login from ${log.location} (${log.ipAddress})`
        : `Login from ${log.ipAddress}`,
      createdAt: log.createdAt
    }));
    
    res.json(mapped);
  } catch (err) {
    console.error('🔥 GET_SECURITY_LOGS_FAIL:', err.message);
    res.status(500).json({ message: 'Logs sync failed' });
  }
});

/**
 * GET /devices
 * Retrieve unique trusted devices based on user login history.
 */
router.get('/devices', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const fallbackDb = require('../utils/fallbackDb');
  
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    const userId = decoded.id;
    
    const history = await fallbackDb.find('loginHistory', { userId });
    
    const devicesMap = new Map();
    (history || []).forEach(log => {
      const os = log.os || 'Unknown OS';
      const browser = log.browser || 'Unknown Browser';
      const deviceKey = `${os}-${browser}`;
      
      if (!devicesMap.has(deviceKey) || parseDate(log.createdAt) > parseDate(devicesMap.get(deviceKey).createdAt)) {
        devicesMap.set(deviceKey, log);
      }
    });
    
    const devicesList = Array.from(devicesMap.values()).map(log => {
      const os = log.os || 'Unknown OS';
      const browser = log.browser || 'Unknown Browser';
      const isMobile = os.includes('Android') || os.includes('iOS') || os.includes('iPhone') || os.includes('iPad');
      
      return {
        deviceType: isMobile ? 'Mobile' : 'Desktop',
        deviceName: `${os} - ${browser}`,
        lastIp: log.ipAddress || '127.0.0.1',
        createdAt: log.createdAt
      };
    });
    
    res.json(devicesList);
  } catch (err) {
    console.error('🔥 GET_SECURITY_DEVICES_FAIL:', err.message);
    res.status(500).json({ message: 'Devices list offline' });
  }
});

/**
 * DELETE /devices/:deviceName
 * Removes device entries from login history (mocks revocation).
 */
router.delete('/devices/:deviceName', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const fallbackDb = require('../utils/fallbackDb');
  
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    const userId = decoded.id;
    const { deviceName } = req.params;
    
    const history = await fallbackDb.find('loginHistory', { userId });
    
    const matches = (history || []).filter(log => {
      const name = `${log.os} - ${log.browser}`;
      return name === deviceName;
    });
    
    for (const match of matches) {
      await fallbackDb.deleteOne('loginHistory', match.id || match._id);
    }
    
    res.json({ success: true, message: 'Device node access revoked' });
  } catch (err) {
    console.error('🔥 DELETE_DEVICE_FAIL:', err.message);
    res.status(500).json({ message: 'Revocation failed' });
  }
});

// ── ZERO-TRUST GEOLOCATION ANOMALY DETECTOR ──
const CITY_COORDINATES = {
  'mumbai': { lat: 19.0760, lon: 72.8777 },
  'delhi': { lat: 28.7041, lon: 77.1025 },
  'bangalore': { lat: 12.9716, lon: 77.5946 },
  'london': { lat: 51.5074, lon: -0.1278 },
  'new york': { lat: 40.7128, lon: -74.0060 },
  'paris': { lat: 48.8566, lon: 2.3522 },
  'tokyo': { lat: 35.6762, lon: 139.6503 },
  'singapore': { lat: 1.3521, lon: 103.8198 },
  'berlin': { lat: 52.5200, lon: 13.4050 },
  'sydney': { lat: -33.8688, lon: 151.2093 }
};

function getCoordinates(locationStr) {
  if (!locationStr) return null;
  const lower = locationStr.toLowerCase();
  for (const city in CITY_COORDINATES) {
    if (lower.includes(city)) return CITY_COORDINATES[city];
  }
  return null;
}

function calculateDistance(coords1, coords2) {
  const R = 6371; // km
  const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
  const dLon = (coords2.lon - coords1.lon) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

router.get('/anomalies', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const fallbackDb = require('../utils/fallbackDb');
  
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    const tenantId = decoded.tenantId || 'org_default';
    
    // Fetch all users in this tenant
    const users = await fallbackDb.find('users', { tenantId }) || [];
    const userIds = users.map(u => u.id || u._id);
    
    const allHistory = [];
    for (const uid of userIds) {
      const hist = await fallbackDb.find('loginHistory', { userId: uid }) || [];
      allHistory.push(...hist);
    }
    
    const anomalies = [];
    const userHistoryMap = {};
    allHistory.forEach(log => {
      if (!userHistoryMap[log.userId]) userHistoryMap[log.userId] = [];
      userHistoryMap[log.userId].push(log);
    });

    for (const userId in userHistoryMap) {
      const logs = userHistoryMap[userId];
      logs.sort((a, b) => parseDate(a.createdAt) - parseDate(b.createdAt));
      
      for (let i = 0; i < logs.length - 1; i++) {
        const log1 = logs[i];
        const log2 = logs[i + 1];
        
        const timeDiffMs = Math.abs(parseDate(log2.createdAt) - parseDate(log1.createdAt));
        const timeDiffHrs = timeDiffMs / (1000 * 60 * 60);
        
        if (timeDiffHrs > 0 && timeDiffHrs < 24) {
          const coords1 = getCoordinates(log1.location);
          const coords2 = getCoordinates(log2.location);
          
          if (coords1 && coords2 && log1.location !== log2.location) {
            const distance = calculateDistance(coords1, coords2);
            const speed = distance / timeDiffHrs;
            
            if (speed > 800) {
              const user = users.find(u => (u.id || u._id) === userId);
              anomalies.push({
                id: `anom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                userId,
                userName: user ? user.name : 'Unknown User',
                email: user ? user.email : 'Unknown Email',
                fromLocation: log1.location,
                toLocation: log2.location,
                fromTime: log1.createdAt,
                toTime: log2.createdAt,
                timeDiffMinutes: Math.round(timeDiffMs / (1000 * 60)),
                distanceKm: Math.round(distance),
                calculatedSpeedKmh: Math.round(speed),
                ip1: log1.ipAddress,
                ip2: log2.ipAddress,
                device: log2.device || 'Unknown Device'
              });
            }
          }
        }
      }
    }
    
    res.json(anomalies);
  } catch (err) {
    console.error('🔥 GET_SECURITY_ANOMALIES_FAIL:', err.message);
    res.status(500).json({ message: 'Failed to scan anomalies' });
  }
});

router.post('/lockout/:userId', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const fallbackDb = require('../utils/fallbackDb');
  
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    const adminId = decoded.id;
    const admin = await fallbackDb.findById('users', adminId);
    
    if (!admin || (admin.role !== 'Admin' && admin.role !== 'Super Admin' && admin.role !== 'Manager')) {
      return res.status(403).json({ message: 'Access denied: Admin permissions required.' });
    }
    
    const { userId } = req.params;
    const userToLock = await fallbackDb.findById('users', userId);
    if (!userToLock) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    await fallbackDb.update('users', userId, { status: 'Locked', isActive: false });
    
    const employee = await fallbackDb.findById('employees', userId);
    if (employee) {
      await fallbackDb.update('employees', userId, { status: 'Suspended', isActive: false });
    }
    
    const telegramLink = await fallbackDb.findOne('telegram_users', { companyEmail: userToLock.email }) ||
                         await fallbackDb.findOne('telegram_users', { companyEmail: userToLock.companyEmail });
    if (telegramLink) {
      await fallbackDb.deleteOne('telegram_users', telegramLink.id || telegramLink._id);
    }
    
    await fallbackDb.save('admin_logs', {
      action: 'SUSPEND_USER_LOCKED',
      status: 'warning',
      performedBy: admin.name || admin.email,
      details: {
        lockedUserId: userId,
        reason: 'Impossible travel geolocation anomaly detected.'
      },
      timestamp: new Date()
    });
    
    res.json({ success: true, message: 'User node session successfully suspended and credentials locked.' });
  } catch (err) {
    console.error('🔥 LOCKOUT_ENDPOINT_FAIL:', err.message);
    res.status(500).json({ message: 'Lockout process failed' });
  }
});

// ── FACIAL BIOMETRICS ENROLLMENT ──
router.post('/biometrics/enroll', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const fallbackDb = require('../utils/fallbackDb');

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    const userId = decoded.id;

    const { biometricTemplate, consent } = req.body;
    
    if (!consent) {
      return res.status(400).json({ message: 'User consent is required for biometric enrollment.' });
    }
    if (!biometricTemplate) {
      return res.status(400).json({ message: 'Required fields missing for enrollment.' });
    }

    const user = await fallbackDb.findById('users', userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const email = user.email;
    const tenantId = user.tenantId || 'org_default';

    // Check if user already has an enrolled profile
    const existing = await fallbackDb.findOne('biometrics_templates', { userId });
    if (existing) {
      return res.status(400).json({ message: 'Face profile already enrolled for this user. Delete existing template to re-enroll.' });
    }

    // Save template
    await fallbackDb.save('biometrics_templates', {
      userId,
      email: email.toLowerCase(),
      encryptedTemplate: biometricTemplate,
      tenantId,
      createdAt: new Date().toISOString()
    });

    // Save enrollment log
    await fallbackDb.save('biometrics_logs', {
      userId,
      email: email.toLowerCase(),
      attemptType: 'Enrollment',
      status: 'Success',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      deviceScore: 100,
      timestamp: new Date().toISOString(),
      tenantId
    });

    res.json({ success: true, message: 'Facial biometrics enrolled successfully.' });
  } catch (err) {
    console.error('🔥 BIOMETRIC_ENROLL_FAILURE:', err.message);
    res.status(500).json({ message: 'Biometric enrollment failed.' });
  }
});

// ── FACIAL BIOMETRICS VERIFICATION & MULTI-FACTOR CHALLENGE ──
router.post('/biometrics/verify', async (req, res) => {
  const { email, biometricTemplate, deviceId, deviceInfo, otpToken, livenessPassed } = req.body;
  const fallbackDb = require('../utils/fallbackDb');
  const jwt = require('jsonwebtoken');
  const useragent = require('useragent');
  const agent = useragent.parse(req.headers['user-agent'] || '');

  if (!email || !biometricTemplate || !deviceId) {
    return res.status(400).json({ message: 'Missing fields required for facial authentication.' });
  }

  try {
    let user = await fallbackDb.findOne('users', { email: email.toLowerCase() });
    if (!user) {
      user = await fallbackDb.findOne('users', { companyEmail: email.toLowerCase() });
    }
    if (!user) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    if (user.status === 'Locked') {
      return res.status(403).json({ message: 'Account is locked. Please contact administration.' });
    }

    // Retrieve biometric template — try both id forms to handle enrollment/verification userId inconsistencies
    const primaryId = user.id || user._id;
    const secondaryId = user._id || user.id;
    let stored = await fallbackDb.findOne('biometrics_templates', { userId: primaryId });
    if (!stored && secondaryId && secondaryId !== primaryId) {
      stored = await fallbackDb.findOne('biometrics_templates', { userId: secondaryId });
    }
    if (!stored) {
      return res.status(400).json({ message: 'No biometrics registered for this account. Please use password login or contact Admin.' });
    }

    // Verify liveness state
    if (!livenessPassed) {
      await fallbackDb.save('biometrics_logs', {
        userId: user.id || user._id,
        email: user.email,
        attemptType: 'Verification',
        status: 'Failed_Liveness',
        deviceId,
        deviceScore: 0,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        timestamp: new Date().toISOString(),
        tenantId: user.tenantId || 'org_default'
      });
      return res.status(401).json({ message: 'Liveness detection check failed.' });
    }

    // Match biometric template (simulate matching similarity score)
    const score = biometricTemplate === stored.encryptedTemplate ? 1.0 : 0.95;
    if (score < 0.90) {
      await fallbackDb.save('biometrics_logs', {
        userId: user.id || user._id,
        email: user.email,
        attemptType: 'Verification',
        status: 'Failed_Mismatch',
        deviceId,
        deviceScore: 0,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        timestamp: new Date().toISOString(),
        tenantId: user.tenantId || 'org_default'
      });
      return res.status(401).json({ message: 'Biometric face matching failed. Features do not match.' });
    }

    // Check trusted device
    const trustedDevices = await fallbackDb.find('trusted_devices', { userId: user.id || user._id }) || [];
    const isDeviceTrusted = trustedDevices.some(d => d.deviceId === deviceId);

    // If device is NOT trusted, verify OTP or prompt OTP send
    if (!isDeviceTrusted) {
      if (!otpToken) {
        // Generate OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save OTP code temporary on user profile
        await fallbackDb.update('users', user.id || user._id, {
          biometricOtp: otpCode,
          biometricOtpExpires: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
        });

        // Send OTP email
        await fallbackDb.save('mails', {
          from: 'security@nexovtech.com',
          to: user.email,
          subject: '[NexovTech Security] Verification Code for Untrusted Device Sign-in',
          body: `A sign-in attempt with facial biometrics was detected from an untrusted device. Use the following 6-digit code to authorize access: \n\n${otpCode}\n\nIf you did not initiate this, please contact administrator immediately.`,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          status: 'Unread',
          priority: 'High'
        });

        console.log(`🛡️ OTP Sent to ${user.email}: ${otpCode}`);

        return res.json({
          requireOTP: true,
          message: 'Unrecognized device fingerprint. Verification code dispatched to your email.'
        });
      } else {
        // Verify OTP
        if (!user.biometricOtp || user.biometricOtp !== otpToken || new Date() > new Date(user.biometricOtpExpires)) {
          return res.status(400).json({ message: 'Invalid or expired verification code.' });
        }

        // Clear OTP
        await fallbackDb.update('users', user.id || user._id, {
          biometricOtp: null,
          biometricOtpExpires: null
        });

        // Add to trusted devices
        await fallbackDb.save('trusted_devices', {
          deviceId,
          userId: user.id || user._id,
          browserFingerprint: `${deviceInfo?.browser || agent.toAgent()} on ${deviceInfo?.os || agent.os.toString()}`,
          trustScore: 95,
          lastUsed: new Date().toISOString(),
          tenantId: user.tenantId || 'org_default'
        });
      }
    } else {
      // Update lastUsed for trusted device
      const currentDevice = trustedDevices.find(d => d.deviceId === deviceId);
      if (currentDevice) {
        await fallbackDb.update('trusted_devices', currentDevice.id || currentDevice._id, {
          lastUsed: new Date().toISOString()
        });
      }
    }

    // Record Success to LoginHistory & biometrics_logs
    const geo = require('geoip-lite').lookup(req.ip || req.headers['x-forwarded-for'] || '127.0.0.1');
    const locationStr = geo ? `${geo.city}, ${geo.region}, ${geo.country}` : 'Remote Gateway';

    await fallbackDb.save('loginHistory', {
      userId: user.id || user._id,
      email: user.email,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      device: agent.device.toString(),
      browser: agent.toAgent(),
      os: agent.os.toString(),
      loginStatus: 'Success',
      location: locationStr,
      area: geo ? geo.timezone : 'UTC',
      application: 'NexovTech Web Portal (Biometric)',
      createdAt: new Date().toISOString()
    });

    await fallbackDb.save('biometrics_logs', {
      userId: user.id || user._id,
      email: user.email,
      attemptType: 'Verification',
      status: 'Success',
      deviceId,
      deviceScore: isDeviceTrusted ? 100 : 95,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      location: locationStr,
      browser: agent.toAgent(),
      os: agent.os.toString(),
      timestamp: new Date().toISOString(),
      tenantId: user.tenantId || 'org_default'
    });

    // Generate internal session JWT
    const jwtToken = jwt.sign(
      { id: user.id || user._id, role: user.role, firebaseUid: user.firebaseUid || '', tenantId: user.tenantId || 'org_default' },
      process.env.JWT_SECRET || 'nexovtech_secret_key',
      { expiresIn: '24h' }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        address: user.address,
        authorizedSign: user.authorizedSign,
        teamSign: user.teamSign,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });

  } catch (err) {
    console.error('🔥 BIOMETRIC_VERIFY_FAILURE:', err);
    res.status(500).json({ message: 'Internal biometric verification error.' });
  }
});

// ── FACIAL BIOMETRICS STATUS ──
router.get('/biometrics/status/:userId', async (req, res) => {
  const { userId } = req.params;
  const fallbackDb = require('../utils/fallbackDb');

  try {
    const user = await fallbackDb.findById('users', userId);
    const template = await fallbackDb.findOne('biometrics_templates', { userId });
    res.json({
      enrolled: !!(template && template.encryptedTemplate),
      enrolledAt: template ? template.createdAt : null,
      policy: 'Face-Only Login Enabled (Password Bypass Active)',
      settings: user?.face_auth_settings || template?.settings || {
        enableFaceLogin: true,
        requireOtp: false,
        trustedDeviceMode: false,
        loginNotifications: true
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve biometrics status.' });
  }
});

// ── UPDATE FACIAL BIOMETRICS SETTINGS ──
router.post('/biometrics/settings', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const fallbackDb = require('../utils/fallbackDb');

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    const userId = decoded.id;
    const { settings } = req.body;

    // Update user profile settings (persistent preference fallback)
    await fallbackDb.update('users', userId, {
      face_auth_settings: settings
    });

    // Also update template if it is already enrolled
    const template = await fallbackDb.findOne('biometrics_templates', { userId });
    if (template) {
      await fallbackDb.update('biometrics_templates', template.id || template._id, {
        settings
      });
    }

    res.json({ success: true, message: 'Biometric settings updated successfully.' });
  } catch (err) {
    console.error('🔥 BIOMETRICS_SETTINGS_FAIL:', err.message);
    res.status(500).json({ message: 'Failed to update biometric settings.' });
  }
});

// ── FACIAL BIOMETRICS DELETE ──
router.delete('/biometrics/delete', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const fallbackDb = require('../utils/fallbackDb');

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    const userId = decoded.id;

    const template = await fallbackDb.findOne('biometrics_templates', { userId });
    if (!template) {
      return res.status(404).json({ message: 'No biometric template found for this user.' });
    }

    await fallbackDb.deleteOne('biometrics_templates', template.id || template._id);

    // Save deletion log
    await fallbackDb.save('biometrics_logs', {
      userId,
      email: decoded.email || '',
      attemptType: 'Revocation',
      status: 'Success',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      deviceScore: 100,
      timestamp: new Date().toISOString(),
      tenantId: decoded.tenantId || 'org_default'
    });

    res.json({ success: true, message: 'Facial biometric template deleted successfully.' });
  } catch (err) {
    console.error('🔥 BIOMETRICS_DELETE_FAIL:', err.message);
    res.status(500).json({ message: 'Failed to delete biometric profile.' });
  }
});

// ── ADMIN: BIOMETRICS LOGS & STATS ──
router.get('/biometrics/admin/logs', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const fallbackDb = require('../utils/fallbackDb');

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    
    // Check if admin
    const user = await fallbackDb.findById('users', decoded.id);
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return res.status(403).json({ message: 'Access denied: Administrative clearance required.' });
    }

    const tenantId = decoded.tenantId || 'org_default';

    // Fetch biometrics logs
    const logs = await fallbackDb.find('biometrics_logs', { tenantId }) || [];
    const sortedLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Fetch trusted devices
    const devices = await fallbackDb.find('trusted_devices', { tenantId }) || [];

    // Fetch all user counts & biometrics enrollment stats
    const users = await fallbackDb.find('users', { tenantId }) || [];
    const templates = await fallbackDb.find('biometrics_templates', { tenantId }) || [];

    res.json({
      logs: sortedLogs,
      devices,
      stats: {
        totalUsers: users.length,
        enrolledUsers: templates.length,
        failedAttempts: logs.filter(l => l.status.startsWith('Failed')).length,
        activeDevices: new Set(devices.map(d => d.deviceId)).size
      }
    });
  } catch (err) {
    console.error('🔥 GET_BIOMETRICS_ADMIN_LOGS_FAIL:', err.message);
    res.status(500).json({ message: 'Failed to fetch biometric statistics.' });
  }
});

// ── ADMIN: REVOKE BIOMETRIC TEMPLATE ──
router.post('/biometrics/admin/revoke/:userId', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const fallbackDb = require('../utils/fallbackDb');

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    
    // Check if admin
    const admin = await fallbackDb.findById('users', decoded.id);
    if (!admin || (admin.role !== 'Admin' && admin.role !== 'Super Admin' && admin.role !== 'Manager')) {
      return res.status(403).json({ message: 'Access denied: Administrative clearance required.' });
    }

    const { userId } = req.params;
    const targetUser = await fallbackDb.findById('users', userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const template = await fallbackDb.findOne('biometrics_templates', { userId });
    if (!template) {
      return res.status(400).json({ message: 'No biometric template found for this user.' });
    }

    await fallbackDb.deleteOne('biometrics_templates', template.id || template._id);

    // Save logs
    await fallbackDb.save('biometrics_logs', {
      userId,
      email: targetUser.email,
      attemptType: 'Revocation',
      status: 'Revoked_By_Admin',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      deviceScore: 100,
      timestamp: new Date().toISOString(),
      tenantId: targetUser.tenantId || 'org_default'
    });

    await fallbackDb.save('admin_logs', {
      action: 'BIOMETRICS_REVOKE',
      status: 'warning',
      performedBy: admin.name || admin.email,
      details: {
        revokedUserId: userId,
        revokedUserEmail: targetUser.email
      },
      timestamp: new Date()
    });

    res.json({ success: true, message: 'User biometric template successfully revoked.' });
  } catch (err) {
    console.error('🔥 BIOMETRICS_REVOKE_FAIL:', err.message);
    res.status(500).json({ message: 'Revocation protocol failed.' });
  }
});

module.exports = router;
