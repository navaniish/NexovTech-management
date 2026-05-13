const fallbackDb = require('../utils/fallbackDb');

async function checkAdmins() {
  const users = await fallbackDb.find('users', {});
  const admins = users.filter(u => u.name?.toLowerCase().includes('admin'));
  console.log('Users with "Admin" in name:', admins.length);
  admins.forEach((u, i) => {
    console.log(`[${i}] ID: ${u.id || u._id}, Email: ${u.email}, Name: ${u.name}, Role: ${u.role}`);
  });
}

checkAdmins();
