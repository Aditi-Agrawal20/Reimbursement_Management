const express = require('express');
const { authenticate, authorize, requirePasswordChanged, prisma } = require('../middleware/auth');

const router = express.Router();

// ── Helper: validate sequential steps ──────────────────────────
async function validateSequentialSteps(steps, companyId) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return { valid: false, error: 'Sequential rule requires at least one step.' };
  }

  // Normalize step ordering to be continuous 1,2,3...
  const normalizedSteps = steps.map((step, i) => ({
    ...step,
    step_order: i + 1,
  }));

  // Validate no duplicate step_order (guaranteed by normalization, but double-check)
  const orders = normalizedSteps.map(s => s.step_order);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) {
    return { valid: false, error: 'Duplicate step_order values are not allowed.' };
  }

  // Validate continuous ordering: must be 1,2,3,...,N
  for (let i = 0; i < normalizedSteps.length; i++) {
    if (normalizedSteps[i].step_order !== i + 1) {
      return { valid: false, error: `Step ordering must be continuous (1,2,3,...). Got gap at position ${i + 1}.` };
    }
  }

  // Each step must have a role or approver_id
  for (const step of normalizedSteps) {
    if (!step.role && !step.approver_id) {
      return { valid: false, error: `Step ${step.step_order} must have either a role or an approver_id.` };
    }
  }

  // Validate approver_ids exist and belong to the company
  const approverIds = normalizedSteps.filter(s => s.approver_id).map(s => s.approver_id);
  if (approverIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: approverIds }, company_id: companyId },
    });
    const foundIds = new Set(users.map(u => u.id));
    for (const id of approverIds) {
      if (!foundIds.has(id)) {
        return { valid: false, error: `Approver with id "${id}" not found in your company.` };
      }
    }

    // Check no duplicate approver_ids
    const uniqueApprovers = new Set(approverIds);
    if (uniqueApprovers.size !== approverIds.length) {
      return { valid: false, error: 'Duplicate approvers are not allowed in sequential steps.' };
    }
  }

  return { valid: true, steps: normalizedSteps };
}

// ── Helper: validate specific person approver ──────────────────
async function validateSpecificApprover(approverId, companyId) {
  if (!approverId) {
    return { valid: false, error: 'Specific person rule requires an approver_id.' };
  }

  const approver = await prisma.user.findUnique({ where: { id: approverId } });
  if (!approver) {
    return { valid: false, error: 'Selected approver not found.' };
  }
  if (approver.company_id !== companyId) {
    return { valid: false, error: 'Selected approver must belong to your company.' };
  }

  // STRICT: only Finance or Director allowed
  const forbidden = ['admin', 'manager', 'employee'];
  if (forbidden.includes(approver.role)) {
    return {
      valid: false,
      error: `Specific person approver must be either Finance or Director role. "${approver.role}" is not allowed.`,
    };
  }
  if (!['finance', 'director'].includes(approver.role)) {
    return {
      valid: false,
      error: 'Specific person approver must be either Finance or Director role.',
    };
  }

  return { valid: true };
}

/**
 * POST /api/rules — Create an approval rule
 */
