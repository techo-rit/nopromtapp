/**
 * API: Create Razorpay Order
 * POST /api/create-order
 * 
 * Creates a new Razorpay order for payment processing.
 * Requires authenticated user.
 */

import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { createLogger, generateRequestId } from './_lib/logger';
import { PRICING_PLANS, RATE_LIMIT_CONFIG } from './_lib/serverConfig';

// ============== INLINE RATE LIMITING ==============
// NOTE: Rate limiting is inlined here to avoid Vercel serverless bundling issues
// where imports from _lib files can cause module resolution failures at runtime.
// This duplication is intentional - see https://github.com/vercel/next.js/issues/XXXXX
let redisClient: Redis | null = null;
let orderRateLimiter: Ratelimit | null = null;

function getOrderRateLimiter(): Ratelimit | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    console.warn('Redis credentials missing - rate limiting disabled');
    return null;
  }
  
  if (!redisClient) {
    try {
      redisClient = new Redis({ url, token });
    } catch (e) {
      console.error('Failed to init Redis:', e);
      return null;
    }
  }
  
  if (!orderRateLimiter) {
    orderRateLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMIT_CONFIG.ORDER.requests, 
        `${RATE_LIMIT_CONFIG.ORDER.windowSeconds} s`
      ),
      prefix: 'ratelimit:order',
    });
  }
  return orderRateLimiter;
}

async function checkRateLimit(limiter: Ratelimit | null, id: string) {
  // SECURITY: Fail-closed - if rate limiter unavailable, deny requests for payment endpoints
  if (!limiter) {
    console.warn('Rate limiter unavailable - failing closed for security');
    return { success: false, limit: 0, remaining: 0, reset: Date.now() + 60000 };
  }
  try {
    const r = await limiter.limit(id);
    return { success: r.success, limit: r.limit, remaining: r.remaining, reset: r.reset };
  } catch (e) {
    console.error('Rate limit check failed:', e);
    // SECURITY: Fail-closed on error for payment endpoints
    return { success: false, limit: 0, remaining: 0, reset: Date.now() + 60000 };
  }
}
// ==================================================================================

// SECURITY: Verify JWT token and return authenticated user
async function verifyAuth(req: any, supabase: any): Promise<{ user: any } | { error: string; status: number }> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized - missing auth token', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return { error: 'Unauthorized - invalid session', status: 401 };
  }

  return { user };
}

export default async function handler(req: any, res: any) {
  const requestId = generateRequestId();
  const log = createLogger(requestId);

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get environment variables
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Validate environment
    if (!razorpayKeyId || !razorpayKeySecret) {
      log.error('Missing Razorpay credentials');
      return res.status(500).json({ 
        success: false, 
        error: 'Payment service not configured' 
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      log.error('Missing Supabase credentials');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service not configured' 
      });
    }

    // Initialize Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Verify JWT authentication
    const authResult = await verifyAuth(req, supabase);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ success: false, error: authResult.error });
    }
    const authenticatedUser = authResult.user;

    // Parse request body - only planId needed, user info from JWT
    const { planId } = req.body || {};
    const userId = authenticatedUser.id;
    const userEmail = authenticatedUser.email;
    const userName = authenticatedUser.user_metadata?.full_name || authenticatedUser.user_metadata?.name || ''

    // Validate required fields
    if (!planId || !userId || !userEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: planId, userId, userEmail' 
      });
    }

    // Validate plan exists
    const plan = PRICING_PLANS[planId];
    if (!plan) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid plan: ${planId}` 
      });
    }

    // SECURITY: Redis-backed rate limiting (persists across serverless instances)
    const rateLimitResult = await checkRateLimit(getOrderRateLimiter(), userId);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      return res.status(429).json({ 
        success: false, 
        error: `Too many requests. Please try again in ${retryAfter} seconds.` 
      });
    }

    // Dynamic import to handle CommonJS/ESM interop - runs at request time, not module-load time
    let Razorpay: any;
    try {
      const RazorpayModule = await import('razorpay') as any;
      Razorpay = RazorpayModule.default ?? RazorpayModule;
    } catch (importError: any) {
      console.error('Failed to import Razorpay SDK:', importError);
      return res.status(500).json({
        success: false,
        error: 'Payment service temporarily unavailable',
      });
    }

    // Initialize Razorpay with try/catch to handle malformed credentials
    let razorpay: any;
    try {
      razorpay = new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      });
    } catch (initError: any) {
      console.error('Razorpay initialization failed:', initError);
      return res.status(500).json({
        success: false,
        error: 'Payment service configuration error',
      });
    }

    // Defensive null check before using SDK
    if (!razorpay || typeof razorpay.orders?.create !== 'function') {
      console.error('Razorpay SDK not properly initialized');
      return res.status(500).json({
        success: false,
        error: 'Payment service unavailable',
      });
    }

    // Create unique receipt ID
    const receipt = `rcpt_${userId.substring(0, 8)}_${Date.now()}`;

    // Create Razorpay order
    const orderOptions = {
      amount: plan.price, // Amount in paise
      currency: plan.currency,
      receipt: receipt,
      notes: {
        userId: userId,
        planId: planId,
        planName: plan.name,
        credits: plan.credits.toString(),
      },
    };

    let order: any;
    try {
      order = await razorpay.orders.create(orderOptions);
    } catch (razorpayError: any) {
      console.error('Razorpay API error:', razorpayError);
      return res.status(500).json({
        success: false,
        error: razorpayError.error?.description || 'Failed to create payment order',
      });
    }

    if (!order?.id) {
      console.error('Invalid order response from Razorpay:', order);
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment order',
      });
    }

    // Store order in database
    const { error: dbError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        plan_name: plan.name,
        credits_purchased: plan.credits,
        amount: plan.price,
        currency: plan.currency,
        razorpay_order_id: order.id,
        status: 'created',
      });

    if (dbError) {
      console.error('Failed to store order:', dbError);
      // Continue anyway - order was created in Razorpay
    }

    // Log the order creation
    await supabase.from('payment_logs').insert({
      user_id: userId,
      event_type: 'order_created',
      razorpay_order_id: order.id,
      amount: plan.price,
      currency: plan.currency,
      status: 'created',
      metadata: {
        planId,
        planName: plan.name,
        credits: plan.credits,
        receipt,
      },
      ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      user_agent: req.headers['user-agent'],
    });

    // Return order details to frontend
    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayKeyId, // Public key for checkout
      prefill: {
        name: userName || '',
        email: userEmail,
      },
    });

  } catch (error: any) {
    console.error('Create order error:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);
    
    // Handle Razorpay specific errors
    if (error.error?.description) {
      return res.status(400).json({ 
        success: false, 
        error: error.error.description 
      });
    }

    // Always return JSON, never let it crash
    return res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to create order. Please try again.' 
    });
  }
}
