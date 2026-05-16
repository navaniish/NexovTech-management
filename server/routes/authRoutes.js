const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');
const upload = require('../middleware/upload');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const LoginHistory = require('../models/LoginHistory');
const useragent = require('useragent');
const { sendNotification } = require('../bot/telegramBot');

// POST /auth/upload-avatar/:id — Upload profile photo
router.post('/upload-avatar/:id', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let userId = req.params.id;
    if (userId === 'admin_bypass') userId = 'nexovtech@myyahoo.com';
    // Construct the URL for the avatar
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const updatedUser = await fallbackDb.update('users', userId, { avatar: avatarUrl });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile photo updated successfully',
      avatar: avatarUrl
    });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ message: 'Failed to upload profile photo' });
  }
});

// GET /auth/me — Sync user data from UID
router.get('/me', async (req, res) => {
  const { uid, email } = req.query;

  let user;
  if (email) {
    // 1. Explicit Email Lookup (High Priority for Bypass/Discovery)
    user = await fallbackDb.findOne('users', { email: email.toLowerCase() });
  } else if (uid) {
    // 2. UID Lookup (Standard Auth Sync)
    user = await fallbackDb.findOne('users', { firebaseUid: uid });
  }

  if (user) {
    if (user.email === 'nexovtech@myyahoo.com') user.role = 'Admin';
    return res.json(user);
  }

  res.status(404).json({ message: 'User profile not found in Registry.' });
});

