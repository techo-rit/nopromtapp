import { createAdminClient, getUserFromRequest, ensureUserProfile } from '../lib/auth.js';

// GET /api/profile — fetch full profile
export async function getProfileHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    // Ensure profile row exists (auto-create if missing)
    await ensureUserProfile(supabase, authResult.user);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authResult.user.id)
      .single();

    if (error || !profile) {
      // Table may not exist yet — return safe defaults so frontend doesn't crash
      console.warn('Profile fetch failed (table may not exist yet):', error?.message || 'no row');
      return res.status(200).json({
        success: true,
        profile: {
          id: authResult.user.id,
          email: authResult.user.email || null,
          name: authResult.user.user_metadata?.full_name || authResult.user.email?.split('@')[0] || 'User',
          phone: null,
          ageRange: null,
          colorMode: null,
          colors: [],
          styles: [],
          fit: null,
          bodyType: null,
          avatarUrl: authResult.user.user_metadata?.avatar_url || authResult.user.user_metadata?.picture || null,
          isOnboardingComplete: false,
          credits: 8,
        },
        onboardingSteps: 0,
        onboardingPercent: 0,
      });
    }

    // Compute steps completed
    const steps = await computeSteps(profile, supabase, authResult.user.id);

    return res.status(200).json({
      success: true,
      profile: mapProfile(profile, authResult.user),
      onboardingSteps: steps,
      onboardingPercent: Math.round((steps / 5) * 100),
    });
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
}

// PUT /api/profile — update profile (onboarding + edit)
export async function updateProfileHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    const userId = authResult.user.id;
    const body = req.body || {};

    // Ensure profile row exists (auto-create if missing)
    await ensureUserProfile(supabase, authResult.user);

    // Build update object — only include fields that are provided
    const update = {};

    if (body.name !== undefined) update.full_name = body.name;
    if (body.phone !== undefined) update.phone = body.phone;
    if (body.ageRange !== undefined) update.age_range = body.ageRange;
    if (body.email !== undefined) update.email = body.email;
    if (body.colorMode !== undefined) update.color_mode = body.colorMode;
    if (body.colors !== undefined) update.colors = body.colors;
    if (body.styles !== undefined) update.styles = body.styles;
    if (body.fit !== undefined) update.fit = body.fit;
    if (body.bodyType !== undefined) update.body_type = body.bodyType;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    update.updated_at = new Date().toISOString();

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update profile' });
    }

    const steps = await computeSteps(profile, supabase, userId);

    return res.status(200).json({
      success: true,
      profile: mapProfile(profile, authResult.user),
      onboardingSteps: steps,
      onboardingPercent: Math.round((steps / 5) * 100),
    });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
}

// ---- Addresses ----

// GET /api/profile/addresses
export async function getAddressesHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', authResult.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ success: false, error: 'Failed to fetch addresses' });

    return res.status(200).json({ success: true, addresses: data || [] });
  } catch (err) {
    console.error('getAddresses error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch addresses' });
  }
}

// POST /api/profile/addresses
export async function addAddressHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    const { label, addressLine, city, state, pincode, lat, lng, isDefault } = req.body || {};
    if (!addressLine) return res.status(400).json({ success: false, error: 'Address line is required' });

    // If setting as default, unset other defaults
    if (isDefault) {
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', authResult.user.id);
    }

    const { data, error } = await supabase
      .from('user_addresses')
      .insert({
        user_id: authResult.user.id,
        label: label || 'Home',
        address_line: addressLine,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        lat: lat || null,
        lng: lng || null,
        is_default: isDefault || false,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: 'Failed to add address' });

    return res.status(200).json({ success: true, address: data });
  } catch (err) {
    console.error('addAddress error:', err);
    return res.status(500).json({ success: false, error: 'Failed to add address' });
  }
}

// DELETE /api/profile/addresses/:id
export async function deleteAddressHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    const addressId = req.params.id;
    if (!addressId) return res.status(400).json({ success: false, error: 'Address ID required' });

    const { error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', authResult.user.id);

    if (error) return res.status(500).json({ success: false, error: 'Failed to delete address' });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('deleteAddress error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete address' });
  }
}

// ---- Helpers ----

async function computeSteps(profile, supabase, userId) {
  let steps = 0;

  // Step 1: Name + Phone
  if (profile.full_name && profile.phone) steps++;

  // Step 2: Color preferences
  if (profile.color_mode && profile.colors && profile.colors.length > 0) steps++;

  // Step 3: Style preferences
  if (profile.styles && profile.styles.length > 0) steps++;

  // Step 4: Fit & Body type
  if (profile.fit && profile.body_type) steps++;

  // Step 5: Location — check user_addresses table
  try {
    const { count } = await supabase
      .from('user_addresses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (count && count > 0) steps++;
  } catch { /* ignore if table doesn't exist */ }

  return steps;
}

function mapProfile(profile, supabaseUser) {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.full_name,
    phone: profile.phone,
    ageRange: profile.age_range,
    colorMode: profile.color_mode,
    colors: profile.colors || [],
    styles: profile.styles || [],
    fit: profile.fit,
    bodyType: profile.body_type,
    avatarUrl: supabaseUser?.user_metadata?.avatar_url || supabaseUser?.user_metadata?.picture || null,
    isOnboardingComplete: profile.is_onboarding_complete,
    credits: profile.credits,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}
