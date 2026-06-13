const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number], // Storing embeddings array for similarity matches
    required: true
  },
  index: {
    type: Number,
    required: true
  }
});

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required']
    },
    fileKey: {
      type: String, // Cloudinary public_id or local filename
      required: true
    },
    fileType: {
      type: String,
      required: [true, 'File type is required']
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required']
    },
    extractedText: {
      type: String,
      default: ''
    },
    ocrConfidence: {
      type: Number,
      default: 100 // Tesseract confidence score
    },
    summary: {
      short: { type: String, default: '' },
      detailed: { type: String, default: '' },
      bulletPoints: { type: [String], default: [] }
    },
    category: {
      type: String,
      enum: ['Invoice', 'Resume', 'Legal', 'Medical', 'Financial', 'Academic', 'Other'],
      default: 'Other'
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['uploading', 'ocr_processing', 'chunking', 'indexing', 'completed', 'failed'],
      default: 'uploading'
    },
    errorMessage: {
      type: String,
      default: ''
    },
    chunks: [chunkSchema] // Document chunks for local RAG operations
  },
  {
    timestamps: true
  }
);

const Document = mongoose.model('Document', documentSchema);
module.exports = Document;
