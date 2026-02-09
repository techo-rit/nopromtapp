export function parseCookies(req) {
  const header = req.headers.cookie || '';
  const pairs = header.split(';').map((p) => p.trim()).filter(Boolean);
  const out = {};
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

export function setCookie(res, name, value, options = {}) {
  const opts = {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    ...options,
  };

  let cookie = `${name}=${encodeURIComponent(value)}`;
  if (opts.maxAge !== undefined) cookie += `; Max-Age=${opts.maxAge}`;
  if (opts.expires instanceof Date) cookie += `; Expires=${opts.expires.toUTCString()}`;
  if (opts.path) cookie += `; Path=${opts.path}`;
  if (opts.httpOnly) cookie += '; HttpOnly';
  if (opts.sameSite) cookie += `; SameSite=${opts.sameSite}`;
  if (opts.secure) cookie += '; Secure';

  if (typeof res.append === 'function') {
    res.append('Set-Cookie', cookie);
  } else {
    const prev = res.getHeader('Set-Cookie');
    if (!prev) {
      res.setHeader('Set-Cookie', cookie);
    } else if (Array.isArray(prev)) {
      res.setHeader('Set-Cookie', [...prev, cookie]);
    } else {
      res.setHeader('Set-Cookie', [prev, cookie]);
    }
  }
}

export function clearCookie(res, name) {
  setCookie(res, name, '', { maxAge: 0 });
}
