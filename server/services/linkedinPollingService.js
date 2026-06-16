const axios = require('axios');
const prisma = require('../config/database');
const fallbackDb = require('../utils/fallbackDb');

/**
 * Poll LinkedIn for new comments on the company page and auto‑reply using the
 * existing `autoReply` logic. This runs in the background via the scheduler.
 */
async function pollLinkedInComments() {
  try {
    // Only operate in company mode
    if (process.env.LINKEDIN_USE_COMPANY !== 'true') return;

    // Load LinkedIn configuration from local cache only – avoids DB dependency during polling
    const configs = await fallbackDb.find('linkedin_configs', {});
    const config = configs && configs.length > 0 ? configs[0] : null;
    if (!config || !config.isActive) return;

    // Retrieve last processed timestamp (fallback to epoch if none)
    let meta = await fallbackDb.findOne('linkedin_meta', { id: 'last_check' });
    let lastTimestamp = meta?.timestamp || new Date(0).toISOString();

    // Ensure organization URN is correctly formatted (e.g., "urn:li:organization:<id>")
    const orgUrn = config.organizationUrn && config.organizationUrn.startsWith('urn:li:organization:')
      ? config.organizationUrn
      : `urn:li:organization:${config.organizationUrn}`;
    // Build LinkedIn comments API URL – fetch recent comments (last 24h)
    const commentsUrl = `https://api.linkedin.com/rest/comments?q=entity&entity=${encodeURIComponent(orgUrn)}&count=100`;
    let response;
    try {
      response = await axios.get(commentsUrl, {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'LinkedIn-Version': '202605',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        timeout: 8000
      });
    } catch (apiErr) {
      if (apiErr.response && apiErr.response.status === 404) {
        console.warn('⚠️ LinkedIn comments endpoint returned 404 – likely no comments or wrong entity URN');
      } else {
        console.warn('⚠️ LinkedIn comments fetch failed:', apiErr.message);
      }
      return; // abort this poll cycle
    }

    const comments = response.data?.elements || [];
    for (const comment of comments) {
      const createdAt = comment?.created?.time ? new Date(comment.created.time).toISOString() : null;
      if (!createdAt || createdAt <= lastTimestamp) continue;

      const commentId = comment.id;
      const replyTemplate = 'Thank you for engaging with NexovTech! We will get back to you shortly.';

      try {
        await axios.post(
          'https://api.linkedin.com/rest/comments',
          {
            author: config.organizationUrn,
            lifecycleState: 'PUBLISHED',
            parent: `urn:li:comment:${commentId}`,
            message: { text: replyTemplate }
          },
          {
            headers: {
              Authorization: `Bearer ${config.accessToken}`,
              'LinkedIn-Version': '202605',
              'X-Restli-Protocol-Version': '2.0.0',
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`✅ Auto‑replied to LinkedIn comment ${commentId}`);
        if (createdAt > lastTimestamp) lastTimestamp = createdAt;
      } catch (replyErr) {
        console.warn('⚠️ Failed to post auto‑reply for comment', commentId, replyErr.message);
      }
    }

    // Persist the newest timestamp back to Firestore/local cache
    if (meta) {
      await fallbackDb.update('linkedin_meta', meta.id || meta._id, { timestamp: lastTimestamp });
    } else {
      await fallbackDb.save('linkedin_meta', { id: 'last_check', timestamp: lastTimestamp });
    }
  } catch (err) {
    console.error('❌ pollLinkedInComments error:', err.message);
  }
}

module.exports = { pollLinkedInComments };
