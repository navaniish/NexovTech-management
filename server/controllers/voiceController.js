const fallbackDb = require('../utils/fallbackDb');
const OpenAI = require('openai');

let aiClient;
try {
  aiClient = new OpenAI({
    baseURL: process.env.AI_BASE_URL || "https://api.nexovtech.ai/v1",
    apiKey: process.env.AI_API_KEY || 'placeholder',
    timeout: 30000
  });
} catch (e) {
  // Silent fallback
}

async function runQuery(systemPrompt, userPrompt) {
  if (!aiClient || !process.env.AI_API_KEY || process.env.AI_API_KEY === 'placeholder') {
    throw new Error('AI Provider Offline');
  }
  const completion = await aiClient.chat.completions.create({
    model: process.env.AI_MODEL || "nvidia/nemotron-3-ultra-550b-a55b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 1024
  });
  return completion.choices[0].message?.content || '';
}

exports.simulateVoiceCall = async (req, res) => {
  const { leadId } = req.body;
  if (!leadId) {
    return res.status(400).json({ message: 'leadId is required for voice call simulation' });
  }

  try {
    const lead = await fallbackDb.findById('leads', leadId);
    if (!lead || (lead.tenantId && lead.tenantId !== (req.tenantId || 'org_default'))) {
      return res.status(404).json({ message: 'Lead not found or unauthorized' });
    }

    console.log(`📞 [VOICE OUTBOUND]: Initiating simulated Vapi/Retell B2B Call to ${lead.companyName}...`);

    let callTranscript = '';
    let callOutcome = 'Call completed successfully. Follow-up scheduled.';

    try {
      const systemPrompt = `You are a professional B2B AI Voice Assistant representing NexovTech Corp.
Generate a realistic 4-line telephone script transcript between yourself (NEXA Voice) and the client contact representing ${lead.companyName}.
The conversation should discuss the qualification of their ${lead.industry || 'AI/Web'} project requirements.
Do not output any markdown formatting, headers, or instructions. Output only the conversation script lines.`;

      const userPrompt = `
        Client: ${lead.companyName}
        Industry: ${lead.industry}
        Contact Name: ${lead.contactName || 'Client representative'}
      `;

      callTranscript = await runQuery(systemPrompt, userPrompt);
    } catch (err) {
      callTranscript = `
[00:02] NEXA Voice: Hello! Am I speaking with the representative for ${lead.companyName}?
[00:06] Client: Yes, this is they. Who is calling?
[00:11] NEXA Voice: This is the NexovTech Autonomous Agent. I am calling to discuss our custom B2B specifications proposal.
[00:17] Client: Excellent, we received the proposal and would love to move forward with the kickoff next week.
`;
      callOutcome = 'Client accepted proposal. Moving to kickoff.';
    }

    // Save to outreach_logs
    const logData = {
      id: `out_${Date.now()}`,
      leadId: leadId,
      channel: 'Voice Call',
      recipient: lead.email || lead.contactEmail || lead.companyName,
      contentSent: callTranscript,
      outcome: callOutcome,
      tenantId: req.tenantId || 'org_default',
      createdAt: new Date().toISOString()
    };

    const savedLog = await fallbackDb.save('outreach_logs', logData);
    console.log('✅ [VOICE OUTBOUND]: Call log saved in outreach_logs:', savedLog.id);

    res.json({
      success: true,
      message: `Simulated Retell/Vapi Call to ${lead.companyName} completed.`,
      transcript: callTranscript,
      outcome: callOutcome,
      log: savedLog
    });
  } catch (err) {
    console.error('❌ Voice call simulation error:', err);
    res.status(500).json({ message: 'Voice call simulation failed', error: err.message });
  }
};
