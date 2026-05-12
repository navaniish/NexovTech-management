const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Path to service account key
const keyPath = path.join(process.cwd(), 'server', 'serviceAccountKey.json');

if (!fs.existsSync(keyPath)) {
  console.error('❌ serviceAccountKey.json not found in server directory');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function listAllUsers(nextPageToken) {
  try {
    const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
    listUsersResult.users.forEach((userRecord) => {
      console.log(`User: ${userRecord.email} (UID: ${userRecord.uid})`);
    });
    if (listUsersResult.pageToken) {
      await listAllUsers(listUsersResult.pageToken);
    }
  } catch (error) {
    console.error('Error listing users:', error);
  }
}

console.log('🔍 Fetching users from Firebase Auth...');
listAllUsers().then(() => {
  console.log('✅ Done');
  process.exit(0);
});
