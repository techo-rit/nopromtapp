-- ==========================================
-- Migration: Add deduct_credits function
-- Purpose: Safely deduct credits before AI generation
-- ==========================================

CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id uuid,
  p_amount integer
)
RETURNS json AS $$
DECLARE
  v_current_credits integer;
BEGIN
  -- Get current credits with row lock to prevent race conditions
  SELECT credits INTO v_current_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  -- Check if user exists
  IF v_current_credits IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check if sufficient credits
  IF v_current_credits < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits', 'current', v_current_credits);
  END IF;
  
  -- Deduct credits
  UPDATE public.profiles
  SET credits = credits - p_amount
  WHERE id = p_user_id;
  
  RETURN json_build_object('success', true, 'remaining', v_current_credits - p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
