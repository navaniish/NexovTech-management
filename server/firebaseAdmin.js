let admin, db;

try {
  admin = require('firebase-admin');
  let serviceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    try {
      serviceAccount = require('./serviceAccountKey.json');
    } catch (e) {
      console.warn('⚠️ No serviceAccountKey.json found, checking environment variables.');
    }
  }

  if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  db = admin.apps.length ? admin.firestore() : null;
} catch (err) {
  console.error('🔥 FIREBASE_FATAL_ERROR:', err.message);
  db = null;
}

module.exports = { admin, db };
