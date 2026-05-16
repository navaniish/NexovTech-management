const { db } = require('../firebaseAdmin');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function syncJsonToFirestore() {
  if (!db) return;

  try {
    const usersJsonPath = path.join(__dirname, '..', 'data', 'users.json');
    const users = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));

    console.log(`--- Syncing ${users.length} users to Firestore ---`);

    for (const user of users) {
      // Find user by name or phone since email changed
      const snapshot = await db.collection('users').where('name', '==', user.name).get();
      
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await db.collection('users').doc(docId).update({
          companyEmail: user.companyEmail,
          email: user.email || user.companyEmail
        });
        console.log(`✅ Updated Firestore for ${user.name}: ${user.companyEmail}`);
      } else {
        console.log(`⚠️ User ${user.name} not found in Firestore.`);
      }
    }

    console.log('\n✨ Firestore sync complete.');
  } catch (err) {
    console.error('❌ Error syncing:', err.message);
  }
}

syncJsonToFirestore();
