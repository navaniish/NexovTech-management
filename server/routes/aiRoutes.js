const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const dotenv = require('dotenv');

dotenv.config();

let client;
try {
  client = new OpenAI({
    baseURL: process.env.AI_BASE_URL || "https://api.nexovtech.ai/v1",
    apiKey: process.env.AI_API_KEY || 'placeholder'
  });
} catch (e) {
  console.warn('⚠️ AI module offline: Missing API key.');
}

// SYSTEM PROMPT: Defining the NexovTech AI Persona
// SYSTEM PROMPT: Defining the NexovTech AI Persona
const SYSTEM_PROMPT = `
You are the NexovTech AI Workforce Intelligence Engine, a high-performance administrative intelligence for the NexovTech Management SaaS.

Operational Protocol:
1. Speak exclusively in a professional, executive, and analytical corporate tone.
2. Every response MUST be provided as a STRICT BULLET-POINT LIST.
3. Length: 5-10 high-density lines.
4. Content: Include only metrics, flags, and actionable recommendations.
5. No titles, headers, or conversational filler.
6. Use terms like "Specialists" and "Dossiers".
`;

router.post('/chat', async (req, res) => {
  const { messages } = req.body;

  console.log('🤖 AI_UPLINK: Synchronizing with NVIDIA StepFun Cloud...');
  
  try {
    const completion = await client.chat.completions.create({
      model: process.env.AI_MODEL || "nexov-intelligence-v1",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages
      ],
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 2048,
    });

    console.log('✅ AI_UPLINK: Intelligence synchronized successfully.');
    const aiResponse = completion.choices[0].message;
    res.json(aiResponse);
  } catch (error) {
    console.error('❌ NEURAL_UPLINK_FAILED:', {
      message: error.message,
      status: error.status,
      type: error.type,
      stack: error.stack
    });
    
    res.status(500).json({ 
      role: 'assistant', 
      content: 'Neural link severed. I am unable to synchronize with the intelligence cloud. Diagnostic: ' + (error.message || 'Unknown protocol error')
    });
  }
});

module.exports = router;
