const { runMultiAgentOrchestration } = require('./agentNetworkController');

/**
 * GET Verification endpoint for Meta WhatsApp Cloud API
 */
exports.handleMetaVerification = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'NEXOV-WHATSAPP-TOKEN';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Meta Webhook Verification successful.');
    return res.status(200).send(challenge);
  } else {
    console.warn('❌ Meta Webhook Verification failed.');
    return res.status(403).send('Verification failed');
  }
};

/**
 * POST Webhook handler for Meta WhatsApp Cloud API
 */
exports.handleMetaMessage = async (req, res) => {
  try {
    const { body } = req;
    
    // Check if the payload is from Meta WhatsApp
    if (body.object === 'whatsapp_business_account' && body.entry) {
      for (const entry of body.entry) {
        if (!entry.changes) continue;
        for (const change of entry.changes) {
          if (change.value && change.value.messages) {
            for (const message of change.value.messages) {
              if (message.type === 'text') {
                const text = message.text.body;
                const senderNumber = message.from;
                
                console.log(`💬 Meta WhatsApp Incoming: "${text}" from ${senderNumber}`);
                
                // Trigger Multi-Agent Orchestration
                const result = await runMultiAgentOrchestration(text);
                
                // Log the success
                console.log(`✅ Meta WhatsApp AI Orchestration finished. Response: "${result.response.substring(0, 50)}..."`);
              }
            }
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    }
    
    return res.status(404).send('Not a valid Meta message');
  } catch (err) {
    console.error('❌ Meta WhatsApp Webhook Exception:', err);
    return res.status(500).send('Internal Error');
  }
};

/**
 * POST Webhook handler for Twilio WhatsApp API
 */
exports.handleTwilioMessage = async (req, res) => {
  try {
    const userMessage = req.body.Body;
    const sender = req.body.From;

    if (!userMessage) {
      return res.status(400).send('Body is required');
    }

    console.log(`💬 Twilio WhatsApp Incoming: "${userMessage}" from ${sender}`);

    // Trigger Multi-Agent Orchestration
    const result = await runMultiAgentOrchestration(userMessage);

    // Format the response including hops
    let hopsText = "";
    if (result.hops && result.hops.length > 0) {
      hopsText = result.hops.map(h => `• ${h.sender} ➔ ${h.recipient}`).join('\n');
    }
    
    let twimlResponse = "";
    if (hopsText) {
      twimlResponse += `🤖 NEXA Multi-Agent Hops:\n${hopsText}\n\n`;
    }
    twimlResponse += `📋 Consolidated Strategic Report:\n${result.response}`;

    // Return proper TwiML response so Twilio can send the message back
    res.type('text/xml');
    return res.send(`
      <Response>
        <Message>${escapeXml(twimlResponse)}</Message>
      </Response>
    `.trim());
  } catch (err) {
    console.error('❌ Twilio WhatsApp Webhook Exception:', err);
    res.type('text/xml');
    return res.send(`
      <Response>
        <Message>NEXA Multi-Agent network encountered an issue. Please try again later.</Message>
      </Response>
    `.trim());
  }
};

/**
 * POST Simulator endpoint for Web Dashboard
 */
exports.handleSimulatedMessage = async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ message: 'Message is required.' });
  }

  try {
    const result = await runMultiAgentOrchestration(message, null, req.tenantId || 'org_default');
    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('❌ WhatsApp simulator loop exception:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
