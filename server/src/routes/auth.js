import { createAnonClient, createAdminClient, setSessionCookies, clearSessionCookies, getUserFromRequest, fetchUserProfile, ensureUserProfile, mapUser, generatePkcePair, setPkceCookie, getPkceVerifier, storeSessionForAccount, switchSessionToAccount, getSessionPool, setSessionPool, removeSessionForEmail } from '../lib/auth.js';
import { clearCookie } from '../lib/cookies.js';
import { createTtlCache } from '../lib/cache.js';

const CACHE_TTL_MS = Number(process.env.SERVER_CACHE_TTL_MS || 60000);
const meCache = createTtlCache(CACHE_TTL_MS);

function getBackendUrl(req) {
  const envUrl = process.env.BACKEND_URL?.trim();
  if (!envUrl) return `${req.protocol}://${req.get('host')}`;

  // Accept values like "stiri.in" and normalize to a valid absolute URL.
  const withProtocol = /^https?:\/\//i.test(envUrl) ? envUrl : `https://${envUrl}`;
  try {
    const normalized = new URL(withProtocol);
    return normalized.toString().replace(/\/$/, '');
  } catch {
    return `${req.protocol}://${req.get('host')}`;
  }
}

export async function logoutHandler(req, res) {
  const current = await getUserFromRequest(req, res);
  const currentEmail = !('error' in current) ? (current.user.email || '').toLowerCase() : '';
  if (!('error' in current)) {
    meCache.del(`me:${current.user.id}`);
  }

  let remainingPool = currentEmail
    ? removeSessionForEmail(req, res, currentEmail)
    : getSessionPool(req);

  clearSessionCookies(res);

  if (remainingPool.length === 0) {
    setSessionPool(res, []);
    return res.status(200).json({ success: true, user: null });
  }

  const admin = createAdminClient();
  for (const candidate of remainingPool) {
    const switched = await switchSessionToAccount(req, res, candidate.email, remainingPool);
    if (!('error' in switched)) {
      if (admin) await ensureUserProfile(admin, switched.user);
      const profile = admin ? await fetchUserProfile(admin, switched.user.id) : { name: null, accountType: 'free', monthlyQuota: 3, monthlyUsed: 0, extraCredits: 5, creationsLeft: 8 };
      return res.status(200).json({ success: true, user: mapUser(switched.user, profile) });
    }

    remainingPool = remainingPool.filter((entry) => entry.email !== candidate.email);
    setSessionPool(res, remainingPool);
  }

  return res.status(200).json({ success: true, user: null });
}

export async function meHandler(req, res) {
  const result = await getUserFromRequest(req, res);
  if ('error' in result) {
    return res.status(result.status).json({ success: false, error: result.error });
  }

  const cacheKey = `me:${result.user.id}`;
  const cached = meCache.get(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  const admin = createAdminClient();
  if (admin) await ensureUserProfile(admin, result.user);
  const profile = admin ? await fetchUserProfile(admin, result.user.id) : { name: null, accountType: 'free', monthlyQuota: 3, monthlyUsed: 0, extraCredits: 5, creationsLeft: 8 };
  const payload = { success: true, user: mapUser(result.user, profile) };
  meCache.set(cacheKey, payload);
  return res.status(200).json(payload);
}

export async function switchAccountHandler(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  const switched = await switchSessionToAccount(req, res, email);
  if ('error' in switched) {
    return res.status(switched.status).json({ success: false, error: switched.error });
  }

  const admin = createAdminClient();
  if (admin) await ensureUserProfile(admin, switched.user);
  const profile = admin ? await fetchUserProfile(admin, switched.user.id) : { name: null, accountType: 'free', monthlyQuota: 3, monthlyUsed: 0, extraCredits: 5, creationsLeft: 8 };
  const payload = { success: true, user: mapUser(switched.user, profile) };
  meCache.set(`me:${switched.user.id}`, payload);
  return res.status(200).json(payload);
}

export async function googleStartHandler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ success: false, error: 'Server misconfigured: missing Supabase keys' });
  }

  const { verifier, challenge } = generatePkcePair();
  setPkceCookie(res, verifier);
  const loginHint = typeof req.query.login_hint === 'string' ? req.query.login_hint : null;
  const prompt = typeof req.query.prompt === 'string' ? req.query.prompt : null;

  const redirectTo = `${getBackendUrl(req)}/auth/google/callback`;
  const url = new URL(`${supabaseUrl}/auth/v1/authorize`);
  url.searchParams.set('provider', 'google');
  url.searchParams.set('redirect_to', redirectTo);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 's256');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', prompt || 'consent');
  if (loginHint) {
    url.searchParams.set('login_hint', loginHint);
  }

  if (req.query.redirect === '1') {
    return res.redirect(url.toString());
  }

  return res.status(200).json({ success: true, url: url.toString() });
}

export async function googleCallbackHandler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const frontendUrl = process.env.FRONTEND_URL || '/';

  const oauthError = Array.isArray(req.query.error) ? req.query.error[0] : req.query.error;
  const oauthErrorDescription = Array.isArray(req.query.error_description)
    ? req.query.error_description[0]
    : req.query.error_description;
  const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
  const verifier = getPkceVerifier(req);

  if (!supabaseUrl || !anonKey) {
    return res.status(500).send('Server misconfigured');
  }

  if (oauthError) {
    const redirectTarget = new URL(frontendUrl, `${req.protocol}://${req.get('host')}`);
    redirectTarget.searchParams.set('auth_error', String(oauthError));
    if (oauthErrorDescription) {
      redirectTarget.searchParams.set('auth_error_description', String(oauthErrorDescription));
    }
    clearCookie(res, 'sb_code_verifier');
    return res.redirect(redirectTarget.toString());
  }

  if (!code || !verifier) {
    const redirectTarget = new URL(frontendUrl, `${req.protocol}://${req.get('host')}`);
    redirectTarget.searchParams.set('auth_error', 'missing_oauth_code_or_verifier');
    redirectTarget.searchParams.set('auth_error_description', 'OAuth callback missing code/verifier. Ensure cookies are enabled and retry.');
    return res.redirect(redirectTarget.toString());
  }

  try {
    const tokenResp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    });

    const data = await tokenResp.json();
    if (!tokenResp.ok || !data?.access_token) {
      return res.status(400).send('OAuth exchange failed');
    }

    setSessionCookies(res, {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in || 3600,
    });
    const admin = createAdminClient();
    if (admin) {
      const { data: userData } = await admin.auth.getUser(data.access_token);
      if (userData?.user?.email) {
        storeSessionForAccount(req, res, {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in || 3600,
        }, userData.user.email);
      }
    }

    clearCookie(res, 'sb_code_verifier');

    return res.redirect(frontendUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.status(500).send('OAuth failed');
  }
}