router.post('/rules', authenticate, requirePasswordChanged, authorize('admin'), async (req, res, next) => {
  try {
    const { name, description, type, config } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required.' });
    }

    const validTypes = ['sequential', 'percentage', 'specific'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }

    // ── Validate "specific" rule ──
    if (type === 'specific') {
      const parsedConfig = config || {};
      const result = await validateSpecificApprover(parsedConfig.approver_id, req.user.company_id);
      if (!result.valid) {
        return res.status(400).json({ error: result.error });
      }
    }

    // ── Validate "sequential" rule ──
    if (type === 'sequential' && config?.steps) {
      const result = await validateSequentialSteps(config.steps, req.user.company_id);
      if (!result.valid) {
        return res.status(400).json({ error: result.error });
      }
      config.steps = result.steps;
    }

    const rule = await prisma.approvalRule.create({
      data: {
        company_id: req.user.company_id,
        name,
        description: description || null,
        type,
        config: JSON.stringify(config || {}),
      },
    });

    res.status(201).json({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      type: rule.type,
      config: JSON.parse(rule.config),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/rules — List approval rules
 */
router.get('/rules', authenticate, requirePasswordChanged, async (req, res, next) => {
  try {
    const rules = await prisma.approvalRule.findMany({
      where: { company_id: req.user.company_id },
      orderBy: { created_at: 'desc' },
    });

    res.json(rules.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      type: r.type,
      config: JSON.parse(r.config || '{}'),
    })));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/rules/approvers — Get eligible specific-person approvers (Finance + Director only)
 */
router.get('/rules/approvers', authenticate, requirePasswordChanged, authorize('admin'), async (req, res, next) => {
  try {
    const approvers = await prisma.user.findMany({
      where: {
        company_id: req.user.company_id,
        role: { in: ['finance', 'director'] },
      },
      orderBy: { full_name: 'asc' },
    });

    res.json(approvers.map(u => ({
      id: u.id,
      name: u.full_name,
      email: u.email,
      role: u.role,
    })));
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/rules/:id — Update an approval rule (supports reordering via drag-and-drop)
 */
router.patch('/rules/:id', authenticate, requirePasswordChanged, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, type, config } = req.body;

    const rule = await prisma.approvalRule.findUnique({ where: { id } });
    if (!rule || rule.company_id !== req.user.company_id) {
      return res.status(404).json({ error: 'Rule not found.' });
    }

    const effectiveType = type || rule.type;

    // ── Validate "specific" rule on update ──
    if (effectiveType === 'specific' && config) {
      const result = await validateSpecificApprover(config.approver_id, req.user.company_id);
      if (!result.valid) {
        return res.status(400).json({ error: result.error });
      }
    }

    // ── Validate "sequential" step ordering on update (reorder from drag-and-drop) ──
    if (effectiveType === 'sequential' && config?.steps) {
      const result = await validateSequentialSteps(config.steps, req.user.company_id);
      if (!result.valid) {
        return res.status(400).json({ error: result.error });
      }
      config.steps = result.steps;
    }

    const updated = await prisma.approvalRule.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(config && { config: JSON.stringify(config) }),
      },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      type: updated.type,
      config: JSON.parse(updated.config || '{}'),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/rules/:id/reorder — Dedicated reorder endpoint for sequential steps
 * Accepts { steps: [{ step_order, role?, approver_id?, label? }, ...] }
 * from frontend drag-and-drop
 */
router.put('/rules/:id/reorder', authenticate, requirePasswordChanged, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { steps } = req.body;

    const rule = await prisma.approvalRule.findUnique({ where: { id } });
    if (!rule || rule.company_id !== req.user.company_id) {
      return res.status(404).json({ error: 'Rule not found.' });
    }

    if (rule.type !== 'sequential') {
      return res.status(400).json({ error: 'Reordering is only supported for sequential rules.' });
    }

    // Validate the new step order
    const result = await validateSequentialSteps(steps, req.user.company_id);
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    // Merge with existing config, replacing steps
    const existingConfig = JSON.parse(rule.config || '{}');
    const updatedConfig = { ...existingConfig, steps: result.steps };

    const updated = await prisma.approvalRule.update({
      where: { id },
      data: { config: JSON.stringify(updatedConfig) },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      type: updated.type,
      config: JSON.parse(updated.config || '{}'),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/rules/:id — Delete an approval rule
 */
router.delete('/rules/:id', authenticate, requirePasswordChanged, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const rule = await prisma.approvalRule.findUnique({ where: { id } });
    if (!rule || rule.company_id !== req.user.company_id) {
      return res.status(404).json({ error: 'Rule not found.' });
    }

    await prisma.approvalRule.delete({ where: { id } });
    res.json({ message: 'Rule deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
