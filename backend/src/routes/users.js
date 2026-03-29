const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticate, authorize, requirePasswordChanged, prisma } = require('../middleware/auth');
const { generateTempPassword, sendTempPassword } = require('../services/emailService');

const router = express.Router();

/**
 * POST /api/users — Admin creates a user
 */
router.post('/users', authenticate, requirePasswordChanged, authorize('admin'), async (req, res, next) => {
  try {
    const { full_name, email, role, manager_id, department } = req.body;

    if (!full_name || !email || !role) {
      return res.status(400).json({ error: 'Name, email, and role are required.' });
    }

    const validRoles = ['employee', 'manager', 'finance', 'director'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Check email is unique
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    // Generate temp password
    const tempPassword = generateTempPassword();
    const password_hash = await bcrypt.hash(tempPassword, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        full_name,
        email: email.toLowerCase().trim(),
        password_hash,
        role,
        company_id: req.user.company_id,
        manager_id: role === 'employee' && manager_id ? manager_id : null,
        department: department || null,
        must_change_password: true,
      },
    });

    // Fetch company name for email template
    const company = await prisma.company.findUnique({ where: { id: req.user.company_id } });

    // Send welcome email with temp password
    sendTempPassword(user.email, tempPassword, user.full_name, company?.name);

    // Fetch manager name if the user has one
    let managerName = null;
    if (user.manager_id) {
      const mgr = await prisma.user.findUnique({ where: { id: user.manager_id } });
      managerName = mgr ? mgr.full_name : null;
    }

    res.status(201).json({
      message: `${full_name} added as ${role}. Temporary password sent to ${email}.`,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        manager: managerName,
      },
      temp_password: tempPassword, // For dev/testing only
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users — List users
 * Admin: all users of the company
 * Manager: their direct reports
 */
router.get('/users', authenticate, requirePasswordChanged, async (req, res, next) => {
  try {
    let where = { company_id: req.user.company_id };

    if (req.user.role === 'manager') {
      where.manager_id = req.user.id;
    } else if (req.user.role !== 'admin' && req.user.role !== 'director') {
      // Non-admin, non-director, non-manager — only see themselves
      where.id = req.user.id;
    }

    const users = await prisma.user.findMany({
      where,
      include: { manager: true },
      orderBy: { created_at: 'asc' },
    });

    const formatted = users.map(u => ({
      id: u.id,
      name: u.full_name,
      email: u.email,
      role: u.role,
      department: u.department,
      manager: u.manager ? u.manager.full_name : null,
      manager_id: u.manager_id,
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/managers — Get list of managers (for dropdowns)
 */
router.get('/users/managers', authenticate, requirePasswordChanged, async (req, res, next) => {
  try {
    const managers = await prisma.user.findMany({
      where: {
        company_id: req.user.company_id,
        role: 'manager',
      },
      orderBy: { full_name: 'asc' },
    });

    res.json(managers.map(m => ({
      id: m.id,
      name: m.full_name,
      email: m.email,
    })));
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/users/:id — Update a user
 */
router.patch('/users/:id', authenticate, requirePasswordChanged, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, role, department, manager_id } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.company_id !== req.user.company_id) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(full_name && { full_name }),
        ...(role && { role }),
        ...(department !== undefined && { department }),
        ...(manager_id !== undefined && { manager_id: manager_id || null }),
      },
      include: { manager: true },
    });

    res.json({
      id: updated.id,
      name: updated.full_name,
      email: updated.email,
      role: updated.role,
      department: updated.department,
      manager: updated.manager ? updated.manager.full_name : null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/users/:id — Delete a user
 */
router.delete('/users/:id', authenticate, requirePasswordChanged, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.company_id !== req.user.company_id) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin users.' });
    }

    // Use a transaction to handle cascading deletes
    await prisma.$transaction(async (tx) => {
      // 1. Delete approval steps where user is approver
      await tx.approvalStep.deleteMany({ where: { approver_id: id } });

      // 2. Delete approval steps on user's expenses
      const userExpenses = await tx.expense.findMany({
        where: { employee_id: id },
        select: { id: true },
      });
      if (userExpenses.length > 0) {
        await tx.approvalStep.deleteMany({
          where: { expense_id: { in: userExpenses.map(e => e.id) } },
        });
      }

      // 3. Delete user's expenses
      await tx.expense.deleteMany({ where: { employee_id: id } });

      // 4. Reassign any direct reports (set their manager to null)
      await tx.user.updateMany({
        where: { manager_id: id },
        data: { manager_id: null },
      });

      // 5. Delete the user
      await tx.user.delete({ where: { id } });
    });

    res.json({ message: `${user.full_name} has been removed.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
