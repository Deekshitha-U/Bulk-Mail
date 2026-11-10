import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js';
import dashboardRoutes from './routes/dashboard.js';
import draftRoutes from './routes/drafts.js';
import contactRoutes from './routes/contacts.js';

/* ------------------------------------------------------------------ *
 * CORS
 *  - CLIENT_URL may hold one or many origins, comma separated.
 *  - Outside production, any localhost / 127.0.0.1 / ::1 / private-LAN
 *    origin on ANY port is accepted, so Vite moving to :5174, opening the
 *    app through 127.0.0.1, or testing from your phone on the Wi-Fi never
 *    triggers a CORS error.
 *  - Requests with no Origin header (curl, Postman, server-to-server)
 *    are always allowed.
 * ------------------------------------------------------------------ */
const PRIVATE_HOST =
  /^(localhost|127(\.\d{1,3}){3}|\[::1\]|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})$/;
const warned = new Set();

export function isAllowedOrigin(origin, env = process.env) {
  if (!origin) return true;
  const clean = origin.replace(/\/$/, '');
  const configured = String(env.CLIENT_URL || '')
    .split(',')
    .map(s => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (configured.includes(clean)) return true;
  if (env.NODE_ENV !== 'production') {
    try {
      if (PRIVATE_HOST.test(new URL(clean).hostname)) return true;
    } catch { /* malformed origin -> fall through to false */ }
  }
  return false;
}

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const corsOptions = {
    origin(origin, callback) {
      const ok = isAllowedOrigin(origin);
      if (!ok && !warned.has(origin)) {
        warned.add(origin);
        console.warn(`[CORS] Blocked origin "${origin}". Add it to CLIENT_URL in server/.env (comma separated for several).`);
      }
      callback(null, ok); // never throw: a blocked origin just gets no CORS headers
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: 600,
    optionsSuccessStatus: 204,
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions)); // answer every preflight before auth/rate-limit run

  app.use(express.json({ limit: '2mb' }));
  app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many sign-in attempts. Try again in a few minutes.' } }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'PulsePost API' }));
  app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many sign-up attempts. Try again later.' } }));
  app.use('/api/auth/resend', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests. Try again in a few minutes.' } }));
  app.use('/api/auth', authRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/drafts', draftRoutes);
  app.use('/api/contacts', contactRoutes);

  app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found.' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ message: 'That request is too large.' });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON body.' });
    console.error(err);
    res.status(500).json({ message: 'Unexpected server error.' });
  });
  return app;
}
