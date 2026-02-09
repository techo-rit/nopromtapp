import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
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
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const publicDir = path.resolve(__dirname, '..', 'public');

  app.use(express.static(publicDir));

  // SPA fallback
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  return app;
}
