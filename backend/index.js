const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const queryRoutes = require('./routes/queries');
const User = require('./models/User');

const app = express();

// Middleware
const allowedOrigins = [
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean) : []),
  'http://localhost:8080',
  'http://localhost:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (Postman/curl) and same-origin calls without Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS not allowed for this origin'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@admin.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123';

async function bootstrapAdmin() {
  const existing = await User.findOne({ username: ADMIN_EMAIL });
  if (existing) return;

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(ADMIN_PASSWORD, salt);
  await User.create({
    fullName: 'System Admin',
    username: ADMIN_EMAIL,
    password: hash,
    role: 'admin',
    category: 'SUPER_ADMIN',
  });
  console.log(`Default admin created: ${ADMIN_EMAIL}`);
}

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB Atlas');
    await bootstrapAdmin();
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/queries', queryRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('ResolveX API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
