import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { parseCookies, setCookie, clearCookie } from './cookies.js';

const ACCESS_COOKIE = 'sb_access_token';
const REFRESH_COOKIE = 'sb_refresh_token';
const PKCE_COOKIE = 'sb_code_verifier';

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
    .select('full_name, credits')
    .eq('id', userId)
    .single();

  return {
    name: profile?.full_name || null,
    credits: profile?.credits || 0,
  };
}

export async function ensureUserProfile(adminClient, supabaseUser) {
  if (!adminClient || !supabaseUser?.id) return;

  const { data: existing } = await adminClient
    .from('profiles')
    .select('id')
    .eq('id', supabaseUser.id)
    .maybeSingle();

  if (existing) return;

  await adminClient
    .from('profiles')
    .insert({
      id: supabaseUser.id,
      email: supabaseUser.email || null,
      full_name: supabaseUser.user_metadata?.full_name || null,
      credits: 3,
    });
}

export function mapUser(supabaseUser, profile) {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: profile?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
    credits: profile?.credits || 0,
    createdAt: new Date(supabaseUser.created_at),
    lastLogin: new Date(),
  };
}

function base64Url(input) {
  return input.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
