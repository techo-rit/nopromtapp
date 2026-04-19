/**
 * Basic CORS helper for serverless/express routes.
 *
 * Configure allowed origins with CORS_ORIGINS (comma-separated).
 * If unset in production, reject cross-origin requests.
 * In development, allow localhost origins.
 */
export function applyCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const isProduction = process.env.NODE_ENV === 'production';

  let allowOrigin;
  if (allowed.length > 0) {
    // Explicit allowlist configured — only allow listed origins
    allowOrigin = allowed.includes(origin) ? origin : null;
  } else if (!isProduction) {
    // Development: allow localhost origins
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    allowOrigin = isLocalhost ? origin : null;
  } else {
    // Production without CORS_ORIGINS: deny cross-origin
    allowOrigin = null;
  }

  if (allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}
