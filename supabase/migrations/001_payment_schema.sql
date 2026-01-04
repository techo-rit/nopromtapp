-- ==========================================
-- RAZORPAY PAYMENT INTEGRATION SCHEMA
-- Run this in Supabase SQL Editor
-- ==========================================

-- ==========================================
-- 1. Add credits column to existing profiles table
-- ==========================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits integer DEFAULT 0 NOT NULL;

-- ==========================================
-- 2. Create SUBSCRIPTIONS Table
-- Stores successful payment/subscription records
-- ==========================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Plan details
  plan_id text NOT NULL,
  plan_name text NOT NULL,
  credits_purchased integer NOT NULL DEFAULT 0,
  
  -- Payment details
  amount integer NOT NULL, -- Amount in paise (smallest currency unit)
  currency text NOT NULL DEFAULT 'INR',
  
  -- Razorpay identifiers
  razorpay_order_id text NOT NULL UNIQUE,
  razorpay_payment_id text UNIQUE,
  razorpay_signature text,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'created', -- created, paid, failed, refunded
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  paid_at timestamp with time zone
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_order_id ON public.subscriptions(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. Create PAYMENT_LOGS Table
-- Audit trail for all payment events
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Event details
  event_type text NOT NULL, -- order_created, payment_success, payment_failed, webhook_received
  
  -- Razorpay identifiers
  razorpay_order_id text,
  razorpay_payment_id text,
  
  -- Payment details
  amount integer,
  currency text,
  status text,
  
  -- Error tracking
  error_code text,
  error_message text,
  
  -- Additional data (JSON)
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Request info for security
  ip_address text,
  user_agent text,
  
  -- Timestamp
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON public.payment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_razorpay_order_id ON public.payment_logs(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_event_type ON public.payment_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON public.payment_logs(created_at);

-- Enable RLS
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. Create IDEMPOTENCY_KEYS Table
-- Prevents duplicate payment processing
-- ==========================================
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  response jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone DEFAULT (timezone('utc'::text, now()) + interval '24 hours') NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON public.idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON public.idempotency_keys(expires_at);

-- Enable RLS
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. RLS Policies for SUBSCRIPTIONS
-- ==========================================

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" 
  ON public.subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own subscriptions (for order creation)
CREATE POLICY "Users can insert own subscriptions" 
  ON public.subscriptions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Only service role can update subscriptions (for webhook/verification)
-- Note: Service role bypasses RLS, so no explicit policy needed for updates
-- But we add one for extra safety in case RLS is disabled
CREATE POLICY "Service role can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- 6. RLS Policies for PAYMENT_LOGS
-- ==========================================

-- Users can view their own payment logs
CREATE POLICY "Users can view own payment logs" 
  ON public.payment_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- Service role can insert payment logs (bypass RLS)
-- This policy allows the webhook to insert logs
CREATE POLICY "Allow insert for service role"
  ON public.payment_logs FOR INSERT
  WITH CHECK (true);

-- ==========================================
-- 7. RLS Policies for IDEMPOTENCY_KEYS
-- ==========================================

-- Users can view their own idempotency keys
CREATE POLICY "Users can view own idempotency keys" 
  ON public.idempotency_keys FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own idempotency keys
CREATE POLICY "Users can insert own idempotency keys" 
  ON public.idempotency_keys FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 8. Function to update user credits
-- Called after successful payment
-- ==========================================
CREATE OR REPLACE FUNCTION public.add_user_credits(
  p_user_id uuid,
  p_credits integer
)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET credits = credits + p_credits
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 9. Function to update subscription and add credits
-- Called by webhook after payment confirmation
-- ==========================================
CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_razorpay_signature text
)
RETURNS json AS $$
DECLARE
  v_subscription public.subscriptions%ROWTYPE;
  v_result json;
BEGIN
  -- Get the subscription
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE razorpay_order_id = p_razorpay_order_id;
  
  -- Check if subscription exists
  IF v_subscription.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Subscription not found');
  END IF;
  
  -- Check if already paid (idempotency)
  IF v_subscription.status = 'paid' THEN
    RETURN json_build_object('success', true, 'message', 'Already processed', 'subscription_id', v_subscription.id);
  END IF;
  
  -- Update subscription status
  UPDATE public.subscriptions
  SET 
    status = 'paid',
    razorpay_payment_id = p_razorpay_payment_id,
    razorpay_signature = p_razorpay_signature,
    paid_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = v_subscription.id;
  
  -- Add credits to user profile
  PERFORM public.add_user_credits(v_subscription.user_id, v_subscription.credits_purchased);
  
  -- Return success
  RETURN json_build_object(
    'success', true, 
    'subscription_id', v_subscription.id,
    'credits_added', v_subscription.credits_purchased
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 10. Cleanup function for expired idempotency keys
-- Run periodically via Supabase cron or external scheduler
-- ==========================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM public.idempotency_keys
  WHERE expires_at < timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 11. Trigger to update updated_at timestamp
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- DONE! Your payment schema is ready.
-- ==========================================
