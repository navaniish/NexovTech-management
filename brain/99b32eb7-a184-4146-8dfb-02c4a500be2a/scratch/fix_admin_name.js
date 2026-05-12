const { db } = require(require('path').join(process.cwd(), 'server', 'firebaseAdmin'));

async function fixAdminName() {
  if (!db) { console.error('❌ No Firestore'); return; }
  
  await db.collection('users').doc('W82hAWDuXQUEmtlErLdwMlRQ6yH2').update({
    name: 'NexovTech Administration'
  });
  
  console.log('✅ Admin name fixed in Firestore: "NexovTech Administration"');
  process.exit(0);
}

fixAdminName().catch(err => { console.error('🔥', err); process.exit(1); });
