-- ==========================================
-- USER PROFILES SCHEMA
-- Run BEFORE 001_payment_schema.sql
-- ==========================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- 1. Create PROFILES Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Personal Info (Step 1)
  full_name text,
  phone text,
  age_range text,  -- 'gen_z', 'millennial', 'gen_x', 'boomer'

  -- Color Preferences (Step 2)
  color_mode text,  -- 'light' or 'dark'
  colors text[] DEFAULT '{}',  -- up to 3 primary colors

  -- Style Preferences (Step 3)
  styles text[] DEFAULT '{}',  -- casual, formal, party, beachwear, etc.

  -- Fit & Body Type (Step 4)
  fit text,       -- 'xs', 's', 'm', 'l', 'xl', 'xxl'
  body_type text, -- 'hourglass', 'triangle', 'inverted_triangle', 'rectangle', 'round'

  -- Onboarding
  is_onboarding_complete boolean DEFAULT false NOT NULL,

  -- Credits
  credits integer DEFAULT 8 NOT NULL,

  -- Metadata
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. Create USER_ADDRESSES Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label text DEFAULT 'Home',
  address_line text NOT NULL,
  city text,
  state text,
  pincode text,
  lat double precision,
  lng double precision,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. RLS Policies for PROFILES
-- ==========================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ==========================================
-- 4. RLS Policies for USER_ADDRESSES
-- ==========================================
DROP POLICY IF EXISTS "Users can view own addresses" ON public.user_addresses;
CREATE POLICY "Users can view own addresses"
  ON public.user_addresses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own addresses" ON public.user_addresses;
CREATE POLICY "Users can insert own addresses"
  ON public.user_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON public.user_addresses;
CREATE POLICY "Users can update own addresses"
  ON public.user_addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON public.user_addresses;
CREATE POLICY "Users can delete own addresses"
  ON public.user_addresses FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- 5. Function to compute onboarding completion
-- Returns number of steps completed (0-5)
-- ==========================================
CREATE OR REPLACE FUNCTION public.compute_onboarding_steps(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_has_address boolean := false;
  v_steps integer := 0;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF v_profile.id IS NULL THEN RETURN 0; END IF;

  -- Step 1: Name + Phone (mandatory)
  IF v_profile.full_name IS NOT NULL AND v_profile.full_name != '' 
     AND v_profile.phone IS NOT NULL AND v_profile.phone != '' THEN
    v_steps := v_steps + 1;
  END IF;

  -- Step 2: Color preferences
  IF v_profile.color_mode IS NOT NULL AND array_length(v_profile.colors, 1) > 0 THEN
    v_steps := v_steps + 1;
  END IF;

  -- Step 3: Style preferences
  IF array_length(v_profile.styles, 1) > 0 THEN
    v_steps := v_steps + 1;
  END IF;

  -- Step 4: Fit & Body type
  IF v_profile.fit IS NOT NULL AND v_profile.body_type IS NOT NULL THEN
    v_steps := v_steps + 1;
  END IF;

  -- Step 5: Location (from user_addresses)
  SELECT EXISTS (
    SELECT 1
    FROM public.user_addresses ua
    WHERE ua.user_id = p_user_id
      AND ua.address_line IS NOT NULL
      AND ua.address_line != ''
  ) INTO v_has_address;

  IF v_has_address THEN
    v_steps := v_steps + 1;
  END IF;

  RETURN v_steps;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 6. Trigger to auto-update is_onboarding_complete
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_onboarding_status()
RETURNS TRIGGER AS $$
DECLARE
  v_steps integer;
BEGIN
  v_steps := public.compute_onboarding_steps(NEW.id);
  
  -- Complete = all 5 steps done (age and email are optional)
  -- But mandatory fields: name, phone, colors, styles, fit, body_type, location
  NEW.is_onboarding_complete := (v_steps = 5);
  NEW.updated_at := timezone('utc'::text, now());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_onboarding ON public.profiles;
CREATE TRIGGER trg_update_onboarding
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_onboarding_status();

-- ==========================================
-- 7. Auto-create profile on user signup
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, credits)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
      8
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
      updated_at = timezone('utc'::text, now());
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists first then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- DONE! User profiles schema is ready.
-- ==========================================
