const { db } = require('../firebaseAdmin');

async function listUsers() {
  if (!db) {
    console.log('❌ Firestore not connected.');
    return;
  }
  const snapshot = await db.collection('employees').get();
  const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log('--- Firestore Employees ---');
  users.forEach(u => console.log(`[${u.id}] ${u.name} <${u.email}> status: ${u.status}`));

  const userSnap = await db.collection('users').get();
  const users2 = userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log('--- Firestore Users ---');
  users2.forEach(u => console.log(`[${u.id}] ${u.name} <${u.email}> status: ${u.status}`));

  const cardSnap = await db.collection('idcards').get();
  const cards = cardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log('--- Firestore ID Cards ---');
  cards.forEach(c => console.log(`[${c.id}] ${c.name} <${c.email}> userId: ${c.userId} status: ${c.status}`));
}

listUsers().catch(console.error);
