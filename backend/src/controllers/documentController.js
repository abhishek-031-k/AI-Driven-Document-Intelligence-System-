const fs = require('fs').promises;
const path = require('path');
const Document = require('../models/Document');
const Query = require('../models/Query');
const AuditLog = require('../models/AuditLog');
const ocrService = require('../services/ocrService');
const aiService = require('../services/aiService');
const vectorDbService = require('../services/vectorDbService');
const { emitDocStatus } = require('../sockets/socketHandler');
const { cloudinary, isCloudinaryConfigured } = require('../configs/cloudinary');

/**
 * Helper to upload to Cloudinary if configured, else returns relative URL
 */
const uploadFileToStorage = async (file) => {
  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: 'raw', // Support non-image documents
        folder: 'ai_doc_intelligence'
      });
      // Delete temporary local file
      await fs.unlink(file.path).catch(err => console.error('Error removing temp file:', err));
      return {
        url: result.secure_url,
        key: result.public_id
      };
    } catch (error) {
      console.error('Cloudinary upload failed, falling back to local storage path:', error);
    }
  }

  // Local storage fallback (relative web path)
  const relativePath = `/uploads/${path.basename(file.path)}`;
  return {
    url: relativePath,
    key: path.basename(file.path)
  };
};

/**
 * Background worker task to process document: OCR -> Chunk -> Embed -> Summarize -> Classify -> Complete
 */
const processDocumentBackground = async (documentId, tempFilePath, originalName, userId) => {
  let doc = await Document.findById(documentId);
  if (!doc) return;

  try {
    // 1. OCR / Text Extraction
    doc.status = 'ocr_processing';
    await doc.save();
    emitDocStatus(userId, doc);

    const { text, confidence } = await ocrService.extractText(tempFilePath, originalName);
    
    doc.extractedText = text;
    doc.ocrConfidence = confidence;
    doc.status = 'chunking';
    await doc.save();
    emitDocStatus(userId, doc);

    // 2. Chunking
    const textChunks = aiService.chunkText(text, 1000, 200);
    
    // 3. Classification & Tags
    doc.status = 'indexing'; // Summarizing & Embedding
    await doc.save();
    emitDocStatus(userId, doc);

    const classification = await aiService.classifyDocument(text);
    doc.category = classification.category;
    doc.tags = classification.tags;

    // 4. Summarization
    const summaries = await aiService.generateSummary(text);
    doc.summary = summaries;

    // 5. Generate Vector Embeddings for Chunks
    const chunksWithVectors = [];
    for (let idx = 0; idx < textChunks.length; idx++) {
      const chunkText = textChunks[idx];
      const embedding = await aiService.generateEmbedding(chunkText);
      chunksWithVectors.push({
        text: chunkText,
        embedding: embedding,
        index: idx
      });
    }

    doc.chunks = chunksWithVectors;
    doc.status = 'completed';
    await doc.save();
    emitDocStatus(userId, doc);

    // Sync to external vector database (if Pinecone is set up)
    await vectorDbService.upsertVectors(doc._id, chunksWithVectors, userId);

    // Clean up local temp file if it's still there (and not stored as final local upload)
    if (isCloudinaryConfigured) {
      await fs.unlink(tempFilePath).catch(() => {});
    }

    await AuditLog.create({
      action: 'DOCUMENT_PROCESSED',
      performedBy: userId,
      details: `Document "${doc.title}" processed successfully. Chunks: ${textChunks.length}, Category: ${doc.category}`,
      ipAddress: 'System'
    });

  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);
    doc.status = 'failed';
    doc.errorMessage = error.message;
    await doc.save();
    emitDocStatus(userId, doc);

    // Clean up local temp file on error
    await fs.unlink(tempFilePath).catch(() => {});

    await AuditLog.create({
      action: 'DOCUMENT_PROCESS_FAILED',
      performedBy: userId,
      details: `Document "${doc.title}" processing failed: ${error.message}`,
      ipAddress: 'System'
    });
  }
};

// Upload document (HTTP route handler)
exports.uploadDocument = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a file' });
  }

  const { title, description } = req.body;

  try {
    // Determine storage location
    const storageResult = await uploadFileToStorage(req.file);

    // Save initial document record in database
    const doc = await Document.create({
      title: title || req.file.originalname,
      description: description || '',
      fileUrl: storageResult.url,
      fileKey: storageResult.key,
      fileType: path.extname(req.file.originalname).substring(1).toLowerCase(),
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      status: 'uploading'
    });

    await AuditLog.create({
      action: 'DOCUMENT_UPLOADED',
      performedBy: req.user._id,
      details: `Uploaded file: ${req.file.originalname}. Title: ${doc.title}. Status: Processing started.`,
      ipAddress: req.ip
    });

    // Start background processing pipeline (doesn't block response)
    const tempFilePath = req.file.path; // will be deleted in worker if Cloudinary is active
    processDocumentBackground(doc._id, tempFilePath, req.file.originalname, req.user._id);

    res.status(202).json({
      success: true,
      message: 'Document upload success. Processing started in the background.',
      document: doc
    });
  } catch (error) {
    next(error);
  }
};

