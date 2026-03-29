const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create approval steps for a new expense based on the company's active approval rule.
 */
async function createApprovalSteps(expenseId, companyId, employeeId) {
  // Get the company's approval rule (most recent)
  const rule = await prisma.approvalRule.findFirst({
    where: { company_id: companyId },
    orderBy: { created_at: 'desc' },
  });

  if (!rule) {
    // No rule — auto-approve
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: 'approved' },
    });
    return [];
  }

  const config = JSON.parse(rule.config || '{}');
  const type = rule.type;

  // Get the employee to find their manager chain
  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    include: { manager: true },
  });

  // Build approver list based on rule type
  let approvers = [];

  if (type === 'sequential') {
    // ── Sequential: use configured step order from drag-and-drop ──
    if (config.steps && Array.isArray(config.steps) && config.steps.length > 0) {
      const companyUsers = await prisma.user.findMany({
        where: { company_id: companyId },
      });

      // Sort by step_order to guarantee correct ordering (respects drag-and-drop reorder)
      const sortedSteps = [...config.steps].sort((a, b) => (a.step_order || 0) - (b.step_order || 0));

      for (const step of sortedSteps) {
        if (step.approver_id) {
          // Explicit approver_id (set by admin via drag-and-drop)
          // Validate that the approver exists and belongs to the company
          const approver = companyUsers.find(u => u.id === step.approver_id);
          if (approver) {
            approvers.push(step.approver_id);
          }
        } else if (step.role) {
          // Role-based step — resolve to actual user
          if (step.role === 'manager' && employee.manager_id) {
            approvers.push(employee.manager_id);
          } else if (step.role === 'finance') {
            const financeUser = companyUsers.find(u => u.role === 'finance');
            if (financeUser) approvers.push(financeUser.id);
          } else if (step.role === 'director') {
            const directorUser = companyUsers.find(u => u.role === 'director');
            if (directorUser) approvers.push(directorUser.id);
          }
        }
      }
    } else {
      // Fallback: default sequential chain Manager → Finance → Director
      const companyUsers = await prisma.user.findMany({
        where: { company_id: companyId },
      });

      if (employee.manager_id) {
        approvers.push(employee.manager_id);
      }

      const financeUsers = companyUsers.filter(u => u.role === 'finance');
      if (financeUsers.length > 0) {
        approvers.push(financeUsers[0].id);
      }

      const directorUsers = companyUsers.filter(u => u.role === 'director');
      if (directorUsers.length > 0) {
        approvers.push(directorUsers[0].id);
      }
    }

    // Additional approvers from config.approver_ids (legacy support)
    if (config.approver_ids && Array.isArray(config.approver_ids)) {
      for (const id of config.approver_ids) {
        if (!approvers.includes(id)) {
          approvers.push(id);
        }
      }
    }
  } else if (type === 'percentage') {
    // Percentage: same chain as sequential but all steps are pending at once
    const companyUsers = await prisma.user.findMany({
      where: { company_id: companyId },
    });

    if (employee.manager_id) {
      approvers.push(employee.manager_id);
    }

    const financeUsers = companyUsers.filter(u => u.role === 'finance');
    if (financeUsers.length > 0) {
      approvers.push(financeUsers[0].id);
    }

    const directorUsers = companyUsers.filter(u => u.role === 'director');
    if (directorUsers.length > 0) {
      approvers.push(directorUsers[0].id);
    }

    if (config.approver_ids && Array.isArray(config.approver_ids)) {
      for (const id of config.approver_ids) {
        if (!approvers.includes(id)) {
          approvers.push(id);
        }
      }
    }
  } else if (type === 'specific') {
    // ── Specific person: ONLY that person approves ──
    if (!config.approver_id) {
      // No approver configured — reject submission
      throw new Error('Specific person approval rule has no approver configured. Contact your admin.');
    }

    // Validate the approver is still finance/director
    const approver = await prisma.user.findUnique({ where: { id: config.approver_id } });
    if (!approver) {
      throw new Error('The configured specific approver no longer exists. Contact your admin.');
    }
    if (!['finance', 'director'].includes(approver.role)) {
      throw new Error('The configured specific approver is no longer a Finance or Director user. Contact your admin.');
    }
    if (approver.company_id !== companyId) {
      throw new Error('The configured specific approver does not belong to your company. Contact your admin.');
    }

    // Only this one person
    approvers = [config.approver_id];
  }

  // Remove duplicates and the employee themselves
  approvers = [...new Set(approvers)].filter(id => id !== employeeId);

  if (approvers.length === 0) {
    // No approvers — auto-approve
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: 'approved' },
    });
    return [];
  }

  // Create approval step records
  const steps = [];
  for (let i = 0; i < approvers.length; i++) {
    const step = await prisma.approvalStep.create({
      data: {
        expense_id: expenseId,
        approver_id: approvers[i],
        step_order: i + 1,
        // Sequential: only first step is pending, rest wait
        // Percentage: all steps are pending simultaneously
        // Specific: single step is always pending (only one approver)
        status: type === 'sequential' ? (i === 0 ? 'pending' : 'waiting') : 'pending',
      },
    });
    steps.push(step);
  }

  return steps;
}

