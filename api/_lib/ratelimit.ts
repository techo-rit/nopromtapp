/**
 * Redis-backed Rate Limiting (Upstash) - "Fail Open" Version
 * * If Redis is not configured (missing env vars), this will now
 * explicitly ALLOW the request instead of crashing the app.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Lazy-initialized Redis client
let redisClient: Redis | null = null;
let isRedisConfigured = false;

function getRedis(): Redis | null {
  if (!redisClient && !isRedisConfigured) {
    // Check for Vercel integration or manual keys
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      // FIX: Log warning instead of crashing
      console.warn('⚠️ Redis credentials missing. Rate limiting is disabled (Allowed Mode).');
      return null;
    }

    try {
      redisClient = new Redis({ url, token });
      isRedisConfigured = true;
    } catch (e) {
      console.error('Failed to initialize Redis client:', e);
      return null;
    }
  }
  return redisClient;
}

// Rate limiter instances
let orderRateLimiter: Ratelimit | null = null;

export function getOrderRateLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  if (!orderRateLimiter) {
    orderRateLimiter = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'ratelimit:order',
      analytics: true,
    });
  }
  return orderRateLimiter;
}

export function getGenerateRateLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  return new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(20, '60 s'),
    prefix: 'ratelimit:generate',
    analytics: true,
  });
}

/**
 * Check rate limit safely
 * SECURITY: Fail-closed - if Redis is unavailable, deny the request to prevent abuse
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number; failedClosed?: boolean }> {
  // 1. Safety Check: If no limiter (due to missing Env Vars), DENY the request
  if (!limiter) {
    console.error('[SECURITY ALERT] Rate limiter unavailable - Redis not configured. Denying request for safety.');
    return { success: false, limit: 0, remaining: 0, reset: 0, failedClosed: true };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // 2. Runtime Check: If Redis crashes during fetch, DENY the request
    console.error('[SECURITY ALERT] Rate limit check failed - Redis error. Denying request for safety:', error);
    return { success: false, limit: 0, remaining: 0, reset: 0, failedClosed: true };
  }
}

export function getClientIP(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}
