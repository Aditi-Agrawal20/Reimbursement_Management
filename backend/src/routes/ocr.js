const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate, requirePasswordChanged } = require('../middleware/auth');
const { extractReceiptData } = require('../services/ocrService');

const router = express.Router();

// Multer setup for OCR uploads (temporary storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `ocr-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) and PDFs are allowed.'));
    }
  },
});

/**
 * POST /api/ocr/receipt — Upload a receipt image for AI analysis
 * Returns extracted expense data (amount, currency, date, category, vendor, description)
 */
router.post('/ocr/receipt', authenticate, requirePasswordChanged, upload.single('receipt'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No receipt file uploaded.' });
    }

    console.log(`[OCR] Processing receipt: ${req.file.filename} (${(req.file.size / 1024).toFixed(1)}KB)`);

    const result = await extractReceiptData(req.file.path);

    // Return the uploaded file path so the frontend can attach it to the expense later
    result.receipt_path = `/uploads/${req.file.filename}`;

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
