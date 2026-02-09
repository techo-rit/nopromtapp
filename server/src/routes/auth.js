import { createAnonClient, createAdminClient, setSessionCookies, clearSessionCookies, getUserFromRequest, fetchUserProfile, mapUser, generatePkcePair, setPkceCookie, getPkceVerifier } from '../lib/auth.js';
import { clearCookie } from '../lib/cookies.js';

function getBackendUrl(req) {
  return process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
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

  const admin = createAdminClient();
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

  const admin = createAdminClient();
  const profile = admin ? await fetchUserProfile(admin, data.user.id) : { name: null, credits: 0 };
  return res.status(200).json({ success: true, user: mapUser(data.user, profile) });
}

export async function logoutHandler(_req, res) {
  clearSessionCookies(res);
  return res.status(200).json({ success: true });
}

export async function meHandler(req, res) {
  const result = await getUserFromRequest(req, res);
  if ('error' in result) {
    return res.status(result.status).json({ success: false, error: result.error });
  }

  const admin = createAdminClient();
  const profile = admin ? await fetchUserProfile(admin, result.user.id) : { name: null, credits: 0 };
  return res.status(200).json({ success: true, user: mapUser(result.user, profile) });
}

export async function googleStartHandler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ success: false, error: 'Server misconfigured: missing Supabase keys' });
  }

  const { verifier, challenge } = generatePkcePair();
  setPkceCookie(res, verifier);

  const redirectTo = `${getBackendUrl(req)}/auth/google/callback`;
  const url = new URL(`${supabaseUrl}/auth/v1/authorize`);
  url.searchParams.set('provider', 'google');
  url.searchParams.set('redirect_to', redirectTo);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 's256');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');

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

    clearCookie(res, 'sb_code_verifier');

    return res.redirect(frontendUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.status(500).send('OAuth failed');
  }
}
