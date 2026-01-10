// api/_lib/ratelimit.ts
/**
 * Redis-backed Rate Limiting (Upstash) - "Fail Open" Version
 * * FIX: If Redis is not configured (missing env vars), this will now
 * explicitly ALLOW the request instead of crashing or blocking 
 * everything (429).
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
      // Log warning only once per server instance to avoid clutter
      if (!process.env.SUPPRESS_REDIS_WARNING) {
        console.warn('⚠️ Redis credentials missing. Rate limiting is disabled (Allowed Mode).');
      }
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

// Rate limiter instances (cached to avoid creating new instances per request)
let orderRateLimiter: Ratelimit | null = null;
let generateRateLimiter: Ratelimit | null = null;

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

  if (!generateRateLimiter) {
    generateRateLimiter = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      prefix: 'ratelimit:generate',
      analytics: true,
    });
  }
  return generateRateLimiter;
}

/**
 * Check rate limit safely
 * FIX: Fail-OPEN - if Redis is unavailable, ALLOW the request to prevent
 * blocking users during development or misconfiguration.
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number; failedOpen?: boolean }> {
  // 1. Safety Check: If no limiter (due to missing Env Vars), ALLOW the request
  if (!limiter) {
    console.log('🔓 Rate limiter not configured - allowing request (fail-open)');
    return { success: true, limit: 100, remaining: 100, reset: 0, failedOpen: true };
  }

  try {
    const result = await limiter.limit(identifier);
    console.log(`🔍 Rate limit check for ${identifier}: success=${result.success}, remaining=${result.remaining}/${result.limit}`);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // 2. Runtime Check: If Redis crashes during fetch, ALLOW the request
    console.warn('⚠️ Rate limit check failed (Redis error). Allowing request:', error);
    return { success: true, limit: 100, remaining: 100, reset: 0, failedOpen: true };
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