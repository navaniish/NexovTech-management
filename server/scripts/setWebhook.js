const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL || `https://nexovtech-management.netlify.app/api/telegram-webhook`;

async function setWebhook() {
  if (!TOKEN) {
    console.error('❌ Error: TELEGRAM_BOT_TOKEN is missing in .env');
    return;
  }

  console.log(`📡 Setting webhook to: ${WEBHOOK_URL}`);
  
  try {
    const response = await axios.get(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
      params: { url: WEBHOOK_URL }
    });
    console.log('✅ Telegram Response:', response.data);
  } catch (error) {
    console.error('❌ Failed to set webhook:', error.response ? error.response.data : error.message);
  }
}

setWebhook();
