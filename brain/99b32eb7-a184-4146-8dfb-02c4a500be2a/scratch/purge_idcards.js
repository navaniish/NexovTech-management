const { db } = require(require('path').join(process.cwd(), 'server', 'firebaseAdmin'));
const fs = require('fs');
const path = require('path');

async function purgeIdCards() {
  console.log('🧹 Purging ID Cards Registry...');

  // 1. Clear Local JSON
  const localPath = path.join(process.cwd(), 'server', 'data', 'idcards.json');
  fs.writeFileSync(localPath, JSON.stringify([], null, 2));
  console.log('✅ Local idcards.json wiped.');

  // 2. Clear Firestore collection
  if (db) {
    const snapshot = await db.collection('idcards').get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`✅ Firestore [idcards] collection cleared (${snapshot.size} documents deleted).`);
  } else {
    console.warn('⚠️ Firestore handle missing, skipping cloud purge.');
  }

  console.log('\n✨ Registry Purge Complete. You can now issue new IDs from the Admin portal.');
  process.exit(0);
}

purgeIdCards().catch(err => {
  console.error('🔥 Purge failed:', err);
  process.exit(1);
});
