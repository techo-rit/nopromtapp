import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { parseCookies, setCookie, clearCookie } from './cookies.js';

const ACCESS_COOKIE = 'sb_access_token';
const REFRESH_COOKIE = 'sb_refresh_token';
const PKCE_COOKIE = 'sb_code_verifier';
const SESSION_POOL_COOKIE = 'sb_session_pool';
const MAX_STORED_SESSIONS = 5;

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}

function getAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
}

function getServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function createAnonClient() {
  const url = getSupabaseUrl();
  const key = getAnonKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createAdminClient() {
  const url = getSupabaseUrl();
  const key = getServiceKey();
  if (!url || !key) return null;
  return createClient(url, key);
}

export function getAccessTokenFromReq(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }
  const cookies = parseCookies(req);
  return cookies[ACCESS_COOKIE] || null;
}

export function getRefreshTokenFromReq(req) {
  const cookies = parseCookies(req);
  return cookies[REFRESH_COOKIE] || null;
}

export function setSessionCookies(res, session) {
  if (!session?.access_token || !session?.refresh_token) return;

  const accessMaxAge = session.expires_in || 3600;
  const refreshMaxAge = 60 * 60 * 24 * 30;

  setCookie(res, ACCESS_COOKIE, session.access_token, { maxAge: accessMaxAge });
  setCookie(res, REFRESH_COOKIE, session.refresh_token, { maxAge: refreshMaxAge });
}

function readSessionPool(req) {
  const cookies = parseCookies(req);
  const raw = cookies[SESSION_POOL_COOKIE];
  if (!raw) return [];
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) =>
      item &&
      typeof item.email === 'string' &&
      typeof item.accessToken === 'string' &&
      typeof item.refreshToken === 'string'
    );
  } catch {
    return [];
  }
}

function writeSessionPool(res, pool) {
  const sanitized = pool.slice(0, MAX_STORED_SESSIONS).map((s) => ({
    email: s.email,
    accessToken: s.accessToken,
    refreshToken: s.refreshToken,
    updatedAt: Date.now(),
  }));
  const encoded = Buffer.from(JSON.stringify(sanitized), 'utf8').toString('base64url');
  setCookie(res, SESSION_POOL_COOKIE, encoded, { maxAge: 60 * 60 * 24 * 30 });
}

export function getSessionPool(req) {
  return readSessionPool(req);
}

export function setSessionPool(res, pool) {
  writeSessionPool(res, pool);
}

export function removeSessionForEmail(req, res, email) {
  const normalized = (email || '').toLowerCase();
  const remaining = readSessionPool(req).filter((entry) => entry.email.toLowerCase() !== normalized);
  writeSessionPool(res, remaining);
  return remaining;
}

export function storeSessionForAccount(req, res, session, email) {
  if (!session?.access_token || !session?.refresh_token || !email) return;
  const existing = readSessionPool(req);
  const next = [
    {
      email,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      updatedAt: Date.now(),
    },
    ...existing.filter((entry) => entry.email !== email),
  ];
  writeSessionPool(res, next);
}

export async function switchSessionToAccount(req, res, email, poolOverride = null) {
  if (!email) {
    return { error: 'Email is required', status: 400 };
  }

  const admin = createAdminClient();
  const anon = createAnonClient();
  if (!admin || !anon) {
    return { error: 'Server misconfigured: missing Supabase keys', status: 500 };
  }

  const pool = Array.isArray(poolOverride) ? poolOverride : readSessionPool(req);
  const found = pool.find((entry) => entry.email === email);
  if (!found) {
    return { error: 'No stored session for this account', status: 404 };
  }

  let accessToken = found.accessToken;
  let refreshToken = found.refreshToken;

  const accessCheck = await admin.auth.getUser(accessToken);
  if (accessCheck.error || !accessCheck.data?.user) {
    const refreshResult = await anon.auth.refreshSession({ refresh_token: refreshToken });
    if (refreshResult.error || !refreshResult.data?.session) {
      return { error: 'Stored session expired. Please log in again.', status: 401 };
    }
    accessToken = refreshResult.data.session.access_token;
    refreshToken = refreshResult.data.session.refresh_token;
    setSessionCookies(res, refreshResult.data.session);
  } else {
    setSessionCookies(res, {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
    });
  }

  writeSessionPool(res, [
    {
      email,
      accessToken,
      refreshToken,
      updatedAt: Date.now(),
    },
    ...pool.filter((entry) => entry.email !== email),
  ]);

  const userResp = await admin.auth.getUser(accessToken);
  if (userResp.error || !userResp.data?.user) {
    return { error: 'Unable to switch account', status: 401 };
  }

  return { user: userResp.data.user, accessToken };
}

export function clearSessionCookies(res) {
  clearCookie(res, ACCESS_COOKIE);
  clearCookie(res, REFRESH_COOKIE);
  clearCookie(res, PKCE_COOKIE);
}

