let admin, db;

try {
  admin = require('firebase-admin');
  let serviceAccount;

  // Production: read from environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.error('❌ FIREBASE_ENV_PARSE_ERROR:', e.message);
    }
  }

  // Local development: read from file using fs (invisible to esbuild bundler)
  if (!serviceAccount && !process.env.NETLIFY && !process.env.VERCEL) {
    try {
      const fs = require('fs');
      const path = require('path');
      const keyFile = path.join(__dirname, 'serviceAccountKey.json');
      if (fs.existsSync(keyFile)) {
        serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
      }
    } catch (e) {
      console.warn('⚠️ No local serviceAccountKey.json found.');
    }
  }

  if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "nexovtech-management.firebasestorage.app"
    });
  }

  db = admin.apps.length ? admin.firestore() : null;
  const bucket = admin.apps.length ? admin.storage().bucket() : null;
} catch (err) {
  console.error('🔥 FIREBASE_FATAL_ERROR:', err.message);
  admin = null;
  db = null;
}

module.exports = { admin, db, bucket: admin?.apps?.length ? admin.storage().bucket() : null };
