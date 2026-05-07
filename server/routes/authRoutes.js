const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');
const upload = require('../middleware/upload');
const path = require('path');

// POST /auth/upload-avatar/:id — Upload profile photo
router.post('/upload-avatar/:id', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let userId = req.params.id;
    if (userId === 'admin_bypass') userId = 'nexovtech@myyahoo.com';
    // Construct the URL for the avatar
    // We assume the server is running on localhost:5005 as per other routes
    const avatarUrl = `/api/uploads/avatars/${req.file.filename}`;

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
  const user = (await fallbackDb.findOne('users', { firebaseUid: uid })) || (await fallbackDb.findOne('users', { email: email?.toLowerCase() }));
  
  if (user) {
    if (user.email === 'nexovtech@myyahoo.com') user.role = 'Admin';
    return res.json(user);
  }

  res.status(404).json({ message: 'User profile not found in Registry.' });
});

// POST /auth/register — Create/Sync profile from Firebase
router.post('/register', async (req, res) => {
  const { uid, email, name, role } = req.body;
  const userData = { 
    firebaseUid: uid, 
    email: email.toLowerCase(), 
    name: name || 'New Explorer', 
    role: email.toLowerCase() === 'nexovtech@myyahoo.com' ? 'Admin' : (role || 'Employee'),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name + Date.now()}`,
    createdAt: new Date()
  };

  const savedUser = await fallbackDb.save('users', userData);
  res.json(savedUser);
});

// Grant Access (Admin)
router.post('/grant-access', async (req, res) => {
  const { email, role, name, tempPassword, bankName, accountNumber, ifscCode, upiId } = req.body;
  const { admin } = require('../firebaseAdmin');
  
  if (!email) return res.status(400).json({ message: 'Email is required for secure delegation' });
  if (!tempPassword) return res.status(400).json({ message: 'Initial password is required' });

  try {
    console.log(`🛡️ SECURITY_BRIDGE: Creating cloud credentials for [${email}]...`);
    
    // 1. Create User in Firebase Auth
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email: email.trim().toLowerCase(),
        password: tempPassword,
        displayName: name,
      });
      console.log('✅ SECURITY_BRIDGE: Firebase account created:', firebaseUser.uid);
    } catch (authErr) {
      // If user already exists in Firebase, just find them
      if (authErr.code === 'auth/email-already-exists') {
        firebaseUser = await admin.auth().getUserByEmail(email.trim().toLowerCase());
        console.log('ℹ️ SECURITY_BRIDGE: Firebase account already exists, syncing ID...');
      } else {
        throw authErr;
      }
    }

    const userData = {
      name,
      email: email.trim().toLowerCase(),
      firebaseUid: firebaseUser.uid,
      role: role || 'Employee',
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
      message: `Access granted to ${email}. Cloud identity activated.`, 
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
  const { name, role, email, phone } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (role !== undefined) updates.role = role;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;

  try {
    const updated = await fallbackDb.update('users', req.params.id, updates);
    res.json(updated);
  } catch (err) {
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

// Revoke access
router.delete('/revoke-access/:id', async (req, res) => {
  await fallbackDb.deleteOne('users', req.params.id);
  res.json({ message: 'Access revoked successfully' });
});

module.exports = router;
