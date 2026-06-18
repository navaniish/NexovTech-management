const express = require('express');
const router = express.Router();
const axios = require('axios');
const OpenAI = require('openai');

let aiClient;
try {
  if (process.env.AI_API_KEY) {
    aiClient = new OpenAI({
      baseURL: process.env.AI_BASE_URL || "https://api.nexovtech.ai/v1",
      apiKey: process.env.AI_API_KEY
    });
  }
} catch (e) {
  console.warn('⚠️ Biometrics AI Security Agent offline: Missing API key.', e.message);
}


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
    
    const trusted = await fallbackDb.find('trusted_devices', { userId }) || [];
    const history = await fallbackDb.find('loginHistory', { userId }) || [];
    
    const devicesMap = new Map();
    
    // First, populate with trusted devices
    trusted.forEach(dev => {
      const deviceKey = dev.deviceId || dev.browserFingerprint;
      if (deviceKey) {
        devicesMap.set(deviceKey, {
          id: dev.id || dev._id,
          deviceId: dev.deviceId,
          browserFingerprint: dev.browserFingerprint || 'Unknown Browser Node',
          deviceName: dev.browserFingerprint || 'Unknown Browser Node',
          trustScore: dev.trustScore || 95,
          lastUsed: dev.lastUsed || dev.createdAt || new Date().toISOString(),
          createdAt: dev.lastUsed || dev.createdAt || new Date().toISOString(),
          lastIp: dev.lastIp || '127.0.0.1',
          deviceType: 'Desktop', // default
          isTrusted: true
        });
      }
    });
    
    // Then, merge with login history for completeness
    history.forEach(log => {
      const os = log.os || 'Unknown OS';
      const browser = log.browser || 'Unknown Browser';
      const deviceNameStr = `${os} - ${browser}`;
      const isMobile = os.includes('Android') || os.includes('iOS') || os.includes('iPhone') || os.includes('iPad');
      
      // Try to match key or device ID
      let matchedKey = null;
      for (const [key, dev] of devicesMap.entries()) {
        if (dev.browserFingerprint && (dev.browserFingerprint.includes(browser) && dev.browserFingerprint.includes(os))) {
          matchedKey = key;
          break;
        }
      }
      
      if (matchedKey) {
        const existing = devicesMap.get(matchedKey);
        existing.lastIp = log.ipAddress || existing.lastIp;
        existing.deviceType = isMobile ? 'Mobile' : existing.deviceType;
      } else {
        const key = log.deviceId || `${os}-${browser}`;
        if (!devicesMap.has(key)) {
          devicesMap.set(key, {
            id: log.id || log._id,
            deviceId: log.deviceId || key,
            browserFingerprint: deviceNameStr,
            deviceName: deviceNameStr,
            trustScore: 70, // lower score for untrusted devices
            lastUsed: log.createdAt,
            createdAt: log.createdAt,
            lastIp: log.ipAddress || '127.0.0.1',
            deviceType: isMobile ? 'Mobile' : 'Desktop',
            isTrusted: false
          });
        }
      }
    });
    
    res.json(Array.from(devicesMap.values()));
  } catch (err) {
    console.error('🔥 GET_SECURITY_DEVICES_FAIL:', err.message);
    res.status(500).json({ message: 'Devices list offline' });
  }
});

