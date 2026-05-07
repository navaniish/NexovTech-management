let admin, db;

try {
  admin = require('firebase-admin');
  let serviceAccount;

  // 1. Try Environment Variable (Production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.error('❌ FIREBASE_ENV_PARSE_ERROR:', e.message);
    }
  } 

  // 2. Try Local File (Development Only)
  if (!serviceAccount && !process.env.NETLIFY && !process.env.VERCEL) {
    try {
      // We use a dynamic require string to prevent bundlers like esbuild from failing during build
      const keyPath = './serviceAccountKey.json';
      serviceAccount = require(keyPath);
    } catch (e) {
      console.warn('⚠️ No local serviceAccountKey.json found.');
    }
  }

  if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  // Ensure db is always connected if an app exists
  if (admin.apps.length) {
    db = admin.firestore();
  } else {
    db = null;
  }
} catch (err) {
  console.error('🔥 FIREBASE_FATAL_ERROR:', err.message);
  db = null;
}

module.exports = { admin, db };