// POST /auth/register — Create/Sync profile from Firebase
router.post('/register', async (req, res) => {
  const { uid, email, name, role, password } = req.body;
  const userData = {
    firebaseUid: uid,
    email: email.toLowerCase(),
    name: name || 'New Explorer',
    role: email.toLowerCase() === 'nexovtech@myyahoo.com' ? 'Admin' : (role || 'Employee'),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name + Date.now()}`,
    createdAt: new Date()
  };

  if (password) {
    const salt = await bcrypt.genSalt(10);
    userData.password = await bcrypt.hash(password, salt);
  }

  const savedUser = await fallbackDb.save('users', userData);
  res.json(savedUser);
});

// GET Discover Real Email from Virtual Identity
router.get('/discovery/:companyEmail', async (req, res) => {
  try {
    const { companyEmail } = req.params;
    console.log(`🔍 DISCOVERY_QUERY: [${companyEmail}]`);
    const user = await fallbackDb.findOne('users', { companyEmail: companyEmail.toLowerCase() });
    if (!user) {
      console.warn(`⚠️ DISCOVERY_MISSING: No mapping found for [${companyEmail}]`);
      return res.status(404).json({ message: 'Virtual identity not found' });
    }
    res.json({ email: user.email });
  } catch (err) {
    res.status(500).json({ message: 'Discovery service offline' });
  }
});

// POST /auth/login — Secure Identity Verification & Session Initialization
router.post('/login', async (req, res) => {
  const { email, firebaseToken, token } = req.body; // 'token' here is the 2FA MFA token
  const agent = useragent.parse(req.headers['user-agent']);
  const { admin } = require('../firebaseAdmin');

  try {
    let firebaseUser;

    // 1. Verify Firebase ID Token if provided (Modern Flow)
    if (firebaseToken) {
      try {
        firebaseUser = await admin.auth().verifyIdToken(firebaseToken);
        console.log(`✅ FIREBASE_VERIFIED: [${firebaseUser.email}]`);

        // 1.1 Provider Policy Enforcement
        // Team members with '.nexovtech@gmail.com' must use Google Login ONLY
        const authEmail = firebaseUser.email.toLowerCase();
        const signInProvider = firebaseUser.firebase.sign_in_provider;
        
        if (authEmail.includes('.nexovtech@gmail.com') && signInProvider === 'password') {
          console.warn(`🛡️ SECURITY_POLICY: Blocked password login for [${authEmail}]. Google OAuth required.`);
          return res.status(403).json({ 
            message: 'Unauthorized Provider: Please use "Sign in with Google" to access your NexovTech account.' 
          });
        }
      } catch (authErr) {
        console.error('🔥 FIREBASE_TOKEN_INVALID:', authErr.message);
        return res.status(401).json({ message: 'Identity verification failed. Token expired or invalid.' });
      }
    } else {
      return res.status(400).json({ message: 'Identity token required for authorization.' });
    }

    // 2. Fetch/Sync User from Registry
    const lookupEmail = firebaseUser.email || (email ? email.toLowerCase() : '');
    if (!lookupEmail) {
      return res.status(400).json({ message: 'Email identity required' });
    }
    let user = await fallbackDb.findOne('users', { email: lookupEmail });

    // Virtual Email Generator
    const generateCompanyEmail = (name) => `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@nexovtech.com`;

    if (!user) {
      console.log(`🚀 ENTERPRISE_SYNC: New identity detected [${lookupEmail}]. Provisioning virtual workspace profile...`);
      const name = firebaseUser.name || lookupEmail.split('@')[0];
      user = await fallbackDb.save('users', {
        email: lookupEmail,
        companyEmail: generateCompanyEmail(name),
        firebaseUid: firebaseUser.uid,
        name: name,
        role: lookupEmail === 'nexovtech@myyahoo.com' ? 'Super Admin' : 'Employee',
        department: lookupEmail === 'nexovtech@myyahoo.com' ? 'Executive' : 'General',
        status: 'Active',
        avatar: firebaseUser.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${lookupEmail}`,
        lastActive: new Date(),
        createdAt: new Date()
      });
    } else {
      // Update lastActive on every login/sync
      const updatedUser = await fallbackDb.update('users', user.id || user._id, {
        lastActive: new Date()
      });
      if (updatedUser) user = updatedUser;
    }

    if (!user) {
      return res.status(500).json({ message: 'Failed to provision or retrieve user profile.' });
    }

    // 3. Check 2FA (TOTP or Backup Code)
    if (user.twoFactorEnabled) {
      if (!token) {
        return res.json({ require2FA: true, userId: user.id || user._id });
      }

      const speakeasy = require('speakeasy');
      
      // Try TOTP first
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token
      });

      if (!verified) {
        // Try Backup Codes
        const backupCodes = user.backupCodes || [];
        const codeIndex = backupCodes.indexOf(token);
        
        if (codeIndex !== -1) {
          console.log(`🛡️ SECURITY_BRIDGE: Emergency backup code consumed for [${user.email}]`);
          // Consume the code
          backupCodes.splice(codeIndex, 1);
          await fallbackDb.update('users', user.id || user._id, { backupCodes });
        } else {
          return res.status(400).json({ message: 'Invalid verification token' });
        }
      }
    }

    // 4. Record Success History
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
      application: 'NexovTech Web Portal',
      createdAt: new Date()
    });
    
    // 4.5 Send Telegram Notification if linked
    if (user.telegramId) {
      sendNotification(user.telegramId, `🛡️ *Security Alert*: A new login to your NexovTech portal was detected.\n\n📍 *IP*: ${req.ip || 'Unknown'}\n🖥️ *Device*: ${agent.os.toString()} / ${agent.toAgent()}`);
    }
 
    // 5. Generate Internal Session JWT
    const jwtToken = jwt.sign(
      { id: user.id || user._id, role: user.role, firebaseUid: firebaseUser.uid },
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
    console.error('🔥 SESSION_INIT_ERROR:', err);
    res.status(500).json({ message: 'Mission Control failed to initialize session.' });
  }
});

