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
  full_name              text,
  phone                  text,
  age_range              text,          -- 'gen_z' | 'millennial' | 'gen_x' | 'boomer'
  colors                 text[]      DEFAULT '{}',
  styles                 text[]      DEFAULT '{}',
  fit                    text,
  bust                   numeric,       -- measurement in inches
  waist                  numeric,       -- measurement in inches
  hip                    numeric,       -- measurement in inches
  measurement_unit       text        DEFAULT 'in' CHECK (measurement_unit IN ('in', 'cm') OR measurement_unit IS NULL),
  body_type              text,
  skin_tone              text        CHECK (skin_tone IN ('fair', 'medium', 'dark') OR skin_tone IS NULL),
  is_onboarding_complete boolean     NOT NULL DEFAULT false,
  account_type           text        NOT NULL DEFAULT 'free',
  monthly_quota          integer     NOT NULL DEFAULT 3,
  monthly_used           integer     NOT NULL DEFAULT 0,
  extra_credits          integer     NOT NULL DEFAULT 5,
  shopify_cart_id         text,
  profile_photo_url       text,
  created_at             timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at             timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 2. user_addresses
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label        text        DEFAULT 'Home',
  address_line_1 text,
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
  mode          text        NOT NULL DEFAULT 'remix' CHECK (mode IN ('remix', 'tryon', 'carousel_tryon')),
  aspect_ratio  text,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 7. templates
