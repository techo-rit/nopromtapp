/**
 * API: Create Razorpay Order
 * POST /api/create-order
 * 
 * Creates a new Razorpay order for payment processing.
 * Requires authenticated user.
 */

import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

// Pricing plans (must match constants.ts)
const PLANS: Record<string, { name: string; price: number; credits: number; currency: string }> = {
  essentials: {
    name: 'Essentials',
    price: 12900, // ₹129 in paise
    credits: 20,
    currency: 'INR',
  },
  ultimate: {
    name: 'Ultimate',
    price: 74900, // ₹749 in paise
    credits: 135,
    currency: 'INR',
  },
};

// Rate limiting: Simple in-memory store (use Redis in production for multi-instance)
const rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // Max 10 orders per minute per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(userId);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

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
      console.error('Missing Razorpay credentials');
      return res.status(500).json({ 
        success: false, 
        error: 'Payment service not configured' 
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
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
    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid plan: ${planId}` 
      });
    }

    // Rate limiting check
    if (!checkRateLimit(userId)) {
      return res.status(429).json({ 
        success: false, 
        error: 'Too many requests. Please try again in a minute.' 
      });
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

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

    const order = await razorpay.orders.create(orderOptions);

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
    
    // Handle Razorpay specific errors
    if (error.error?.description) {
      return res.status(400).json({ 
        success: false, 
        error: error.error.description 
      });
    }

    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create order. Please try again.' 
    });
  }
}
