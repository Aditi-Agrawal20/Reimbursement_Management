const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate, authorize, requirePasswordChanged, prisma } = require('../middleware/auth');
const { convertToBase } = require('../services/currencyService');
const { createApprovalSteps, getApprovalProgress } = require('../services/approvalEngine');

const router = express.Router();

// Multer setup for receipt uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`);
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
 * POST /api/expenses — Submit a new expense
 */
router.post('/expenses', authenticate, requirePasswordChanged, upload.single('receipt'), async (req, res, next) => {
  try {
    const { amount, currency, category, vendor, description, date } = req.body;

    if (!amount || !category || !description || !date) {
      return res.status(400).json({ error: 'Amount, category, description, and date are required.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }

    const curr = currency || 'INR';
    const convertedAmount = convertToBase(parsedAmount, curr);

    const receipt_url = req.file ? `/uploads/${req.file.filename}` : null;

    const expense = await prisma.expense.create({
      data: {
        employee_id: req.user.id,
        amount: parsedAmount,
        currency: curr,
        converted_amount: convertedAmount,
        category,
        vendor: vendor || null,
        description,
        date,
        receipt_url,
        status: 'pending',
      },
    });

    // Create approval steps based on company rules
    try {
      await createApprovalSteps(expense.id, req.user.company_id, req.user.id);
    } catch (stepErr) {
      // If approval step creation fails (e.g. invalid specific person), clean up the expense
      await prisma.expense.delete({ where: { id: expense.id } });
      return res.status(400).json({ error: stepErr.message });
    }

    // Fetch the updated expense with approval progress
    const updatedExpense = await prisma.expense.findUnique({
      where: { id: expense.id },
      include: { employee: true },
    });
    const progress = await getApprovalProgress(expense.id);

    const initials = updatedExpense.employee.full_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();

    res.status(201).json({
      message: 'Expense submitted for approval!',
      expense: {
        id: updatedExpense.id,
        employee: updatedExpense.employee.full_name,
        avatar: initials,
        amount: updatedExpense.amount,
        currency: updatedExpense.currency,
        convertedAmount: updatedExpense.converted_amount,
        category: updatedExpense.category,
        vendor: updatedExpense.vendor,
        description: updatedExpense.description,
        date: updatedExpense.date,
        receipt_url: updatedExpense.receipt_url,
        status: updatedExpense.status,
        step: progress.step,
        totalSteps: progress.totalSteps,
        approvers: progress.approvers,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/expenses — List expenses based on role
 */
router.get('/expenses', authenticate, requirePasswordChanged, async (req, res, next) => {
  try {
    let where = {};
    const { status, category, search } = req.query;

    if (req.user.role === 'employee') {
      // Employees see only their own
      where.employee_id = req.user.id;
    } else if (req.user.role === 'manager') {
      // Managers see their reports' expenses
      const reports = await prisma.user.findMany({
        where: { manager_id: req.user.id },
        select: { id: true },
      });
      const reportIds = reports.map(r => r.id);
      reportIds.push(req.user.id); // Include own expenses
      where.employee_id = { in: reportIds };
    }
    // Admin, Finance, Director — see all expenses from the company
    if (['admin', 'finance', 'director'].includes(req.user.role)) {
      const companyUsers = await prisma.user.findMany({
        where: { company_id: req.user.company_id },
        select: { id: true },
      });
      where.employee_id = { in: companyUsers.map(u => u.id) };
    }

    // Filters
    if (status && status !== 'all') {
      where.status = status;
    }
    if (category) {
      where.category = category;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { employee: true },
      orderBy: { created_at: 'desc' },
    });

    // Build response with approval progress
    const result = await Promise.all(
      expenses.map(async (e) => {
        const progress = await getApprovalProgress(e.id);
        const initials = e.employee.full_name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase();

        return {
          id: e.id,
          employee: e.employee.full_name,
          employee_id: e.employee_id,
          role: e.employee.role,
          avatar: initials,
          amount: e.amount,
          currency: e.currency,
          convertedAmount: e.converted_amount,
          category: e.category,
          vendor: e.vendor,
          description: e.description,
          date: e.date,
          receipt_url: e.receipt_url,
          status: e.status,
          step: progress.step,
          totalSteps: progress.totalSteps,
          approvers: progress.approvers,
          approval_steps: progress.steps,
        };
      })
    );

    // Search filter (in-memory for simplicity)
    let filtered = result;
    if (search) {
      const q = search.toLowerCase();
      filtered = result.filter(
        e =>
          e.employee.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.vendor && e.vendor.toLowerCase().includes(q))
      );
    }

    res.json(filtered);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/expenses/export/csv — Export expenses as CSV (Finance only)
 */
router.get('/expenses/export/csv', authenticate, requirePasswordChanged, authorize('finance', 'admin'), async (req, res, next) => {
  try {
    const companyUsers = await prisma.user.findMany({
      where: { company_id: req.user.company_id },
      select: { id: true },
    });

    const expenses = await prisma.expense.findMany({
      where: { employee_id: { in: companyUsers.map(u => u.id) } },
      include: { employee: true },
      orderBy: { created_at: 'desc' },
    });

    // Build CSV
    const header = 'ID,Employee,Amount,Currency,Converted Amount (INR),Category,Vendor,Description,Date,Status\n';
    const rows = expenses.map(e =>
      `"${e.id}","${e.employee.full_name}",${e.amount},"${e.currency}",${e.converted_amount},"${e.category}","${e.vendor || ''}","${e.description}","${e.date}","${e.status}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
    res.send(header + rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/expenses/stats — Aggregate stats for dashboards
 */
router.get('/expenses/stats', authenticate, requirePasswordChanged, async (req, res, next) => {
  try {
    const companyUsers = await prisma.user.findMany({
      where: { company_id: req.user.company_id },
      select: { id: true },
    });
    const userIds = companyUsers.map(u => u.id);

    let expenseWhere = { employee_id: { in: userIds } };

    // For manager, only their team
    if (req.user.role === 'manager') {
      const reports = await prisma.user.findMany({
        where: { manager_id: req.user.id },
        select: { id: true },
      });
      const reportIds = reports.map(r => r.id);
      reportIds.push(req.user.id);
      expenseWhere = { employee_id: { in: reportIds } };
    }

    const expenses = await prisma.expense.findMany({ where: expenseWhere });

    const total = expenses.length;
    const pending = expenses.filter(e => e.status === 'pending');
    const approved = expenses.filter(e => e.status === 'approved');
    const rejected = expenses.filter(e => e.status === 'rejected');

    const totalSpend = expenses.reduce((sum, e) => sum + e.converted_amount, 0);
    const pendingValue = pending.reduce((sum, e) => sum + e.converted_amount, 0);
    const teamSize = companyUsers.length;

    // Monthly breakdown (last 6 months)
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString('en', { month: 'short' });
      const monthExpenses = expenses.filter(e => {
        const ed = new Date(e.date);
        return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
      });
      months.push({
        name: monthName,
        amount: monthExpenses.reduce((s, e) => s + e.converted_amount, 0),
      });
    }

    // Category breakdown
    const catMap = {};
    for (const e of expenses) {
      if (!catMap[e.category]) {
        catMap[e.category] = { name: e.category, amount: 0, count: 0 };
      }
      catMap[e.category].amount += e.converted_amount;
      catMap[e.category].count += 1;
    }
    const categoryBreakdown = Object.values(catMap).map(c => ({
      ...c,
      pct: totalSpend > 0 ? Math.round((c.amount / totalSpend) * 100) : 0,
    }));

    // Weekly activity
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyData = weekDays.map(day => ({
      day,
      count: Math.round(Math.random() * 12) + 1, // Simulated for seed data
    }));

    res.json({
      admin: [
        { label: 'Total Requests', value: total, icon: 'receipt', sparkline: [20, 35, 28, 45, 38, 52, total] },
        { label: 'Pending', value: pending.length, icon: 'clock', sparkline: [5, 8, 6, 12, 10, 15, pending.length] },
        { label: 'Approved', value: approved.length, icon: 'check-circle', sparkline: [10, 15, 20, 30, 35, 42, approved.length] },
        { label: 'Rejected', value: rejected.length, icon: 'x-circle', sparkline: [3, 5, 2, 7, 4, 6, rejected.length] },
        { label: 'Team Size', value: teamSize, icon: 'users', sparkline: [5, 5, 6, 7, 7, 8, teamSize] },
      ],
      director: [
        { label: 'Total Spend', value: totalSpend, prefix: '₹', icon: 'receipt', sparkline: [120, 135, 128, 145, 138, 152, Math.round(totalSpend / 1000)] },
        { label: 'Pending Value', value: pendingValue, prefix: '₹', icon: 'clock', sparkline: [15, 28, 16, 32, 20, 35, Math.round(pendingValue / 1000)] },
        { label: 'Approved Count', value: approved.length, icon: 'check-circle', sparkline: [10, 15, 20, 30, 35, 42, approved.length] },
        { label: 'Rejected Count', value: rejected.length, icon: 'x-circle', sparkline: [3, 5, 2, 7, 4, 6, rejected.length] },
      ],
      monthlyData: months,
      categoryBreakdown,
      weeklyData,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/expenses/:id — Get a single expense with full details
 */
router.get('/expenses/:id', authenticate, requirePasswordChanged, async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: { employee: true },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    // Access control
    if (req.user.role === 'employee' && expense.employee_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only view your own expenses.' });
    }

    const progress = await getApprovalProgress(expense.id);
    const initials = expense.employee.full_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();

    res.json({
      id: expense.id,
      employee: expense.employee.full_name,
      avatar: initials,
      amount: expense.amount,
      currency: expense.currency,
      convertedAmount: expense.converted_amount,
      category: expense.category,
      vendor: expense.vendor,
      description: expense.description,
      date: expense.date,
      receipt_url: expense.receipt_url,
      status: expense.status,
      step: progress.step,
      totalSteps: progress.totalSteps,
      approvers: progress.approvers,
      approval_steps: progress.steps,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
