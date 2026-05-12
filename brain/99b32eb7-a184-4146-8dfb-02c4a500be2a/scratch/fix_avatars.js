const fs = require('fs');
const path = require('path');

const usersPath = path.join(process.cwd(), 'server', 'data', 'users.json');

if (!fs.existsSync(usersPath)) {
  console.error('❌ users.json not found');
  process.exit(1);
}

const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

let count = 0;
const fixedUsers = users.map(user => {
  if (user.avatar && user.avatar.includes('localhost:5005')) {
    user.avatar = user.avatar.replace('http://localhost:5005', '');
    count++;
  }
  return user;
});

fs.writeFileSync(usersPath, JSON.stringify(fixedUsers, null, 2));

console.log(`✅ Successfully fixed ${count} avatar URLs in users.json`);
process.exit(0);
