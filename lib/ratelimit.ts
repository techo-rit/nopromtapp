/**
 * Redis-backed Rate Limiting (Upstash)
 * 
 * Persistent rate limiting that works across serverless cold starts
 * and parallel instances. Required for payment/credit-based apps.
 * 
 * Environment variables (auto-added by Vercel Upstash integration):
 * - KV_REST_API_URL (or UPSTASH_REDIS_REST_URL)
 * - KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_TOKEN)
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Lazy-initialized Redis client (created on first use)
let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    // Support both Vercel integration names and manual setup names
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        'Missing Redis credentials. Set KV_REST_API_URL/KV_REST_API_TOKEN ' +
        '(Vercel integration) or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN (manual)'
      );
    }

    redisClient = new Redis({ url, token });
  }
  return redisClient;
}

// ...existing code...
// Rate limiter instances (lazy-initialized)
let orderRateLimiter: Ratelimit | null = null;
let generateRateLimiter: Ratelimit | null = null;

/**
 * Rate limiter for order creation
 * Sliding window: 10 requests per 60 seconds per user
 */
export function getOrderRateLimiter(): Ratelimit {
  if (!orderRateLimiter) {
    orderRateLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'ratelimit:order',
      analytics: true, // Enable analytics in Upstash console
    });
  }
  return orderRateLimiter;
}

/**
 * Rate limiter for image generation
 * Sliding window: 20 requests per 60 seconds per user
 */
export function getGenerateRateLimiter(): Ratelimit {
  if (!generateRateLimiter) {
    generateRateLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      prefix: 'ratelimit:generate',
      analytics: true,
    });
  }
  return generateRateLimiter;
}

/**
 * Check rate limit and return result
 * @param limiter - The rate limiter to use
 * @param identifier - User ID or IP address
 * @returns Object with success boolean and reset time
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // If Redis is unavailable, fail open (allow request) but log the error
    console.error('Rate limit check failed:', error);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}

/**
 * Get client IP from request headers (works with Vercel proxy)
 */
export function getClientIP(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}
