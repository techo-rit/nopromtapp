import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, createWriteStream, readFileSync } from 'fs';
import { applyCors } from './lib/cors.js';
import { generateHandler } from './routes/generate.js';
import { createOrderHandler } from './routes/createOrder.js';
import { verifyPaymentHandler } from './routes/verifyPayment.js';
import { userSubscriptionHandler } from './routes/userSubscription.js';
import { webhookHandler } from './routes/webhook.js';
import { healthHandler } from './routes/health.js';
import { logoutHandler, meHandler, switchAccountHandler } from './routes/auth.js';
import { getProfileHandler, updateProfileHandler, getAddressesHandler, addAddressHandler, updateAddressHandler, setDefaultAddressHandler, deleteAddressHandler, getGenerationsHandler, deleteGenerationHandler, deleteAllGenerationsHandler } from './routes/profile.js';
import { sendOtpHandler, verifyOtpHandler, whatsappWebhookVerify, whatsappWebhookHandler } from './routes/whatsappOtp.js';
import { geocodeHandler, placesAutocompleteHandler, placeDetailsHandler } from './routes/geocode.js';
import { getProductsHandler, getProductByHandleHandler, getProductsByHandlesHandler, cartHandler, getCartHandler, addCartLinesHandler, updateCartLinesHandler, removeCartLinesHandler, cachePurgeHandler } from './routes/shopify.js';
import { listTemplates, listTrendingTemplates, getTemplate, templatesStream, startTemplateRealtime } from './routes/templates.js';
import { getWishlistHandler, addWishlistHandler, removeWishlistHandler } from './routes/wishlist.js';

export function createApp() {
  const app = express();
  const bodyLimitMb = Number(process.env.BODY_LIMIT_MB || 35);
  const bodyLimit = `${Number.isFinite(bodyLimitMb) && bodyLimitMb > 0 ? bodyLimitMb : 35}mb`;

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
    limit: bodyLimit,
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString();
    },
  }));

  // API routes
  app.post('/auth/logout', logoutHandler);
  app.get('/auth/me', meHandler);
  app.post('/auth/switch', switchAccountHandler);
  app.post('/auth/otp/send', sendOtpHandler);
  app.post('/auth/otp/verify', verifyOtpHandler);
  app.get('/auth/webhook/whatsapp', whatsappWebhookVerify);
  app.post('/auth/webhook/whatsapp', whatsappWebhookHandler);
  app.post('/api/generate', generateHandler);
  app.post('/api/create-order', createOrderHandler);
  app.post('/api/verify-payment', verifyPaymentHandler);
  app.get('/api/user-subscription', userSubscriptionHandler);
  app.post('/api/webhook', webhookHandler);
  app.get('/api/health', healthHandler);
  app.get('/api/geocode', geocodeHandler);
  app.get('/api/places/autocomplete', placesAutocompleteHandler);
  app.get('/api/places/details', placeDetailsHandler);
  app.get('/api/profile', getProfileHandler);
  app.put('/api/profile', updateProfileHandler);
  app.get('/api/profile/addresses', getAddressesHandler);
  app.post('/api/profile/addresses', addAddressHandler);
  app.put('/api/profile/addresses/:id', updateAddressHandler);
  app.put('/api/profile/addresses/:id/default', setDefaultAddressHandler);
  app.delete('/api/profile/addresses/:id', deleteAddressHandler);
  app.get('/api/profile/generations', getGenerationsHandler);
  app.delete('/api/profile/generations/:id', deleteGenerationHandler);
  app.delete('/api/profile/generations', deleteAllGenerationsHandler);

  // Shopify routes
  app.get('/api/shopify/products', getProductsHandler);
  app.get('/api/shopify/product/:handle', getProductByHandleHandler);
  app.post('/api/shopify/products/batch', getProductsByHandlesHandler);
  app.post('/api/shopify/cart', cartHandler);
  app.get('/api/shopify/cart/:id', getCartHandler);
  app.post('/api/shopify/cart/lines', addCartLinesHandler);
  app.put('/api/shopify/cart/lines', updateCartLinesHandler);
  app.delete('/api/shopify/cart/lines', removeCartLinesHandler);
  app.post('/api/admin/cache/purge', cachePurgeHandler);

  // Templates routes
  app.get('/api/templates/stream', templatesStream);
  app.get('/api/templates', listTemplates);
  app.get('/api/templates/trending', listTrendingTemplates);
  app.get('/api/templates/:id', getTemplate);

  // Wishlist routes
  app.get('/api/wishlist', getWishlistHandler);
  app.post('/api/wishlist', addWishlistHandler);
  app.delete('/api/wishlist/:templateId', removeWishlistHandler);

  // Start Supabase Realtime listener for templates
  startTemplateRealtime();

  // Serve built web app from server/public
  const publicDir = path.resolve(__dirname, '..', 'public');
  const indexHtmlPath = path.join(publicDir, 'index.html');
  const indexHtmlTemplate = existsSync(indexHtmlPath)
    ? readFileSync(indexHtmlPath, 'utf8')
    : null;
  const profileRevalidationThrottleMs = Number(process.env.PROFILE_REVALIDATION_THROTTLE_MS || 15000);
  const safeProfileRevalidationThrottleMs =
    Number.isFinite(profileRevalidationThrottleMs) && profileRevalidationThrottleMs > 0
      ? Math.floor(profileRevalidationThrottleMs)
      : 15000;

  function renderIndexHtml() {
    if (!indexHtmlTemplate) return null;
    const runtimeScript = `<script>window.__PROFILE_REVALIDATION_THROTTLE_MS__ = ${safeProfileRevalidationThrottleMs};</script>`;
    return indexHtmlTemplate.replace('</body>', `    ${runtimeScript}\n  </body>`);
  }

  app.use(express.static(publicDir, { index: false }));

  // SPA fallback
  app.get('*', (_req, res) => {
    const rendered = renderIndexHtml();
    if (rendered) {
      res.type('html').send(rendered);
      return;
    }
    res.sendFile(indexHtmlPath);
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
