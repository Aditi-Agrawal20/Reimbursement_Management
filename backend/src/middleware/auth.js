const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'clearclaim-secret';

/**
 * Authenticate — verifies JWT and attaches user to req
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

/**
 * Authorize — checks if user has one of the allowed roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
    }
    next();
  };
}

/**
 * Require password changed — blocks access if must_change_password is true
 */
async function requirePasswordChanged(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.must_change_password) {
      return res.status(403).json({
        error: 'You must change your password before accessing this resource.',
        must_change_password: true,
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Generate JWT token for a user
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
      full_name: user.full_name,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = { authenticate, authorize, requirePasswordChanged, generateToken, prisma };
