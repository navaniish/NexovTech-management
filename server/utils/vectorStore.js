const fallbackDb = require('./fallbackDb');
const OpenAI = require('openai');
const axios = require('axios');
const prisma = require('../config/database');

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

// Determine active embedding model and dimension configuration
const getEmbeddingModelConfig = () => {
  const model = process.env.AI_EMBEDDING_MODEL || (process.env.AI_BASE_URL?.includes('nvidia') ? 'nvidia/llama-nemotron-embed-300m-v2' : 'text-embedding-3-small');
  const dim = process.env.AI_EMBEDDING_DIM ? Number(process.env.AI_EMBEDDING_DIM) : (model.includes('300m') ? 1024 : 1536);
  return { model, dim };
};

// Resilient pgvector table initialization helper
let isPgvectorTableChecked = false;
async function ensurePgvectorTable(dim = 1536) {
  if (isPgvectorTableChecked) return true;
  try {
    // 1. Try to create extension if not exists
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    // 2. Try to create table if not exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "vector_memory" (
        "id" TEXT PRIMARY KEY,
        "collection" TEXT NOT NULL,
        "text" TEXT NOT NULL,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "embedding" vector(${dim}),
        "tenantId" TEXT NOT NULL DEFAULT 'org_default',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Ensure column dimension matches active model in case table was pre-existing
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "vector_memory" ALTER COLUMN "embedding" TYPE vector(${dim});`);
    } catch (alterErr) {
      console.log(`ℹ️ pgvector column type check: ${alterErr.message}`);
    }

    // 3. Try to create index if not exists (using older ivfflat for wider compatibility)
    try {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "vector_memory_embedding_idx" ON "vector_memory" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`);
    } catch (idxErr) {
      // Ignore index errors, query still works
    }
    isPgvectorTableChecked = true;
    return true;
  } catch (err) {
    console.warn('⚠️ pgvector initialization failed, SQL operations will fallback:', err.message);
    throw err;
  }
}

// Resilient ChromaDB collection helper
async function getChromaCollectionId(chromaUrl, collectionName) {
  try {
    const res = await axios.post(`${chromaUrl}/api/v1/collections`, {
      name: collectionName,
      get_or_create: true
    }, { timeout: 5000 });
    return res.data.id;
  } catch (err) {
    console.warn(`⚠️ Chroma connection failed for collection [${collectionName}]:`, err.message);
    throw err;
  }
}

exports.addDocument = async (collectionName, text, metadata = {}) => {
  const docId = `vec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  let embedding = null;
  const config = getEmbeddingModelConfig();

  if (aiClient && process.env.AI_API_KEY && process.env.AI_API_KEY !== 'placeholder') {
    try {
      const response = await aiClient.embeddings.create({
        model: config.model,
        input: text,
      });
      embedding = response.data[0].embedding;
    } catch (err) {
      console.warn(`⚠️ API Embeddings failed using model ${config.model}, saving without real vector:`, err.message);
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

  const provider = (process.env.VECTOR_DB_PROVIDER || 'fallback').toLowerCase();

  // 1. CHROMA ROUTE
  if (provider === 'chroma' && embedding) {
    const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
    try {
      const collectionId = await getChromaCollectionId(chromaUrl, collectionName);
      await axios.post(`${chromaUrl}/api/v1/collections/${collectionId}/add`, {
        ids: [docId],
        embeddings: [embedding],
        metadatas: [{ ...metadata, tenantId: metadata.tenantId || 'org_default' }],
        documents: [text]
      }, { timeout: 5000 });
      console.log(`... CHROMA_DB_SAVE [${collectionName}]: Document ${docId} added.`);
      return doc;
    } catch (err) {
      console.warn('⚠️ ChromaDB save failed, falling back to local vault:', err.message);
    }
  }

  // 2. PGVECTOR ROUTE
  if (provider === 'pgvector' && embedding) {
    try {
      await ensurePgvectorTable(config.dim);
      const vectorString = `[${embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(`
        INSERT INTO "vector_memory" ("id", "collection", "text", "metadata", "embedding", "tenantId")
        VALUES ($1, $2, $3, $4::jsonb, $5::vector, $6)
        ON CONFLICT ("id") DO UPDATE SET
          "collection" = EXCLUDED."collection",
          "text" = EXCLUDED."text",
          "metadata" = EXCLUDED."metadata",
          "embedding" = EXCLUDED."embedding",
          "tenantId" = EXCLUDED."tenantId";
      `, docId, collectionName, text, JSON.stringify(metadata), vectorString, metadata.tenantId || 'org_default');
      console.log(`✅ PGVECTOR_DB_SAVE [${collectionName}]: Document ${docId} added.`);
      return doc;
    } catch (err) {
      console.warn('⚠️ pgvector save failed, falling back to local vault:', err.message);
    }
  }

  // 3. FALLBACK ROUTE (Default / Offline)
  await fallbackDb.save('vector_memory', doc);
  return doc;
};

