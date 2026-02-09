import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export async function webhookHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!webhookSecret) {
      console.error('Missing webhook secret');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Database not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      console.error('Missing webhook signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    const rawBody = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventId = event.event;
    const payload = event.payload;

    const eventKey = `webhook_${eventId}_${payload?.payment?.entity?.id || payload?.order?.entity?.id || Date.now()}`;

    const { data: existingKey, error: keyCheckError } = await supabase
      .from('idempotency_keys')
      .select('id')
      .eq('key', eventKey)
      .maybeSingle();

    if (existingKey) {
      console.log('Duplicate webhook event, skipping:', eventKey);
      return res.status(200).json({ status: 'ok', message: 'Already processed' });
    }

    const { error: keyInsertError } = await supabase
      .from('idempotency_keys')
      .insert({
        key: eventKey,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (keyInsertError) {
      if (keyInsertError.code === '23505') {
        console.log('Concurrent webhook processing detected, skipping:', eventKey);
        return res.status(200).json({ status: 'ok', message: 'Already processed' });
      }
      console.error('Idempotency key insert error:', keyInsertError);
    }

    await supabase.from('payment_logs').insert({
      event_type: `webhook_${eventId}`,
      razorpay_order_id: payload?.order?.entity?.id || payload?.payment?.entity?.order_id,
      razorpay_payment_id: payload?.payment?.entity?.id,
      amount: payload?.payment?.entity?.amount,
      currency: payload?.payment?.entity?.currency,
      status: payload?.payment?.entity?.status,
      metadata: {
        event: eventId,
        payload,
      },
    });

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
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handlePaymentCaptured(supabase, payload) {
  const payment = payload.payment?.entity;
  if (!payment) return;

  const orderId = payment.order_id;
  const paymentId = payment.id;

  console.log('Payment captured:', { orderId, paymentId });

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('razorpay_order_id', orderId)
    .single();

  if (!subscription) {
    console.error('Subscription not found for order:', orderId);
    return;
  }

  const { data: updatedSubscription } = await supabase
    .from('subscriptions')
    .update({
      status: 'paid',
      razorpay_payment_id: paymentId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id)
    .neq('status', 'paid')
    .select()
    .maybeSingle();

  if (!updatedSubscription) {
    console.log('Subscription already paid (race condition prevented):', subscription.id);
    return;
  }

  await supabase.rpc('add_user_credits', {
    p_user_id: subscription.user_id,
    p_credits: subscription.credits_purchased,
  });

  console.log('Credits added:', {
    userId: subscription.user_id,
    credits: subscription.credits_purchased,
  });
}

async function handlePaymentFailed(supabase, payload) {
  const payment = payload.payment?.entity;
  if (!payment) return;

  const orderId = payment.order_id;
  const paymentId = payment.id;
  const errorCode = payment.error_code;
  const errorDescription = payment.error_description;

  console.log('Payment failed:', { orderId, paymentId, errorCode, errorDescription });

  await supabase
    .from('subscriptions')
    .update({
      status: 'failed',
      razorpay_payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('razorpay_order_id', orderId);

  await supabase.from('payment_logs').insert({
    event_type: 'payment_failed',
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    status: 'failed',
    error_code: errorCode,
    error_message: errorDescription,
  });
}

async function handleOrderPaid(supabase, payload) {
  const order = payload.order?.entity;
  if (!order) return;

  const orderId = order.id;
  const paymentId = payload.payment?.entity?.id;

  console.log('Order paid:', { orderId, paymentId });

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('razorpay_order_id', orderId)
    .single();

  if (!subscription) {
    console.error('Subscription not found for order:', orderId);
    return;
  }

  const { data: updatedSubscription } = await supabase
    .from('subscriptions')
    .update({
      status: 'paid',
      razorpay_payment_id: paymentId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id)
    .neq('status', 'paid')
    .select()
    .maybeSingle();

  if (!updatedSubscription) {
    console.log('Subscription already paid via order.paid (race condition prevented):', subscription.id);
    return;
  }

  await supabase.rpc('add_user_credits', {
    p_user_id: subscription.user_id,
    p_credits: subscription.credits_purchased,
  });

  console.log('Credits added via order.paid:', {
    userId: subscription.user_id,
    credits: subscription.credits_purchased,
  });
}
