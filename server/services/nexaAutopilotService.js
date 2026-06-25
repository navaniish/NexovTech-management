const fallbackDb = require('../utils/fallbackDb');

const industries = [
  'Healthcare', 'Finance', 'E-commerce', 'Logistics', 
  'Education', 'Cybersecurity', 'Real Estate', 'Retail'
];

/**
 * Runs one background tick of the NEXA 24/7 Autopilot.
 * 1. Checks if autopilot settings are enabled in the database.
 * 2. Crawls a random industry niche for B2B leads.
 * 3. Finds pending deals >= 75 score, auto-approves them, and launches projects.
 */
async function runAutopilotCycle() {
  try {
    // Load autopilot settings from DB
    const settings = await fallbackDb.findOne('system_settings', { id: 'autopilot_settings' });
    if (!settings || settings.nexa_autopilot !== true) {
      return; // Autopilot is idle or disabled
    }

    console.log('🤖 [NEXA AUTOPILOT]: Autopilot cycle running...');

    const nexaController = require('../controllers/nexaController');

    // 1. Rotating Lead Discovery Niche
    const selectedIndustry = industries[Math.floor(Math.random() * industries.length)];
    console.log(`🤖 [NEXA AUTOPILOT]: Initiating autonomous lead crawl for industry: ${selectedIndustry}`);

    const discoverReq = {
      body: {
        industry: selectedIndustry,
        region: 'Global',
        limit: 3,
        sources: ['WebScrape']
      }
    };

    const discoverRes = {
      status: (code) => ({
        json: (data) => console.log(`🤖 [NEXA AUTOPILOT]: Crawl status [${code}]:`, data.message || data)
      }),
      json: (data) => console.log(`🤖 [NEXA AUTOPILOT]: Crawl data:`, data.message || data)
    };

    try {
      await nexaController.discoverLeads(discoverReq, discoverRes);
    } catch (discErr) {
      console.error('🤖 [NEXA AUTOPILOT ERROR]: Autonomous lead discovery failed:', discErr.message);
    }

    // Give DB brief moment to commit new entries and scores
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Awaiting Client Email Verification
    const pendingDeals = await fallbackDb.find('pending_deals', { status: 'Pending' }) || [];
    if (pendingDeals.length > 0) {
      console.log(`🤖 [NEXA AUTOPILOT]: Awaiting client email confirmation for ${pendingDeals.length} pending deals.`);
      for (const deal of pendingDeals) {
        console.log(`   • [${deal.companyName}] (Score: ${deal.opportunityScore}%) - Awaiting mail verification before proceeding.`);
      }
    } else {
      console.log('🤖 [NEXA AUTOPILOT]: No pending pitches in queue.');
    }
  } catch (error) {
    console.error('🤖 [NEXA AUTOPILOT ERROR]: Autonomous background cycle failed:', error.message);
  }
}

module.exports = { runAutopilotCycle };
