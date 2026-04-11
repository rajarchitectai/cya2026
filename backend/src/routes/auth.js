const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User     = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

// POST /api/auth/register  — creates regular users only
router.post(
  '/register',
  [
    body('fname').trim().notEmpty().withMessage('First name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('cell').trim().notEmpty().withMessage('Phone number is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const { fname, lname, cell, email, password } = req.body;

    try {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing)
        return res.status(400).json({ error: 'An account with that email already exists.' });

      const hash = await bcrypt.hash(password, 12);
      const user = await User.create({ fname, lname, cell, email: email.toLowerCase(), password: hash, role: 'user' });

      return res.status(201).json({
        token: signToken(user),
        user: { id: user._id, fname: user.fname, email: user.email, cell: user.cell, role: user.role },
      });
    } catch (err) {
      console.error('Register error:', err);
      return res.status(500).json({ error: 'Server error during registration.' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user)
        return res.status(401).json({ error: 'Invalid email or password.' });

      const match = await bcrypt.compare(password, user.password);
      if (!match)
        return res.status(401).json({ error: 'Invalid email or password.' });

      // Admin portal: only allow admin role users
      if (user.role !== 'admin')
        return res.status(403).json({ error: 'Access denied. This portal is for admins only.' });

      return res.json({
        token: signToken(user),
        user: { id: user._id, fname: user.fname, email: user.email, cell: user.cell, role: user.role },
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Server error during login.' });
    }
  }
);

// POST /api/auth/user-login — for the end-user portal (non-admin only)
router.post(
  '/user-login',
  [
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user)
        return res.status(401).json({ error: 'Invalid email or password.' });

      const match = await bcrypt.compare(password, user.password);
      if (!match)
        return res.status(401).json({ error: 'Invalid email or password.' });

      // User portal: block admin accounts
      if (user.role === 'admin')
        return res.status(403).json({ error: 'Please use the Admin Portal to sign in.' });

      return res.json({
        token: signToken(user),
        user: { id: user._id, fname: user.fname, email: user.email, cell: user.cell, role: user.role },
      });
    } catch (err) {
      console.error('User login error:', err);
      return res.status(500).json({ error: 'Server error during login.' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const { _id, fname, lname, email, cell, role } = req.user;
  res.json({ id: _id, fname, lname, email, cell, role });
});

module.exports = router;
