const { db } = require(require('path').join(process.cwd(), 'server', 'firebaseAdmin'));

async function verifyAll() {
  if (!db) { console.error('❌ No Firestore'); return; }

  console.log('=== FULL FIRESTORE AUDIT ===\n');
  const snapshot = await db.collection('users').get();
  
  snapshot.forEach(doc => {
    const d = doc.data();
    console.log(`[${doc.id}]`);
    console.log(`  name:         ${d.name}`);
    console.log(`  email:        ${d.email}`);
    console.log(`  companyEmail: ${d.companyEmail || '(none)'}`);
    console.log(`  role:         ${d.role}`);
    console.log(`  firebaseUid:  ${d.firebaseUid || '(none)'}`);
    console.log('');
  });

  // Simulate the exact query the bypass does
  console.log('=== SIMULATING BYPASS QUERY: email=nexovtech@myyahoo.com ===');
  const q = await db.collection('users').where('email', '==', 'nexovtech@myyahoo.com').limit(1).get();
  if (q.empty) {
    console.log('❌ NO RESULT from Firestore for nexovtech@myyahoo.com');
  } else {
    q.forEach(doc => {
      console.log(`✅ RESULT [${doc.id}]: name="${doc.data().name}", email="${doc.data().email}"`);
    });
  }

  process.exit(0);
}

verifyAll().catch(err => { console.error('🔥', err); process.exit(1); });
