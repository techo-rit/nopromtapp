/**
 * Redis-backed Rate Limiting (Upstash) - fail-closed with in-memory fallback
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

let redisClient = null;
let isRedisConfigured = false;

// In-memory fallback rate limiter when Redis is unavailable
const inMemoryWindows = new Map(); // key → { count, windowStart }
const IN_MEMORY_CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanupInMemory() {
  const now = Date.now();
  if (now - lastCleanup < IN_MEMORY_CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of inMemoryWindows) {
    if (now - entry.windowStart > 120_000) inMemoryWindows.delete(key);
  }
}

function inMemoryRateCheck(identifier, maxRequests, windowMs) {
  cleanupInMemory();
  const now = Date.now();
  const key = identifier;
  let entry = inMemoryWindows.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 0, windowStart: now };
    inMemoryWindows.set(key, entry);
  }
  entry.count++;
  return {
    success: entry.count <= maxRequests,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    reset: entry.windowStart + windowMs,
    fallback: true,
  };
}

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

export async function checkRateLimit(limiter, identifier, maxRequests = 20, windowMs = 60_000) {
  if (!limiter) {
    // Redis unavailable — use in-memory fallback instead of failing open
    return inMemoryRateCheck(identifier, maxRequests, windowMs);
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
    console.warn('Rate limit check failed (Redis error). Using in-memory fallback:', error.message);
    return inMemoryRateCheck(identifier, maxRequests, windowMs);
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
