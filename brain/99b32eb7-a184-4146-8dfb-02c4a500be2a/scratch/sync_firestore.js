const { db } = require(require('path').join(process.cwd(), 'server', 'firebaseAdmin'));
const fs = require('fs');
const path = require('path');

async function syncFirestore() {
  if (!db) {
    console.error('❌ Firestore not available');
    return;
  }

  const usersPath = path.join(process.cwd(), 'server', 'data', 'users.json');
  const localUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

  console.log(`🚀 Syncing ${localUsers.length} users to Firestore...`);

  for (const user of localUsers) {
    const id = user.firebaseUid || user.id || user.email;
    if (!id) continue;

    console.log(`  - Syncing [${user.email}]...`);
    await db.collection('users').doc(id).set(user, { merge: true });
  }

  console.log('✅ Firestore Synchronization Complete.');
  process.exit(0);
}

syncFirestore().catch(err => {
  console.error('🔥 Sync failed:', err);
  process.exit(1);
});
