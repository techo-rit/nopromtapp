-- ==========================================
-- STIRI — COMPLETE DATABASE SCHEMA
-- Single idempotent migration.
-- Run once on a fresh Supabase project.
-- ==========================================


-- ==========================================
-- EXTENSIONS
-- ==========================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- ==========================================
-- TABLES
-- ==========================================

-- 1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id                     uuid        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email                  text,
  full_name              text,
  phone                  text,
  age_range              text,          -- 'gen_z' | 'millennial' | 'gen_x' | 'boomer'
  colors                 text[]      DEFAULT '{}',
  styles                 text[]      DEFAULT '{}',
  fit                    text,
  body_type              text,
  is_onboarding_complete boolean     NOT NULL DEFAULT false,
  account_type           text        NOT NULL DEFAULT 'free',
  monthly_quota          integer     NOT NULL DEFAULT 3,
  monthly_used           integer     NOT NULL DEFAULT 0,
  extra_credits          integer     NOT NULL DEFAULT 5,
  created_at             timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at             timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 2. user_addresses
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label        text        DEFAULT 'Home',
  address_line text        NOT NULL,
  city         text,
  state        text,
  pincode      text,
  lat          double precision,
  lng          double precision,
  is_default   boolean     DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 3. subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id             text        NOT NULL,
  plan_name           text        NOT NULL,
  creations_purchased integer     NOT NULL DEFAULT 0,
  amount              integer     NOT NULL,       -- in paise
  currency            text        NOT NULL DEFAULT 'INR',
  razorpay_order_id   text        NOT NULL UNIQUE,
  razorpay_payment_id text        UNIQUE,
  razorpay_signature  text,
  status              text        NOT NULL DEFAULT 'created',  -- created | paid | failed | refunded
  created_at          timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at          timestamptz NOT NULL DEFAULT timezone('utc', now()),
  paid_at             timestamptz
);

-- 4. payment_logs
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type          text        NOT NULL,  -- order_created | payment_success | payment_failed | webhook_received
  razorpay_order_id   text,
  razorpay_payment_id text,
  amount              integer,
  currency            text,
  status              text,
  error_code          text,
  error_message       text,
  metadata            jsonb       DEFAULT '{}'::jsonb,
  ip_address          text,
  user_agent          text,
  created_at          timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 5. idempotency_keys
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  key        text        NOT NULL UNIQUE,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  response   jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  expires_at timestamptz NOT NULL DEFAULT (timezone('utc', now()) + interval '24 hours')
);

-- 6. generated_images
CREATE TABLE IF NOT EXISTS public.generated_images (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path  text        NOT NULL,   -- path inside 'generated-images' bucket
  image_url     text        NOT NULL,   -- full public URL
  template_id   text,
  template_name text,
  stack_id      text,
  mode          text        NOT NULL DEFAULT 'remix' CHECK (mode IN ('remix', 'tryon')),
  aspect_ratio  text,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now())
);


