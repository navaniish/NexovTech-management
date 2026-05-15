const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const DATA_DIR = path.join(__dirname, '..', 'data');

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
  try {
    fs.writeFileSync(getFilePath(collection), JSON.stringify(data, null, 2));
    console.log(`✅ Success: [${collection}.json] deduplicated. Total items: ${data.length}`);
  } catch (e) {
    console.error(`❌ Failed to write [${collection}]: ${e.message}`);
  }
};

const { db } = require('../firebaseAdmin');

const deduplicate = async () => {
  console.log('🧹 ORGANIZATIONAL PURGE: Deduplicating Employees & E-IDs...');

  // 1. Deduplicate Users
  const users = await (db ? db.collection('users').get().then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))) : readLocalData('users'));
  const uniqueUsersMap = new Map();
  const userDeletions = [];
  
  users.forEach(user => {
    const email = user.email?.toLowerCase();
    if (!email) return;

    if (!uniqueUsersMap.has(email)) {
      uniqueUsersMap.set(email, user);
    } else {
      const existing = uniqueUsersMap.get(email);
      // Decide which one to keep
      let toKeep = existing;
      let toDelete = user;

      if (!existing.firebaseUid && user.firebaseUid) {
        toKeep = user;
        toDelete = existing;
      } else if (user.lastActive && (!existing.lastActive || new Date(user.lastActive) > new Date(existing.lastActive))) {
        toKeep = user;
        toDelete = existing;
      }
      
      uniqueUsersMap.set(email, toKeep);
      userDeletions.push(toDelete.id);
    }
  });

  const cleanUsers = Array.from(uniqueUsersMap.values());
  writeLocalData('users', cleanUsers);
  if (db) {
    for (const id of userDeletions) {
      await db.collection('users').doc(id).delete();
      console.log(`🗑️ Firestore: Removed duplicate user ${id}`);
    }
  }

  // 2. Deduplicate ID Cards
  const idcards = await (db ? db.collection('idcards').get().then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))) : readLocalData('idcards'));
  const uniqueCardsMap = new Map();
  const cardDeletions = [];

  idcards.forEach(card => {
    const key = card.email?.toLowerCase() || card.userId || card.id;
    if (!key) return;

    if (!uniqueCardsMap.has(key)) {
      uniqueCardsMap.set(key, card);
    } else {
      const existing = uniqueCardsMap.get(key);
      let toKeep = existing;
      let toDelete = card;

      if (new Date(card.issueDate) > new Date(existing.issueDate)) {
        toKeep = card;
        toDelete = existing;
      }
      
      uniqueCardsMap.set(key, toKeep);
      cardDeletions.push(toDelete.id);
    }
  });

  const cleanCards = Array.from(uniqueCardsMap.values());
  writeLocalData('idcards', cleanCards);
  if (db) {
    for (const id of cardDeletions) {
      await db.collection('idcards').doc(id).delete();
      console.log(`🗑️ Firestore: Removed duplicate card ${id}`);
    }
  }

  console.log('✨ CLEANUP COMPLETE: Global registry synchronized and optimized.');
};

deduplicate().catch(console.error);
