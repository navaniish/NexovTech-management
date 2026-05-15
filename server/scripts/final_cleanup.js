const { db } = require('../firebaseAdmin');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

const writeLocalData = (collection, data) => {
  try {
    fs.writeFileSync(path.join(DATA_DIR, `${collection}.json`), JSON.stringify(data, null, 2));
    console.log(`✅ Local [${collection}.json] updated.`);
  } catch (e) {
    console.error(`❌ Failed to write [${collection}]: ${e.message}`);
  }
};

async function cleanup() {
  if (!db) {
    console.log('❌ Firestore not connected.');
    return;
  }

  console.log('🧹 STARTING FINAL PURGE...');

  // 1. Fetch all data
  const userSnap = await db.collection('users').get();
  const users = userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const empSnap = await db.collection('employees').get();
  const employees = empSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const cardSnap = await db.collection('idcards').get();
  const cards = cardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const deletions = { users: [], employees: [], idcards: [] };

  // 2. Remove redundant entries from 'employees' collection (favor 'users' collection)
  for (const emp of employees) {
    const email = emp.email?.toLowerCase();
    if (users.find(u => u.email?.toLowerCase() === email)) {
      deletions.employees.push(emp.id);
      console.log(`🗑️ employees: Removed redundant ${emp.email} (exists in users)`);
    } else if (emp.status === 'revoked' || emp.status === 'Revoked') {
       deletions.employees.push(emp.id);
       console.log(`🗑️ employees: Removed revoked ${emp.email}`);
    }
  }

  // 3. Remove duplicate GUNDA SARANYA in 'users'
  // Keep: 8D4t1gdpTwPeBCeH8J6Dy3mTqq62 (Active Card)
  // Delete: L2CAoeF1K5TuHB71HVzb4oNvzwy2 (No Card)
  if (users.find(u => u.id === 'L2CAoeF1K5TuHB71HVzb4oNvzwy2')) {
    deletions.users.push('L2CAoeF1K5TuHB71HVzb4oNvzwy2');
    console.log(`🗑️ users: Removed duplicate GUNDA SARANYA (gmail)`);
  }

  // 4. Remove duplicate MANI CHARAN in 'users'
  // Keep: WJdOgEaZ7vVThsp6SeXxIpQJONS2 (Active Card)
  // Delete: yph0evdoiiTrvTbfubJWBZdlA2J2 (Inactive Card)
  if (users.find(u => u.id === 'yph0evdoiiTrvTbfubJWBZdlA2J2')) {
    deletions.users.push('yph0evdoiiTrvTbfubJWBZdlA2J2');
    deletions.idcards.push('yph0evdoiiTrvTbfubJWBZdlA2J2'); // Associated card
    console.log(`🗑️ users: Removed duplicate MANI CHARAN (Inactive)`);
  }

  // 5. Execute Deletions in Firestore
  for (const id of deletions.employees) {
    await db.collection('employees').doc(id).delete();
  }
  for (const id of deletions.users) {
    await db.collection('users').doc(id).delete();
  }
  for (const id of deletions.idcards) {
    await db.collection('idcards').doc(id).delete();
  }

  // 6. Update Local Cache
  const cleanUsers = users.filter(u => !deletions.users.includes(u.id));
  writeLocalData('users', cleanUsers);

  const cleanCards = cards.filter(c => !deletions.idcards.includes(c.id));
  writeLocalData('idcards', cleanCards);

  console.log('✨ CLEANUP COMPLETE.');
}

cleanup().catch(console.error);
