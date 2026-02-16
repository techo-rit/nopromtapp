import { createAnonClient, createAdminClient, setSessionCookies, clearSessionCookies, getUserFromRequest, fetchUserProfile, ensureUserProfile, mapUser, generatePkcePair, setPkceCookie, getPkceVerifier, storeSessionForAccount, switchSessionToAccount, getSessionPool, setSessionPool, removeSessionForEmail } from '../lib/auth.js';
import { clearCookie } from '../lib/cookies.js';

function getBackendUrl(req) {
  const envUrl = process.env.BACKEND_URL?.trim();
  if (!envUrl) return `${req.protocol}://${req.get('host')}`;

  // Accept values like "app.nopromt.ai" and normalize to a valid absolute URL.
  const withProtocol = /^https?:\/\//i.test(envUrl) ? envUrl : `https://${envUrl}`;
  try {
    const normalized = new URL(withProtocol);
    return normalized.toString().replace(/\/$/, '');
  } catch {
    return `${req.protocol}://${req.get('host')}`;
  }
}

export async function signUpHandler(req, res) {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
  }

  const anon = createAnonClient();
  if (!anon) {
    return res.status(500).json({ success: false, error: 'Server misconfigured: missing Supabase anon key' });
  }

  const { data, error } = await anon.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (error) return res.status(400).json({ success: false, error: error.message });

  if (data.user && !data.session) {
    return res.status(200).json({ success: true, user: null, message: 'Check your email to confirm your account.' });
  }

  if (!data.user || !data.session) {
    return res.status(400).json({ success: false, error: 'Sign up failed' });
  }

  setSessionCookies(res, data.session);
  storeSessionForAccount(req, res, data.session, data.user.email);

  const admin = createAdminClient();
  if (admin) await ensureUserProfile(admin, data.user);
  const profile = admin ? await fetchUserProfile(admin, data.user.id) : { name: null, credits: 0 };
  return res.status(200).json({ success: true, user: mapUser(data.user, profile) });
}

export async function loginHandler(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  const anon = createAnonClient();
  if (!anon) {
    return res.status(500).json({ success: false, error: 'Server misconfigured: missing Supabase anon key' });
  }

  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    return res.status(400).json({ success: false, error: error?.message || 'Login failed' });
  }

  setSessionCookies(res, data.session);
  storeSessionForAccount(req, res, data.session, data.user.email);

  const admin = createAdminClient();
  if (admin) await ensureUserProfile(admin, data.user);
  const profile = admin ? await fetchUserProfile(admin, data.user.id) : { name: null, credits: 0 };
  return res.status(200).json({ success: true, user: mapUser(data.user, profile) });
}

export async function logoutHandler(req, res) {
  const current = await getUserFromRequest(req, res);
  const currentEmail = !('error' in current) ? (current.user.email || '').toLowerCase() : '';

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
      const profile = admin ? await fetchUserProfile(admin, switched.user.id) : { name: null, credits: 0 };
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

  const admin = createAdminClient();
  if (admin) await ensureUserProfile(admin, result.user);
  const profile = admin ? await fetchUserProfile(admin, result.user.id) : { name: null, credits: 0 };
  return res.status(200).json({ success: true, user: mapUser(result.user, profile) });
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
  const profile = admin ? await fetchUserProfile(admin, switched.user.id) : { name: null, credits: 0 };
  return res.status(200).json({ success: true, user: mapUser(switched.user, profile) });
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

  return res.status(200).json({ success: true, url: url.toString() });
}

export async function googleCallbackHandler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const frontendUrl = process.env.FRONTEND_URL || '/';

  const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
  const verifier = getPkceVerifier(req);

  if (!supabaseUrl || !anonKey) {
    return res.status(500).send('Server misconfigured');
  }

  if (!code || !verifier) {
    return res.status(400).send('Missing OAuth code');
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
