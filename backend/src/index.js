require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const expenseRoutes = require('./routes/expenses');
const approvalRoutes = require('./routes/approvals');
const ruleRoutes = require('./routes/rules');
const ocrRoutes = require('./routes/ocr');

const app = express();
const PORT = process.env.PORT || 8000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', expenseRoutes);
app.use('/api', approvalRoutes);
app.use('/api', ruleRoutes);
app.use('/api', ocrRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ClearClaim Backend', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 ClearClaim Backend running at http://localhost:${PORT}`);
  console.log(`📡 API endpoints at http://localhost:${PORT}/api`);
  console.log(`📁 Uploads served at http://localhost:${PORT}/uploads\n`);
});

module.exports = app;
