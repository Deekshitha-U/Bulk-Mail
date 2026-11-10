import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js';
import dashboardRoutes from './routes/dashboard.js';
import draftRoutes from './routes/drafts.js';
import contactRoutes from './routes/contacts.js';

const PRIVATE_HOST =
  /^(localhost|127(\.\d{1,3}){3}|\[::1\]|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})$/;

const warned = new Set();

function isAllowedOrigin(origin) {
  if (!origin) return true;

  const clean = origin.replace(/\/$/, '');

  const configured = String(process.env.CLIENT_URL || '')
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (configured.includes(clean)) return true;

  if (process.env.NODE_ENV !== 'production') {
    try {
      return PRIVATE_HOST.test(new URL(clean).hostname);
    } catch {
      return false;
    }
  }

  return false;
}

export function createApp() {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    })
  );

  const corsOptions = {
    origin(origin, callback) {
      const allowed = isAllowedOrigin(origin);

      if (!allowed && !warned.has(origin)) {
        warned.add(origin);
        console.warn(`[CORS] Blocked origin: ${origin}`);
      }

      callback(null, allowed);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],
    credentials: true,
    optionsSuccessStatus: 204,
    maxAge: 600,
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  app.use(express.json({ limit: '2mb' }));

  // Root health endpoint
  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      message: 'PulsePost API is running',
    });
  });

  // API health endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'PulsePost API',
    });
  });

  app.use(
    '/api/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        message: 'Too many sign-in attempts. Try again in a few minutes.',
      },
    })
  );

  app.use(
    '/api/auth/register',
    rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        message: 'Too many sign-up attempts. Try again later.',
      },
    })
  );

  app.use(
    '/api/auth/resend',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        message: 'Too many requests. Try again in a few minutes.',
      },
    })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/drafts', draftRoutes);
  app.use('/api/contacts', contactRoutes);

  app.use('/api', (req, res) => {
    res.status(404).json({
      message: 'API route not found.',
      path: req.originalUrl,
      method: req.method,
    });
  });

  app.use((err, req, res, next) => {
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({
        message: 'That request is too large.',
      });
    }

    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({
        message: 'Malformed JSON body.',
      });
    }

    console.error(err);

    res.status(500).json({
      message: 'Unexpected server error.',
    });
  });

  return app;
}