/**
 * API: Razorpay Webhook Handler
 * POST /api/webhook
 * 
 * Handles webhook events from Razorpay.
 * Verifies webhook signature and updates database accordingly.
 * 
 * Configure in Razorpay Dashboard:
 * URL: https://nopromt.ai/api/webhook
 * Events: payment.captured, payment.failed, order.paid
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// NOTE: In-memory cache removed - using database idempotency_keys table instead
// This is critical for serverless environments where each request may hit a different instance

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get environment variables
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Validate environment
    if (!webhookSecret) {
      console.error('Missing webhook secret');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Initialize Supabase client with service role EARLY (before any DB operations)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the signature from headers
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      console.error('Missing webhook signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Get raw body for signature verification
    // Note: Vercel auto-parses JSON, so we need to stringify back
    const rawBody = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Parse the event
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventId = event.event;
    const payload = event.payload;

    // Create unique idempotency key from event data
    const eventKey = `webhook_${eventId}_${payload?.payment?.entity?.id || payload?.order?.entity?.id || Date.now()}`;

    // SECURITY: Database-based idempotency check (works across serverless instances)
    const { data: existingKey, error: keyCheckError } = await supabase
      .from('idempotency_keys')
      .select('id')
      .eq('key', eventKey)
      .maybeSingle();

    if (existingKey) {
      console.log('Duplicate webhook event, skipping:', eventKey);
      return res.status(200).json({ status: 'ok', message: 'Already processed' });
    }

    // Insert idempotency key BEFORE processing (prevents race conditions)
    const { error: keyInsertError } = await supabase
      .from('idempotency_keys')
      .insert({ 
        key: eventKey, 
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });

    if (keyInsertError) {
      // If insert fails due to unique constraint, another instance already processed this
      if (keyInsertError.code === '23505') { // Postgres unique violation
        console.log('Concurrent webhook processing detected, skipping:', eventKey);
        return res.status(200).json({ status: 'ok', message: 'Already processed' });
      }
      console.error('Idempotency key insert error:', keyInsertError);
    }

    // Log the webhook event
    await supabase.from('payment_logs').insert({
      event_type: `webhook_${eventId}`,
      razorpay_order_id: payload?.order?.entity?.id || payload?.payment?.entity?.order_id,
      razorpay_payment_id: payload?.payment?.entity?.id,
      amount: payload?.payment?.entity?.amount,
      currency: payload?.payment?.entity?.currency,
      status: payload?.payment?.entity?.status,
      metadata: {
        event: eventId,
        payload: payload,
      },
    });

    // Handle different event types
    switch (eventId) {
      case 'payment.captured':
        await handlePaymentCaptured(supabase, payload);
        break;

      case 'payment.failed':
        await handlePaymentFailed(supabase, payload);
        break;

      case 'order.paid':
        await handleOrderPaid(supabase, payload);
        break;

      default:
        console.log('Unhandled event type:', eventId);
    }

    return res.status(200).json({ status: 'ok' });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Handle payment.captured event
 * Payment was successfully captured
 */
async function handlePaymentCaptured(supabase: any, payload: any) {
  const payment = payload.payment?.entity;
  if (!payment) return;

  const orderId = payment.order_id;
  const paymentId = payment.id;

  console.log('Payment captured:', { orderId, paymentId });

  // Get the subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('razorpay_order_id', orderId)
    .single();

  if (!subscription) {
    console.error('Subscription not found for order:', orderId);
    return;
  }

  // SECURITY: Atomic update with status check to prevent double-credit race condition
  // Only update if status is NOT already 'paid'
  const { data: updatedSubscription, error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'paid',
      razorpay_payment_id: paymentId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id)
    .neq('status', 'paid')  // CRITICAL: Only update if not already paid
    .select()
    .maybeSingle();

  // If no row was updated, payment was already processed
  if (!updatedSubscription) {
    console.log('Subscription already paid (race condition prevented):', subscription.id);
    return;
  }

  // Add credits to user (only if atomic update succeeded)
  await supabase.rpc('add_user_credits', {
    p_user_id: subscription.user_id,
    p_credits: subscription.credits_purchased,
  });

  console.log('Credits added:', {
    userId: subscription.user_id,
    credits: subscription.credits_purchased,
  });
}

/**
 * Handle payment.failed event
 * Payment failed for some reason
 */
async function handlePaymentFailed(supabase: any, payload: any) {
  const payment = payload.payment?.entity;
  if (!payment) return;

  const orderId = payment.order_id;
  const paymentId = payment.id;
  const errorCode = payment.error_code;
  const errorDescription = payment.error_description;

  console.log('Payment failed:', { orderId, paymentId, errorCode, errorDescription });

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'failed',
      razorpay_payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('razorpay_order_id', orderId);

  // Log the failure
  await supabase.from('payment_logs').insert({
    event_type: 'payment_failed',
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    status: 'failed',
    error_code: errorCode,
    error_message: errorDescription,
  });
}

/**
 * Handle order.paid event
 * Order was fully paid
 */
async function handleOrderPaid(supabase: any, payload: any) {
  const order = payload.order?.entity;
  if (!order) return;

  const orderId = order.id;
  const paymentId = payload.payment?.entity?.id;

  console.log('Order paid:', { orderId, paymentId });

  // Get the subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('razorpay_order_id', orderId)
    .single();

  if (!subscription) {
    console.error('Subscription not found for order:', orderId);
    return;
  }

  // SECURITY: Atomic update with status check to prevent double-credit race condition
  const { data: updatedSubscription, error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'paid',
      razorpay_payment_id: paymentId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id)
    .neq('status', 'paid')  // CRITICAL: Only update if not already paid
    .select()
    .maybeSingle();

  // If no row was updated, payment was already processed
  if (!updatedSubscription) {
    console.log('Subscription already paid via order.paid (race condition prevented):', subscription.id);
    return;
  }

  // Add credits to user (only if atomic update succeeded)
  await supabase.rpc('add_user_credits', {
    p_user_id: subscription.user_id,
    p_credits: subscription.credits_purchased,
  });

  console.log('Credits added via order.paid:', {
    userId: subscription.user_id,
    credits: subscription.credits_purchased,
  });
}
