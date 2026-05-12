const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const keyPath = path.join(process.cwd(), 'server', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function resetPasswords() {
  const users = [
    { uid: 'W82hAWDuXQUEmtlErLdwMlRQ6yH2', email: 'nexovtech@myyahoo.com', newPassword: 'Admin@123' },
    { uid: '3Nrcp0hlh1e04bQwjAnrwzQvodD2', email: 'manicharanteja1234@gmail.com', newPassword: 'Admin@123' },
    { uid: 'ggPbi818LkbNFPuhay8QCJTSrkx1', email: 'naredlasathwik@nexovtech.com', newPassword: 'Admin@123' },
    { uid: '8D4t1gdpTwPeBCeH8J6Dy3mTqq62', email: 'saranya@nexovtech.com', newPassword: 'Admin@123' },
    { uid: 'yph0evdoiiTrvTbfubJWBZdlA2J2', email: 'manicharanteja@nexovtech.com', newPassword: 'Admin@123' },
    { uid: 'jBLpMVT21NUdPlfaSl6yN0sB5LE3', email: 'gundasaranya2006@gmail.com', newPassword: 'Admin@123' },
  ];

  for (const u of users) {
    try {
      await admin.auth().updateUser(u.uid, { password: u.newPassword });
      console.log(`✅ [${u.email}] → password set to "${u.newPassword}"`);
    } catch (err) {
      console.error(`❌ [${u.email}] → ${err.message}`);
    }
  }

  console.log('\n✅ All Firebase passwords synchronized.');
  process.exit(0);
}

resetPasswords();
