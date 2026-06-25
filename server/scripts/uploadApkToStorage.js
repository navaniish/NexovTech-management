const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function uploadApk() {
  const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ serviceAccountKey.json not found in server directory!');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "nexovtech-management.firebasestorage.app"
    });
  }

  const bucket = admin.storage().bucket();
  const localApkPath = path.join(__dirname, '../../nexovtech.apk');

  if (!fs.existsSync(localApkPath)) {
    console.error(`❌ Local APK file not found at: ${localApkPath}`);
    process.exit(1);
  }

  console.log(`📤 Uploading ${localApkPath} to Firebase Storage bucket ${bucket.name}...`);

  try {
    const [file] = await bucket.upload(localApkPath, {
      destination: 'apk/nexovtech.apk',
      resumable: false,
      public: true,
      metadata: {
        contentType: 'application/vnd.android.package-archive',
        cacheControl: 'public, max-age=31536000'
      }
    });

    console.log('✅ Upload complete!');
    
    // Construct the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
    console.log(`🔗 Public Download URL: ${publicUrl}`);
    
    // Save to server config so securityRoutes.js can redirect to it dynamically
    const db = admin.firestore();
    await db.collection('settings').doc('android_config').set({
      apkUrl: publicUrl,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log('📊 Firebase settings ledger updated with APK URL.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to upload APK to Storage:', err);
    process.exit(1);
  }
}

uploadApk();
