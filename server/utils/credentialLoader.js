const fallbackDb = require('./fallbackDb');

async function loadIntegrationCredentials() {
  try {
    const settings = await fallbackDb.findOne('system_settings', { id: 'api_credentials' });
    if (settings) {
      if (settings.stripe_secret_key) process.env.STRIPE_SECRET_KEY = settings.stripe_secret_key;
      if (settings.razorpay_key_id) process.env.RAZORPAY_KEY_ID = settings.razorpay_key_id;
      if (settings.razorpay_key_secret) process.env.RAZORPAY_KEY_SECRET = settings.razorpay_key_secret;
      if (settings.github_token) process.env.GITHUB_TOKEN = settings.github_token;
      if (settings.jira_host) process.env.JIRA_HOST = settings.jira_host;
      if (settings.jira_email) process.env.JIRA_EMAIL = settings.jira_email;
      if (settings.jira_api_token) process.env.JIRA_API_TOKEN = settings.jira_api_token;
      console.log('⚙️ [INTEGRATIONS]: Dynamic credentials loaded from DB.');
    }
  } catch (err) {
    console.warn('⚠️ [INTEGRATIONS]: Failed to load credentials from DB:', err.message);
  }
}

module.exports = { loadIntegrationCredentials };
