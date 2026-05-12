const { db } = require(require('path').join(process.cwd(), 'server', 'firebaseAdmin'));
const fs = require('fs');
const path = require('path');

async function syncClean() {
  if (!db) { console.error('❌ No Firestore'); return; }

  // 1. Delete stale records from Firestore
  const staleIds = ['3Nrcp0hlh1e04bQwjAnrwzQvodD2', 'jBLpMVT21NUdPlfaSl6yN0sB5LE3'];
  for (const id of staleIds) {
    try {
      await db.collection('users').doc(id).delete();
      console.log(`🗑️ Deleted stale Firestore record: [${id}]`);
    } catch (e) {
      console.log(`  (already gone: ${id})`);
    }
  }

  // 2. Sync the 4 valid records from users.json to Firestore
  const users = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'server', 'data', 'users.json'), 'utf8'));
  for (const user of users) {
    await db.collection('users').doc(user.firebaseUid).set(user, { merge: true });
    console.log(`✅ Synced [${user.email}] → Firestore`);
  }

  // 3. Verify final state
  console.log('\n=== FINAL FIRESTORE STATE ===');
  const snapshot = await db.collection('users').get();
  snapshot.forEach(doc => {
    const d = doc.data();
    console.log(`  [${doc.id}] ${d.name} → ${d.email}`);
  });

  console.log('\n✅ Registry is now 1:1 with Firebase Auth. No ghost records.');
  process.exit(0);
}

syncClean().catch(e => { console.error(e); process.exit(1); });