// Grant Access (Admin)
router.post('/grant-access', async (req, res) => {
  const { email, role, name, tempPassword, bankName, accountNumber, ifscCode, upiId, phoneNo } = req.body;
  const { admin } = require('../firebaseAdmin');

  if (!email) return res.status(400).json({ message: 'Email is required for secure delegation' });

  try {
    console.log(`🛡️ SECURITY_BRIDGE: Provisioning identity for [${email}]...`);

    let firebaseUid = null;

    // 1. Optional: Create User in Firebase Auth if password provided (otherwise rely on Google Login sync)
    // POLICY: If email is '.nexovtech@gmail.com', password creation is FORBIDDEN.
    const isNexovtechGmail = email.toLowerCase().includes('.nexovtech@gmail.com');

    if (tempPassword && !isNexovtechGmail) {
      try {
        const firebaseUser = await admin.auth().createUser({
          email: email.trim().toLowerCase(),
          password: tempPassword,
          displayName: name,
        });
        firebaseUid = firebaseUser.uid;
        console.log('✅ SECURITY_BRIDGE: Firebase account created via password:', firebaseUid);
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-exists') {
          const firebaseUser = await admin.auth().getUserByEmail(email.trim().toLowerCase());
          firebaseUid = firebaseUser.uid;
          console.log('ℹ️ SECURITY_BRIDGE: Firebase account already exists, syncing ID...');
        } else {
          throw authErr;
        }
      }
    }

    let hashedPassword = null;
    if (tempPassword && !isNexovtechGmail) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(tempPassword, salt);
    }

    const generateCompanyEmail = (name) => `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@nexovtech.com`;

    const userData = {
      name,
      email: email.trim().toLowerCase(),
      companyEmail: generateCompanyEmail(name),
      firebaseUid: firebaseUid,
      password: hashedPassword,
      phone: phoneNo, // Mapping phoneNo from frontend to phone in DB
      role: role || 'Employee',
      department: role === 'Admin' ? 'Executive' : (req.body.department || 'General'),
      status: 'Active',
      bankName,
      accountNumber,
      ifscCode,
      upiId,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name + Date.now()}`,
      performance: { tasksCompleted: 0, onTimeRate: 100, rating: 5 },
      createdAt: new Date()
    };

    console.log(`📝 ACCESS_SYNC: Registering specialist [${email}] in database...`);
    const saved = await fallbackDb.save('users', userData);

    const allUsers = (await fallbackDb.find('users', {})) || [];

    res.json({
      message: isNexovtechGmail 
        ? `Access granted to ${email}. (Google Login Required for this identity)`
        : `Access granted to ${email}. Cloud identity activated.`,
      user: saved,
      updatedRoster: allUsers
    });
  } catch (err) {
    console.error('🔥 SECURITY_BRIDGE_FAILURE:', err.message);
    res.status(500).json({ message: `Security Bridge Failure: ${err.message}` });
  }
});

// Update Financials
router.put('/update-financials/:id', async (req, res) => {
  const { bankName, accountNumber, ifscCode, upiId } = req.body;
  try {
    const updated = await fallbackDb.save('users', {
      id: req.params.id,
      bankName,
      accountNumber,
      ifscCode,
      upiId
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Financial update failed' });
  }
});

// Update Profile (Admin)
router.put('/update-profile/:id', async (req, res) => {
  const { name, role, email, phone, avatar, address, authorizedSign, teamSign } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (role !== undefined) updates.role = role;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (avatar !== undefined) updates.avatar = avatar;
  if (address !== undefined) updates.address = address;
  if (authorizedSign !== undefined) updates.authorizedSign = authorizedSign;
  if (teamSign !== undefined) updates.teamSign = teamSign;

  try {
    console.log(`👤 PROFILE_UPDATE_REQ: ID=[${req.params.id}] Body=`, req.body);
    const updated = await fallbackDb.update('users', req.params.id, updates);
    console.log(`✅ PROFILE_UPDATE_SUCCESS: ID=[${req.params.id}]`);
    res.json(updated);
  } catch (err) {
    console.error(`❌ PROFILE_UPDATE_FAIL: ID=[${req.params.id}]`, err);
    res.status(500).json({ message: 'Profile update failed' });
  }
});

// List all granted users
router.get('/team-access', async (req, res) => {
  try {
    const users = (await fallbackDb.find('users', {})) || [];
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve access registry' });
  }
});

// GET count of all users
router.get('/count', async (req, res) => {
  try {
    const users = await fallbackDb.find('users', {});
    res.json({ count: users.length });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

// GET /auth/login-history/:userId — Retrieve security audit log
router.get('/login-history/:userId', async (req, res) => {
  try {
    const history = await fallbackDb.find('loginHistory', { userId: req.params.userId });
    // Sort by most recent first
    const sorted = (history || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sorted.slice(0, 10)); // Return last 10 logins
  } catch (err) {
    res.status(500).json({ message: 'Audit logs inaccessible' });
  }
});

module.exports = router;
