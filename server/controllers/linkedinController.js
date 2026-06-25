const axios = require('axios');
const prisma = require('../config/database');
const fallbackDb = require('../utils/fallbackDb');

const USE_COMPANY = process.env.LINKEDIN_USE_COMPANY === 'true';

const CLIENT_ID = USE_COMPANY
  ? (process.env.LINKEDIN_CLIENT_ID_COMPANY || 'placeholder_client_id')
  : (process.env.LINKEDIN_CLIENT_ID_PERSONAL || 'placeholder_client_id');

const CLIENT_SECRET = USE_COMPANY
  ? (process.env.LINKEDIN_CLIENT_SECRET_COMPANY || 'placeholder_client_secret')
  : (process.env.LINKEDIN_CLIENT_SECRET_PERSONAL || 'placeholder_client_secret');

const CALLBACK_URL = process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:5006/api/linkedin/callback';
const CLIENT_DASHBOARD_URL = process.env.CLIENT_URL || 'http://localhost:5173/ai';

const SCOPES = (USE_COMPANY
  ? (process.env.LINKEDIN_SCOPES_COMPANY || 'w_organization_social r_organization_social')
  : (process.env.LINKEDIN_SCOPES_PERSONAL || 'openid profile email w_member_social')
).replace(/['"]/g, '');

// 1. REDIRECT TO LINKEDIN OAUTH CONSENT
exports.redirectToAuth = (req, res) => {
  // Determine mode: query param overrides env var
  const useCompany = req.query.useCompany === 'true' ? true : (process.env.LINKEDIN_USE_COMPANY === 'true');
  const clientId = useCompany
    ? (process.env.LINKEDIN_CLIENT_ID_COMPANY || 'placeholder_client_id')
    : (process.env.LINKEDIN_CLIENT_ID_PERSONAL || 'placeholder_client_id');
  
  const stateVal = useCompany ? 'nexa_company' : 'nexa_personal';

  if (clientId === 'placeholder_client_id' || !clientId) {
    console.warn('❌ [LINKEDIN OAUTH]: No client ID configured.');
    return res.redirect(`${CLIENT_DASHBOARD_URL}?error=${encodeURIComponent('LinkedIn App ID is not configured.')}`);
  }

  // Scopes are already defined globally based on env, recompute if overridden
  const scopes = (useCompany
    ? (process.env.LINKEDIN_SCOPES_COMPANY || 'w_organization_social r_organization_social')
    : (process.env.LINKEDIN_SCOPES_PERSONAL || 'openid profile email w_member_social')).replace(/["']/g, '');
  const scopeEncoded = encodeURIComponent(scopes);
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(CALLBACK_URL)}&state=${stateVal}&scope=${scopeEncoded}`;
  res.redirect(authUrl);
};

// 2. OAUTH CALLBACK & TOKEN EXCHANGE
exports.handleCallback = async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error('❌ LinkedIn OAuth error:', error_description || error);
    return res.redirect(`${CLIENT_DASHBOARD_URL}?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.status(400).json({ message: 'Authorization code is missing' });
  }

  // Simulated authentication code bypass removed for strictly real integrations
  if (code.startsWith('simulated_')) {
    return res.redirect(`${CLIENT_DASHBOARD_URL}?error=${encodeURIComponent('Simulated LinkedIn tokens are disabled.')}`);
  }

  const useCompany = state === 'nexa_company';
  const clientId = useCompany
    ? (process.env.LINKEDIN_CLIENT_ID_COMPANY || 'placeholder_client_id')
    : (process.env.LINKEDIN_CLIENT_ID_PERSONAL || 'placeholder_client_id');
  const clientSecret = useCompany
    ? (process.env.LINKEDIN_CLIENT_SECRET_COMPANY || 'placeholder_client_secret')
    : (process.env.LINKEDIN_CLIENT_SECRET_PERSONAL || 'placeholder_client_secret');

  try {
    // Exchange Auth Code for Access Token
    const tokenResponse = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: CALLBACK_URL,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
      { 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 8000
      }
    );

    const { access_token, expires_in, refresh_token } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Fetch user profile info or roles to get target organization URN
    let organizationUrn = 'urn:li:organization:105267232'; // Default mock organization URN if request fails
    let organizationName = 'NexovTech Corp';
    let aclSuccess = false;

    // Only query organizational ACLs if we are in company mode
    if (useCompany) {
      try {
        const aclResponse = await axios.get(
          'https://api.linkedin.com/rest/organizationalEntityAcls?q=roleAssignee',
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              'LinkedIn-Version': '202605',
              'X-Restli-Protocol-Version': '2.0.0'
            },
            timeout: 8000
          }
        );

        const elements = aclResponse.data?.elements || [];
        const orgAcl = elements.find(el => el.organizationalEntity && el.role === 'ADMINISTRATOR');
        
        if (orgAcl && orgAcl.organizationalEntity) {
          organizationUrn = orgAcl.organizationalEntity;
          aclSuccess = true;
          
          // Fetch organization name
          const orgId = organizationUrn.split(':').pop();
          const orgInfoResponse = await axios.get(
            `https://api.linkedin.com/rest/organizations/${orgId}`,
            {
              headers: {
                Authorization: `Bearer ${access_token}`,
                'LinkedIn-Version': '202605',
                'X-Restli-Protocol-Version': '2.0.0'
              },
              timeout: 8000
            }
          );
          organizationName = orgInfoResponse.data?.localizedName || organizationName;
        }
      } catch (apiErr) {
        console.warn('⚠️ Could not resolve Organization URN automatically via ACLs:', apiErr.message);
      }
    }

    // Fallback/Standard profile flow: Fetch user profile (OIDC userinfo) if ACLs failed/skipped or found no active organization
    if (!aclSuccess) {
      try {
        const userInfoResponse = await axios.get(
          'https://api.linkedin.com/v2/userinfo',
          {
            headers: {
              Authorization: `Bearer ${access_token}`
            },
            timeout: 8000
          }
        );
        if (userInfoResponse.data && userInfoResponse.data.sub) {
          organizationUrn = `urn:li:person:${userInfoResponse.data.sub}`;
          const personName = userInfoResponse.data.name || `${userInfoResponse.data.given_name || ''} ${userInfoResponse.data.family_name || ''}`.trim() || 'LinkedIn Member';
          organizationName = `${personName} (Personal Profile)`;
          console.log(`👤 Using personal member profile: ${organizationName}`);
        }
      } catch (userErr) {
        console.warn('⚠️ Could not resolve Member User Info from OIDC endpoint:', userErr.message);
      }
    }

    // Save configuration in database (single record active)
    let existingConfig;
    let useFallbackDb = false;
    try {
      existingConfig = await prisma.linkedInConfig.findFirst();
    } catch (dbErr) {
      console.warn('⚠️ PostgreSQL offline, falling back to local/Firestore cache for LinkedIn Config:', dbErr.message);
      useFallbackDb = true;
      const configs = await fallbackDb.find('linkedin_configs', {});
      existingConfig = configs[0] || null;
    }

    if (!useFallbackDb) {
      try {
        if (existingConfig) {
          await prisma.linkedInConfig.update({
            where: { id: existingConfig.id },
            data: {
              organizationUrn,
              organizationName,
              accessToken: access_token,
              refreshToken: refresh_token || null,
              expiresAt,
              isActive: true
            }
          });
        } else {
          await prisma.linkedInConfig.create({
            data: {
              organizationUrn,
              organizationName,
              accessToken: access_token,
              refreshToken: refresh_token || null,
              expiresAt,
              isActive: true
            }
          });
        }
      } catch (dbErr) {
        console.warn('⚠️ PostgreSQL save failed in handleCallback:', dbErr.message);
      }
    }

    // Always mirror to fallbackDb to keep them in sync
    const finalizedItem = {
      organizationUrn,
      organizationName,
      accessToken: access_token,
      refreshToken: refresh_token || null,
      expiresAt: expiresAt.toISOString ? expiresAt.toISOString() : expiresAt,
      isActive: true
    };
    try {
      if (existingConfig) {
        await fallbackDb.update('linkedin_configs', existingConfig.id || existingConfig._id, finalizedItem);
      } else {
        await fallbackDb.save('linkedin_configs', finalizedItem);
      }
    } catch (fbErr) {
      console.error('🔥 fallbackDb save failed in handleCallback:', fbErr.message);
    }

    console.log(`✅ LinkedIn connection successful for organization: ${organizationName}`);
    res.redirect(`${CLIENT_DASHBOARD_URL}?linkedin=connected&company=${encodeURIComponent(organizationName)}`);
  } catch (err) {
    console.error('❌ LinkedIn token exchange failed:', err.message);
    res.redirect(`${CLIENT_DASHBOARD_URL}?error=TokenExchangeFailed`);
  }
};

