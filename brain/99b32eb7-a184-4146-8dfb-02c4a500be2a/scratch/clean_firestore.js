const { db } = require(require('path').join(process.cwd(), 'server', 'firebaseAdmin'));

async function cleanFirestore() {
  if (!db) { console.error('❌ No Firestore'); return; }

  console.log('🔍 Scanning Firestore for ALL user documents...\n');
  const snapshot = await db.collection('users').get();
  
  const docsToDelete = [];
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const docId = doc.id;
    
    // Flag documents where the ID is an email (these are DUPLICATES created by fallbackDb.save)
    // The real documents use Firebase UIDs as their ID
    if (docId.includes('@')) {
      console.log(`🚨 GHOST RECORD [${docId}]: name="${data.name}", email="${data.email}"`);
      docsToDelete.push(docId);
    } else {
      console.log(`✅ VALID RECORD [${docId}]: name="${data.name}", email="${data.email}"`);
    }
  });

  console.log(`\n📊 Found ${docsToDelete.length} ghost records to delete.\n`);
  
  for (const id of docsToDelete) {
    console.log(`  🗑️ Deleting ghost: [${id}]...`);
    await db.collection('users').doc(id).delete();
  }
  
  console.log('\n✅ Firestore cleanup complete.');
  process.exit(0);
}

cleanFirestore().catch(err => { console.error('🔥', err); process.exit(1); });
