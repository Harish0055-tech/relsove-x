const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Simple inline schema for login history
const loginEventSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username:  { type: String, required: true },
    role:      { type: String, default: 'user' },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    success:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

const LoginEvent = mongoose.models.LoginEvent || mongoose.model('LoginEvent', loginEventSchema);

// POST /api/login-store  — record a login event (called after successful login)
router.post('/', async (req, res) => {
  try {
    const { userId, username, role, success } = req.body;
    if (!username) return res.status(400).json({ message: 'username is required' });
    const event = await LoginEvent.create({
      userId: userId || null,
      username,
      role: role || 'user',
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      success: success !== false,
    });
    return res.status(201).json(event);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

// GET /api/login-store  — admins can view login history
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view login history' });
    }
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const events = await LoginEvent.find().sort({ createdAt: -1 }).limit(limit);
    return res.json(events);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

module.exports = router;
