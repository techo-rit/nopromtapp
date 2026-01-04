/**
 * API: Verify Razorpay Payment
 * POST /api/verify-payment
 * 
 * Verifies payment signature and updates subscription status.
 * Called from frontend after successful Razorpay checkout.
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
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
      console.error('Missing Razorpay secret');
      return res.status(500).json({ 
        success: false, 
        error: 'Payment verification not configured' 
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service not configured' 
      });
    }

    // Parse request body
    const { 
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature,
      userId 
    } = req.body || {};

    // Validate required fields
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the payment signature
    // Razorpay signature = HMAC SHA256(order_id + "|" + payment_id, secret)
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(body)
      .digest('hex');

    const isValidSignature = expectedSignature === razorpaySignature;

    if (!isValidSignature) {
      console.error('Invalid payment signature');
      
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

    // Get the subscription record
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('razorpay_order_id', razorpayOrderId)
      .single();

    if (fetchError || !subscription) {
      console.error('Subscription not found:', fetchError);
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
      console.error('User mismatch:', { subscriptionUserId: subscription.user_id, requestUserId: userId });
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Update subscription status
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'paid',
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Failed to update subscription:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update payment status' 
      });
    }

    // Add credits to user profile
    const { error: creditsError } = await supabase.rpc('add_user_credits', {
      p_user_id: userId,
      p_credits: subscription.credits_purchased,
    });

    if (creditsError) {
      console.error('Failed to add credits:', creditsError);
      // Log but don't fail - subscription is updated
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

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      subscriptionId: subscription.id,
      creditsAdded: subscription.credits_purchased,
    });

  } catch (error: any) {
    console.error('Verify payment error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Payment verification failed. Please contact support.' 
    });
  }
}
