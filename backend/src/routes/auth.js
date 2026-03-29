const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticate, generateToken, prisma } = require('../middleware/auth');
const { sendPasswordChangedNotification } = require('../services/emailService');

const router = express.Router();

/**
 * POST /api/setup — One-time company + admin setup
 */
router.post('/setup', async (req, res, next) => {
  try {
    // Check if any company exists
    const existingCompany = await prisma.company.findFirst();
    if (existingCompany) {
      return res.status(403).json({
        error: 'Setup already complete. Please log in.',
        setup_complete: true,
      });
    }

    const { company_name, country, currency, admin_name, admin_email, password } = req.body;

    if (!company_name || !country || !admin_name || !admin_email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create company
    const company = await prisma.company.create({
      data: {
        name: company_name,
        country: country,
        currency: currency || 'INR',
        setup_complete: true,
      },
    });

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        full_name: admin_name,
        email: admin_email,
        password_hash,
        role: 'admin',
        company_id: company.id,
        must_change_password: false,
      },
    });

    // Generate token
    const token = generateToken(admin);

    res.status(201).json({
      message: 'Company created successfully! Welcome to ClearClaim.',
      token,
      user: {
        id: admin.id,
        full_name: admin.full_name,
        email: admin.email,
        role: admin.role,
        company_id: company.id,
        must_change_password: false,
      },
      company: {
        id: company.id,
        name: company.name,
        country: company.country,
        currency: company.currency,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/check-setup — Check if company setup has been done
 */
router.get('/check-setup', async (req, res, next) => {
  try {
    const company = await prisma.company.findFirst();
    res.json({ setup_complete: !!company });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/login — Email + password login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { company: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        company_id: user.company_id,
        must_change_password: user.must_change_password,
        department: user.department,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/change-password — Change password (for first-time login)
 */
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Both old and new passwords are required.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const validOld = await bcrypt.compare(old_password, user.password_hash);
    if (!validOld) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const new_hash = await bcrypt.hash(new_password, 12);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        password_hash: new_hash,
        must_change_password: false,
      },
    });

    sendPasswordChangedNotification(user.email, user.full_name);

    // Generate new token without must_change_password flag
    const updatedUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const token = generateToken(updatedUser);

    res.json({
      message: 'Password updated successfully!',
      token,
      user: {
        id: updatedUser.id,
        full_name: updatedUser.full_name,
        email: updatedUser.email,
        role: updatedUser.role,
        company_id: updatedUser.company_id,
        must_change_password: false,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
