const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Simple inline schema for role requests
const roleRequestSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username:    { type: String, required: true },
    fullName:    { type: String, required: true },
    requestedRole: { type: String, default: 'admin' },
    reason:      { type: String, default: '' },
    status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy:  { type: String, default: null },
  },
  { timestamps: true }
);

const RoleRequest = mongoose.models.RoleRequest || mongoose.model('RoleRequest', roleRequestSchema);

// GET /api/role-requests  — admins see all, users see their own
router.get('/', authMiddleware, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { userId: req.user.id };
    const requests = await RoleRequest.find(filter).sort({ createdAt: -1 });
    return res.json(requests);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

// POST /api/role-requests — authenticated users submit a request
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { reason, requestedRole } = req.body;
    const existing = await RoleRequest.findOne({ userId: req.user.id, status: 'pending' });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending role request' });
    }
    const request = await RoleRequest.create({
      userId: req.user.id,
      username: req.user.username,
      fullName: req.user.fullName || req.user.username,
      requestedRole: requestedRole || 'admin',
      reason: reason || '',
    });
    return res.status(201).json(request);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

// PATCH /api/role-requests/:id — admin approves or rejects
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can review role requests' });
    }
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be approved or rejected' });
    }
    const request = await RoleRequest.findByIdAndUpdate(
      req.params.id,
      { status, reviewedBy: req.user.username },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: 'Role request not found' });
    return res.json(request);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

// DELETE /api/role-requests/:id — admin removes a request
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete role requests' });
    }
    const request = await RoleRequest.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ message: 'Role request not found' });
    return res.json({ message: 'Role request deleted' });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

module.exports = router;
