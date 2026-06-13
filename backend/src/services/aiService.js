const { OpenAI } = require('openai');
const natural = require('natural');

const openaiApiKey = process.env.OPENAI_API_KEY;
let openai = null;
if (openaiApiKey && openaiApiKey !== 'your_openai_api_key_here') {
  openai = new OpenAI({ apiKey: openaiApiKey });
}

/**
 * Split text into chunks with overlap
 * @param {string} text - Full extracted text
 * @param {number} chunkSize - Number of characters per chunk
 * @param {number} overlap - Overlap size
 * @returns {Array<string>} Chunks array
 */
const chunkText = (text, chunkSize = 1000, overlap = 200) => {
  if (!text) return [];
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    // Avoid split in middle of a word if possible
    let end = i + chunkSize;
    if (end < text.length) {
      const nextSpace = text.indexOf(' ', end);
      if (nextSpace !== -1 && nextSpace - end < 50) {
        end = nextSpace;
      }
    }
    chunks.push(text.substring(i, end).trim());
    i += chunkSize - overlap;
  }
  return chunks.filter(c => c.length > 10);
};

/**
 * Generate a deterministic 1536-dimensional embedding array for a given text.
 * Used as a fallback if OpenAI is not configured.
 * It uses simple word hashes so that texts with similar words yield higher cosine similarities.
 */
const generateLocalEmbedding = (text) => {
  const dimensions = 1536;
  const vector = new Array(dimensions).fill(0);
  if (!text) return vector;

  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  if (words.length === 0) {
    vector[0] = 1;
    return vector;
  }

  // Populate vector dimensions using simple hash function of words
  words.forEach(word => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    const idx = Math.abs(hash) % dimensions;
    vector[idx] += 1;
  });

  // Normalize vector (L2 normalization) for cosine similarity
  let magnitude = 0;
  for (let i = 0; i < dimensions; i++) {
    magnitude += vector[i] * vector[i];
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] = vector[i] / magnitude;
    }
  } else {
    vector[0] = 1;
  }

  return vector;
};

/**
 * Generate 1536-dimension embeddings array
 * @param {string} text - Text to embed
 * @returns {Promise<Array<number>>} Embedding array
 */
const generateEmbedding = async (text) => {
  if (!text) return new Array(1536).fill(0);

  if (openai) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.replace(/\n/g, ' ')
      });
      return response.data[0].embedding;
    } catch (error) {
      console.warn('OpenAI embedding generation failed, falling back to local simulation:', error.message);
    }
  }

  return generateLocalEmbedding(text);
};

/**
 * Calculate cosine similarity between two vectors
 */
const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Classify a document based on text keywords or OpenAI
 * @param {string} text - Extracted document text
 * @returns {Promise<{category: string, tags: Array<string>}>}
 */
const classifyDocument = async (text) => {
  const textSample = (text || '').substring(0, 5000);
  
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an AI specialized in classifying files. Classify the document into one of: Invoice, Resume, Legal, Medical, Financial, Academic, Other. Respond with a JSON object containing "category" and "tags" (list of 3-5 tags).'
          },
          {
            role: 'user',
            content: `Document sample text:\n\n${textSample}`
          }
        ],
        response_format: { type: "json_object" }
      });
      
      const result = JSON.parse(response.choices[0].message.content);
      return {
        category: result.category || 'Other',
        tags: result.tags || []
      };
    } catch (error) {
      console.warn('OpenAI classification failed, falling back to heuristics:', error.message);
    }
  }

  // Heuristic-based classification (Fallback)
  const lowerText = textSample.toLowerCase();
  let category = 'Other';
  let tags = ['Document'];

  if (lowerText.includes('invoice') || lowerText.includes('receipt') || lowerText.includes('purchase order') || lowerText.includes('bill to')) {
    category = 'Invoice';
    tags = ['Billing', 'Invoice', 'Payment'];
  } else if (lowerText.includes('resume') || lowerText.includes('curriculum vitae') || lowerText.includes('education') || lowerText.includes('experience') || lowerText.includes('skills')) {
    category = 'Resume';
    tags = ['CV', 'Profile', 'Employment'];
  } else if (lowerText.includes('agreement') || lowerText.includes('contract') || lowerText.includes('terms') || lowerText.includes('lease') || lowerText.includes('shall hereby') || lowerText.includes('court')) {
    category = 'Legal';
    tags = ['Contract', 'Agreement', 'Legal-Terms'];
  } else if (lowerText.includes('medical') || lowerText.includes('patient') || lowerText.includes('clinical') || lowerText.includes('doctor') || lowerText.includes('treatment') || lowerText.includes('prescription')) {
    category = 'Medical';
    tags = ['Health', 'Medical-Record', 'Patient-File'];
  } else if (lowerText.includes('financial') || lowerText.includes('portfolio') || lowerText.includes('revenue') || lowerText.includes('assets') || lowerText.includes('balance sheet') || lowerText.includes('profit')) {
    category = 'Financial';
    tags = ['Finance', 'Report', 'Earnings'];
  } else if (lowerText.includes('abstract') || lowerText.includes('introduction') || lowerText.includes('conclusion') || lowerText.includes('references') || lowerText.includes('university') || lowerText.includes('research')) {
    category = 'Academic';
    tags = ['Research', 'Study', 'Academic-Paper'];
  }

  return { category, tags };
};