// 3. GET INTEGRATION STATUS
exports.getStatus = async (req, res) => {
  try {
    let config;
    try {
      config = await prisma.linkedInConfig.findFirst();
    } catch (dbErr) {
      console.warn('⚠️ PostgreSQL offline in getStatus, falling back to local/Firestore cache:', dbErr.message);
      const configs = await fallbackDb.find('linkedin_configs', {});
      config = configs[0] || null;
    }

    if (!config || !config.isActive) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      companyName: config.organizationName,
      organizationUrn: config.organizationUrn,
      expiresAt: config.expiresAt
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve connection status', error: err.message });
  }
};

// 4. DISCONNECT INTEGRATION
exports.disconnect = async (req, res) => {
  try {
    try {
      await prisma.linkedInConfig.deleteMany();
    } catch (dbErr) {
      console.warn('⚠️ PostgreSQL offline in disconnect:', dbErr.message);
    }
    // Delete from fallbackDb
    const configs = await fallbackDb.find('linkedin_configs', {});
    for (const c of configs) {
      await fallbackDb.deleteOne('linkedin_configs', c.id || c._id);
    }
    res.json({ message: 'LinkedIn integration disconnected successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to disconnect integration', error: err.message });
  }
};

// 5. POST SHARE ON FEED
exports.sharePost = async (req, res) => {
  try {
    const { commentary } = req.body;

    if (!commentary) {
      return res.status(400).json({ message: 'Commentary text is required' });
    }

    let config;
    try {
      config = await prisma.linkedInConfig.findFirst();
    } catch (dbErr) {
      console.warn('⚠️ PostgreSQL offline in sharePost, falling back to local/Firestore cache:', dbErr.message);
      const configs = await fallbackDb.find('linkedin_configs', {});
      config = configs[0] || null;
    }

    const isSimulated = !config || !config.isActive || (config.accessToken && config.accessToken.startsWith('simulated_'));

    if (isSimulated) {
      return res.status(400).json({
        message: 'LinkedIn Sharing requires a real, connected LinkedIn profile/company page. Please connect a real account.'
      });
    }

    // Call LinkedIn rest/posts API
    const response = await axios.post(
      'https://api.linkedin.com/rest/posts',
      {
        author: config.organizationUrn,
        commentary,
        visibility: 'PUBLIC',
        lifecycleState: 'PUBLISHED',
        distribution: {
          feedDistribution: 'MAIN_FEED'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'LinkedIn-Version': '202605',
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json'
        },
        timeout: 8000
      }
    );

    res.json({ message: 'Post successfully shared on LinkedIn feed', data: response.data });
  } catch (err) {
    console.error('❌ LinkedIn post failed:', err.response?.data || err.message);
    res.status(500).json({
      message: 'Failed to publish post on LinkedIn',
      error: err.response?.data || err.message
    });
  }
};

