const fallbackDb = require('../utils/fallbackDb');
const OpenAI = require('openai');
const axios = require('axios');
const { generateToken04 } = require('../utils/zegoServerAssistant');
const socketHub = require('../utils/socketHub');


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
  const { leadId, customPhoneNumber, language, customMessage } = req.body;
  console.log('📞 [VOICE OUTBOUND API CALLED]:', { leadId, customPhoneNumber, language, customMessage });
  if (!leadId) {
    return res.status(400).json({ message: 'leadId is required for voice call' });
  }

  try {
    const lead = await fallbackDb.findById('leads', leadId);
    if (!lead || (lead.tenantId && lead.tenantId !== (req.tenantId || 'org_default'))) {
      return res.status(404).json({ message: 'Lead not found or unauthorized' });
    }

    // Determine target phone number
    const targetPhoneNumber = customPhoneNumber || lead.phone || lead.contactPhone || (lead.contactInfo && lead.contactInfo.phone) || '';

    // Define the pending log data structure
    const logData = {
      id: `out_${Date.now()}`,
      leadId: leadId,
      channel: 'voice',
      recipient: targetPhoneNumber || lead.email || lead.contactEmail || lead.companyName,
      contentSent: customMessage || '',
      outcome: 'Awaiting background call queue dispatcher...',
      status: 'Pending',
      tenantId: req.tenantId || 'org_default',
      createdAt: new Date().toISOString()
    };

    const savedLog = await fallbackDb.save('outreach_logs', logData);
    console.log(`✅ [VOICE OUTBOUND]: Voice campaign queued as Pending (Log ID: ${savedLog.id})`);

    // Broadcast instant Socket.io update for real-time dashboard updates (Instagram concept)
    socketHub.emit('outreach_update', savedLog);

    res.json({
      success: true,
      message: `Voice campaign queued in background.`,
      isRealCall: false,
      serviceUsed: 'Queue Worker',
      transcript: 'Dialing...',
      outcome: 'Pending background dispatch',
      log: savedLog
    });
  } catch (err) {
    console.error('❌ Outbound call dispatcher error:', err);
    res.status(500).json({ message: 'Outbound voice call dispatcher failed', error: err.message });
  }
};

exports.getZegoToken = async (req, res) => {
  const { roomID, userID } = req.body;
  if (!roomID) {
    return res.status(400).json({ message: 'roomID is required' });
  }

  const targetUserID = userID || (req.user && req.user.email) || `user_${Math.floor(Math.random() * 10000)}`;

  try {
    const appId = Number(process.env.ZEGO_APP_ID);
    const serverSecret = process.env.ZEGO_SERVER_SECRET;

    if (!appId || !serverSecret) {
      return res.status(500).json({ message: 'Zego credentials not configured on server' });
    }

    const payloadObject = {
      room_id: roomID,
      privilege: {
        1: 1, // loginRoom: 1 = allow, 0 = deny
        2: 1  // publishStream: 1 = allow, 0 = deny
      },
      stream_id_list: null
    };

    const payload = JSON.stringify(payloadObject);
    const effectiveTimeInSeconds = 7200; // 2 hours

    console.log(`📞 [ZEGO TOKEN]: Generating token for User: ${targetUserID}, Room: ${roomID}`);
    const token = generateToken04(appId, targetUserID, serverSecret, effectiveTimeInSeconds, payload);

    res.json({
      success: true,
      token,
      appId,
      userID: targetUserID,
      roomID
    });
  } catch (err) {
    console.error('❌ Zego token generation error:', err);
    res.status(500).json({ message: 'Failed to generate Zego token', error: err.message });
  }
};

