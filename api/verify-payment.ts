/**
 * API: Verify Razorpay Payment
 * POST /api/verify-payment
 * 
 * Verifies payment signature and updates subscription status.
 * Called from frontend after successful Razorpay checkout.
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createLogger, generateRequestId } from './_lib/logger.js';
import { PAYMENT_CONFIG } from './_lib/serverConfig.js';

// Helper to verify Razorpay signature
function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}

// Helper for retrying credit addition with backoff
async function addCreditsWithRetry(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  credits: number,
  log: ReturnType<typeof createLogger>
): Promise<{ success: boolean; error?: Error }> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= PAYMENT_CONFIG.RETRY_ATTEMPTS; attempt++) {
    const { error } = await supabase.rpc('add_user_credits', {
      p_user_id: userId,
      p_credits: credits,
    });
    
    if (!error) {
      return { success: true };
    }
    
    lastError = new Error(error.message);
    
    if (attempt < PAYMENT_CONFIG.RETRY_ATTEMPTS) {
      log.warn(`Credit addition attempt ${attempt} failed, retrying...`, { error: error.message });
      await new Promise(resolve => setTimeout(resolve, PAYMENT_CONFIG.RETRY_DELAY_MS));
    }
  }
  
  return { success: false, error: lastError || new Error('Unknown error') };
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
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Validate environment
    if (!razorpayKeySecret) {
      log.error('Missing Razorpay secret');
      return res.status(500).json({ 
        success: false, 
        error: 'Payment verification not configured' 
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      log.error('Missing Supabase credentials');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service not configured' 
      });
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Verify JWT authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized - missing auth token' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized - invalid session' 
      });
    }

    // User ID comes from authenticated JWT, not request body
    const userId = user.id;
    const userLog = createLogger(requestId, userId);

    // Parse request body
    const { 
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature
    } = req.body || {};

    // Validate required fields
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Verify the payment signature
    const isValidSignature = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      razorpayKeySecret
    );

    if (!isValidSignature) {
      userLog.error('Invalid payment signature', { razorpayOrderId, razorpayPaymentId });
      
      // Log the failed verification
      await supabase.from('payment_logs').insert({
        user_id: userId,
        event_type: 'signature_verification_failed',
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        status: 'failed',
        error_message: 'Signature verification failed',
        ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        user_agent: req.headers['user-agent'],
      });

      return res.status(400).json({ 
        success: false, 
        error: 'Payment verification failed. Please contact support.' 
      });
    }

    userLog.info('Payment signature verified', { razorpayOrderId, razorpayPaymentId });

    // Get the subscription record
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('razorpay_order_id', razorpayOrderId)
      .single();

    if (fetchError || !subscription) {
      userLog.error('Subscription not found', { razorpayOrderId, error: fetchError?.message });
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    // Check if already processed (idempotency)
    if (subscription.status === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        subscriptionId: subscription.id,
        creditsAdded: subscription.credits_purchased,
      });
    }

    // Verify the user matches
    if (subscription.user_id !== userId) {
      userLog.error('User mismatch', { subscriptionUserId: subscription.user_id, requestUserId: userId });
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // SECURITY: Atomic update with status check to prevent double-credit race condition
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'paid',
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)
      .neq('status', 'paid')
      .select()
      .maybeSingle();

    if (updateError) {
      userLog.error('Failed to update subscription', { error: updateError.message });
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update payment status' 
      });
    }

    // If no row was updated, it means status was already 'paid' (race condition prevented)
    if (!updatedSubscription) {
      userLog.info('Payment already processed (race condition prevented)', { subscriptionId: subscription.id });
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        subscriptionId: subscription.id,
        creditsAdded: subscription.credits_purchased,
      });
    }

    // Add credits to user profile with retry logic
    const creditResult = await addCreditsWithRetry(
      supabase,
      userId,
      subscription.credits_purchased,
      userLog
    );

    if (!creditResult.success) {
      // CRITICAL: Payment succeeded but credits failed - requires manual intervention
      userLog.error('[CRITICAL ALERT] Failed to add credits after payment verification!', {
        subscriptionId: subscription.id,
        razorpayPaymentId,
        creditsToAdd: subscription.credits_purchased,
        error: creditResult.error?.message,
      });
      
      // Log to payment_logs for tracking/reconciliation
      await supabase.from('payment_logs').insert({
        user_id: userId,
        event_type: 'credit_addition_failed',
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        amount: subscription.amount,
        currency: subscription.currency,
        status: 'error',
        error_message: `Credit addition failed: ${creditResult.error?.message}`,
        metadata: {
          subscriptionId: subscription.id,
          creditsToAdd: subscription.credits_purchased,
          requiresManualFix: true,
        },
        ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        user_agent: req.headers['user-agent'],
      });
    }

    // Log successful payment
    await supabase.from('payment_logs').insert({
      user_id: userId,
      event_type: 'payment_verified',
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      amount: subscription.amount,
      currency: subscription.currency,
      status: 'success',
      metadata: {
        planId: subscription.plan_id,
        planName: subscription.plan_name,
        creditsAdded: subscription.credits_purchased,
      },
      ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      user_agent: req.headers['user-agent'],
    });

    userLog.info('Payment verified successfully', { 
      subscriptionId: subscription.id, 
      creditsAdded: subscription.credits_purchased 
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      subscriptionId: subscription.id,
      creditsAdded: subscription.credits_purchased,
    });

  } catch (error: any) {
    log.error('Verify payment error', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: 'Payment verification failed. Please contact support.' 
    });
  }
}
