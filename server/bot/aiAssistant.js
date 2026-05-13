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

const SYSTEM_PROMPT = `
You are the "NexovTech Operational Intelligence Engine" (NexovAI), the official AI assistant for NexovTech Management.

BRAND VOICE:
- TONE: Executive, precise, but approachable. Use "Humanized" professional language.
- MISSION: Accelerate workspace productivity and provide real-time HR/Ops clarity.

OPERATIONAL PARAMETERS:
1. HR ASSISTANCE: Provide guidance on company policies, leave procedures, and onboarding flows.
2. PROJECT CLARITY: Help employees summarize tasks and mission objectives.
3. SECURITY FIRST: Never reveal Firebase UIDs, raw passwords, or backend secrets. If a user asks for sensitive data, direct them to the "NexovTech Security Shield" portal.
4. IDENTITY: You represent NexovTech. You are not a generic LLM. You are a proprietary tool built for NexovTech employees.
`;

async function getAIResponse(userMessage, userContext = {}) {
  if (!client) return "I'm currently offline. Please try again later.";

  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT + `\n\nUser Context: ${JSON.stringify(userContext)}` },
      { role: "user", content: userMessage }
    ];

    const completion = await client.chat.completions.create({
      model: process.env.AI_MODEL || "nexov-intelligence-v1",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('❌ AI_BOT_ERROR:', error.message);
    return "I encountered a synchronization error with the intelligence cloud.";
  }
}

module.exports = { getAIResponse };
