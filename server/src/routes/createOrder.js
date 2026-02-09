import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { createLogger, generateRequestId } from '../lib/logger.js';
import { PRICING_PLANS, RATE_LIMIT_CONFIG } from '../lib/serverConfig.js';
import { createAdminClient, getUserFromRequest } from '../lib/auth.js';

let redisClient = null;
let orderRateLimiter = null;

function getOrderRateLimiter() {
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

async function checkRateLimit(limiter, id) {
  if (!limiter) {
    console.warn('Rate limiter unavailable - failing closed for security');
    return { success: false, limit: 0, remaining: 0, reset: Date.now() + 60000 };
  }
  try {
    const r = await limiter.limit(id);
    return { success: r.success, limit: r.limit, remaining: r.remaining, reset: r.reset };
  } catch (e) {
    console.error('Rate limit check failed:', e);
    return { success: false, limit: 0, remaining: 0, reset: Date.now() + 60000 };
  }
}


export async function createOrderHandler(req, res) {
  const requestId = generateRequestId();
  const log = createLogger(requestId);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeyId || !razorpayKeySecret) {
      log.error('Missing Razorpay credentials');
      return res.status(500).json({ success: false, error: 'Payment service not configured' });
    }
    const supabase = createAdminClient();
    if (!supabase) {
      log.error('Missing Supabase credentials');
      return res.status(500).json({ success: false, error: 'Database service not configured' });
    }

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ success: false, error: authResult.error });
    }
    const authenticatedUser = authResult.user;

    const { planId } = req.body || {};
    const userId = authenticatedUser.id;
    const userEmail = authenticatedUser.email;
    const userName = authenticatedUser.user_metadata?.full_name || authenticatedUser.user_metadata?.name || '';

    if (!planId || !userId || !userEmail) {
      return res.status(400).json({ success: false, error: 'Missing required fields: planId, userId, userEmail' });
    }

    const plan = PRICING_PLANS[planId];
    if (!plan) {
      return res.status(400).json({ success: false, error: `Invalid plan: ${planId}` });
    }

    const rateLimitResult = await checkRateLimit(getOrderRateLimiter(), userId);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      return res.status(429).json({ success: false, error: `Too many requests. Please try again in ${retryAfter} seconds.` });
    }

    let Razorpay;
    try {
      const RazorpayModule = await import('razorpay');
      Razorpay = RazorpayModule.default ?? RazorpayModule;
    } catch (importError) {
      console.error('Failed to import Razorpay SDK:', importError);
      return res.status(500).json({ success: false, error: 'Payment service temporarily unavailable' });
    }

    let razorpay;
    try {
      razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
    } catch (initError) {
      console.error('Razorpay initialization failed:', initError);
      return res.status(500).json({ success: false, error: 'Payment service configuration error' });
    }

    if (!razorpay || typeof razorpay.orders?.create !== 'function') {
      console.error('Razorpay SDK not properly initialized');
      return res.status(500).json({ success: false, error: 'Payment service unavailable' });
    }

    const receipt = `rcpt_${userId.substring(0, 8)}_${Date.now()}`;

    const orderOptions = {
      amount: plan.price,
      currency: plan.currency,
      receipt,
      notes: {
        userId,
        planId,
        planName: plan.name,
        credits: plan.credits.toString(),
      },
    };

    let order;
    try {
      order = await razorpay.orders.create(orderOptions);
    } catch (razorpayError) {
      console.error('Razorpay API error:', razorpayError);
      return res.status(500).json({
        success: false,
        error: razorpayError.error?.description || 'Failed to create payment order',
      });
    }

    if (!order?.id) {
      console.error('Invalid order response from Razorpay:', order);
      return res.status(500).json({ success: false, error: 'Failed to create payment order' });
    }

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
    }

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

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayKeyId,
      prefill: {
        name: userName || '',
        email: userEmail,
      },
    });
  } catch (error) {
    console.error('Create order error:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);

    if (error.error?.description) {
      return res.status(400).json({ success: false, error: error.error.description });
    }

    return res.status(500).json({ success: false, error: error?.message || 'Failed to create order. Please try again.' });
  }
}
