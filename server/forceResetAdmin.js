const { admin } = require('./firebaseAdmin');

const forceReset = async () => {
  const email = 'nexovtech@myyahoo.com';
  const newPassword = 'Nexov123!';

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, {
      password: newPassword
    });
    console.log(`✅ SUCCESS: Password for ${email} has been forcefully reset to: ${newPassword}`);
    process.exit(0);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      // If user doesn't exist, create it
      await admin.auth().createUser({
        email,
        password: newPassword,
        displayName: 'NexovTech Administrator'
      });
      console.log(`✅ SUCCESS: Admin account ${email} created with password: ${newPassword}`);
    } else {
      console.error('❌ FORCE RESET FAILED:', err.message);
    }
    process.exit(1);
  }
};

forceReset();
