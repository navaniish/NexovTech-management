const fallbackDb = require('../utils/fallbackDb');

async function checkAdmins() {
  const users = await fallbackDb.find('users', { role: 'Admin' });
  console.log('Admins found:', users.length);
  users.forEach((u, i) => {
    console.log(`[${i}] ID: ${u.id || u._id}, Email: ${u.email}, Name: ${u.name}`);
  });
}

checkAdmins();
