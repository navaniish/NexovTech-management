const admin = require('firebase-admin');
const fs = require('fs');
const sa = JSON.parse(fs.readFileSync('server/serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });

async function fixAll() {
  // List all Firebase users to get real UIDs
  const list = await admin.auth().listUsers(1000);
  
  console.log('=== ALL FIREBASE AUTH USERS ===');
  for (const u of list.users) {
    console.log(`  ${u.email} → UID: ${u.uid}`);
    
    // Reset password for ALL users
    await admin.auth().updateUser(u.uid, { password: 'Admin@123' });
    console.log(`  ✅ Password set to Admin@123`);
  }
  
  console.log('\n✅ Done. All users now have password: Admin@123');
  process.exit(0);
}

fixAll().catch(e => { console.error(e); process.exit(1); });
