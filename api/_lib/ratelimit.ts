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
 * If Redis is missing/down, we return success=true (Fail Open)
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // 1. Safety Check: If no limiter (due to missing Env Vars), allow the request
  if (!limiter) {
    return { success: true, limit: 100, remaining: 100, reset: 0 };
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
    // 2. Runtime Check: If Redis crashes during fetch, allow the request
    console.error('Rate limit check failed (failing open):', error);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
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
