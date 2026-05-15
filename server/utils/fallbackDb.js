const fs = require('fs');
const path = require('path');
const { db } = require('../firebaseAdmin');

const IS_SERVERLESS = !!(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const DATA_DIR = path.join(__dirname, '..', 'data');
try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) { /* read-only FS */ }

const getFilePath = (collection) => path.join(DATA_DIR, `${collection}.json`);

const readLocalData = (collection) => {
  if (IS_SERVERLESS) return []; // No local filesystem in serverless
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return [];
  }
};

const writeLocalData = (collection, data) => {
  if (IS_SERVERLESS) return; // Cannot write in serverless
  try {
    fs.writeFileSync(getFilePath(collection), JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn(`Local cache write failed for [${collection}]: ${e.message}`);
  }
};

const fallbackDb = {
  // FIND ALL
  find: async (collection, query) => {
    try {
      // 1. Try Firestore
      if (!db) throw new Error('Firestore DB handle is missing');
      const snapshot = await db.collection(collection).get();
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Update local cache
      writeLocalData(collection, docs);
      
      return docs;
    } catch (err) {
      console.warn(`Firestore fail [${collection}]: falling back to local vault.`);
      const localData = readLocalData(collection);
      if (!query || Object.keys(query).length === 0) return localData;
      return localData.filter(item => {
        return Object.keys(query).every(key => item[key] === query[key]);
      });
    }
  },

  // FIND ONE
  findOne: async (collection, query) => {
    try {
      // Simple query support for common fields
      if (!db) throw new Error('Firestore DB handle is missing');
      let ref = db.collection(collection);
      let hasFilter = false;
      if (query.email) { ref = ref.where('email', '==', query.email); hasFilter = true; }
      if (query.otp) { ref = ref.where('otp', '==', query.otp); hasFilter = true; }
      if (query.telegramId) { ref = ref.where('telegramId', '==', query.telegramId); hasFilter = true; }
      if (query.firebaseUid) { ref = ref.where('firebaseUid', '==', query.firebaseUid); hasFilter = true; }
      if (query.uid) { ref = ref.where('firebaseUid', '==', query.uid); hasFilter = true; }
      if (query.companyEmail) { ref = ref.where('companyEmail', '==', query.companyEmail); hasFilter = true; }
      if (query.phone) { ref = ref.where('phone', '==', query.phone); hasFilter = true; }
      
      // SAFETY: Never query without a filter — it returns random documents
      if (!hasFilter) throw new Error('No supported query filter provided');
      
      const snapshot = await ref.limit(1).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
    } catch (err) {
      console.warn(`Firestore query fail [${collection}]: ${err.message}`);
    }

    // Fallback to local
    const localData = readLocalData(collection);
    return localData.find(item => {
      return Object.keys(query).every(key => item[key] === query[key]);
    });
  },

  // FIND BY ID
  findById: async (collection, id) => {
    try {
      if (!db) throw new Error('Firestore handle offline');
      const doc = await db.collection(collection).doc(id).get();
      if (doc.exists) return { id: doc.id, ...doc.data() };
    } catch (err) {
      console.warn(`Firestore findById fail: ${err.message}`);
    }
    const local = readLocalData(collection);
    return local.find(item => item.id === id || item._id === id);
  },

  // SAVE / UPDATE
  save: async (collection, item) => {
    try {
      // CRITICAL: Never use email as Firestore document ID — it creates ghost duplicates
      const id = item.firebaseUid || (item.id && !item.id.includes('@') ? item.id : null) || (db ? db.collection(collection).doc().id : `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
      if (!item.id) item.id = id;
      
      if (!db) throw new Error('DATABASE_OFFLINE: No Firestore handle found. Please check Netlify Environment Variables.');
      await db.collection(collection).doc(id).set(item, { merge: true });
      console.log(`Cloud Sync Success: [${collection}] document updated.`);

      // NEXOV-SYNC: Ensure specialists are mirrored in both 'users' and 'employees' for identity parity
      const email = (item.email || '').toLowerCase().trim();
      const isMaster = email === 'nexovtech@myyahoo.com';
      if (!isMaster && (collection === 'users' || collection === 'employees')) {
        const mirrorColl = collection === 'users' ? 'employees' : 'users';
        await db.collection(mirrorColl).doc(id).set(item, { merge: true });
        console.log(`NEXOV-SYNC: Specialist mirrored to [${mirrorColl}] registry.`);
      }
    } catch (err) {
      console.warn(`🔥 Cloud Sync Failed [${collection}]: proceeding with local vault only.`);
      // Do not re-throw, allow falling back to local cache logic below
    }

    // Always update local cache
    const data = readLocalData(collection);
    const idToUse = item.id || item.firebaseUid || item.email;
    const index = data.findIndex(i => i.id === idToUse || i.email === item.email || i.firebaseUid === item.firebaseUid);
    
    const finalizedItem = { ...item, id: idToUse };
    
    if (index > -1) {
      data[index] = { ...data[index], ...finalizedItem };
    } else {
      data.push(finalizedItem);
    }
    writeLocalData(collection, data);
    return finalizedItem;
  },

  // DELETE
  deleteOne: async (collection, id) => {
    try {
      if (!db) throw new Error('Firestore handle offline');
      // Try Firestore delete
      await db.collection(collection).doc(id).delete();
    } catch (err) {
      console.warn(`Firestore delete fail: ${err.message}`);
    }

    // Always clean local cache
    const local = readLocalData(collection);
    const filtered = local.filter(item => item.id !== id && item._id !== id);
    writeLocalData(collection, filtered);
    return true;
  },

  // UPDATE (Partial)
  update: async (collection, id, updates) => {
    console.log(`📝 DB_UPDATE: [${collection}] ID=[${id}]`, updates);
    try {
      if (!db) throw new Error('Firestore handle offline');
      
      // Update primary collection (Use set with merge: true for upsert support)
      await db.collection(collection).doc(id).set(updates, { merge: true });

      // MIRRORING LOGIC for identity parity (Users <-> Employees)
      if (collection === 'users' || collection === 'employees') {
        const mirrorColl = collection === 'users' ? 'employees' : 'users';
        // Use set with merge: true for the mirror to ensure it exists or gets created
        await db.collection(mirrorColl).doc(id).set(updates, { merge: true });
        console.log(`✅ NEXOV-SYNC: Partial update mirrored to [${mirrorColl}].`);
      }
    } catch (err) {
      console.warn(`⚠️ Firestore update fail: ${err.message}`);
    }

    // Update local cache for primary collection
    const data = readLocalData(collection);
    const index = data.findIndex(i => i.id === id || i._id === id);
    if (index > -1) {
      data[index] = { ...data[index], ...updates };
      writeLocalData(collection, data);
      
      // Mirror local cache too
      if (collection === 'users' || collection === 'employees') {
        const mirrorColl = collection === 'users' ? 'employees' : 'users';
        const mirrorData = readLocalData(mirrorColl);
        const mIndex = mirrorData.findIndex(i => i.id === id || i._id === id);
        if (mIndex > -1) {
          mirrorData[mIndex] = { ...mirrorData[mIndex], ...updates };
          writeLocalData(mirrorColl, mirrorData);
        }
      }
      
      return data[index];
    }
    return null;
  }
};

module.exports = fallbackDb;
