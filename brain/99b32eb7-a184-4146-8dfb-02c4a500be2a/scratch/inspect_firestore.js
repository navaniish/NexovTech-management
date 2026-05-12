const { db } = require(require('path').join(process.cwd(), 'server', 'firebaseAdmin'));

async function inspectFirestore() {
  if (!db) {
    console.error('❌ Firestore not available');
    return;
  }

  console.log('🔍 Inspecting Firestore for email: nexovtech@myyahoo.com...');
  const snapshot = await db.collection('users').where('email', '==', 'nexovtech@myyahoo.com').get();
  
  if (snapshot.empty) {
    console.log('❓ No users found in Firestore with that email.');
  } else {
    snapshot.forEach(doc => {
      console.log(`✅ Found User [${doc.id}]:`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });
  }

  process.exit(0);
}

inspectFirestore().catch(err => {
  console.error('🔥 Inspection failed:', err);
  process.exit(1);
});
