require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');
const passport  = require('passport');
const path      = require('path');

const connectDB      = require('./config/db');
const seedAdmin      = require('./config/seedAdmin');
const authRoutes     = require('./routes/auth');
const plaidRoutes    = require('./routes/plaid');
const alertRoutes    = require('./routes/alerts');
const adminRoutes    = require('./routes/admin');
const finchRoutes    = require('./routes/finch');
const { startAlertWorker } = require('./services/alertWorker');

const app = express();

// Trust reverse proxies (Cloudflare Tunnel, nginx, etc.)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
}));

// CORS — allow configured frontend URL + localhost fallbacks
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// Rate limiting — 100 requests per 15 minutes per IP
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Passport JWT
app.use(passport.initialize());
require('./config/passport')(passport);

// Connect to MongoDB, then start server
connectDB().then(async () => {
  await seedAdmin();

  // Routes
  app.use('/api/auth',   authRoutes);
  app.use('/api/plaid',  plaidRoutes);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/admin',  adminRoutes);
  app.use('/api/finch',  finchRoutes);

  // Health check
  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  );

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    startAlertWorker();
  });
});
