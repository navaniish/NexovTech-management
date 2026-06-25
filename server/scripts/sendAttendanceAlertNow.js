const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const { sendDailyAttendanceAlert } = require('../services/schedulerService');

async function triggerNow() {
  console.log('🚀 Manually triggering Daily Attendance Alert via real SMTP...');
  try {
    const result = await sendDailyAttendanceAlert();
    console.log('✅ Success! Daily brief sent. Results:', result);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to trigger daily attendance alert:', err);
    process.exit(1);
  }
}

triggerNow();
