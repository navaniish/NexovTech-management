const path = require('path');
const workspaceRoot = 'c:/Users/dnava/OneDrive/Desktop/Nexovgen-management';
const fallbackDb = require(path.join(workspaceRoot, 'server/utils/fallbackDb'));

async function debugLookup() {
  const email = 'saranya@nexovtech.com';
  console.log(`Searching for: ${email}`);
  
  const user = (await fallbackDb.findById('users', email)) || 
               (await fallbackDb.findOne('users', { firebaseUid: email })) ||
               (await fallbackDb.findOne('users', { email: email }));
  
  console.log('User found:', JSON.stringify(user, null, 2));
  
  const canonicalUserId = user.firebaseUid || user.id || user._id;
  console.log('Canonical User ID:', canonicalUserId);
  
  process.exit(0);
}

debugLookup().catch(console.error);
