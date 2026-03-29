const express = require('express');
const { authenticate, authorize, requirePasswordChanged, prisma } = require('../middleware/auth');
const { processApproval, getApprovalProgress } = require('../services/approvalEngine');
const { sendExpenseStatusEmail } = require('../services/emailService');

const router = express.Router();

/**
 * GET /api/approvals/pending — Get pending approvals for current user
 */
router.get('/approvals/pending', authenticate, requirePasswordChanged, async (req, res, next) => {
  try {
    // Find approval steps assigned to this user that are pending
    const pendingSteps = await prisma.approvalStep.findMany({
      where: {
        approver_id: req.user.id,
        status: 'pending',
      },
      include: {
        expense: {
          include: {
            employee: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Deduplicate by expense (one card per expense)
    const seen = new Set();
    const expenses = [];

    for (const step of pendingSteps) {
      if (seen.has(step.expense_id)) continue;
      seen.add(step.expense_id);

      const e = step.expense;
      const progress = await getApprovalProgress(e.id);
      const initials = e.employee.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();

      expenses.push({
        id: e.id,
        step_id: step.id,
        employee: e.employee.full_name,
        employee_id: e.employee_id,
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
      });
    }

    res.json(expenses);
  } catch (err) {
    next(err);
  }
});

/**
 * Helper: send status email to the expense owner after a final decision
 */
async function notifyExpenseOwner(expenseId, action, comment) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { employee: true },
    });
    if (!expense) return;

    // Only email when the expense reaches a final state
    if (expense.status === 'approved' || expense.status === 'rejected') {
      sendExpenseStatusEmail(
        expense.employee.email,
        expense.employee.full_name,
        expense,
        expense.status, // use the actual final status
        comment
      );
    }
  } catch (err) {
    console.error('Failed to send expense status email:', err.message);
  }
}

/**
 * POST /api/approve — Approve an expense approval step
 */
router.post('/approve', authenticate, requirePasswordChanged, async (req, res, next) => {
  try {
    const { expense_id, step_id, comment } = req.body;

    if (!expense_id && !step_id) {
      return res.status(400).json({ error: 'expense_id or step_id is required.' });
    }

    let targetStepId = step_id;

    // If only expense_id provided, find the pending step for this user
    if (!targetStepId && expense_id) {
      const step = await prisma.approvalStep.findFirst({
        where: {
          expense_id,
          approver_id: req.user.id,
          status: 'pending',
        },
      });
      if (!step) {
        return res.status(404).json({ error: 'No pending approval step found for you on this expense.' });
      }
      targetStepId = step.id;
    }

    // Verify this step belongs to the current user
    const step = await prisma.approvalStep.findUnique({ where: { id: targetStepId } });
    if (!step) {
      return res.status(404).json({ error: 'Approval step not found.' });
    }
    if (step.approver_id !== req.user.id) {
      return res.status(403).json({ error: 'This approval step is not assigned to you.' });
    }

    const result = await processApproval(targetStepId, 'approved', comment);

    // Send email notification if expense reached final status
    await notifyExpenseOwner(step.expense_id, 'approved', comment);

    res.json({
      message: 'Expense approved!',
      ...result,
    });
  } catch (err) {
    if (err.message.includes('already been processed') || err.message.includes('not found')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/reject — Reject an expense approval step
 */
router.post('/reject', authenticate, requirePasswordChanged, async (req, res, next) => {
  try {
    const { expense_id, step_id, comment } = req.body;

    if (!expense_id && !step_id) {
      return res.status(400).json({ error: 'expense_id or step_id is required.' });
    }

    let targetStepId = step_id;

    if (!targetStepId && expense_id) {
      const step = await prisma.approvalStep.findFirst({
        where: {
          expense_id,
          approver_id: req.user.id,
          status: 'pending',
        },
      });
      if (!step) {
        return res.status(404).json({ error: 'No pending approval step found for you on this expense.' });
      }
      targetStepId = step.id;
    }

    const step = await prisma.approvalStep.findUnique({ where: { id: targetStepId } });
    if (!step) {
      return res.status(404).json({ error: 'Approval step not found.' });
    }
    if (step.approver_id !== req.user.id) {
      return res.status(403).json({ error: 'This approval step is not assigned to you.' });
    }

    const result = await processApproval(targetStepId, 'rejected', comment);

    // Send email notification — rejection is always a final status
    await notifyExpenseOwner(step.expense_id, 'rejected', comment);

    res.json({
      message: 'Expense rejected.',
      ...result,
    });
  } catch (err) {
    if (err.message.includes('already been processed') || err.message.includes('not found')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
