const fetch = require('node-fetch');
async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/dashboard/stats');
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
