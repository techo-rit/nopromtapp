import crypto from 'crypto';
import { createLogger, generateRequestId } from '../lib/logger.js';
import { PAYMENT_CONFIG } from '../lib/serverConfig.js';
import { createAdminClient, getUserFromRequest } from '../lib/auth.js';

function verifyRazorpaySignature(orderId, paymentId, signature, secret) {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return expectedSignature === signature;
}

async function addEntitlementsWithRetry(supabase, userId, creations, accountType, log) {
  let lastError = null;

  for (let attempt = 1; attempt <= PAYMENT_CONFIG.RETRY_ATTEMPTS; attempt++) {
    const { error } = await supabase.rpc('add_user_entitlements', {
      p_user_id: userId,
      p_amount: creations,
      p_account_type: accountType,
    });

    if (!error) {
      return { success: true };
    }

    lastError = new Error(error.message);

    if (attempt < PAYMENT_CONFIG.RETRY_ATTEMPTS) {
      log.warn(`Entitlement addition attempt ${attempt} failed, retrying...`, { error: error.message });
      await new Promise((resolve) => setTimeout(resolve, PAYMENT_CONFIG.RETRY_DELAY_MS));
    }
  }

  return { success: false, error: lastError || new Error('Unknown error') };
}

export async function verifyPaymentHandler(req, res) {
  const requestId = generateRequestId();
  const log = createLogger(requestId);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) {
      log.error('Missing Razorpay secret');
      return res.status(500).json({ success: false, error: 'Payment verification not configured' });
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
    const user = authResult.user;

    const userId = user.id;
    const userLog = createLogger(requestId, userId);

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const isValidSignature = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      razorpayKeySecret
    );

    if (!isValidSignature) {
      userLog.error('Invalid payment signature', { razorpayOrderId, razorpayPaymentId });

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

      return res.status(400).json({ success: false, error: 'Payment verification failed. Please contact support.' });
    }

    userLog.info('Payment signature verified', { razorpayOrderId, razorpayPaymentId });

    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('razorpay_order_id', razorpayOrderId)
      .single();

    if (fetchError || !subscription) {
      userLog.error('Subscription not found', { razorpayOrderId, error: fetchError?.message });
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (subscription.status === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        subscriptionId: subscription.id,
        creationsAdded: subscription.creations_purchased,
      });
    }

    if (subscription.user_id !== userId) {
      userLog.error('User mismatch', { subscriptionUserId: subscription.user_id, requestUserId: userId });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

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
      return res.status(500).json({ success: false, error: 'Failed to update payment status' });
    }

    if (!updatedSubscription) {
      userLog.info('Payment already processed (race condition prevented)', { subscriptionId: subscription.id });
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        subscriptionId: subscription.id,
        creationsAdded: subscription.creations_purchased,
      });
    }

    const creditResult = await addEntitlementsWithRetry(
      supabase,
      userId,
      subscription.creations_purchased,
      subscription.plan_id,
      userLog
    );

    if (!creditResult.success) {
      userLog.error('[CRITICAL ALERT] Failed to add creations after payment verification!', {
        subscriptionId: subscription.id,
        razorpayPaymentId,
        creationsToAdd: subscription.creations_purchased,
        error: creditResult.error?.message,
      });

      await supabase.from('payment_logs').insert({
        user_id: userId,
        event_type: 'entitlement_addition_failed',
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        amount: subscription.amount,
        currency: subscription.currency,
        status: 'error',
        error_message: `Entitlement addition failed: ${creditResult.error?.message}`,
        metadata: {
          subscriptionId: subscription.id,
          creationsToAdd: subscription.creations_purchased,
          requiresManualFix: true,
        },
        ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        user_agent: req.headers['user-agent'],
      });
    }

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
        creationsAdded: subscription.creations_purchased,
      },
      ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      user_agent: req.headers['user-agent'],
    });

    userLog.info('Payment verified successfully', {
      subscriptionId: subscription.id,
      creationsAdded: subscription.creations_purchased,
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      subscriptionId: subscription.id,
      creationsAdded: subscription.creations_purchased,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    return res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
}