/**
 * Generate three types of summaries
 * @param {string} text - Full extracted text
 * @returns {Promise<{short: string, detailed: string, bulletPoints: Array<string>}>}
 */
const generateSummary = async (text) => {
  const cleanText = text ? text.trim() : '';
  if (!cleanText) {
    return {
      short: 'No text extracted from document.',
      detailed: 'No text extracted. Cannot generate summary.',
      bulletPoints: ['No text found.']
    };
  }

  const textSample = cleanText.substring(0, 8000);

  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI document summarization engine. Analyze the text and return a JSON object with keys:
            - "short": A 1-2 sentence high-level overview.
            - "detailed": A comprehensive 1-2 paragraph description.
            - "bulletPoints": A list of 3-6 key takeaways.`
          },
          {
            role: 'user',
            content: `Document text:\n\n${textSample}`
          }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.warn('OpenAI summarization failed, falling back to heuristics:', error.message);
    }
  }

  // Heuristic-based summarization (Fallback)
  const sentences = cleanText
    .split(/[.!?]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15);

  const short = sentences.slice(0, 2).join('. ') + '.';
  
  const detailed = sentences.slice(0, Math.min(8, sentences.length)).join('. ') + '.';
  
  // Extract bullet points using simple frequency-based selection
  const bulletPoints = sentences
    .slice(2, Math.min(7, sentences.length))
    .map(s => s.replace(/^\W+/, '')); // strip leading bullet chars

  if (bulletPoints.length === 0) {
    bulletPoints.push('Document contains limited readable text.');
  }

  return {
    short,
    detailed,
    bulletPoints
  };
};

/**
 * RAG - Ask questions based on document context chunks
 * @param {string} question - Query text
 * @param {Array<Object>} chunks - Array of chunk schemas {text, embedding}
 * @returns {Promise<{answer: string, sources: Array<Object>}>}
 */
const answerQuestion = async (question, chunks) => {
  if (!chunks || chunks.length === 0) {
    return {
      answer: 'No content chunks found to answer questions. Make sure document text was extracted.',
      sources: []
    };
  }

  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(question);

  // 2. Compute similarity for all chunks and sort
  const scoredChunks = chunks.map((chunk) => {
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    return { chunk, score };
  });

  scoredChunks.sort((a, b) => b.score - a.score);

  // 3. Take top 3 matching chunks
  const topMatches = scoredChunks.slice(0, 3).filter(item => item.score > 0.05);

  if (topMatches.length === 0) {
    return {
      answer: "I couldn't find any relevant sections in the document to answer your question with confidence.",
      sources: []
    };
  }

  const contextText = topMatches.map(m => `[Chunk ${m.chunk.index}]: ${m.chunk.text}`).join('\n\n');
  const sources = topMatches.map(m => ({
    text: m.chunk.text.substring(0, 150) + '...',
    index: m.chunk.index
  }));

  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant helping a user extract answers from a document. Use the provided document chunks as context to answer the question. Be concise, direct, and refer specifically to the context where possible. If the context does not contain the answer, explain that you are answering from the document text but could not find specific detail.'
          },
          {
            role: 'user',
            content: `Context:\n${contextText}\n\nQuestion: ${question}`
          }
        ]
      });

      return {
        answer: response.choices[0].message.content,
        sources
      };
    } catch (error) {
      console.warn('OpenAI completions failed, falling back to local retrieval:', error.message);
    }
  }

  // Local RAG fallback (Regex matcher / word occurrences)
  // Let's find the sentence in the top match that shares the most words with the question.
  const topChunkText = topMatches[0].chunk.text;
  const matchSentences = topChunkText.split(/[.!?]\s+/);
  
  let bestSentence = matchSentences[0] || topChunkText;
  let maxMatchCount = 0;
  
  const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  matchSentences.forEach(sentence => {
    let matches = 0;
    questionWords.forEach(word => {
      if (sentence.toLowerCase().includes(word)) matches++;
    });
    if (matches > maxMatchCount) {
      maxMatchCount = matches;
      bestSentence = sentence;
    }
  });

  return {
    answer: `Based on Section ${topMatches[0].chunk.index} of the document: "${bestSentence.trim()}." (Local simulation response based on similarity score: ${(topMatches[0].score * 100).toFixed(1)}%)`,
    sources
  };
};

module.exports = {
  chunkText,
  generateEmbedding,
  cosineSimilarity,
  classifyDocument,
  generateSummary,
  answerQuestion
};
