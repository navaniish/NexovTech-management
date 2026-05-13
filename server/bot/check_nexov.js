const fallbackDb = require('../utils/fallbackDb');

async function checkNexovUsers() {
  const users = await fallbackDb.find('users', {});
  const nexovUsers = users.filter(u => 
    u.email?.includes('nexov') || 
    u.name?.toLowerCase().includes('nexov') ||
    u.companyEmail?.includes('nexov')
  );
  console.log('Nexov related users found:', nexovUsers.length);
  nexovUsers.forEach((u, i) => {
    console.log(`[${i}] ID: ${u.id || u._id}, Email: ${u.email}, CoEmail: ${u.companyEmail}, Name: ${u.name}, Role: ${u.role}`);
  });
}

checkNexovUsers();
