const fs = require('fs');
const path = require('path');
const { db } = require('../firebaseAdmin');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const getFilePath = (collection) => path.join(DATA_DIR, `${collection}.json`);

const readLocalData = (collection) => {
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return [];
  }
};

const writeLocalData = (collection, data) => {
  fs.writeFileSync(getFilePath(collection), JSON.stringify(data, null, 2));
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
      return readLocalData(collection);
    }
  },

  // FIND ONE
  findOne: async (collection, query) => {
    try {
      // Simple query support for common fields
      if (!db) throw new Error('Firestore DB handle is missing');
      let ref = db.collection(collection);
      if (query.email) ref = ref.where('email', '==', query.email);
      if (query.firebaseUid) ref = ref.where('firebaseUid', '==', query.firebaseUid);
      if (query.uid) ref = ref.where('firebaseUid', '==', query.uid);
      
      const snapshot = await ref.limit(1).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
    } catch (err) {
      console.warn(`Firestore query fail: ${err.message}`);
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
      const id = item.firebaseUid || item.id || item.email || (db ? db.collection(collection).doc().id : Date.now().toString());
      if (!item.id && !item.firebaseUid && !item.email) item.id = id;
      
      if (!db) throw new Error('Firestore DB handle is missing');
      await db.collection(collection).doc(id).set(item, { merge: true });
      console.log(`Cloud Sync: [${collection}] document updated.`);
    } catch (err) {
      console.error(`Cloud Sync Failed: ${err.message}`);
    }

    // Always update local cache
    const data = readLocalData(collection);
    const index = data.findIndex(i => i.id === item.id || i.email === item.email || i.firebaseUid === item.firebaseUid);
    if (index > -1) {
      data[index] = { ...data[index], ...item };
    } else {
      data.push(item);
    }
    writeLocalData(collection, data);
    return item;
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
    try {
      if (!db) throw new Error('Firestore handle offline');
      await db.collection(collection).doc(id).update(updates);
    } catch (err) {
      console.warn(`Firestore update fail: ${err.message}`);
    }

    // Update local
    const data = readLocalData(collection);
    const index = data.findIndex(i => i.id === id || i._id === id);
    if (index > -1) {
      data[index] = { ...data[index], ...updates };
      writeLocalData(collection, data);
      return data[index];
    }
    return null;
  }
};

module.exports = fallbackDb;
