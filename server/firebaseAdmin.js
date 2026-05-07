let admin, db;

try {
  admin = require('firebase-admin');
  const serviceAccount = require('./serviceAccountKey.json');

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  db = admin.firestore();
} catch (err) {
  console.error('🔥 FIREBASE_FATAL_ERROR:', err.message);
  db = null; // Fallback to local will handle this
}

module.exports = { admin, db };
