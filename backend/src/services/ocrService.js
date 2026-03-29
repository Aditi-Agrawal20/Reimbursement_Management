const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

/**
 * OCR Service — Uses Google Gemini to extract expense data from receipt images
 */

let genAI = null;

function getClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not set in environment variables');
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

/**
 * Extract expense data from a receipt image file
 * @param {string} filePath - Absolute path to the uploaded receipt image
 * @returns {Promise<object>} - Extracted expense data
 */
async function extractReceiptData(filePath) {
  try {
    const client = getClient();

    // Read the file and convert to base64
    const imageBuffer = fs.readFileSync(filePath);
    const base64Data = imageBuffer.toString('base64');

    // Determine MIME type from extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };
    const mimeType = mimeMap[ext] || 'image/jpeg';

    const prompt = `You are an expense receipt scanner.
Look at this receipt image carefully and extract the expense information.

Return ONLY a valid JSON object with these exact fields:
{
    "amount": <number — the final total amount, no currency symbol>,
    "currency": <3-letter currency code like USD, INR, GBP, EUR>,
    "date": <date in YYYY-MM-DD format>,
    "description": <short description of what was purchased, max 60 chars>,
    "category": <one of: Travel, Food, Accommodation, Office Supplies, Transportation, Equipment, Software, Miscellaneous>,
    "vendor": <name of the shop, restaurant, or service>
}

Rules:
- amount must be a number only (e.g. 850.00 not Rs. 850)
- If currency is unclear, default to INR
- If date is unclear, use today's date
- category must be exactly one of the listed options
- Return ONLY the JSON, no extra text, no markdown, no explanation`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    });

    let raw = response.text.trim();

    // Strip markdown code fences if Gemini added them
    if (raw.includes('```')) {
      raw = raw.split('```')[1];
      if (raw.startsWith('json')) {
        raw = raw.substring(4);
      }
      raw = raw.trim();
    }

    const parsed = JSON.parse(raw);

    return {
      success: true,
      data: {
        amount: parsed.amount || '',
        currency: parsed.currency || 'INR',
        date: parsed.date || new Date().toISOString().split('T')[0],
        description: parsed.description || '',
        category: parsed.category || 'Miscellaneous',
        vendor: parsed.vendor || '',
      },
    };
  } catch (err) {
    console.error('OCR extraction error:', err.message);

    // Return fallback data
    return {
      success: false,
      warning: `OCR failed: ${err.message}. Please fill in the details manually.`,
      data: {
        amount: '',
        currency: 'INR',
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: 'Miscellaneous',
        vendor: '',
      },
    };
  }
}

module.exports = { extractReceiptData };
