const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@admin.com').toLowerCase();
const SUPER_ADMIN_CATEGORY = 'SUPER_ADMIN';

function normalizeUsername(input) {
  return String(input || '').trim().toLowerCase();
}

function isSuperAdmin(user) {
  return normalizeUsername(user?.username) === ADMIN_EMAIL || user?.category === SUPER_ADMIN_CATEGORY;
}

function getResolverFilterForAdmin(user) {
  if (isSuperAdmin(user)) {
    return { role: 'admin', username: { $ne: ADMIN_EMAIL } };
  }
  return { role: 'admin', category: user?.category };
}

function isAdmin(user) {
  return user?.role === 'admin';
}

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { fullName, password } = req.body;
    const username = normalizeUsername(req.body.username || req.body.email);

    if (!fullName || !username || !password) {
      return res.status(400).json({ message: 'fullName, email and password are required' });
    }

    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      fullName,
      username,
      password: hashedPassword,
      role: 'user',
      category: null,
    });

    await user.save();

    const payload = {
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        username: user.username,
        category: user.category
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: payload.user });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username || req.body.email);
    const { password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    let user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const payload = {
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        username: user.username,
        category: user.category,
        isSuperAdmin: isSuperAdmin(user),
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: payload.user });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get current user details using token (useful for persistent login)
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ ...user.toObject(), isSuperAdmin: isSuperAdmin(user) });
    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Super admin: list users
router.get('/admin/users', authMiddleware, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only super admin can manage users' });
    }
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });
    return res.json(users);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

// Super admin: delete user
router.delete('/admin/users/:id', authMiddleware, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only super admin can manage users' });
    }
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.role !== 'user') return res.status(400).json({ message: 'Only user accounts can be deleted here' });
    await User.findByIdAndDelete(req.params.id);
    return res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

// Super admin: list resolvers
router.get('/admin/resolvers', authMiddleware, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only super admin can manage resolvers' });
    }
    const resolvers = await User.find({
      role: 'admin',
      username: { $ne: ADMIN_EMAIL },
    }).select('-password').sort({ createdAt: -1 });
    return res.json(resolvers);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

// Admin or super admin: list resolvers available for assignment
router.get('/resolvers', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view resolvers' });
    }

    const resolvers = await User.find(getResolverFilterForAdmin(req.user))
      .select('-password')
      .sort({ fullName: 1, username: 1 });

    return res.json(
      resolvers.map((resolver) => ({
        id: resolver.id,
        fullName: resolver.fullName,
        username: resolver.username,
        category: resolver.category,
      }))
    );
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

// Super admin: create resolver
router.post('/admin/resolvers', authMiddleware, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only super admin can manage resolvers' });
    }
    const username = normalizeUsername(req.body.email || req.body.username);
    const password = String(req.body.password || '');
    const category = String(req.body.category || req.body.role || '').trim();
    const fullName = String(req.body.fullName || username.split('@')[0] || 'Resolver').trim();

    if (!username || !password || !category) {
      return res.status(400).json({ message: 'email, password and category are required' });
    }
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ message: 'Resolver already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const resolver = await User.create({
      fullName,
      username,
      password: hashedPassword,
      role: 'admin',
      category,
    });
    return res.status(201).json({
      message: 'Resolver created',
      resolver: {
        id: resolver.id,
        fullName: resolver.fullName,
        username: resolver.username,
        role: resolver.role,
        category: resolver.category,
        createdAt: resolver.createdAt,
      },
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

// Super admin: update resolver category
router.patch('/admin/resolvers/:id/category', authMiddleware, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only super admin can manage resolvers' });
    }
    const category = String(req.body.category || req.body.role || '').trim();
    if (!category) return res.status(400).json({ message: 'category is required' });

    const resolver = await User.findById(req.params.id);
    if (!resolver) return res.status(404).json({ message: 'Resolver not found' });
    if (resolver.role !== 'admin' || normalizeUsername(resolver.username) === ADMIN_EMAIL) {
      return res.status(400).json({ message: 'Target is not a resolver account' });
    }

    resolver.category = category;
    await resolver.save();
    return res.json({
      message: 'Resolver category updated',
      resolver: {
        id: resolver.id,
        fullName: resolver.fullName,
        username: resolver.username,
        role: resolver.role,
        category: resolver.category,
      },
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

// Super admin: delete resolver
router.delete('/admin/resolvers/:id', authMiddleware, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only super admin can manage resolvers' });
    }

    const resolver = await User.findById(req.params.id);
    if (!resolver) return res.status(404).json({ message: 'Resolver not found' });
    if (resolver.role !== 'admin' || normalizeUsername(resolver.username) === ADMIN_EMAIL) {
      return res.status(400).json({ message: 'Target is not a resolver account' });
    }

    await User.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Resolver deleted' });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

// Admins: list available resolvers for assignment
router.get('/resolvers', authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: 'Only admins can view resolvers' });
    }

    const query = {
      role: 'admin',
      username: { $ne: ADMIN_EMAIL },
    };

    if (!isSuperAdmin(req.user) && req.user.category) {
      query.category = req.user.category;
    }

    const resolvers = await User.find(query)
      .select('_id fullName username category')
      .sort({ fullName: 1, createdAt: -1 });

    return res.json(resolvers);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

module.exports = router;
