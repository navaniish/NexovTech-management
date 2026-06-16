const fallbackDb = require('./fallbackDb');
const OpenAI = require('openai');

let aiClient;
try {
  aiClient = new OpenAI({
    baseURL: process.env.AI_BASE_URL || "https://api.nexovtech.ai/v1",
    apiKey: process.env.AI_API_KEY || 'placeholder',
    timeout: 15000
  });
} catch (e) {
  // Silent fallback
}

// Local word frequency cosine similarity fallback
const getTfidfSimilarity = (text1, text2) => {
  const getTokens = (t) => {
    return t.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);
  };
  const tokens1 = getTokens(text1);
  const tokens2 = getTokens(text2);

  const freq1 = {};
  const freq2 = {};
  const allWords = new Set();

  tokens1.forEach(w => { freq1[w] = (freq1[w] || 0) + 1; allWords.add(w); });
  tokens2.forEach(w => { freq2[w] = (freq2[w] || 0) + 1; allWords.add(w); });

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  allWords.forEach(w => {
    const v1 = freq1[w] || 0;
    const v2 = freq2[w] || 0;
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  });

  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
};

exports.addDocument = async (collectionName, text, metadata = {}) => {
  const docId = `vec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  let embedding = null;

  if (aiClient && process.env.AI_API_KEY && process.env.AI_API_KEY !== 'placeholder') {
    try {
      const response = await aiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      embedding = response.data[0].embedding;
    } catch (err) {
      console.warn('⚠️ API Embeddings failed, saving without real vector:', err.message);
    }
  }

  const doc = {
    id: docId,
    collection: collectionName,
    text,
    metadata,
    embedding,
    tenantId: metadata.tenantId || 'org_default',
    createdAt: new Date().toISOString()
  };

  await fallbackDb.save('vector_memory', doc);
  return doc;
};

exports.querySimilarity = async (collectionName, text, tenantId = 'org_default', limit = 3) => {
  // Query all vector documents for this collection and tenant
  const docs = (await fallbackDb.find('vector_memory', { collection: collectionName, tenantId })) || [];
  
  if (docs.length === 0) return [];

  let queryEmbedding = null;
  if (aiClient && process.env.AI_API_KEY && process.env.AI_API_KEY !== 'placeholder') {
    try {
      const response = await aiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      queryEmbedding = response.data[0].embedding;
    } catch (err) {
      // Fall back to local TF-IDF similarity
    }
  }

  const scoredDocs = docs.map(doc => {
    let score = 0;
    if (queryEmbedding && doc.embedding && queryEmbedding.length === doc.embedding.length) {
      // Cosine similarity for real embeddings
      let dot = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < queryEmbedding.length; i++) {
        dot += queryEmbedding[i] * doc.embedding[i];
        normA += queryEmbedding[i] * queryEmbedding[i];
        normB += doc.embedding[i] * doc.embedding[i];
      }
      score = normA > 0 && normB > 0 ? (dot / (Math.sqrt(normA) * Math.sqrt(normB))) : 0;
    } else {
      // Fallback local similarity
      score = getTfidfSimilarity(text, doc.text);
    }
    return { ...doc, score };
  });

  // Sort descending by similarity score
  scoredDocs.sort((a, b) => b.score - a.score);
  return scoredDocs.slice(0, limit);
};
