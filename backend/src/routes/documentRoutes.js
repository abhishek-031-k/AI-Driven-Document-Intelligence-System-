const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Document management endpoints
router.post('/upload', protect, upload.single('file'), documentController.uploadDocument);
router.get('/', protect, documentController.getDocuments);
router.get('/:id', protect, documentController.getDocumentById);
router.put('/:id', protect, documentController.updateDocument);
router.delete('/:id', protect, documentController.deleteDocument);

// AI & Search features
router.post('/summarize', protect, documentController.summarizeDocument);
router.post('/question-answer', protect, documentController.questionAnswer);
router.post('/search', protect, documentController.searchDocuments);

module.exports = router;
