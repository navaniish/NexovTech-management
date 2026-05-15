const { db } = require('../firebaseAdmin');

async function purgeNameDuplicates() {
  if (!db) return;
  
  console.log('🔍 Identifying Name Duplicates...');
  const userSnap = await db.collection('users').get();
  const users = userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const nameMap = new Map();
  const toDelete = [];

  for (const user of users) {
    const name = user.name?.trim().toUpperCase();
    if (!name) continue;

    if (nameMap.has(name)) {
      const existing = nameMap.get(name);
      console.log(`⚠️ Duplicate Name: [${name}]`);
      console.log(`   - Existing: ${existing.email} (ID: ${existing.id})`);
      console.log(`   - Current:  ${user.email} (ID: ${user.id})`);

      // Decision Logic: 
      // 1. Favor nexovtech.com email
      // 2. Favor existing if it has more data
      let keep, discard;
      const isNexov1 = existing.email?.toLowerCase().endsWith('@nexovtech.com');
      const isNexov2 = user.email?.toLowerCase().endsWith('@nexovtech.com');

      if (isNexov2 && !isNexov1) {
        keep = user;
        discard = existing;
      } else {
        keep = existing;
        discard = user;
      }

      console.log(`   ✅ KEEPING: ${keep.email} | 🗑️ DELETING: ${discard.email}`);
      toDelete.push(discard.id);
      nameMap.set(name, keep);
    } else {
      nameMap.set(name, user);
    }
  }

  for (const id of toDelete) {
    await db.collection('users').doc(id).delete();
    await db.collection('employees').doc(id).delete().catch(() => {});
  }

  // Final cross-collection sync: Remove any entry in 'employees' that has a different email than 'users' for the same name
  console.log('🔄 Cross-Collection Sync (employees vs users)...');
  const empSnap = await db.collection('employees').get();
  const emps = empSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  for (const emp of emps) {
    const name = emp.name?.trim().toUpperCase();
    if (!name) continue;

    const canonicalUser = nameMap.get(name);
    if (canonicalUser) {
      if (canonicalUser.email?.toLowerCase() !== emp.email?.toLowerCase()) {
        console.log(`🗑️ employees: Removing mismatching record [${emp.email}] for Specialist [${name}]`);
        await db.collection('employees').doc(emp.id).delete();
      } else if (emp.status?.toLowerCase() === 'revoked' && canonicalUser.status?.toLowerCase() === 'active') {
        console.log(`🗑️ employees: Removing revoked record [${emp.email}] because an active account exists in users.`);
        await db.collection('employees').doc(emp.id).delete();
      }
    }
  }

  console.log(`✨ Purged ${toDelete.length} name duplicates.`);
}

purgeNameDuplicates().catch(console.error);
