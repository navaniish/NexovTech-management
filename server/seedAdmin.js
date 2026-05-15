const dotenv = require('dotenv');
const fallbackDb = require('./utils/fallbackDb');

dotenv.config();

const seedAdmin = async () => {
  const adminEmail = 'nexovtech@myyahoo.com';
  
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Admin@123', salt);

  const adminData = {
    name: 'NEXOVTECH ADMINISTRATION',
    email: adminEmail,
    companyEmail: 'admin@nexovtech.com',
    password: hashedPassword, // Matches 'Admin@123'
    role: 'Admin',
    avatar: '/assets/logo_nexo.jpeg',
    performance: { tasksCompleted: 100, onTimeRate: 100, rating: 5 },
    createdAt: new Date()
  };

  try {
    // Check if admin already exists in local database
    const existingAdmin = await fallbackDb.findOne('users', { email: adminEmail });
    
    // 1. Sync to Firebase Authentication Cloud
    const { admin } = require('./firebaseAdmin');
    try {
      await admin.auth().getUserByEmail(adminEmail);
      console.log('🛡️ CLOUD: Admin account verified in Firebase.');
      // Optional: Update password if needed
      await admin.auth().updateUser((await admin.auth().getUserByEmail(adminEmail)).uid, {
        password: 'Admin@123',
        displayName: 'NEXOVTECH ADMINISTRATION'
      });
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found') {
        await admin.auth().createUser({
          email: adminEmail,
          password: 'Admin@123',
          displayName: 'NEXOVTECH ADMINISTRATION'
        });
        console.log('🛡️ CLOUD: Admin account provisioned in Firebase.');
      }
    }

    if (!existingAdmin) {
      // Sync to Cloud Firestore + Local Vault if it doesn't exist
      await fallbackDb.save('users', adminData);
      console.log('🛡️ REGISTRY: Permanent Admin Credentials Synchronized');
    } else {
      // Ensure companyEmail and other critical fields are present
      await fallbackDb.update('users', existingAdmin.id || existingAdmin._id, {
        name: 'NEXOVTECH ADMINISTRATION',
        role: 'Admin',
        avatar: '/assets/logo_nexo.jpeg',
        companyEmail: 'admin@nexovtech.com',
        password: existingAdmin.password || hashedPassword
      });
      console.log('🛡️ REGISTRY: Admin Identity Refined (Original Name & Logo Locked)');
    }
  } catch (err) {
    console.error('❌ Failed to seed permanent admin:', err.message);
  }
};

module.exports = seedAdmin;