CREATE TABLE IF NOT EXISTS public.templates (
  id               text        PRIMARY KEY,
  title            text        NOT NULL,
  description      text,
  image            text        NOT NULL,
  prompt           text        NOT NULL,
  aspect_ratio     text        NOT NULL DEFAULT '1:1',
  tags             text[]      DEFAULT '{}',
  trending         boolean     NOT NULL DEFAULT false,
  trending_order   integer,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at       timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 8. share_links
CREATE TABLE IF NOT EXISTS public.share_links (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  code           text        NOT NULL UNIQUE,
  user_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  product_handle text,
  product_name   text,
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 9. share_link_clicks
CREATE TABLE IF NOT EXISTS public.share_link_clicks (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id     uuid        REFERENCES public.share_links(id) ON DELETE CASCADE NOT NULL,
  ip_address  text        NOT NULL,
  clicked_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 10. user_wishlist
CREATE TABLE IF NOT EXISTS public.user_wishlist (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id text        REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(user_id, template_id)
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
CREATE INDEX IF NOT EXISTS idx_generated_images_carousel       ON public.generated_images(user_id, template_id, mode) WHERE mode = 'carousel_tryon';
CREATE INDEX IF NOT EXISTS idx_templates_trending               ON public.templates(trending) WHERE trending = true;
CREATE INDEX IF NOT EXISTS idx_templates_is_active              ON public.templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_wishlist_user_id            ON public.user_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_share_links_code                ON public.share_links(code);
CREATE INDEX IF NOT EXISTS idx_share_links_user                ON public.share_links(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_share_link_clicks_unique_ip ON public.share_link_clicks(link_id, ip_address);
CREATE INDEX IF NOT EXISTS idx_share_link_clicks_link          ON public.share_link_clicks(link_id);


-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wishlist     ENABLE ROW LEVEL SECURITY;ALTER TABLE public.share_links        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_link_clicks  ENABLE ROW LEVEL SECURITY;
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

-- templates
DROP POLICY IF EXISTS "Anyone can read active templates" ON public.templates;
CREATE POLICY "Anyone can read active templates"
  ON public.templates FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role can manage templates" ON public.templates;
CREATE POLICY "Service role can manage templates"
  ON public.templates FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_wishlist
DROP POLICY IF EXISTS "Users can view own wishlist" ON public.user_wishlist;
CREATE POLICY "Users can view own wishlist"
  ON public.user_wishlist FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to own wishlist" ON public.user_wishlist;
CREATE POLICY "Users can add to own wishlist"
  ON public.user_wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from own wishlist" ON public.user_wishlist;
CREATE POLICY "Users can remove from own wishlist"
  ON public.user_wishlist FOR DELETE USING (auth.uid() = user_id);

-- share_links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'share_links' AND policyname = 'share_links_owner_read'
  ) THEN
    CREATE POLICY share_links_owner_read
      ON public.share_links FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- share_link_clicks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'share_link_clicks' AND policyname = 'share_link_clicks_owner_read'
  ) THEN
    CREATE POLICY share_link_clicks_owner_read
      ON public.share_link_clicks FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.share_links sl
          WHERE sl.id = link_id AND sl.user_id = auth.uid()
        )
      );
  END IF;
END $$;


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

  IF v_profile.full_name IS NOT NULL AND v_profile.full_name != '' THEN
    v_steps := v_steps + 1;
  END IF;

  IF array_length(v_profile.colors, 1) > 0 THEN v_steps := v_steps + 1; END IF;
  IF array_length(v_profile.styles, 1) > 0 THEN v_steps := v_steps + 1; END IF;

  IF v_profile.fit IS NOT NULL AND v_profile.body_type IS NOT NULL
     AND v_profile.skin_tone IS NOT NULL AND v_profile.skin_tone != '' THEN
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
    INSERT INTO public.profiles (id, full_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
    )
    ON CONFLICT (id) DO UPDATE
    SET
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

-- Auto-update updated_at for templates
CREATE OR REPLACE FUNCTION public.update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
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
  BEFORE UPDATE OF full_name, age_range, colors, styles, fit, body_type, skin_tone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_onboarding_status();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_templates_updated_at ON public.templates;
CREATE TRIGGER trg_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.update_templates_updated_at();


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

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5242880,   -- 5 MB per file
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'profile_photos_public_read'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY profile_photos_public_read
        ON storage.objects FOR SELECT TO public
        USING (bucket_id = 'profile-photos')
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'profile_photos_auth_insert'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY profile_photos_auth_insert
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'profile_photos_auth_update'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY profile_photos_auth_update
        ON storage.objects FOR UPDATE TO authenticated
        USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'profile_photos_auth_delete'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY profile_photos_auth_delete
        ON storage.objects FOR DELETE TO authenticated
        USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
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

-- ==========================================
-- SAVED SELFIES
-- ==========================================

CREATE TABLE IF NOT EXISTS saved_selfies (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url         text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_selfies_user_id ON saved_selfies(user_id, created_at DESC);

ALTER TABLE saved_selfies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_selfies' AND policyname='saved_selfies_user_select') THEN
    CREATE POLICY saved_selfies_user_select ON saved_selfies FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_selfies' AND policyname='saved_selfies_user_insert') THEN
    CREATE POLICY saved_selfies_user_insert ON saved_selfies FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_selfies' AND policyname='saved_selfies_user_delete') THEN
    CREATE POLICY saved_selfies_user_delete ON saved_selfies FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;


-- ==========================================
-- PERSONALIZATION ENGINE — Templates extension + tracking tables
-- ==========================================

-- 30 style dimensions + price data added directly to templates
-- (eliminates the old product_catalog_cache table)

-- Array tag dimensions
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS color_family         text[] DEFAULT '{}';
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS style_tags           text[] DEFAULT '{}';
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS size_range           text[] DEFAULT '{}';
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS body_type_fit        text[] DEFAULT '{}';
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS skin_tone_complement text[] DEFAULT '{}';
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS age_group            text[] DEFAULT '{}';
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS occasion             text[] DEFAULT '{}';
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS season               text[] DEFAULT '{}';
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS trend_tag            text[] DEFAULT '{}';
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS sustainability       text[] DEFAULT '{}';

-- Scalar tag dimensions
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS garment_type         text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS garment_category     text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS fit_silhouette       text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS pattern              text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS fabric               text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS price_tier           text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS gender               text DEFAULT 'unisex';
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS neckline             text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS sleeve_length        text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS length               text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS embellishment        text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS brand_tier           text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS color_intensity      text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS layering             text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS care_level           text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS origin_aesthetic     text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS template_weight      text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS transparency         text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS versatility          text;

-- Metadata columns
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS is_new_arrival       boolean DEFAULT false;

ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS min_price            integer;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS max_price            integer;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS available_for_sale   boolean DEFAULT true;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS tags_synced_at       timestamptz;

-- GIN indexes for personalization queries
CREATE INDEX IF NOT EXISTS idx_templates_style_tags    ON public.templates USING GIN(style_tags);
CREATE INDEX IF NOT EXISTS idx_templates_color_family   ON public.templates USING GIN(color_family);
CREATE INDEX IF NOT EXISTS idx_templates_occasion       ON public.templates USING GIN(occasion);

-- click_events — Raw event log
CREATE TABLE IF NOT EXISTS public.click_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id  text NOT NULL,
  event_type  text NOT NULL CHECK (event_type IN ('view','try_on','wishlist','cart_add','cart_remove','purchase')),
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_click_events_user_time ON public.click_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_click_events_product   ON public.click_events(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_click_events_type      ON public.click_events(event_type);

-- user_click_profile — Pre-aggregated user taste
CREATE TABLE IF NOT EXISTS public.user_click_profile (
  user_id              uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag_affinities       jsonb NOT NULL DEFAULT '{}',
  total_views          integer DEFAULT 0,
  total_try_ons        integer DEFAULT 0,
  total_wishlists      integer DEFAULT 0,
  total_cart_adds      integer DEFAULT 0,
  total_purchases      integer DEFAULT 0,
  engagement_ratio     decimal(5,4) DEFAULT 0,
  recent_impressions   jsonb DEFAULT '[]',
  last_computed_at     timestamptz DEFAULT now(),
  events_since_compute integer DEFAULT 0,
  updated_at           timestamptz DEFAULT now()
);

-- product_click_stats — Pre-aggregated product popularity
CREATE TABLE IF NOT EXISTS public.product_click_stats (
  product_id       text PRIMARY KEY,
  view_count       integer DEFAULT 0,
  try_on_count     integer DEFAULT 0,
  wishlist_count   integer DEFAULT 0,
  cart_add_count   integer DEFAULT 0,
  purchase_count   integer DEFAULT 0,
  recent_views     integer DEFAULT 0,
  recent_try_ons   integer DEFAULT 0,
  recent_wishlists integer DEFAULT 0,
  recent_carts     integer DEFAULT 0,
  recent_purchases integer DEFAULT 0,
  regional_counts  jsonb DEFAULT '{}',
  popularity_score decimal(5,4) DEFAULT 0,
  updated_at       timestamptz DEFAULT now()
);

-- admin_boost_queue — Manual product promotion
CREATE TABLE IF NOT EXISTS public.admin_boost_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      text NOT NULL,
  priority        integer DEFAULT 1,
  min_style_match decimal(3,2) DEFAULT 0.20,
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boost_queue_active ON public.admin_boost_queue(expires_at);

-- ranking_weights — Self-tuning weight history
CREATE TABLE IF NOT EXISTS public.ranking_weights (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  w_style          decimal(4,3) NOT NULL,
  w_user_clicks    decimal(4,3) NOT NULL,
  w_product_pop    decimal(4,3) NOT NULL,
  engagement_ratio decimal(5,4),
  last_delta       jsonb DEFAULT '{}'::jsonb,
  is_active        boolean DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

-- metrics_log — Nightly health metrics
CREATE TABLE IF NOT EXISTS public.metrics_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name   text NOT NULL,
  metric_value  numeric,
  target_value  numeric,
  passed        boolean,
  computed_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metrics_log_name_date ON public.metrics_log(metric_name, computed_at DESC);

-- RLS for personalization tables
ALTER TABLE public.click_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_click_profile    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_click_stats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_boost_queue     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_weights       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_log           ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='click_events' AND policyname='click_events_user_read') THEN
    CREATE POLICY click_events_user_read ON public.click_events FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='click_events' AND policyname='click_events_service_insert') THEN
    CREATE POLICY click_events_service_insert ON public.click_events FOR INSERT TO service_role WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_click_profile' AND policyname='user_click_profile_user_read') THEN
    CREATE POLICY user_click_profile_user_read ON public.user_click_profile FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_click_profile' AND policyname='user_click_profile_service_write') THEN
    CREATE POLICY user_click_profile_service_write ON public.user_click_profile FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_click_stats' AND policyname='product_stats_public_read') THEN
    CREATE POLICY product_stats_public_read ON public.product_click_stats FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_click_stats' AND policyname='product_stats_service_write') THEN
    CREATE POLICY product_stats_service_write ON public.product_click_stats FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admin_boost_queue' AND policyname='boost_queue_service_all') THEN
    CREATE POLICY boost_queue_service_all ON public.admin_boost_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ranking_weights' AND policyname='ranking_weights_service_all') THEN
    CREATE POLICY ranking_weights_service_all ON public.ranking_weights FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='metrics_log' AND policyname='metrics_log_service_all') THEN
    CREATE POLICY metrics_log_service_all ON public.metrics_log FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed ranking_weights
INSERT INTO public.ranking_weights (w_style, w_user_clicks, w_product_pop, last_delta, is_active)
SELECT 0.750, 0.100, 0.150, '{}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.ranking_weights WHERE is_active = true);

-- updated_at triggers for personalization tables
CREATE OR REPLACE FUNCTION public.update_click_profile_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_click_profile_updated_at ON public.user_click_profile;
CREATE TRIGGER trg_user_click_profile_updated_at
  BEFORE UPDATE ON public.user_click_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_click_profile_updated_at();

CREATE OR REPLACE FUNCTION public.update_product_stats_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_click_stats_updated_at ON public.product_click_stats;
CREATE TRIGGER trg_product_click_stats_updated_at
  BEFORE UPDATE ON public.product_click_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_product_stats_updated_at();