/**
 * DELETE /devices/:deviceName
 * Removes device entries from login history and trusted_devices.
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
    
    // Revoke from trusted_devices
    const trusted = await fallbackDb.find('trusted_devices', { userId }) || [];
    const targetTrusted = trusted.filter(d => 
      d.browserFingerprint === deviceName || 
      d.deviceId === deviceName || 
      `${d.browserFingerprint}`.includes(deviceName) ||
      deviceName.includes(`${d.browserFingerprint}`)
    );
    for (const d of targetTrusted) {
      await fallbackDb.deleteOne('trusted_devices', d.id || d._id);
    }
    
    // Revoke from loginHistory too
    const history = await fallbackDb.find('loginHistory', { userId }) || [];
    const targetHistory = history.filter(log => {
      const name = `${log.os} - ${log.browser}`;
      return name === deviceName || log.deviceId === deviceName;
    });
    for (const match of targetHistory) {
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

async function runBiometricAIScan(user, currentAttempt, recentLogs, recentHistory) {
  require('dotenv').config();

  if (!aiClient) {
    try {
      if (process.env.AI_API_KEY && process.env.AI_API_KEY !== 'placeholder') {
        aiClient = new OpenAI({
          baseURL: process.env.AI_BASE_URL || "https://api.nexovtech.ai/v1",
          apiKey: process.env.AI_API_KEY
        });
      }
    } catch (e) {
      console.warn('⚠️ Failed to initialize OpenAI client inside AI Agent:', e.message);
    }
  }

  if (!aiClient) {
    console.warn('⚠️ Biometrics AI Agent skipped: AI Client not initialized.');
    return { riskScore: 0, threatAssessment: 'Sentinel AI module offline. Local rules applied.', verdict: 'CHALLENGE' };
  }

  const model = process.env.AI_MODEL || "meta/llama-3.1-8b-instruct";
  
  const systemPrompt = `You are the Sentinel AI Security Agent for NexovTech Enterprise. Your job is to analyze biometric authentication attempts and evaluate threats.
Analyze the user's current attempt details compared to their recent login history and biometric logs.
Determine:
1. riskScore (0 to 100).
2. threatAssessment: short 1-2 sentence description explaining any anomalies.
3. verdict: 'ALLOW' (trusted device or low risk), 'CHALLENGE' (unrecognized device/moderate risk, needs OTP), or 'LOCK' (severe risk, e.g. brute force, suspicious geo-hops, status issues, high riskScore >= 85).

You MUST respond with a valid JSON object ONLY, matching this schema:
{
  "riskScore": number,
  "threatAssessment": "string",
  "verdict": "ALLOW" | "CHALLENGE" | "LOCK"
}`;

  const prompt = `
[USER CONTEXT]
- Name: ${user.name}
- Email: ${user.email}
- Role: ${user.role}
- Tenant ID: ${user.tenantId}

[CURRENT ATTEMPT]
- Device ID: ${currentAttempt.deviceId}
- Device Info: ${JSON.stringify(currentAttempt.deviceInfo)}
- Liveness Passed: ${currentAttempt.livenessPassed}
- Similarity Score: ${currentAttempt.score}
- IP Address: ${currentAttempt.ip}
- Location: ${currentAttempt.location}

[RECENT BIOMETRIC LOGS]
${JSON.stringify(recentLogs.map(l => ({ attemptType: l.attemptType, status: l.status, ip: l.ipAddress, browser: l.browser, os: l.os, timestamp: l.timestamp })))}

[RECENT LOGIN HISTORY]
${JSON.stringify(recentHistory.map(h => ({ status: h.loginStatus, ip: h.ipAddress, browser: h.browser, location: h.location, timestamp: h.createdAt })))}
`;

  try {
    const response = await aiClient.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content.trim();
    console.log("🤖 SENTINEL AI AGENT SCAN RESULT:", content);
    return JSON.parse(content);
  } catch (err) {
    console.error('🔥 Sentinel AI scan execution failed:', err.message);
    return {
      riskScore: 0,
      threatAssessment: 'Sentinel AI analysis failed. Local fail-safe challenge triggered.',
      verdict: 'CHALLENGE'
    };
  }
}

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
    if (!stored && user.email) {
      stored = await fallbackDb.findOne('biometrics_templates', { email: user.email.toLowerCase() });
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

    // Retrieve location information and logs/history for AI context
    const geoLookup = require('../utils/geoLookup');
    const geo = await geoLookup(req.ip || req.headers['x-forwarded-for'] || '127.0.0.1');
    const locationStr = geo ? `${geo.city}, ${geo.region}, ${geo.country}` : 'Remote Gateway';

    const recentLogs = await fallbackDb.find('biometrics_logs', { userId: primaryId }) || [];
    const recentHistory = await fallbackDb.find('loginHistory', { userId: primaryId }) || [];
    const sortedLogs = recentLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
    const sortedHistory = recentHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

    // Invoke Sentinel AI Security Agent Scan
    const currentAttempt = {
      deviceId,
      deviceInfo: {
        browser: deviceInfo?.browser || agent.toAgent(),
        os: deviceInfo?.os || agent.os.toString()
      },
      livenessPassed,
      score,
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      location: locationStr
    };

    const aiScan = await runBiometricAIScan(user, currentAttempt, sortedLogs, sortedHistory);

    if (aiScan.verdict === 'LOCK') {
      // Temporarily lock user node
      await fallbackDb.update('users', user.id || user._id, { status: 'Locked' });

      await fallbackDb.save('biometrics_logs', {
        userId: user.id || user._id,
        email: user.email,
        attemptType: 'Verification',
        status: 'Failed_Locked',
        deviceId,
        deviceScore: 0,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        location: locationStr,
        browser: agent.toAgent(),
        os: agent.os.toString(),
        timestamp: new Date().toISOString(),
        tenantId: user.tenantId || 'org_default',
        threatAssessment: aiScan.threatAssessment || 'Sentinel AI Agent triggered automatic lockout.',
        aiRiskScore: aiScan.riskScore || 90
      });

      return res.status(403).json({
        message: `Access Denied: Account has been locked by Sentinel AI Security Agent. Threat Assessment: ${aiScan.threatAssessment}`
      });
    }

    // Check trusted device
    const trustedDevices = await fallbackDb.find('trusted_devices', { userId: user.id || user._id }) || [];
    const isDeviceTrusted = trustedDevices.some(d => d.deviceId === deviceId);

    // Enforce OTP if verdict is CHALLENGE or device is untrusted
    const requireOtpChallenge = aiScan.verdict === 'CHALLENGE' || !isDeviceTrusted;

    if (requireOtpChallenge) {
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
          subject: '[NexovTech Security] Verification Code for Biometric Sign-in Challenge',
          body: `A biometric sign-in challenge was triggered by the Sentinel AI Agent. Use the following 6-digit code to authorize access: \n\n${otpCode}\n\nIf you did not initiate this, please contact administrator immediately.`,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          status: 'Unread',
          priority: 'High'
        });

        console.log(`🛡️ OTP Sent to ${user.email}: ${otpCode}`);

        // Dispatch Biometric OTP to Telegram Bot if user is linked
        let targetTelegramId = user.telegramId;
        if (!targetTelegramId) {
          const mapping = await fallbackDb.findOne('telegram_users', { companyEmail: user.email.toLowerCase() }) ||
                          await fallbackDb.findOne('telegram_users', { firebaseUid: user.id || user._id });
          if (mapping) {
            targetTelegramId = mapping.telegramId;
          }
        }

        if (targetTelegramId) {
          try {
            const { sendNotification } = require('../bot/telegramBot');
            const alertMsg = `🔑 *NexovTech Biometric OTP Challenge*\n\nSentinel AI Security Agent has triggered a verification challenge.\n\nYour 6-digit verification code is:\n\n\`${otpCode}\`\n\nPlease enter this code to complete authentication.`;
            await sendNotification(targetTelegramId, alertMsg);
            console.log(`🛡️ OTP Sent to Telegram user ${targetTelegramId}`);
          } catch (teleErr) {
            console.error('🔥 Failed to send biometric OTP to Telegram:', teleErr.message);
          }
        }

        return res.json({
          requireOTP: true,
          message: 'Biometric challenge triggered. Verification code dispatched to your email and linked Telegram device.'
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

        // Add to trusted devices if it's not already trusted
        if (!isDeviceTrusted) {
          await fallbackDb.save('trusted_devices', {
            deviceId,
            userId: user.id || user._id,
            browserFingerprint: `${deviceInfo?.browser || agent.toAgent()} on ${deviceInfo?.os || agent.os.toString()}`,
            trustScore: 95,
            lastUsed: new Date().toISOString(),
            tenantId: user.tenantId || 'org_default'
          });
        }
      }
    } else {
      // Update lastUsed for trusted device if we didn't do OTP challenge
      const currentDevice = trustedDevices.find(d => d.deviceId === deviceId);
      if (currentDevice) {
        await fallbackDb.update('trusted_devices', currentDevice.id || currentDevice._id, {
          lastUsed: new Date().toISOString()
        });
      }
    }

    // Record Success to LoginHistory & biometrics_logs
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
      tenantId: user.tenantId || 'org_default',
      threatAssessment: aiScan.threatAssessment,
      aiRiskScore: aiScan.riskScore
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
    let template = await fallbackDb.findOne('biometrics_templates', { userId });
    if (!template && user?.email) {
      template = await fallbackDb.findOne('biometrics_templates', { email: user.email.toLowerCase() });
    }
    
    let webauthn = await fallbackDb.findOne('webauthn_credentials', { userId });
    if (!webauthn && user?.email) {
      webauthn = await fallbackDb.findOne('webauthn_credentials', { email: user.email.toLowerCase() });
    }

    res.json({
      enrolled: !!(template && template.encryptedTemplate),
      enrolledAt: template ? template.createdAt : null,
      webauthnEnrolled: !!webauthn,
      webauthnEnrolledAt: webauthn ? webauthn.createdAt : null,
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
    const sortedLogs = logs.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

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
        failedAttempts: logs.filter(l => l.status && typeof l.status === 'string' && l.status.startsWith('Failed')).length,
        activeDevices: new Set(devices.map(d => d.deviceId).filter(Boolean)).size
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

    let template = await fallbackDb.findOne('biometrics_templates', { userId });
    if (!template && targetUser?.email) {
      template = await fallbackDb.findOne('biometrics_templates', { email: targetUser.email.toLowerCase() });
    }
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

// ── GET ANDROID BUILD & COMPILATION STATUS ──
router.get('/android/status', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const fallbackDb = require('../utils/fallbackDb');
  const { getBuildStatus } = require('../utils/androidBuilder');

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    const user = await fallbackDb.findById('users', decoded.id);
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return res.status(403).json({ message: 'Access denied: Administrative clearance required.' });
    }

    const status = getBuildStatus();
    res.json(status);
  } catch (err) {
    console.error('🔥 GET_ANDROID_STATUS_FAIL:', err.message);
    res.status(500).json({ message: 'Android compiler offline.' });
  }
});

// ── TRIGGER ANDROID APK COMPILE & DEPLOYMENT ──
router.post('/android/build', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const fallbackDb = require('../utils/fallbackDb');
  const { triggerAndroidBuild } = require('../utils/androidBuilder');

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    const user = await fallbackDb.findById('users', decoded.id);
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return res.status(403).json({ message: 'Access denied: Administrative clearance required.' });
    }

    const result = triggerAndroidBuild(user);
    res.json(result);
  } catch (err) {
    console.error('🔥 TRIGGER_ANDROID_BUILD_FAIL:', err.message);
    res.status(400).json({ message: err.message || 'Android build failed to initialize.' });
  }
});

// ── GET ANDROID PERMISSIONS CONFIGURATION ──
router.get('/android/permissions', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const fallbackDb = require('../utils/fallbackDb');
  const fs = require('fs');
  const path = require('path');

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    const user = await fallbackDb.findById('users', decoded.id);
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return res.status(403).json({ message: 'Access denied: Administrative clearance required.' });
    }

    const manifestPath = path.resolve(__dirname, '../../client/android/app/src/main/AndroidManifest.xml');
    if (!fs.existsSync(manifestPath)) {
      return res.status(404).json({ message: 'AndroidManifest.xml file not found in client directory.' });
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf8');

    const CONTROLLED_PERMISSIONS = [
      { id: 'android.permission.CAMERA', name: 'Camera Access', description: 'Required for facial verification and biometric liveness checks.' },
      { id: 'android.permission.RECORD_AUDIO', name: 'Microphone Access', description: 'Required for voice-based liveness verification.' },
      { id: 'android.permission.POST_NOTIFICATIONS', name: 'Push Notifications', description: 'Allows sending system alarms, task updates, and security logs.' },
      { id: 'android.permission.ACCESS_FINE_LOCATION', name: 'Fine Location', description: 'Required for geofence validation and automated check-ins.' },
      { id: 'android.permission.ACCESS_COARSE_LOCATION', name: 'Coarse Location', description: 'Required for approximate area geofence validation.' },
      { id: 'android.permission.READ_MEDIA_IMAGES', name: 'Read Media Images', description: 'Allows access to device image gallery.' },
      { id: 'android.permission.READ_MEDIA_VIDEO', name: 'Read Media Video', description: 'Allows access to device video gallery.' },
      { id: 'android.permission.READ_MEDIA_AUDIO', name: 'Read Media Audio', description: 'Allows access to device audio library.' },
      { id: 'android.permission.READ_EXTERNAL_STORAGE', name: 'Read External Storage', description: 'Legacy storage read access for Android 12 and below.' },
      { id: 'android.permission.WRITE_EXTERNAL_STORAGE', name: 'Write External Storage', description: 'Legacy storage write access for Android 9 and below.' }
    ];

    const permissionsStatus = CONTROLLED_PERMISSIONS.map(p => {
      let enabled = false;
      if (p.id === 'android.permission.WRITE_EXTERNAL_STORAGE') {
        enabled = manifestContent.includes('android.permission.WRITE_EXTERNAL_STORAGE');
      } else {
        enabled = manifestContent.includes(`name="${p.id}"`);
      }
      return { ...p, enabled };
    });

    res.json(permissionsStatus);
  } catch (err) {
    console.error('🔥 GET_ANDROID_PERMISSIONS_FAIL:', err.message);
    res.status(500).json({ message: 'Failed to read Android permissions configuration.' });
  }
});

// ── SAVE ANDROID PERMISSIONS CONFIGURATION ──
router.post('/android/permissions', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const fallbackDb = require('../utils/fallbackDb');
  const fs = require('fs');
  const path = require('path');

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    const user = await fallbackDb.findById('users', decoded.id);
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return res.status(403).json({ message: 'Access denied: Administrative clearance required.' });
    }

    const manifestPath = path.resolve(__dirname, '../../client/android/app/src/main/AndroidManifest.xml');
    const mainActivityPath = path.resolve(__dirname, '../../client/android/app/src/main/java/com/NexovTech/app/MainActivity.java');

    if (!fs.existsSync(manifestPath) || !fs.existsSync(mainActivityPath)) {
      return res.status(404).json({ message: 'Android source files missing. Cannot apply configurations.' });
    }

    const CONTROLLED_PERMISSIONS = [
      { id: 'android.permission.CAMERA' },
      { id: 'android.permission.RECORD_AUDIO' },
      { id: 'android.permission.POST_NOTIFICATIONS' },
      { id: 'android.permission.ACCESS_FINE_LOCATION' },
      { id: 'android.permission.ACCESS_COARSE_LOCATION' },
      { id: 'android.permission.READ_MEDIA_IMAGES' },
      { id: 'android.permission.READ_MEDIA_VIDEO' },
      { id: 'android.permission.READ_MEDIA_AUDIO' },
      { id: 'android.permission.READ_EXTERNAL_STORAGE' },
      { id: 'android.permission.WRITE_EXTERNAL_STORAGE' }
    ];

    // 1. Rewrite AndroidManifest.xml
    let manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const lines = manifestContent.split('\n');
    const filteredLines = lines.filter(line => {
      for (const p of CONTROLLED_PERMISSIONS) {
        if (line.includes(p.id)) return false;
      }
      return true;
    });

    const permissionCommentIndex = filteredLines.findIndex(line => line.includes('<!-- Permissions -->'));
    if (permissionCommentIndex !== -1) {
      const newPermissionsLines = [];
      if (!filteredLines.some(l => l.includes('android.permission.INTERNET'))) {
        newPermissionsLines.push('    <uses-permission android:name="android.permission.INTERNET" />');
      }

      for (const p of CONTROLLED_PERMISSIONS) {
        if (req.body[p.id]) {
          if (p.id === 'android.permission.WRITE_EXTERNAL_STORAGE') {
            newPermissionsLines.push('    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />');
          } else {
            newPermissionsLines.push(`    <uses-permission android:name="${p.id}" />`);
          }
        }
      }
      filteredLines.splice(permissionCommentIndex + 1, 0, ...newPermissionsLines);
    }
    fs.writeFileSync(manifestPath, filteredLines.join('\n'), 'utf8');

    // 2. Rewrite MainActivity.java dynamically
    const cameraBlock = req.body['android.permission.CAMERA'] ? `
        // Camera permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) 
                != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.CAMERA);
        }
` : '';

    const recordAudioBlock = req.body['android.permission.RECORD_AUDIO'] ? `
        // Microphone permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) 
                != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.RECORD_AUDIO);
        }
` : '';

    const fineLocationBlock = req.body['android.permission.ACCESS_FINE_LOCATION'] ? `
        // Fine Location permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) 
                != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
` : '';

    const coarseLocationBlock = req.body['android.permission.ACCESS_COARSE_LOCATION'] ? `
        // Coarse Location permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) 
                != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }
` : '';

    // SDK 33+ permissions
    let sdk33Block = '';
    if (req.body['android.permission.POST_NOTIFICATIONS'] || req.body['android.permission.READ_MEDIA_IMAGES'] || req.body['android.permission.READ_MEDIA_VIDEO'] || req.body['android.permission.READ_MEDIA_AUDIO']) {
      sdk33Block += `
        // Notification and Media permissions for Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {`;
      if (req.body['android.permission.POST_NOTIFICATIONS']) {
        sdk33Block += `
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) 
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS);
            }`;
      }
      if (req.body['android.permission.READ_MEDIA_IMAGES']) {
        sdk33Block += `
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) 
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_MEDIA_IMAGES);
            }`;
      }
      if (req.body['android.permission.READ_MEDIA_VIDEO']) {
        sdk33Block += `
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_VIDEO) 
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_MEDIA_VIDEO);
            }`;
      }
      if (req.body['android.permission.READ_MEDIA_AUDIO']) {
        sdk33Block += `
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_AUDIO) 
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_MEDIA_AUDIO);
            }`;
      }
      sdk33Block += `
        }
      `;
    }

    // SDK 32- permissions
    let sdk32Block = '';
    if (req.body['android.permission.READ_EXTERNAL_STORAGE']) {
      sdk32Block += `
        // Storage permissions for Android 12 and below
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) 
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }
      `;
    }

    const mainActivityContent = `package com.NexovTech.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        requestRequiredPermissions();
    }

    private void requestRequiredPermissions() {
        List<String> permissionsNeeded = new ArrayList<>();
${cameraBlock}${recordAudioBlock}${fineLocationBlock}${coarseLocationBlock}${sdk33Block}${sdk32Block}
        if (!permissionsNeeded.isEmpty()) {
            ActivityCompat.requestPermissions(this, 
                    permissionsNeeded.toArray(new String[0]), 101);
        }
    }
}`;

    fs.writeFileSync(mainActivityPath, mainActivityContent, 'utf8');

    // Save admin configuration action
    await fallbackDb.save('admin_logs', {
      action: 'ANDROID_PERMISSIONS_SYNC',
      status: 'info',
      performedBy: user.name || user.email,
      details: req.body,
      timestamp: new Date()
    });

    res.json({ success: true, message: 'Android source configurations sync applied successfully.' });
  } catch (err) {
    console.error('🔥 POST_ANDROID_PERMISSIONS_FAIL:', err.message);
    res.status(550).json({ message: 'Failed to write Android permissions config files.' });
  }
});

// ── DOWNLOAD COMPILED ANDROID APK ──
router.get('/android/download', async (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const apkPath = path.resolve(__dirname, '../../nexovtech.apk');

  if (fs.existsSync(apkPath)) {
    res.download(apkPath, 'nexovtech.apk');
  } else {
    res.status(404).json({ message: 'Compiled Android APK package not found on server. Please trigger a compilation build first.' });
  }
});

// ── ZERO-TRUST FINGERPRINT LOGIN VERIFY ──
router.post('/fingerprint/verify', async (req, res) => {
  const { email, deviceId } = req.body;
  const fallbackDb = require('../utils/fallbackDb');
  const jwt = require('jsonwebtoken');
  const useragent = require('useragent');
  const agent = useragent.parse(req.headers['user-agent'] || '');

  if (!email || !deviceId) {
    return res.status(400).json({ message: 'Missing email or device fingerprint.' });
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

    // Check if device is trusted for this user
    const trustedDevices = await fallbackDb.find('trusted_devices', { userId: user.id || user._id }) || [];
    const matchedDevice = trustedDevices.find(d => d.deviceId === deviceId);

    if (!matchedDevice) {
      // Save a failed log
      await fallbackDb.save('loginHistory', {
        userId: user.id || user._id,
        email: user.email,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        device: agent.device.toString(),
        browser: agent.toAgent(),
        os: agent.os.toString(),
        loginStatus: 'Failed_Untrusted_Device',
        location: 'Remote Gateway',
        area: 'UTC',
        application: 'NexovTech Web Portal (Fingerprint)',
        createdAt: new Date().toISOString()
      });

      return res.status(401).json({
        message: 'Untrusted device node. Fingerprint login is only available on verified trusted devices. Please log in with credentials first and trust this device.'
      });
    }

    // Device is trusted. Update lastUsed
    await fallbackDb.update('trusted_devices', matchedDevice.id || matchedDevice._id, {
      lastUsed: new Date().toISOString()
    });

    // Record login success
    await fallbackDb.save('loginHistory', {
      userId: user.id || user._id,
      email: user.email,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      device: agent.device.toString(),
      browser: agent.toAgent(),
      os: agent.os.toString(),
      loginStatus: 'Success',
      location: 'Remote Gateway',
      area: 'UTC',
      application: 'NexovTech Web Portal (Fingerprint)',
      createdAt: new Date().toISOString()
    });

    // Generate JWT
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
        twoFactorEnabled: user.twoFactorEnabled
      }
    });

  } catch (err) {
    console.error('🔥 FINGERPRINT_VERIFY_FAILURE:', err);
    res.status(500).json({ message: 'Internal fingerprint login authentication error.' });
  }
});

// ── PUBLIC WEBAUTHN STATUS CHECK (no auth required) ──
router.post('/webauthn/status', async (req, res) => {
  const { email } = req.body;
  const fallbackDb = require('../utils/fallbackDb');

  if (!email) return res.status(400).json({ message: 'Missing email.' });

  try {
    let user = await fallbackDb.findOne('users', { email: email.toLowerCase() });
    if (!user) user = await fallbackDb.findOne('users', { companyEmail: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User profile not found.' });

    const credential = await fallbackDb.findOne('webauthn_credentials', { userId: user.id || user._id });
    res.json({
      enrolled: !!credential,
      userId: user.id || user._id
    });
  } catch (err) {
    console.error('🔥 WEBAUTHN_STATUS_FAIL:', err.message);
    res.status(500).json({ message: 'Failed to check WebAuthn status.' });
  }
});

// ── PUBLIC WEBAUTHN REGISTRATION (for first-time fingerprint login) ──
// This endpoint saves the WebAuthn credential using email as identity — no auth token needed
router.post('/webauthn/register-public', async (req, res) => {
  const { email, credentialId, publicKey } = req.body;
  const fallbackDb = require('../utils/fallbackDb');

  if (!email || !credentialId || !publicKey) {
    return res.status(400).json({ message: 'Missing fields for WebAuthn registration.' });
  }

  try {
    let user = await fallbackDb.findOne('users', { email: email.toLowerCase() });
    if (!user) user = await fallbackDb.findOne('users', { companyEmail: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found. Please verify your email address.' });

    if (user.status === 'Locked') {
      return res.status(403).json({ message: 'Account is locked. Contact administration.' });
    }

    const existing = await fallbackDb.findOne('webauthn_credentials', { userId: user.id || user._id });
    if (existing) {
      await fallbackDb.update('webauthn_credentials', existing.id || existing._id, {
        credentialId,
        publicKey,
        updatedAt: new Date().toISOString()
      });
    } else {
      await fallbackDb.save('webauthn_credentials', {
        userId: user.id || user._id,
        email: user.email.toLowerCase(),
        credentialId,
        publicKey,
        createdAt: new Date().toISOString()
      });
    }

    console.log(`🔐 WEBAUTHN: Public registration for ${user.email}`);
    res.json({ success: true, message: 'Physical fingerprint registered successfully.' });
  } catch (err) {
    console.error('🔥 WEBAUTHN_PUBLIC_REGISTER_FAIL:', err.message);
    res.status(500).json({ message: 'Failed to register fingerprint.' });
  }
});

// ── REGISTER WEBAUTHN DEVICE CREDENTIAL (authenticated, from settings) ──
router.post('/webauthn/register', async (req, res) => {
  const { email, credentialId, publicKey } = req.body;
  const fallbackDb = require('../utils/fallbackDb');
  const jwt = require('jsonwebtoken');

  if (!email || !credentialId || !publicKey) {
    return res.status(400).json({ message: 'Missing fields for WebAuthn registration.' });
  }

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    let user = await fallbackDb.findById('users', decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if user has an existing webauthn credential
    const existing = await fallbackDb.findOne('webauthn_credentials', { userId: user.id || user._id });
    if (existing) {
      await fallbackDb.update('webauthn_credentials', existing.id || existing._id, {
        credentialId,
        publicKey,
        updatedAt: new Date().toISOString()
      });
    } else {
      await fallbackDb.save('webauthn_credentials', {
        userId: user.id || user._id,
        email: user.email.toLowerCase(),
        credentialId,
        publicKey,
        createdAt: new Date().toISOString()
      });
    }

    res.json({ success: true, message: 'System default biometrics registered successfully.' });
  } catch (err) {
    console.error('🔥 WEBAUTHN_REGISTER_FAIL:', err.message);
    res.status(500).json({ message: 'Failed to register WebAuthn credential.' });
  }
});

// ── GET WEBAUTHN CREDENTIALS INFO FOR LOGIN ──
router.post('/webauthn/challenge', async (req, res) => {
  const { email } = req.body;
  const fallbackDb = require('../utils/fallbackDb');

  if (!email) {
    return res.status(400).json({ message: 'Missing email.' });
  }

  try {
    let user = await fallbackDb.findOne('users', { email: email.toLowerCase() });
    if (!user) {
      user = await fallbackDb.findOne('users', { companyEmail: email.toLowerCase() });
    }
    if (!user) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    const credential = await fallbackDb.findOne('webauthn_credentials', { userId: user.id || user._id });
    if (!credential) {
      return res.status(404).json({ message: 'No system default biometrics registered for this email.' });
    }

    res.json({
      credentialId: credential.credentialId,
      userId: user.id || user._id
    });
  } catch (err) {
    console.error('🔥 WEBAUTHN_CHALLENGE_FAIL:', err.message);
    res.status(500).json({ message: 'Failed to generate WebAuthn challenge.' });
  }
});

// ── VERIFY WEBAUTHN AUTHENTICATION ──
router.post('/webauthn/verify', async (req, res) => {
  const { email, credentialId } = req.body;
  const fallbackDb = require('../utils/fallbackDb');
  const jwt = require('jsonwebtoken');
  const useragent = require('useragent');
  const agent = useragent.parse(req.headers['user-agent'] || '');

  if (!email || !credentialId) {
    return res.status(400).json({ message: 'Missing fields for WebAuthn authentication.' });
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
      return res.status(403).json({ message: 'Account is locked. Contact administration.' });
    }

    const credential = await fallbackDb.findOne('webauthn_credentials', { userId: user.id || user._id });
    if (!credential || credential.credentialId !== credentialId) {
      return res.status(401).json({ message: 'Biometric hardware key mismatch.' });
    }

    // Record login success
    await fallbackDb.save('loginHistory', {
      userId: user.id || user._id,
      email: user.email,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      device: agent.device.toString(),
      browser: agent.toAgent(),
      os: agent.os.toString(),
      loginStatus: 'Success',
      location: 'Remote Gateway',
      area: 'UTC',
      application: 'NexovTech Web Portal (System Biometric)',
      createdAt: new Date().toISOString()
    });

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
        twoFactorEnabled: user.twoFactorEnabled
      }
    });

  } catch (err) {
    console.error('🔥 WEBAUTHN_VERIFY_FAILURE:', err);
    res.status(500).json({ message: 'Internal WebAuthn verification error.' });
  }
});

// ── DELETE WEBAUTHN DEVICE CREDENTIAL ──
router.delete('/webauthn/delete', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const fallbackDb = require('../utils/fallbackDb');

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');
    const userId = decoded.id;

    const credential = await fallbackDb.findOne('webauthn_credentials', { userId });
    if (!credential) {
      return res.status(404).json({ message: 'No system default biometric credential found for this user.' });
    }

    await fallbackDb.deleteOne('webauthn_credentials', credential.id || credential._id);

    res.json({ success: true, message: 'System default biometric credential deleted successfully.' });
  } catch (err) {
    console.error('🔥 WEBAUTHN_DELETE_FAIL:', err.message);
    res.status(500).json({ message: 'Failed to delete system default biometric credential.' });
  }
});

module.exports = router;