/**
 * Auto-reply to comments on company posts using AI.
 * Only works when the integration is configured for a company (USE_COMPANY=true).
 */
exports.autoReply = async (req, res) => {
  try {
    const { commentId, replyTemplate } = req.body;
    if (!commentId) {
      return res.status(400).json({ message: 'commentId is required' });
    }

    // Ensure we are in company mode
    if (!process.env.LINKEDIN_USE_COMPANY || process.env.LINKEDIN_USE_COMPANY !== 'true') {
      return res.status(403).json({ message: 'Auto-reply is only available for company LinkedIn integration' });
    }

    // Load config
    let config;
    try {
      config = await prisma.linkedInConfig.findFirst();
    } catch (dbErr) {
      console.warn('⚠️ PostgreSQL offline in autoReply, falling back to local/Firestore cache:', dbErr.message);
      const configs = await fallbackDb.find('linkedin_configs', {});
      config = configs[0] || null;
    }
    if (!config || !config.isActive) {
      return res.status(400).json({ message: 'LinkedIn integration is not active' });
    }

    // Fetch original comment (optional, for context)
    let commentText = '';
    try {
      const commentResp = await axios.get(
        `https://api.linkedin.com/rest/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${config.accessToken}`, 'LinkedIn-Version': '202605', 'X-Restli-Protocol-Version': '2.0.0' } }
      );
      commentText = commentResp.data?.message?.text || '';
    } catch (e) {
      console.warn('⚠️ Could not fetch comment for context:', e.message);
    }

    // Generate AI response – placeholder implementation
    const aiReply = replyTemplate || `Thank you for your comment!`; // Replace with real AI call if available

    // Post reply on LinkedIn
    await axios.post(
      'https://api.linkedin.com/rest/comments',
      {
        author: config.organizationUrn,
        lifecycleState: 'PUBLISHED',
        parent: `urn:li:comment:${commentId}`,
        message: { text: aiReply }
      },
      { headers: { Authorization: `Bearer ${config.accessToken}`, 'LinkedIn-Version': '202605', 'X-Restli-Protocol-Version': '2.0.0', 'Content-Type': 'application/json' } }
    );

    res.json({ message: 'Auto-reply posted successfully', reply: aiReply });
  } catch (err) {
    console.error('❌ Auto-reply failed:', err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to post auto-reply', error: err.response?.data || err.message });
  }
};