exports.getPublicZegoToken = async (req, res) => {
  const { roomID, userID } = req.body;
  if (!roomID) {
    return res.status(400).json({ message: 'roomID is required' });
  }

  const targetUserID = userID || `guest_${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const appId = Number(process.env.ZEGO_APP_ID);
    const serverSecret = process.env.ZEGO_SERVER_SECRET;

    if (!appId || !serverSecret) {
      return res.status(500).json({ message: 'Zego credentials not configured on server' });
    }

    const payloadObject = {
      room_id: roomID,
      privilege: {
        1: 1, // loginRoom: 1 = allow, 0 = deny
        2: 1  // publishStream: 1 = allow, 0 = deny
      },
      stream_id_list: null
    };

    const payload = JSON.stringify(payloadObject);
    const effectiveTimeInSeconds = 7200; // 2 hours

    console.log(`📞 [PUBLIC ZEGO TOKEN]: Generating token for Guest: ${targetUserID}, Room: ${roomID}`);
    const token = generateToken04(appId, targetUserID, serverSecret, effectiveTimeInSeconds, payload);

    res.json({
      success: true,
      token,
      appId,
      userID: targetUserID,
      roomID
    });
  } catch (err) {
    console.error('❌ Public Zego token generation error:', err);
    res.status(500).json({ message: 'Failed to generate public Zego token', error: err.message });
  }
};

exports.respondVoiceCall = async (req, res) => {
  const SpeechResult = req.body.SpeechResult;
  const language = req.query.language || req.body.language || 'en';
  const leadId = req.query.leadId || req.body.leadId || '';
  const logId = req.query.logId || req.body.logId || '';

  console.log('🎙️ [TWILIO RESPOND WEBHOOK CALLED]:', { SpeechResult, language, leadId, logId });

  let log = null;
  if (logId) {
    try {
      log = await fallbackDb.findById('outreach_logs', logId);
    } catch (e) {
      console.warn('Failed to load outreach log:', e.message);
    }
  }

  // Default fallback language and voice
  let voiceLanguage = 'en-US';
  let voiceName = 'alice';
  
  const selectedLang = (language || '').toLowerCase().trim();
  if (selectedLang.startsWith('hi')) {
    voiceLanguage = 'hi-IN';
    voiceName = 'Polly.Aditi';
  } else if (selectedLang.startsWith('te')) {
    voiceLanguage = 'te-IN';
    voiceName = 'Google.te-IN-Standard-A';
  } else if (selectedLang.startsWith('en-in')) {
    voiceLanguage = 'en-IN';
    voiceName = 'Google.en-IN-Standard-A';
  }

  // Handle call startup greeting
  const isCallStart = !log || !log.contentSent || !log.contentSent.includes('[User]');
  if (isCallStart && (!SpeechResult || !SpeechResult.trim())) {
    let greeting = "Hello! I am calling from NexovTech to discuss our custom B2B specifications proposal. Can you hear me okay?";
    if (voiceLanguage === 'hi-IN') {
      greeting = "नमस्ते! मैं नेक्सोवटेक की ओर से हमारे कस्टम बी2बी प्रस्ताव के बारे में चर्चा करने के लिए कॉल कर रहा हूँ। क्या आप मुझे सुन पा रहे हैं?";
    } else if (voiceLanguage === 'te-IN') {
      greeting = "నమస్తే! మా కస్టమ్ బి2బి ప్రపోజల్ గురించి చర్చించడానికి నేను నెక్సోవ్‌టెక్ నుండి కాల్ చేస్తున్నాను. నా వాయిస్ మీకు వినబడుతుందా?";
    }
    
    // Save greeting to transcript
    if (log) {
      log.contentSent = `[Agent]: ${greeting}`;
      log.status = 'In-Progress';
      log.outcome = 'Call connected. Greeting sent.';
      await fallbackDb.update('outreach_logs', logId, log);
      socketHub.emit('outreach_update', log);
    }
    
    let callbackUrl;
    if (process.env.VOICE_CALLBACK_URL) {
      callbackUrl = `${process.env.VOICE_CALLBACK_URL.replace(/\/$/, '')}/api/nexa/voice/respond?language=${voiceLanguage}&leadId=${leadId}&logId=${logId}`;
    } else {
      const host = req.get('host') || 'nexovtech-management.vercel.app';
      const callbackHost = host.includes('localhost') ? 'nexovtech-management.vercel.app' : host;
      const protocol = req.secure ? 'https' : 'http';
      callbackUrl = `${protocol}://${callbackHost}/api/nexa/voice/respond?language=${voiceLanguage}&leadId=${leadId}&logId=${logId}`;
    }
    
    res.type('text/xml');
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${callbackUrl.replace(/&/g, '&amp;')}" language="${voiceLanguage}" timeout="5">
    <Say language="${voiceLanguage}" voice="${voiceName}">${greeting}</Say>
  </Gather>
</Response>`);
  }

  // Handle silence on call
  if (!SpeechResult || !SpeechResult.trim()) {
    let silencePrompt = "I didn't catch that. Could you please repeat?";
    if (voiceLanguage === 'hi-IN') {
      silencePrompt = "क्षमा करें, मुझे आपकी आवाज़ सुनाई नहीं दी। क्या आप कृपया दोहरा सकते हैं?";
    } else if (voiceLanguage === 'te-IN') {
      silencePrompt = "క్షమించండి, మీ వాయిస్ నాకు వినబడలేదు. దయచేసి మళ్ళీ చెప్పగలరా?";
    }

    let callbackUrl;
    if (process.env.VOICE_CALLBACK_URL) {
      callbackUrl = `${process.env.VOICE_CALLBACK_URL.replace(/\/$/, '')}/api/nexa/voice/respond?language=${voiceLanguage}&leadId=${leadId}&logId=${logId}`;
    } else {
      const host = req.get('host') || 'nexovtech-management.vercel.app';
      const callbackHost = host.includes('localhost') ? 'nexovtech-management.vercel.app' : host;
      const protocol = req.secure ? 'https' : 'http';
      callbackUrl = `${protocol}://${callbackHost}/api/nexa/voice/respond?language=${voiceLanguage}&leadId=${leadId}&logId=${logId}`;
    }

    res.type('text/xml');
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${callbackUrl.replace(/&/g, '&amp;')}" language="${voiceLanguage}" timeout="5">
    <Say language="${voiceLanguage}" voice="${voiceName}">${silencePrompt}</Say>
  </Gather>
