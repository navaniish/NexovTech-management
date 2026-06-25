const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');
const OpenAI = require('openai');

let aiClient = null;
try {
  if (process.env.AI_API_KEY && process.env.AI_API_KEY !== 'placeholder') {
    aiClient = new OpenAI({
      baseURL: process.env.AI_BASE_URL || "https://api.nexovtech.ai/v1",
      apiKey: process.env.AI_API_KEY,
      timeout: 10000 // 10 seconds timeout to prevent blocking UI
    });
  }
} catch (e) {
  console.warn('⚠️ Timesheet AI Audit module offline:', e.message);
}

// Get My Timesheets
router.get('/', async (req, res) => {
  const { userId } = req.query;
  try {
    const entries = await fallbackDb.find('timesheets', { userId });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve temporal records' });
  }
});

// Submit Timesheet
router.post('/', async (req, res) => {
  try {
    let entry = { ...req.body, submittedAt: new Date(), status: 'Pending' };

    // AI Timesheet Audit
    let aiCategory = 'General Operations';
    let aiClientSummary = entry.description || 'No description provided.';

    if (aiClient) {
      try {
        const systemPrompt = `You are the NEXA Timesheet Audit AI. Analyze the timesheet work description and map it to a specific work category, then create a clean, client-ready corporate summary.
Respond ONLY in strict JSON format:
{
  "aiCategory": "Frontend UI" | "Backend Database" | "DevOps" | "QA Testing" | "General Operations",
  "aiClientSummary": "<concise client-ready summary of what was accomplished>"
}`;
        const userPrompt = `Task/Issue: ${entry.taskTitle || 'General Task'}\nDescription: ${entry.description || ''}\nHours Logged: ${entry.hours || 0}`;

        const completion = await aiClient.chat.completions.create({
          model: process.env.AI_MODEL || "nvidia/nemotron-3-ultra-550b-a55b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 500
        });

        const text = completion.choices[0]?.message?.content || '';
        const cleanJson = text.trim().substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const parsed = JSON.parse(cleanJson);
        if (parsed.aiCategory) aiCategory = parsed.aiCategory;
        if (parsed.aiClientSummary) aiClientSummary = parsed.aiClientSummary;
      } catch (aiErr) {
        console.warn('⚠️ Timesheet AI audit failed or timed out, falling back:', aiErr.message);
      }
    }

    entry.aiCategory = aiCategory;
    entry.aiClientSummary = aiClientSummary;

    const saved = await fallbackDb.save('timesheets', entry);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Failed to record temporal entry' });
  }
});

module.exports = router;