export async function getUserFromRequest(req, res) {
  const admin = createAdminClient();
  if (!admin) {
    return { error: 'Server misconfigured: missing Supabase service key', status: 500 };
  }

  const accessToken = getAccessTokenFromReq(req);
  if (accessToken) {
    const { data: { user }, error } = await admin.auth.getUser(accessToken);
    if (!error && user) return { user, accessToken };
  }

  const refreshToken = getRefreshTokenFromReq(req);
  if (!refreshToken) {
    return { error: 'Unauthorized', status: 401 };
  }

  const anon = createAnonClient();
  if (!anon) {
    return { error: 'Server misconfigured: missing Supabase anon key', status: 500 };
  }

  const { data: refreshData, error: refreshError } = await anon.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (refreshError || !refreshData?.session) {
    return { error: 'Unauthorized', status: 401 };
  }

  setSessionCookies(res, refreshData.session);

  const { data: { user }, error } = await admin.auth.getUser(refreshData.session.access_token);
  if (error || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  return { user, accessToken: refreshData.session.access_token };
}

export async function fetchUserProfile(adminClient, userId) {
  const { data: profile } = await adminClient
    .from('profiles')
    .select('full_name, phone, age_range, colors, styles, fit, body_type, skin_tone, is_onboarding_complete, account_type, monthly_quota, monthly_used, extra_credits')
    .eq('id', userId)
    .single();

  const monthlyQuota = profile?.monthly_quota || 0;
  const monthlyUsed = profile?.monthly_used || 0;
  const extraCredits = profile?.extra_credits || 0;
  const monthlyRemaining = Math.max(monthlyQuota - monthlyUsed, 0);

  return {
    name: profile?.full_name || null,
    phone: normalizeIndiaPhone(profile?.phone),
    ageRange: profile?.age_range || null,
    colors: profile?.colors || [],
    styles: profile?.styles || [],
    fit: profile?.fit || null,
    bodyType: profile?.body_type || null,
    skinTone: profile?.skin_tone || null,
    isOnboardingComplete: profile?.is_onboarding_complete || false,
    accountType: profile?.account_type || 'free',
    monthlyQuota,
    monthlyUsed,
    extraCredits,
    creationsLeft: monthlyRemaining + extraCredits,
  };
}

export async function ensureUserProfile(adminClient, supabaseUser) {
  if (!adminClient || !supabaseUser?.id) return;

  const { data: existing } = await adminClient
    .from('profiles')
    .select('id, full_name, phone')
    .eq('id', supabaseUser.id)
    .maybeSingle();

  const normalizedPhone = normalizeIndiaPhone(supabaseUser.phone);
  const fullName = supabaseUser.user_metadata?.full_name || null;

  if (existing) {
    const update = {};
    const existingPhone = normalizeIndiaPhone(existing.phone);
    if (normalizedPhone && existingPhone !== normalizedPhone) update.phone = normalizedPhone;
    if (!existing.full_name && fullName) update.full_name = fullName;
    if (Object.keys(update).length > 0) {
      await adminClient
        .from('profiles')
        .update(update)
        .eq('id', supabaseUser.id);
    }
    return;
  }

  await adminClient
    .from('profiles')
    .insert({
      id: supabaseUser.id,
      full_name: fullName,
      phone: normalizedPhone,
      account_type: 'free',
      monthly_quota: 3,
      monthly_used: 0,
      extra_credits: 5,
    });
}

export function mapUser(supabaseUser, profile) {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: profile?.name || supabaseUser.user_metadata?.full_name || null,
    phone: normalizeIndiaPhone(profile?.phone) || normalizeIndiaPhone(supabaseUser.phone),
    ageRange: profile?.ageRange || null,
    colors: profile?.colors || [],
    styles: profile?.styles || [],
    fit: profile?.fit || null,
    bodyType: profile?.bodyType || null,
    skinTone: profile?.skinTone || null,
    avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
    isOnboardingComplete: profile?.isOnboardingComplete || false,
    accountType: profile?.accountType || 'free',
    monthlyQuota: profile?.monthlyQuota || 3,
    monthlyUsed: profile?.monthlyUsed || 0,
    extraCredits: profile?.extraCredits || 0,
    creationsLeft: profile?.creationsLeft || 0,
    createdAt: new Date(supabaseUser.created_at),
    lastLogin: new Date(),
  };
}

function base64Url(input) {
  return input.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function normalizeIndiaPhone(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export function generatePkcePair() {
  const verifier = base64Url(crypto.randomBytes(32).toString('base64'));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest('base64'));
  return { verifier, challenge };
}

export function setPkceCookie(res, verifier) {
  setCookie(res, PKCE_COOKIE, verifier, { maxAge: 60 * 10 });
}

export function getPkceVerifier(req) {
  const cookies = parseCookies(req);
  return cookies[PKCE_COOKIE] || null;
}
