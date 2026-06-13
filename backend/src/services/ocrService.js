const fs = require('fs').promises;
const path = require('path');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract text from a document based on its extension
 * @param {string} filePath - Absolute path to the file on disk
 * @param {string} originalName - Original file name
 * @returns {Promise<{text: string, confidence: number}>} Extracted text and confidence score
 */
const extractText = async (filePath, originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  let text = '';
  let confidence = 100;

  try {
    switch (ext) {
      case '.txt':
        text = await fs.readFile(filePath, 'utf-8');
        break;

      case '.docx':
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
        break;

      case '.pdf':
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text;
        // If PDF contains no text, it might be scanned, we'd log that
        if (!text || text.trim().length === 0) {
          text = "[Scanned PDF - Text content could not be extracted directly. Please upload as an image to run OCR processing or ensure PDF contains text layers.]";
        }
        break;

      case '.png':
      case '.jpg':
      case '.jpeg':
        // Run OCR with Tesseract
        const ocrResult = await Tesseract.recognize(
          filePath,
          'eng',
          { logger: m => console.log(`OCR Progress: ${(m.progress * 100).toFixed(1)}%`) }
        );
        text = ocrResult.data.text;
        confidence = ocrResult.data.confidence;
        break;

      default:
        throw new Error(`Unsupported file extension: ${ext}`);
    }

    return {
      text: text || '',
      confidence: Math.round(confidence)
    };
  } catch (error) {
    console.error(`Error in ocrService.extractText for ${originalName}:`, error);
    throw new Error(`Text extraction failed: ${error.message}`);
  }
};

module.exports = {
  extractText
};
