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
const { auth, JWT_SECRET } = require('../middleware/auth');

const resolveTenantId = (email) => {
  if (!email) return 'org_default';
  const parts = email.toLowerCase().split('@');
  if (parts.length < 2) return 'org_default';
  const domain = parts[1];
  const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'protonmail.com', 'zoho.com'];
  if (genericDomains.includes(domain)) {
    const username = parts[0].replace(/[^a-z0-9]/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `org_${username}_${random}`;
  }
  const cleanDomain = domain.replace(/[^a-z0-9]/g, '');
  return `org_${cleanDomain}`;
};



// POST /auth/upload-avatar/:id — Upload profile photo
router.post('/upload-avatar/:id', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.params.id;
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
router.get('/me', auth, async (req, res) => {
  if (req.user && req.user.email === 'nexovtech@myyahoo.com') {
    req.user.role = 'Admin';
  }
  res.json(req.user);
});

// POST /auth/register — Create/Sync profile from Firebase
router.post('/register', async (req, res) => {
  const { uid, email, name, role, password } = req.body;
  const tenantId = resolveTenantId(email);
  const userData = {
    firebaseUid: uid,
    email: email.toLowerCase(),
    name: name || 'New Explorer',
    role: email.toLowerCase() === 'nexovtech@myyahoo.com' ? 'Admin' : 'Employee',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name + Date.now()}`,
    tenantId,
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
      const employee = await fallbackDb.findOne('employees', { email: lookupEmail }) ||
        await fallbackDb.findOne('employees', { companyEmail: lookupEmail });

      if (!employee && lookupEmail !== 'nexovtech@myyahoo.com') {
        console.warn(`🛡️ SECURITY_POLICY: Blocked login for unregistered email [${lookupEmail}].`);
        return res.status(403).json({ message: 'Access Denied — You are not an authorized NexovTech employee.' });
      }

      console.log(`🚀 ENTERPRISE_SYNC: New identity detected [${lookupEmail}]. Provisioning virtual workspace profile...`);
      const name = employee?.name || firebaseUser.name || lookupEmail.split('@')[0];
      const companyEmail = employee?.companyEmail || generateCompanyEmail(name);
      const tenantId = employee?.tenantId || resolveTenantId(lookupEmail);
      user = await fallbackDb.save('users', {
        email: lookupEmail,
        companyEmail,
        firebaseUid: firebaseUser.uid,
        name: name,
        role: lookupEmail === 'nexovtech@myyahoo.com' ? 'Super Admin' : (employee?.role || 'Employee'),
        department: lookupEmail === 'nexovtech@myyahoo.com' ? 'Executive' : (employee?.department || 'General'),
        status: 'Active',
        avatar: firebaseUser.picture || employee?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${lookupEmail}`,
        tenantId,
        lastActive: new Date(),
        createdAt: new Date()
      });
    } else {
      // Update tenantId and firebaseUid if missing, plus lastActive on every login/sync
      const updateFields = {
        lastActive: new Date()
      };
      if (!user.tenantId) {
        updateFields.tenantId = resolveTenantId(lookupEmail);
      }
      if (!user.firebaseUid || user.firebaseUid !== firebaseUser.uid) {
        updateFields.firebaseUid = firebaseUser.uid;
      }
      const updatedUser = await fallbackDb.update('users', user.id || user._id, updateFields);
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
    const geoLookup = require('../utils/geoLookup');
    const geo = await geoLookup(req.ip || req.headers['x-forwarded-for'] || '127.0.0.1');
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

    const jwtToken = jwt.sign(
      { id: user.id || user._id, role: user.role, firebaseUid: firebaseUser.uid, tenantId: user.tenantId || 'org_default' },
      JWT_SECRET,
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
router.post('/grant-access', auth, async (req, res) => {
  const { email, role, name, tempPassword, bankName, accountNumber, ifscCode, upiId, phoneNo } = req.body;
  const { admin } = require('../firebaseAdmin');

  if (!email) return res.status(400).json({ message: 'Email is required for secure delegation' });

  try {
    console.log(`🛡️ SECURITY_BRIDGE: Provisioning identity for [${email}]...`);

    let firebaseUid = null;

    // 1. Optional: Create User in Firebase Auth if password provided (otherwise rely on Google Login sync)
    if (tempPassword) {
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
    if (tempPassword) {
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
      tenantId: req.tenantId || 'org_default',
      createdAt: new Date()
    };

    console.log(`📝 ACCESS_SYNC: Registering specialist [${email}] in database...`);
    const saved = await fallbackDb.save('users', userData);

    const allUsers = (await fallbackDb.find('users', { tenantId: req.tenantId || 'org_default' })) || [];

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
router.get('/team-access', auth, async (req, res) => {
  try {
    const users = (await fallbackDb.find('users', { tenantId: req.tenantId || 'org_default' })) || [];
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve access registry' });
  }
});

// GET count of all users
// GET /auth/count — Public: Total user count (used by Sidebar badge)
router.get('/count', async (req, res) => {
  try {
    // If auth token provided, scope by tenant; otherwise return global count
    let tenantId = 'org_default';
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, JWT_SECRET);
        tenantId = decoded.tenantId || 'org_default';
      } catch (_) { }
    }
    const users = await fallbackDb.find('users', { tenantId });
    res.json({ count: users.length });
  } catch (err) {
    res.json({ count: 0 });
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

// POST /auth/admin-key — Secure logo-click override (key validated server-side)
router.post('/admin-key', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ success: false, message: 'Access key required.' });
    }

    // Key must match the env secret (set NEXOV_OVERRIDE_KEY in your .env)
    const validKey = process.env.NEXOV_OVERRIDE_KEY || 'NEXOV-PRIME-2026';
    if (key.trim().toUpperCase() !== validKey.trim().toUpperCase()) {
      console.warn(`⛔ OVERRIDE_REJECTED: Invalid key attempt at ${new Date().toISOString()}`);
      return res.status(401).json({ success: false, message: 'Access key invalid.' });
    }

    // Issue a root-level token for the super-admin identity
    const superAdmin = await fallbackDb.findOne('users', { email: 'nexovtech@myyahoo.com' });
    const adminUser = {
      ...(superAdmin || {}),
      id: superAdmin?.id || superAdmin?._id || 'root',
      name: superAdmin?.name || 'NEXOVTECH ADMINISTRATION',
      email: 'nexovtech@myyahoo.com',
      role: 'Super Admin',
      department: 'Executive',
      status: 'Active',
      avatar: superAdmin?.avatar || '/assets/logo_nexo.jpeg',
      isRoot: true
    };

    const token = jwt.sign(
      { id: adminUser.id || 'root', role: 'Super Admin', tenantId: adminUser.tenantId || 'org_nexovtech' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    console.log(`✅ OVERRIDE_GRANTED: Root access issued at ${new Date().toISOString()}`);
    res.json({ success: true, token, user: adminUser });
  } catch (err) {
    console.error('🔥 ADMIN_KEY_ERROR:', err);
    res.status(500).json({ success: false, message: 'Override validation failed.' });
  }
});

// PUT /auth/theme/:id — Update theme preference
router.put('/theme/:id', async (req, res) => {
  const { theme } = req.body;
  if (!theme) return res.status(400).json({ message: 'Theme is required' });
  try {
    const updated = await fallbackDb.update('users', req.params.id, { theme });
    res.json({ success: true, theme: updated.theme });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update theme' });
  }
});

module.exports = router;
