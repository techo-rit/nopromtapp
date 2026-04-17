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
import { getProfileHandler, updateProfileHandler, uploadProfilePhotoHandler, deleteProfilePhotoHandler, getAddressesHandler, addAddressHandler, updateAddressHandler, setDefaultAddressHandler, deleteAddressHandler, getGenerationsHandler, deleteGenerationHandler, deleteAllGenerationsHandler, getSelfiesHandler, saveSelfieHandler, deleteSelfieHandler, activateSelfieHandler } from './routes/profile.js';
import { sendOtpHandler, verifyOtpHandler, whatsappWebhookVerify, whatsappWebhookHandler } from './routes/whatsappOtp.js';
import { geocodeHandler, placesAutocompleteHandler, placeDetailsHandler } from './routes/geocode.js';
import { getProductsHandler, getProductByHandleHandler, getProductsByHandlesHandler, cartHandler, getCartHandler, addCartLinesHandler, updateCartLinesHandler, removeCartLinesHandler, cachePurgeHandler } from './routes/shopify.js';
import { listTemplates, listTrendingTemplates, getTemplate, templatesStream, startTemplateRealtime } from './routes/templates.js';
import { getWishlistHandler, addWishlistHandler, removeWishlistHandler } from './routes/wishlist.js';
import { carouselTryOnHandler } from './routes/carouselTryon.js';
import { createShareLinkHandler, shareLinkRedirectHandler } from './routes/shareLinks.js';
import { trackEventsHandler } from './routes/events.js';
import { feedHandler } from './routes/feed.js';
import { createBoostHandler, listBoostsHandler, deleteBoostHandler } from './routes/adminBoost.js';
import { getWeightsHandler, tuneWeightsHandler } from './routes/adminWeights.js';
import { getMetricsHandler } from './routes/adminMetrics.js';
import { fullSyncHandler, singleSyncHandler, cronHandler } from './routes/productSync.js';
import { uploadGarmentHandler, deleteGarmentHandler, listGarmentsHandler, syncWardrobeHandler, listOutfitsHandler, chatHandler, gapsHandler } from './routes/wardrobe.js';

export function createApp() {
  const app = express();
  const bodyLimitMb = Number(process.env.BODY_LIMIT_MB || 35);
  const bodyLimit = `${Number.isFinite(bodyLimitMb) && bodyLimitMb > 0 ? bodyLimitMb : 35}mb`;

  // Trust the first proxy hop so req.ip reflects the real client IP from X-Forwarded-For
  app.set('trust proxy', 1);

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
  app.post('/api/profile/photo', uploadProfilePhotoHandler);
  app.delete('/api/profile/photo', deleteProfilePhotoHandler);
  app.get('/api/profile/selfies', getSelfiesHandler);
  app.post('/api/profile/selfies', saveSelfieHandler);
  app.delete('/api/profile/selfies/:id', deleteSelfieHandler);
  app.patch('/api/profile/selfies/:id/activate', activateSelfieHandler);
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

  // Carousel try-on route
  app.post('/api/carousel-tryon', carouselTryOnHandler);

  // Share links
  app.post('/api/share-links', createShareLinkHandler);
  app.get('/s/:code', shareLinkRedirectHandler);

  // Personalization: Event tracking
  app.post('/api/events/track', trackEventsHandler);

  // Personalization: Feed
  app.get('/api/feed/for-you', feedHandler);

  // Personalization: Admin boost queue
  app.post('/api/admin/boost', createBoostHandler);
  app.get('/api/admin/boost', listBoostsHandler);
  app.delete('/api/admin/boost/:id', deleteBoostHandler);

  // Personalization: Admin weights
  app.get('/api/admin/weights', getWeightsHandler);
  app.post('/api/admin/weights/tune', tuneWeightsHandler);

  // Personalization: Admin metrics
  app.get('/api/admin/metrics', getMetricsHandler);

  // Personalization: Product sync (Gemini AI tag generation)
  app.post('/api/admin/product-sync', fullSyncHandler);
  app.post('/api/admin/product-sync/:templateId', singleSyncHandler);
  app.post('/api/admin/cron/personalization', cronHandler);

  // Wardrobe
  app.post('/api/wardrobe/garments/upload', uploadGarmentHandler);
  app.delete('/api/wardrobe/garments/:id', deleteGarmentHandler);
  app.get('/api/wardrobe/garments', listGarmentsHandler);
  app.post('/api/wardrobe/sync', syncWardrobeHandler);
  app.get('/api/wardrobe/outfits', listOutfitsHandler);
  app.post('/api/wardrobe/chat', chatHandler);
  app.get('/api/wardrobe/gaps', gapsHandler);

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