// Fetch all documents for user
exports.getDocuments = async (req, res, next) => {
  try {
    let query = {};
    
    // Non-admins only get their own documents
    if (req.user.role !== 'admin') {
      query.uploadedBy = req.user._id;
    }

    // Filters
    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const docs = await Document.find(query)
      .select('-chunks -extractedText') // Exclude heavy fields for list queries
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'fullName email');

    res.status(200).json({
      success: true,
      count: docs.length,
      documents: docs
    });
  } catch (error) {
    next(error);
  }
};

// Fetch single document
exports.getDocumentById = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('uploadedBy', 'fullName email');

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Auth verification
    if (req.user.role !== 'admin' && doc.uploadedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this document' });
    }

    res.status(200).json({
      success: true,
      document: doc
    });
  } catch (error) {
    next(error);
  }
};

// Update document details
exports.updateDocument = async (req, res, next) => {
  const { title, description, category, tags } = req.body;

  try {
    let doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (req.user.role !== 'admin' && doc.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this document' });
    }

    doc.title = title || doc.title;
    doc.description = description !== undefined ? description : doc.description;
    doc.category = category || doc.category;
    if (tags) {
      doc.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    }

    await doc.save();

    res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      document: doc
    });
  } catch (error) {
    next(error);
  }
};

// Delete document
exports.deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (req.user.role !== 'admin' && doc.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this document' });
    }

    // Delete vectors
    await vectorDbService.deleteVectors(doc._id);

    // Delete stored file
    if (isCloudinaryConfigured) {
      await cloudinary.uploader.destroy(doc.fileKey).catch(err => console.error('Cloudinary delete failed:', err));
    } else {
      // Local delete
      const filePath = path.join(__dirname, '../../uploads', doc.fileKey);
      await fs.unlink(filePath).catch(err => console.log('Local file deletion skipped or failed:', err.message));
    }

    await doc.deleteOne();

    await AuditLog.create({
      action: 'DOCUMENT_DELETED',
      performedBy: req.user._id,
      details: `Deleted document "${doc.title}"`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Summarize document
exports.summarizeDocument = async (req, res, next) => {
  const { documentId } = req.body;

  try {
    const doc = await Document.findById(documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (req.user.role !== 'admin' && doc.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (doc.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Document is not processed yet' });
    }

    // Return the stored summary
    res.status(200).json({
      success: true,
      summary: doc.summary
    });
  } catch (error) {
    next(error);
  }
};

// RAG Q&A Route
exports.questionAnswer = async (req, res, next) => {
  const { documentId, question } = req.body;

  if (!documentId || !question) {
    return res.status(400).json({ success: false, message: 'Please provide documentId and question' });
  }

  try {
    const doc = await Document.findById(documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (req.user.role !== 'admin' && doc.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to query this document' });
    }

    if (doc.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Document processing is not completed' });
    }

    const qaResult = await aiService.answerQuestion(question, doc.chunks);

    // Save Q&A to database history
    const query = await Query.create({
      user: req.user._id,
      document: doc._id,
      question,
      answer: qaResult.answer,
      sources: qaResult.sources
    });

    res.status(200).json({
      success: true,
      query
    });
  } catch (error) {
    next(error);
  }
};

// Semantic Search across documents
exports.searchDocuments = async (req, res, next) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ success: false, message: 'Please provide a search query' });
  }

  try {
    let docsQuery = {};
    if (req.user.role !== 'admin') {
      docsQuery.uploadedBy = req.user._id;
    }
    docsQuery.status = 'completed';

    // Retrieve documents and their chunk vectors
    const docs = await Document.find(docsQuery);
    if (docs.length === 0) {
      return res.status(200).json({ success: true, results: [] });
    }

    // Embed search query
    const queryEmbedding = await aiService.generateEmbedding(query);

    // Calculate score for each document
    const scoredDocs = [];

    docs.forEach((doc) => {
      let maxScore = 0;
      let matchingChunkText = '';

      // Find the highest-matching chunk inside the document
      doc.chunks.forEach((chunk) => {
        const score = aiService.cosineSimilarity(queryEmbedding, chunk.embedding);
        if (score > maxScore) {
          maxScore = score;
          matchingChunkText = chunk.text;
        }
      });

      // Format matched details
      if (maxScore > 0.05) { // Similarity threshold
        scoredDocs.push({
          document: {
            _id: doc._id,
            title: doc.title,
            category: doc.category,
            tags: doc.tags,
            fileUrl: doc.fileUrl,
            fileType: doc.fileType,
            fileSize: doc.fileSize,
            createdAt: doc.createdAt
          },
          relevanceScore: parseFloat((maxScore * 100).toFixed(2)),
          snippet: matchingChunkText.substring(0, 250) + '...'
        });
      }
    });

    // Sort documents by relevance
    scoredDocs.sort((a, b) => b.relevanceScore - a.relevanceScore);

    res.status(200).json({
      success: true,
      results: scoredDocs.slice(0, 10) // top 10 matches
    });
  } catch (error) {
    next(error);
  }
};
