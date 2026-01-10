/**
 * API: Health Check Endpoint
 * GET /api/health
 * 
 * Returns service health status including Redis and Supabase connectivity.
 * Used for monitoring and alerting.
 */

import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    redis: { status: 'up' | 'down' | 'not_configured'; latencyMs?: number };
    supabase: { status: 'up' | 'down' | 'not_configured'; latencyMs?: number };
  };
  version?: string;
}

const startTime = Date.now();

async function checkRedis(): Promise<{ status: 'up' | 'down' | 'not_configured'; latencyMs?: number }> {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return { status: 'not_configured' };
  }

  try {
    const redis = new Redis({ url, token });
    const start = Date.now();
    await redis.ping();
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (error) {
    console.error('Redis health check failed:', error);
    return { status: 'down' };
  }
}

async function checkSupabase(): Promise<{ status: 'up' | 'down' | 'not_configured'; latencyMs?: number }> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { status: 'not_configured' };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const start = Date.now();
    // Simple query to verify connectivity
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) throw error;
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (error) {
    console.error('Supabase health check failed:', error);
    return { status: 'down' };
  }
}

export default async function handler(req: any, res: any) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [redisStatus, supabaseStatus] = await Promise.all([
      checkRedis(),
      checkSupabase(),
    ]);

    const services = {
      redis: redisStatus,
      supabase: supabaseStatus,
    };

    // Determine overall health
    const criticalDown = supabaseStatus.status === 'down';
    const anyDown = redisStatus.status === 'down' || supabaseStatus.status === 'down';
    const anyNotConfigured = redisStatus.status === 'not_configured' || supabaseStatus.status === 'not_configured';

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (criticalDown) {
      overallStatus = 'unhealthy';
    } else if (anyDown || anyNotConfigured) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const health: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      services,
      version: process.env.npm_package_version || '1.0.0',
    };

    // Return 200 for healthy/degraded, 503 for unhealthy
    const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;
    
    return res.status(httpStatus).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
}