exports.querySimilarity = async (collectionName, text, tenantId = 'org_default', limit = 3) => {
  const provider = (process.env.VECTOR_DB_PROVIDER || 'fallback').toLowerCase();
  const config = getEmbeddingModelConfig();
  
  let queryEmbedding = null;
  if (aiClient && process.env.AI_API_KEY && process.env.AI_API_KEY !== 'placeholder') {
    try {
      const response = await aiClient.embeddings.create({
        model: config.model,
        input: text,
      });
      queryEmbedding = response.data[0].embedding;
    } catch (err) {
      // Fall back to local TF-IDF similarity
    }
  }

  // 1. CHROMA ROUTE
  if (provider === 'chroma' && queryEmbedding) {
    const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
    try {
      const collectionId = await getChromaCollectionId(chromaUrl, collectionName);
      const res = await axios.post(`${chromaUrl}/api/v1/collections/${collectionId}/query`, {
        query_embeddings: [queryEmbedding],
        n_results: limit,
        where: { tenantId }
      }, { timeout: 5000 });

      const results = [];
      const queryResults = res.data;
      if (queryResults && queryResults.ids && queryResults.ids[0]) {
        for (let i = 0; i < queryResults.ids[0].length; i++) {
          const distance = queryResults.distances[0][i];
          // Cosine distance maps: similarity = 1 - distance
          const score = 1 - distance;
          results.push({
            id: queryResults.ids[0][i],
            collection: collectionName,
            text: queryResults.documents[0][i],
            metadata: queryResults.metadatas[0][i],
            tenantId: queryResults.metadatas[0][i]?.tenantId || tenantId,
            score
          });
        }
      }
      console.log(`✅ CHROMA_DB_QUERY [${collectionName}]: Found ${results.length} matches.`);
      return results;
    } catch (err) {
      console.warn('⚠️ ChromaDB query failed, falling back to local vault:', err.message);
    }
  }

  // 2. PGVECTOR ROUTE
  if (provider === 'pgvector' && queryEmbedding) {
    try {
      await ensurePgvectorTable(config.dim);
      const vectorString = `[${queryEmbedding.join(',')}]`;
      const dbResults = await prisma.$queryRawUnsafe(`
        SELECT "id", "collection", "text", "metadata", "tenantId", "createdAt",
               (1 - ("embedding" <=> $1::vector)) AS "score"
        FROM "vector_memory"
        WHERE "collection" = $2 AND "tenantId" = $3
        ORDER BY "embedding" <=> $1::vector
        LIMIT $4;
      `, vectorString, collectionName, tenantId, limit);

      const results = (dbResults || []).map(row => ({
        id: row.id,
        collection: row.collection,
        text: row.text,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        tenantId: row.tenantId,
        createdAt: row.createdAt,
        score: Number(row.score || 0)
      }));

      console.log(`✅ PGVECTOR_DB_QUERY [${collectionName}]: Found ${results.length} matches.`);
      return results;
    } catch (err) {
      console.warn('⚠️ pgvector query failed, falling back to local vault:', err.message);
    }
  }

  // 3. FALLBACK ROUTE (Default / Offline)
  const docs = (await fallbackDb.find('vector_memory', { collection: collectionName, tenantId })) || [];
  if (docs.length === 0) return [];

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
  console.log(`📦 LOCAL_VECTOR_QUERY [${collectionName}]: Found ${scoredDocs.length} matches.`);
  return scoredDocs.slice(0, limit);
};
