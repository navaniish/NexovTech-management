const { runMultiAgentOrchestration } = require('../controllers/agentNetworkController');
const fallbackDb = require('../utils/fallbackDb');

// Retrieve recent RAG documents to prepend as context
async function getRAGContext(tenantId = 'org_default', limit = 5) {
  try {
    const docs = await fallbackDb.find('vector_memory', { tenantId }) || [];
    if (!docs.length) return '';
    const sorted = docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
    const contextLines = sorted.map(d => `[${d.collection || 'knowledge'}] ${d.text}`).join('\n');
    return `📚 *Relevant RAG Context:*\n${contextLines}\n\n`;
  } catch (err) {
    console.warn('⚠️ RAG context fetch failed:', err.message);
    return '';
  }
}

async function getAIResponse(userMessage, userContext = {}) {
  try {
    // Prepend RAG context from the vector store
    const ragContext = await getRAGContext(userContext.tenantId || 'org_default');

    const result = await runMultiAgentOrchestration(userMessage);
    
    // Format the event hops visualization
    let hopsText = "";
    if (result.hops && result.hops.length > 0) {
      hopsText = result.hops
        .map(h => `• *${h.sender}* ➔ *${h.recipient}*`)
        .join('\n');
    }

    let finalMsg = "";
    if (ragContext) {
      finalMsg += ragContext;
    }
    if (hopsText) {
      finalMsg += `🤖 *NEXA Multi-Agent Event Loop Hops:*\n${hopsText}\n\n`;
    }
    finalMsg += `📋 *Consolidated Strategic Report:*\n${result.response}`;
    return finalMsg;
  } catch (error) {
    console.error('❌ AI_BOT_ERROR (Multi-Agent):', error.message);
    return "I encountered a synchronization error in the multi-agent network event loop.";
  }
}

module.exports = { getAIResponse, getRAGContext };
