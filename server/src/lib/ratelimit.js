/**
 * Redis-backed Rate Limiting (Upstash) - fail-open
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

let redisClient = null;
let isRedisConfigured = false;

function getRedis() {
  if (!redisClient && !isRedisConfigured) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      if (!process.env.SUPPRESS_REDIS_WARNING) {
        console.warn('Redis credentials missing. Rate limiting is disabled (Allowed Mode).');
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

let orderRateLimiter = null;
let generateRateLimiter = null;

export function getOrderRateLimiter() {
  const redis = getRedis();
  if (!redis) return null;

  if (!orderRateLimiter) {
    orderRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'ratelimit:order',
      analytics: true,
    });
  }
  return orderRateLimiter;
}

export function getGenerateRateLimiter() {
  const redis = getRedis();
  if (!redis) return null;

  if (!generateRateLimiter) {
    generateRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      prefix: 'ratelimit:generate',
      analytics: true,
    });
  }
  return generateRateLimiter;
}

export async function checkRateLimit(limiter, identifier) {
  if (!limiter) {
    console.log('Rate limiter not configured - allowing request (fail-open)');
    return { success: true, limit: 100, remaining: 100, reset: 0, failedOpen: true };
  }

  try {
    const result = await limiter.limit(identifier);
    console.log(`Rate limit check for ${identifier}: success=${result.success}, remaining=${result.remaining}/${result.limit}`);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.warn('Rate limit check failed (Redis error). Allowing request:', error);
    return { success: true, limit: 100, remaining: 100, reset: 0, failedOpen: true };
  }
}

export function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}
