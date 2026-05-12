const fs = require('fs');
const path = require('path');

const usersPath = path.join(process.cwd(), 'server', 'data', 'users.json');

const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

// 1. Remove duplicate Admin (keep the one with firebaseUid)
const filteredUsers = users.filter(u => u.id !== 'nexovtech@myyahoo.com');

// 2. Fix saranya email mismatch if any
const updatedUsers = filteredUsers.map(u => {
  if (u.firebaseUid === '8D4t1gdpTwPeBCeH8J6Dy3mTqq62') {
    u.email = 'saranya@nexovtech.com';
    u.companyEmail = 'gunda.saranya@nexovtech.com';
  }
  return u;
});

// 3. Provision missing cloud user
const missingUser = {
  id: "jBLpMVT21NUdPlfaSl6yN0sB5LE3",
  firebaseUid: "jBLpMVT21NUdPlfaSl6yN0sB5LE3",
  email: "gundasaranya2006@gmail.com",
  name: "GUNDA SARANYA (Cloud)",
  role: "Employee",
  status: "Active",
  createdAt: { _seconds: Math.floor(Date.now()/1000), _nanoseconds: 0 }
};

if (!updatedUsers.find(u => u.firebaseUid === missingUser.firebaseUid)) {
  updatedUsers.push(missingUser);
}

fs.writeFileSync(usersPath, JSON.stringify(updatedUsers, null, 2));
console.log('✅ Registry Sync Complete: Duplicates removed, missing users provisioned.');
process.exit(0);
