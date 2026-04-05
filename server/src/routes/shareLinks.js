// server/src/routes/shareLinks.js
// POST /api/share-links  — create a trackable share link (auth required)
// GET  /s/:code          — redirect to product, record unique-IP click (public)

import crypto from 'crypto';
import { createAdminClient, getUserFromRequest } from '../lib/auth.js';

function generateCode() {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8);
}

function getClientIp(req) {
  // With `trust proxy 1` set on the Express app, req.ip already resolves
  // the real client IP from X-Forwarded-For when behind a proxy.
  const raw = req.ip || req.socket?.remoteAddress || 'unknown';
  // Strip IPv4-mapped IPv6 prefix (::ffff:1.2.3.4 → 1.2.3.4)
  if (raw.startsWith('::ffff:')) return raw.slice(7);
  // Normalize IPv6 loopback to standard 127.0.0.1
  if (raw === '::1') return '127.0.0.1';
  return raw;
}

/**
 * POST /api/share-links
 * Body: { productHandle?, productName? }
 * Returns: { code, url }
 */
export async function createShareLinkHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    const { productHandle, productName } = req.body || {};

    // Generate a unique code (retry once on collision)
    let code = generateCode();
    let attempts = 0;
    while (attempts < 3) {
      const { data: existing } = await supabase
        .from('share_links')
        .select('id')
        .eq('code', code)
        .maybeSingle();

      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    const { data, error } = await supabase
      .from('share_links')
      .insert({
        code,
        user_id: authResult.user.id,
        product_handle: productHandle || null,
        product_name: productName || null,
      })
      .select('code')
      .single();

    if (error) throw error;

    const baseUrl = process.env.APP_BASE_URL || process.env.VITE_API_BASE_URL || '';
    const url = `${baseUrl}/s/${data.code}`;

    return res.json({ success: true, code: data.code, url });
  } catch (err) {
    console.error('createShareLink error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create share link' });
  }
}

/**
 * GET /s/:code
 * Public. Records a unique-IP click then redirects.
 */
export async function shareLinkRedirectHandler(req, res) {
  const { code } = req.params;

  if (!code || !/^[A-Za-z0-9_-]{6,12}$/.test(code)) {
    return res.redirect(302, '/');
  }

  const supabase = createAdminClient();
  if (!supabase) return res.redirect(302, '/');

  try {
    const { data: link } = await supabase
      .from('share_links')
      .select('id, product_handle')
      .eq('code', code)
      .maybeSingle();

    if (!link) return res.redirect(302, '/');

    // Record click — unique per IP, ignore conflict (duplicate click)
    const ip = getClientIp(req);
    await supabase
      .from('share_link_clicks')
      .upsert(
        { link_id: link.id, ip_address: ip },
        { onConflict: 'link_id,ip_address', ignoreDuplicates: true }
      );

    const destination = link.product_handle
      ? `/product/${link.product_handle}`
      : '/';

    return res.redirect(302, destination);
  } catch (err) {
    console.error('shareLinkRedirect error:', err);
    return res.redirect(302, '/');
  }
}