/**
 * Process an approval action on an expense.
 */
async function processApproval(stepId, action, comment) {
  const step = await prisma.approvalStep.findUnique({
    where: { id: stepId },
    include: {
      expense: {
        include: {
          employee: { include: { company: true } },
        },
      },
    },
  });

  if (!step) throw new Error('Approval step not found');
  if (step.status !== 'pending') throw new Error('This step has already been processed');

  const expense = step.expense;
  const companyId = expense.employee.company_id;

  // Get the rule
  const rule = await prisma.approvalRule.findFirst({
    where: { company_id: companyId },
    orderBy: { created_at: 'desc' },
  });

  const ruleType = rule ? rule.type : 'sequential';
  const config = rule ? JSON.parse(rule.config || '{}') : {};

  // Update the step
  await prisma.approvalStep.update({
    where: { id: stepId },
    data: {
      status: action, // 'approved' or 'rejected'
      comment: comment || null,
      timestamp: new Date(),
    },
  });

  // ── REJECTION: always immediate for all rule types ──
  if (action === 'rejected') {
    await prisma.expense.update({
      where: { id: expense.id },
      data: { status: 'rejected' },
    });
    // Mark all remaining pending/waiting steps as skipped
    await prisma.approvalStep.updateMany({
      where: {
        expense_id: expense.id,
        status: { in: ['pending', 'waiting'] },
      },
      data: { status: 'skipped' },
    });
    return { expense_status: 'rejected' };
  }

  // ── SPECIFIC PERSON: approval = immediate full approval ──
  if (ruleType === 'specific') {
    // When the specific person approves, immediately approve the expense
    // Skip all other steps (if any exist)
    await prisma.expense.update({
      where: { id: expense.id },
      data: { status: 'approved' },
    });
    // Mark any remaining steps as skipped (specific person overrides everything)
    await prisma.approvalStep.updateMany({
      where: {
        expense_id: expense.id,
        status: { in: ['pending', 'waiting'] },
      },
      data: { status: 'skipped', comment: 'Skipped — specific person approved' },
    });
    return { expense_status: 'approved' };
  }

  // ── PERCENTAGE: check threshold ──
  if (ruleType === 'percentage') {
    const allSteps = await prisma.approvalStep.findMany({
      where: { expense_id: expense.id },
    });
    const totalSteps = allSteps.length;
    const approvedSteps = allSteps.filter(s => s.status === 'approved').length;
    const threshold = (config.percentage || 60) / 100;

    if (approvedSteps / totalSteps >= threshold) {
      await prisma.expense.update({
        where: { id: expense.id },
        data: { status: 'approved' },
      });
      return { expense_status: 'approved' };
    }
    return { expense_status: 'pending', progress: `${approvedSteps}/${totalSteps}` };
  }

  // ── SEQUENTIAL: activate next step in order ──
  const allSteps = await prisma.approvalStep.findMany({
    where: { expense_id: expense.id },
    orderBy: { step_order: 'asc' },
  });

  const currentIndex = allSteps.findIndex(s => s.id === stepId);
  const nextStep = allSteps[currentIndex + 1];

  if (nextStep && nextStep.status === 'waiting') {
    // Activate next step
    await prisma.approvalStep.update({
      where: { id: nextStep.id },
      data: { status: 'pending' },
    });
    return { expense_status: 'pending', next_step: nextStep.step_order };
  }

  // All steps approved → approve the expense
  const allApproved = allSteps.every(s => s.status === 'approved' || s.id === stepId);
  if (allApproved) {
    await prisma.expense.update({
      where: { id: expense.id },
      data: { status: 'approved' },
    });
    return { expense_status: 'approved' };
  }

  return { expense_status: 'pending' };
}

/**
 * Get the approval progress for an expense (for frontend display)
 */
async function getApprovalProgress(expenseId) {
  const steps = await prisma.approvalStep.findMany({
    where: { expense_id: expenseId },
    include: { approver: true },
    orderBy: { step_order: 'asc' },
  });

  const totalSteps = steps.length;
  const currentStep = steps.findIndex(s => s.status === 'pending' || s.status === 'waiting');
  const approvedCount = steps.filter(s => s.status === 'approved').length;

  return {
    step: currentStep === -1 ? totalSteps : approvedCount + 1,
    totalSteps,
    approvers: steps.map(s => {
      const roleMap = { manager: 'Manager', finance: 'Finance', director: 'Director', admin: 'Admin' };
      return roleMap[s.approver.role] || s.approver.role;
    }),
    steps: steps.map(s => ({
      id: s.id,
      approver_name: s.approver.full_name,
      approver_role: s.approver.role,
      step_order: s.step_order,
      status: s.status,
      comment: s.comment,
      timestamp: s.timestamp,
    })),
  };
}

module.exports = { createApprovalSteps, processApproval, getApprovalProgress };
