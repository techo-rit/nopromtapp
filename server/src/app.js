import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, createWriteStream } from 'fs';
import { applyCors } from './lib/cors.js';
import { generateHandler } from './routes/generate.js';
import { createOrderHandler } from './routes/createOrder.js';
import { verifyPaymentHandler } from './routes/verifyPayment.js';
import { userSubscriptionHandler } from './routes/userSubscription.js';
import { webhookHandler } from './routes/webhook.js';
import { healthHandler } from './routes/health.js';
import { signUpHandler, loginHandler, logoutHandler, meHandler, googleStartHandler, googleCallbackHandler } from './routes/auth.js';

export function createApp() {
  const app = express();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Log file setup
  const logsDir = path.resolve(__dirname, '..', 'logs');
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }
  const logStream = createWriteStream(path.join(logsDir, 'server.log'), { flags: 'a' });

  // Request logging (method, path, status, duration)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const msg = `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`;
      logStream.write(`${new Date().toISOString()} ${msg}\n`);
      if (res.statusCode >= 500) {
        console.error(msg);
      } else if (res.statusCode >= 400) {
        console.warn(msg);
      } else {
        console.log(msg);
      }
    });
    next();
  });

  app.use((req, res, next) => {
    if (applyCors(req, res)) return;
    next();
  });

  app.use(express.json({
    limit: '15mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString();
    },
  }));

  // API routes
  app.post('/auth/signup', signUpHandler);
  app.post('/auth/login', loginHandler);
  app.post('/auth/logout', logoutHandler);
  app.get('/auth/me', meHandler);
  app.get('/auth/google/start', googleStartHandler);
  app.get('/auth/google/callback', googleCallbackHandler);
  app.post('/api/generate', generateHandler);
  app.post('/api/create-order', createOrderHandler);
  app.post('/api/verify-payment', verifyPaymentHandler);
  app.get('/api/user-subscription', userSubscriptionHandler);
  app.post('/api/webhook', webhookHandler);
  app.get('/api/health', healthHandler);

  // Serve built web app from server/public
  const publicDir = path.resolve(__dirname, '..', 'public');

  app.use(express.static(publicDir));

  // SPA fallback
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // Error logging
  app.use((err, _req, res, _next) => {
    const msg = `Unhandled error: ${err?.message || err}`;
    logStream.write(`${new Date().toISOString()} ${msg}\n`);
    console.error('Unhandled error:', err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}
