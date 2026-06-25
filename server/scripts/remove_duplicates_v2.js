const { db } = require('../firebaseAdmin');
const fs = require('fs');
const path = require('path');

async function removeDuplicates() {
  if (!db) {
    console.log('❌ Firestore not connected.');
    return;
  }

  const collections = ['users', 'employees', 'idcards'];
  
  for (const col of collections) {
    console.log(`🔍 Cleaning collection: ${col}`);
    const snapshot = await db.collection(col).get();
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const seen = new Map();
    const toDelete = [];

    docs.forEach(doc => {
      // Use email as unique key for users/employees, userId for idcards
      const rawKey = col === 'idcards' ? (doc.userId || doc.id) : (doc.email || doc.companyEmail);
      if (!rawKey) return;
      const key = rawKey.toString().toLowerCase().trim();
      
      if (!key || key === 'undefined' || key === '') return;

      if (seen.has(key)) {
        // Duplicate found! Keep the one with firebaseUid or the most recent one
        const existing = seen.get(key);
        let keep, discard;

        if (doc.firebaseUid && !existing.firebaseUid) {
          keep = doc;
          discard = existing;
        } else if (!doc.firebaseUid && existing.firebaseUid) {
          keep = existing;
          discard = doc;
        } else {
          // Keep the one with more fields or later createdAt
          const docFields = Object.keys(doc).length;
          const existingFields = Object.keys(existing).length;
          if (docFields > existingFields) {
            keep = doc;
            discard = existing;
          } else {
            keep = existing;
            discard = doc;
          }
        }

        seen.set(key, keep);
        toDelete.push(discard.id);
        console.log(`🗑️ Identified duplicate in [${col}]: ${key} (Deleting doc ID: ${discard.id})`);
      } else {
        seen.set(key, doc);
      }
    });

    // Execute deletions in Firestore
    for (const id of toDelete) {
      await db.collection(col).doc(id).delete();
    }
    console.log(`✅ Collection [${col}] cleaned. Removed ${toDelete.length} duplicates.`);

    // Sync to local JSON if it exists
    const localPath = path.join(__dirname, '..', 'data', `${col}.json`);
    if (fs.existsSync(localPath)) {
      const cleanData = Array.from(seen.values());
      fs.writeFileSync(localPath, JSON.stringify(cleanData, null, 2));
      console.log(`✅ Local [${col}.json] synchronized.`);
    }
  }

  console.log('✨ GLOBAL DEDUPLICATION COMPLETE.');
}

removeDuplicates().catch(console.error);