-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id          ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id           ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_order_id ON public.subscriptions(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status            ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id            ON public.payment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_razorpay_order_id  ON public.payment_logs(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_event_type         ON public.payment_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at         ON public.payment_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key            ON public.idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at     ON public.idempotency_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_generated_images_user_created   ON public.generated_images(user_id, created_at DESC);


-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images  ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- user_addresses
DROP POLICY IF EXISTS "Users can view own addresses"   ON public.user_addresses;
CREATE POLICY "Users can view own addresses"
  ON public.user_addresses FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own addresses" ON public.user_addresses;
CREATE POLICY "Users can insert own addresses"
  ON public.user_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON public.user_addresses;
CREATE POLICY "Users can update own addresses"
  ON public.user_addresses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON public.user_addresses;
CREATE POLICY "Users can delete own addresses"
  ON public.user_addresses FOR DELETE USING (auth.uid() = user_id);

-- subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions"      ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions"    ON public.subscriptions;
CREATE POLICY "Users can insert own subscriptions"
  ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can update subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can update subscriptions"
  ON public.subscriptions FOR UPDATE USING (true) WITH CHECK (true);

-- payment_logs
DROP POLICY IF EXISTS "Users can view own payment logs" ON public.payment_logs;
CREATE POLICY "Users can view own payment logs"
  ON public.payment_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow insert for service role" ON public.payment_logs;
CREATE POLICY "Allow insert for service role"
  ON public.payment_logs FOR INSERT WITH CHECK (true);

-- idempotency_keys
DROP POLICY IF EXISTS "Users can view own idempotency keys"   ON public.idempotency_keys;
CREATE POLICY "Users can view own idempotency keys"
  ON public.idempotency_keys FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own idempotency keys" ON public.idempotency_keys;
CREATE POLICY "Users can insert own idempotency keys"
  ON public.idempotency_keys FOR INSERT WITH CHECK (auth.uid() = user_id);

-- generated_images
DROP POLICY IF EXISTS "Users view own generated images"       ON public.generated_images;
CREATE POLICY "Users view own generated images"
  ON public.generated_images FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role inserts generated images" ON public.generated_images;
CREATE POLICY "Service role inserts generated images"
  ON public.generated_images FOR INSERT TO service_role WITH CHECK (true);


-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Compute how many onboarding steps are complete (0–5)
CREATE OR REPLACE FUNCTION public.compute_onboarding_steps(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_profile     public.profiles%ROWTYPE;
  v_has_address boolean := false;
  v_steps       integer := 0;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF v_profile.id IS NULL THEN RETURN 0; END IF;

  IF v_profile.full_name IS NOT NULL AND v_profile.full_name != ''
     AND v_profile.phone IS NOT NULL AND v_profile.phone != '' THEN
    v_steps := v_steps + 1;
  END IF;

  IF array_length(v_profile.colors, 1) > 0 THEN v_steps := v_steps + 1; END IF;
  IF array_length(v_profile.styles, 1) > 0 THEN v_steps := v_steps + 1; END IF;

  IF v_profile.fit IS NOT NULL AND v_profile.body_type IS NOT NULL THEN
    v_steps := v_steps + 1;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_addresses
    WHERE user_id = p_user_id
      AND address_line IS NOT NULL AND address_line != ''
  ) INTO v_has_address;

  IF v_has_address THEN v_steps := v_steps + 1; END IF;

  RETURN v_steps;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update is_onboarding_complete before each profile UPDATE
CREATE OR REPLACE FUNCTION public.update_onboarding_status()
RETURNS TRIGGER AS $$
DECLARE v_steps integer;
BEGIN
  v_steps := public.compute_onboarding_steps(NEW.id);
  NEW.is_onboarding_complete := (v_steps = 5);
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email     = EXCLUDED.email,
      full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
      updated_at = timezone('utc', now());
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generic updated_at stamper (used by subscriptions trigger)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Deduct creations: consume monthly quota first, then extra_credits
CREATE OR REPLACE FUNCTION public.deduct_creations(
  p_user_id uuid,
  p_amount  integer DEFAULT 1
) RETURNS json LANGUAGE plpgsql AS $$
DECLARE
  v_monthly_quota     integer;
  v_monthly_used      integer;
  v_extra             integer;
  v_monthly_remaining integer;
BEGIN
  SELECT monthly_quota, monthly_used, extra_credits
  INTO v_monthly_quota, v_monthly_used, v_extra
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF v_monthly_quota IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_monthly_remaining := GREATEST(v_monthly_quota - v_monthly_used, 0);

  IF v_monthly_remaining >= p_amount THEN
    UPDATE public.profiles SET monthly_used = monthly_used + p_amount WHERE id = p_user_id;
  ELSIF v_monthly_remaining + v_extra >= p_amount THEN
    UPDATE public.profiles
    SET monthly_used  = monthly_used + v_monthly_remaining,
        extra_credits = GREATEST(extra_credits - (p_amount - v_monthly_remaining), 0)
    WHERE id = p_user_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Insufficient creations');
  END IF;

  SELECT monthly_quota, monthly_used, extra_credits
  INTO v_monthly_quota, v_monthly_used, v_extra
  FROM public.profiles WHERE id = p_user_id;

  RETURN json_build_object(
    'success',          true,
    'monthly_remaining', GREATEST(v_monthly_quota - v_monthly_used, 0),
    'extra_remaining',   v_extra
  );
END;
$$;

-- Grant creations and elevate account type (called after successful payment)
CREATE OR REPLACE FUNCTION public.add_user_entitlements(
  p_user_id      uuid,
  p_amount       integer,
  p_account_type text
) RETURNS json LANGUAGE plpgsql AS $$
DECLARE v_extra integer;
BEGIN
  UPDATE public.profiles
  SET extra_credits = GREATEST(extra_credits, 0) + p_amount,
      account_type  = p_account_type
  WHERE id = p_user_id;

  SELECT extra_credits INTO v_extra FROM public.profiles WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'extra_remaining', v_extra);
END;
$$;

-- Monthly reset: restore free monthly quota and clear used count
CREATE OR REPLACE FUNCTION public.reset_monthly_creations()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.profiles SET monthly_quota = 3, monthly_used = 0;
END;
$$;

-- Cleanup expired idempotency keys (call via cron or manually)
CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM public.idempotency_keys WHERE expires_at < timezone('utc', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Confirm payment, update subscription status, and grant entitlements
CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_razorpay_order_id   text,
  p_razorpay_payment_id text,
  p_razorpay_signature  text
) RETURNS json AS $$
DECLARE
  v_subscription public.subscriptions%ROWTYPE;
  v_account_type text;
BEGIN
  SELECT * INTO v_subscription
  FROM public.subscriptions WHERE razorpay_order_id = p_razorpay_order_id;

  IF v_subscription.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Subscription not found');
  END IF;

  IF v_subscription.status = 'paid' THEN
    RETURN json_build_object('success', true, 'message', 'Already processed', 'subscription_id', v_subscription.id);
  END IF;

  UPDATE public.subscriptions
  SET status              = 'paid',
      razorpay_payment_id = p_razorpay_payment_id,
      razorpay_signature  = p_razorpay_signature,
      paid_at             = timezone('utc', now()),
      updated_at          = timezone('utc', now())
  WHERE id = v_subscription.id;

  v_account_type := CASE
    WHEN v_subscription.plan_id = 'ultimate' THEN 'ultimate'
    ELSE 'essentials'
  END;

  PERFORM public.add_user_entitlements(
    v_subscription.user_id,
    COALESCE(v_subscription.creations_purchased, 0),
    v_account_type
  );

  RETURN json_build_object(
    'success',         true,
    'subscription_id', v_subscription.id,
    'creations_added', v_subscription.creations_purchased
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- TRIGGERS
-- ==========================================

DROP TRIGGER IF EXISTS trg_update_onboarding ON public.profiles;
CREATE TRIGGER trg_update_onboarding
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_onboarding_status();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ==========================================
-- STORAGE
-- ==========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images',
  'generated-images',
  true,
  10485760,  -- 10 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'generated_images_public_read'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY generated_images_public_read
        ON storage.objects FOR SELECT TO public
        USING (bucket_id = 'generated-images')
    $pol$;
  END IF;
END $$;


-- ==========================================
-- CRON
-- ==========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly_creation_reset') THEN
    PERFORM cron.schedule(
      'monthly_creation_reset',
      '0 0 1 * *',
      'SELECT public.reset_monthly_creations();'
    );
  END IF;
END $$;


-- ==========================================
-- DONE
-- ==========================================
