const { db } = require(require('path').join(process.cwd(), 'server', 'firebaseAdmin'));

async function deepCleanFirestore() {
  console.log('🧼 DEEP CLEAN: Purging ghost identities from Firestore...');

  const collections = ['users', 'idcards'];
  
  for (const col of collections) {
    const snapshot = await db.collection(col).get();
    let deletedCount = 0;
    
    for (const doc of snapshot.docs) {
      // If document ID is an email (contains @), it's a ghost record
      if (doc.id.includes('@')) {
        await doc.ref.delete();
        console.log(`  🗑️ Deleted ghost in [${col}]: ${doc.id}`);
        deletedCount++;
      }
    }
    console.log(`✅ Collection [${col}] cleaned. Total ghosts removed: ${deletedCount}`);
  }

  console.log('\n✨ Firestore deep clean complete.');
  process.exit(0);
}

deepCleanFirestore().catch(err => {
  console.error('🔥 Clean failed:', err);
  process.exit(1);
});
