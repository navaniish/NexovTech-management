const dotenv = require('dotenv');
const fallbackDb = require('./utils/fallbackDb');

dotenv.config();

const seedAdmin = async () => {
  const adminEmail = 'nexovtech@myyahoo.com';
  
  const adminData = {
    name: 'NexovTech Administrator',
    email: adminEmail,
    role: 'Admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin123',
    performance: { tasksCompleted: 99, onTimeRate: 100, rating: 5 },
    createdAt: new Date()
  };

  try {
    // Check if admin already exists
    const existingAdmin = await fallbackDb.findOne('users', { email: adminEmail });
    if (!existingAdmin) {
      // Sync to Cloud Firestore + Local Vault only if it doesn't exist
      await fallbackDb.save('users', adminData);
      console.log('🛡️ REGISTRY: Permanent Admin Synchronized');
    } else {
      console.log('🛡️ REGISTRY: Permanent Admin Already Exists. Skipping seed.');
    }
  } catch (err) {
    console.error('❌ Failed to seed permanent admin:', err.message);
  }
};

module.exports = seedAdmin;
