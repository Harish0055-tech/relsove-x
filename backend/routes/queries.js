const express = require('express');
const Query = require('../models/Query');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all queries (Admins get all, Users get theirs)
router.get('/', authMiddleware, async (req, res) => {
  try {
    let queries;
    if (req.user.role === 'admin') {
      if (req.user.category) {
        queries = await Query.find({ category: req.user.category }).sort({ createdAt: -1 });
      } else {
        queries = await Query.find().sort({ createdAt: -1 });
      }
    } else {
      queries = await Query.find({ submittedBy: req.user.username }).sort({ createdAt: -1 });
    }
    res.json(queries);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get specific query
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const query = await Query.findOne({ queryId: req.params.id }) || await Query.findById(req.params.id).catch(() => null);
    if (!query) return res.status(404).json({ message: 'Query not found' });
    
    if (req.user.role !== 'admin' && query.submittedBy !== req.user.username) {
        return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(query);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Create a query
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { subject, category, priority, description, attachments } = req.body;

    // Generate custom QR-XXXX format
    const lastQuery = await Query.findOne({ queryId: { $exists: true } }).sort({ createdAt: -1 });
    let nextIdNumber = 1001;
    if (lastQuery && lastQuery.queryId && lastQuery.queryId.startsWith('QR-')) {
      const lastIdParts = lastQuery.queryId.split('-');
      if (lastIdParts.length === 2) {
        const lastNum = parseInt(lastIdParts[1], 10);
        if (!isNaN(lastNum)) {
          nextIdNumber = lastNum + 1;
        }
      }
    }
    const queryId = `QR-${nextIdNumber}`;
    
    // Find an admin handling this category
    const User = require('../models/User');
    const admin = await User.findOne({ role: 'admin', category: category });
    const assignedTo = admin ? (admin.fullName || admin.username) : null;

    const newQuery = new Query({
      queryId,
      subject,
      category,
      priority,
      description,
      submittedBy: req.user.username,
      assignedTo: assignedTo,
      attachments: attachments || [],
      status: 'open',
      activities: [{
        type: 'status_change',
        user: 'System',
        content: assignedTo ? `Ticket created and assigned to ${assignedTo}` : 'Ticket created',
        newStatus: 'open'
      }]
    });

    const query = await newQuery.save();
    res.json(query);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update a query (change status, add activity)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { status, assignedTo, newActivity } = req.body;
    let query = await Query.findOne({ queryId: req.params.id }) || await Query.findById(req.params.id).catch(() => null);

    if (!query) return res.status(404).json({ message: 'Query not found' });

    // Admins can update any, users can only add comments maybe, but let's say admins only can update status.
    if (req.user.role !== 'admin' && status && status !== query.status) {
        return res.status(403).json({ message: 'Only admins can change status' });
    }

    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    
    if (newActivity) {
      query.activities.push({
        ...newActivity,
        user: req.user.username,
        timestamp: new Date()
      });
    }

    await query.save();
    res.json(query);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Delete a query
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const query = await Query.findOne({ queryId: req.params.id }) || await Query.findById(req.params.id).catch(() => null);
    if (!query) return res.status(404).json({ message: 'Query not found' });

    // Only admins or the owner can delete
    if (req.user.role !== 'admin' && query.submittedBy !== req.user.username) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Query.findOneAndDelete({ _id: query._id });
    res.json({ message: 'Query removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
