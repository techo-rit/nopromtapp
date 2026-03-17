import { createAdminClient, clearSessionCookies, getUserFromRequest, fetchUserProfile, ensureUserProfile, mapUser, switchSessionToAccount, getSessionPool, setSessionPool, removeSessionForEmail } from '../lib/auth.js';
import { createTtlCache } from '../lib/cache.js';

const CACHE_TTL_MS = Number(process.env.SERVER_CACHE_TTL_MS || 60000);
const meCache = createTtlCache(CACHE_TTL_MS);

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
