const { db } = require(require('path').join(process.cwd(), 'server', 'firebaseAdmin'));

async function inspectMani() {
  if (!db) return;
  console.log('🔍 Inspecting Firestore for email: manicharanteja1234@gmail.com...');
  const snapshot = await db.collection('users').where('email', '==', 'manicharanteja1234@gmail.com').get();
  snapshot.forEach(doc => {
    console.log(`✅ Found User [${doc.id}]:`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
  process.exit(0);
}

inspectMani();