</Response>`);
  }

  try {
    // Generate AI response representing a human representative from NexovTech
    const systemPrompt = `You are a professional human business representative from NexovTech Corp.
The user is speaking to you on a phone call.
Respond to the user's input in the same language (${voiceLanguage}).
Keep your response short (1 to 2 sentences max) and conversational, suitable to be read by text-to-speech.
Do NOT mention "AI", "bot", "assistant", "NEXA", or "autonomous". Talk exactly like a human sales executive.
If they are ready to end the call, say a polite goodbye.`;

    const userPrompt = `User said: ${SpeechResult}`;
    const aiReply = await runQuery(systemPrompt, userPrompt);

    const escapedReply = aiReply
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    let callbackUrl;
    if (process.env.VOICE_CALLBACK_URL) {
      callbackUrl = `${process.env.VOICE_CALLBACK_URL.replace(/\/$/, '')}/api/nexa/voice/respond?language=${voiceLanguage}&leadId=${leadId}&logId=${logId}`;
    } else {
      const host = req.get('host') || 'nexovtech-management.vercel.app';
      const callbackHost = host.includes('localhost') ? 'nexovtech-management.vercel.app' : host;
      const protocol = req.secure ? 'https' : 'http';
      callbackUrl = `${protocol}://${callbackHost}/api/nexa/voice/respond?language=${voiceLanguage}&leadId=${leadId}&logId=${logId}`;
    }

    const replyLower = aiReply.toLowerCase();
    const isGoodbye = replyLower.includes('goodbye') || 
                      replyLower.includes('bye') || 
                      replyLower.includes('अलविदा') || 
                      replyLower.includes('సెలవు');

    // Update conversation log in real-time
    if (log) {
      const cleanSpeech = SpeechResult.trim();
      const currentTranscript = log.contentSent || '';
      log.contentSent = `${currentTranscript}\n[User]: ${cleanSpeech}\n[Agent]: ${aiReply}`;
      log.status = isGoodbye ? 'Completed' : 'In-Progress';
      log.outcome = isGoodbye ? 'Real voice call completed successfully.' : 'Live conversation active...';
      await fallbackDb.update('outreach_logs', logId, log);
      socketHub.emit('outreach_update', log);
      
      // Index completed call transcript to vector store RAG
      if (isGoodbye) {
        try {
          const vectorStore = require('../utils/vectorStore');
          const textToEmbed = `[CRM Outreach - Real Voice Call Transcript] Lead/Client: ${log.recipient || 'Client'}\nTranscript:\n${log.contentSent}`;
          await vectorStore.addDocument('crm_memory', textToEmbed, {
            tenantId: log.tenantId || 'org_default',
            leadId,
            outreachId: logId,
            channel: 'Voice',
            type: 'Voice_Call_Transcript'
          });
          console.log(`✅ [CRM VECTOR MEMORY]: Indexed completed voice call transcript for RAG.`);
        } catch (vErr) {
          console.warn('⚠️ Failed to index call transcript:', vErr.message);
        }
      }
    }

    res.type('text/xml');
    if (isGoodbye) {
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${voiceLanguage}" voice="${voiceName}">${escapedReply}</Say>
  <Hangup/>
</Response>`);
    } else {
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${callbackUrl.replace(/&/g, '&amp;')}" language="${voiceLanguage}" timeout="5">
    <Say language="${voiceLanguage}" voice="${voiceName}">${escapedReply}</Say>
  </Gather>
</Response>`);
    }
  } catch (err) {
    console.error('❌ Failed to generate interactive voice response:', err);
    let errorPrompt = "Thank you for speaking with us. An executive will follow up with you. Goodbye.";
    if (voiceLanguage === 'hi-IN') {
      errorPrompt = "हमारे साथ बात करने के लिए धन्यवाद। एक अधिकारी जल्द ही आपसे संपर्क करेगा। अलविदा।";
    } else if (voiceLanguage === 'te-IN') {
      errorPrompt = "మాతో మాట్లాడినందుకు ధన్యవాదాలు. ఒక ప్రతినిధి త్వరలోనే మిమ్మల్ని సంప్రదిస్తారు. సెలవు.";
    }

    if (log) {
      log.status = 'Completed';
      log.outcome = `Real voice call completed with errors: ${err.message}`;
      await fallbackDb.update('outreach_logs', logId, log);
      socketHub.emit('outreach_update', log);
    }

    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${voiceLanguage}" voice="${voiceName}">${errorPrompt}</Say>
</Response>`);
  }
};


