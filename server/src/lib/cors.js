/**
 * Basic CORS helper for serverless/express routes.
 *
 * Configure allowed origins with CORS_ORIGINS (comma-separated).
 * If unset, allow all origins.
 */
export function applyCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const allowOrigin = allowed.length === 0
    ? (origin || '*')
    : (allowed.includes(origin) ? origin : allowed[0]);

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}
