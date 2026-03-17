import { createAdminClient, getUserFromRequest, ensureUserProfile } from '../lib/auth.js';
import { createTtlCache } from '../lib/cache.js';

const CACHE_TTL_MS = Number(process.env.SERVER_CACHE_TTL_MS || 60000);
const GALLERY_CACHE_TTL_MS = Number(process.env.GALLERY_CACHE_TTL_MS || 120000); // 2 min
const profileCache = createTtlCache(CACHE_TTL_MS);
const addressCache = createTtlCache(CACHE_TTL_MS);
const galleryCache = createTtlCache(GALLERY_CACHE_TTL_MS);

// GET /api/profile — fetch full profile
export async function getProfileHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    const cacheKey = `profile:${authResult.user.id}`;
    const cached = profileCache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

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
      const payload = {
        success: true,
        profile: {
          id: authResult.user.id,
          name: authResult.user.user_metadata?.full_name || 'User',
          phone: null,
          ageRange: null,
          colors: [],
          styles: [],
          fit: null,
          bodyType: null,
          avatarUrl: authResult.user.user_metadata?.avatar_url || authResult.user.user_metadata?.picture || null,
          isOnboardingComplete: false,
          accountType: 'free',
          monthlyQuota: 3,
          monthlyUsed: 0,
          extraCredits: 5,
          creationsLeft: 8,
        },
        onboardingSteps: 0,
        onboardingPercent: 0,
      };
      profileCache.set(cacheKey, payload);
      return res.status(200).json(payload);
    }

    // Compute steps completed
    const steps = await computeSteps(profile, supabase, authResult.user.id);

    const payload = {
      success: true,
      profile: mapProfile(profile, authResult.user),
      onboardingSteps: steps,
      onboardingPercent: Math.round((steps / 5) * 100),
    };
    profileCache.set(cacheKey, payload);
    return res.status(200).json(payload);
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

    const payload = {
      success: true,
      profile: mapProfile(profile, authResult.user),
      onboardingSteps: steps,
      onboardingPercent: Math.round((steps / 5) * 100),
    };
    profileCache.set(`profile:${userId}`, payload);
    return res.status(200).json(payload);
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

    const cacheKey = `addresses:${authResult.user.id}`;
    const cached = addressCache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', authResult.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ success: false, error: 'Failed to fetch addresses' });

    const payload = { success: true, addresses: (data || []).map(mapAddress) };
    addressCache.set(cacheKey, payload);
    return res.status(200).json(payload);
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

    const cacheKey = `addresses:${authResult.user.id}`;
    const cached = addressCache.get(cacheKey);
    const mapped = mapAddress(data);
    if (cached?.addresses) {
      addressCache.set(cacheKey, { success: true, addresses: [mapped, ...cached.addresses.filter((a) => a.id !== mapped.id)] });
    } else {
      addressCache.set(cacheKey, { success: true, addresses: [mapped] });
    }
    profileCache.del(`profile:${authResult.user.id}`);

    return res.status(200).json({ success: true, address: mapped });
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

    const cacheKey = `addresses:${authResult.user.id}`;
    const cached = addressCache.get(cacheKey);
    if (cached?.addresses) {
      addressCache.set(cacheKey, { success: true, addresses: cached.addresses.filter((a) => a.id !== addressId) });
    } else {
      addressCache.del(cacheKey);
    }
    profileCache.del(`profile:${authResult.user.id}`);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('deleteAddress error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete address' });
  }
}

// ---- Generations Gallery ----

// GET /api/profile/generations?page=1&limit=50
export async function getGenerationsHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const cacheKey = `gallery:${authResult.user.id}:${page}:${limit}`;
    const cached = galleryCache.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    const { data, error, count } = await supabase
      .from('generated_images')
      .select('id, image_url, template_id, template_name, stack_id, mode, aspect_ratio, created_at', { count: 'exact' })
      .eq('user_id', authResult.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('getGenerations error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch generations' });
    }

    const payload = { success: true, generations: data || [], total: count || 0, page, limit };
    galleryCache.set(cacheKey, payload);
    return res.status(200).json(payload);
  } catch (err) {
    console.error('getGenerations error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch generations' });
  }
}

// DELETE /api/profile/generations/:id — delete a single generated image
export async function deleteGenerationHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Generation ID required' });

    // Fetch the row first to get storage_path and verify ownership
    const { data: row, error: fetchError } = await supabase
      .from('generated_images')
      .select('id, storage_path')
      .eq('id', id)
      .eq('user_id', authResult.user.id)
      .single();

    if (fetchError || !row) return res.status(404).json({ success: false, error: 'Generation not found' });

    // Delete from storage (best-effort — don't fail if it errors)
    if (row.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('generated-images')
        .remove([row.storage_path]);
      if (storageError) console.warn('Storage delete warn (id=' + id + '):', storageError.message);
    }

    // Delete from DB
    const { error: dbError } = await supabase
      .from('generated_images')
      .delete()
      .eq('id', id)
      .eq('user_id', authResult.user.id);

    if (dbError) return res.status(500).json({ success: false, error: 'Failed to delete generation' });

    // Bust gallery cache for this user
    _clearUserGalleryCache(authResult.user.id);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('deleteGeneration error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete generation' });
  }
}

// DELETE /api/profile/generations — delete ALL generations for the authenticated user
export async function deleteAllGenerationsHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    // Fetch all storage paths for this user
    const { data: rows, error: fetchError } = await supabase
      .from('generated_images')
      .select('storage_path')
      .eq('user_id', authResult.user.id);

    if (fetchError) return res.status(500).json({ success: false, error: 'Failed to fetch generations' });

    // Delete from storage in batches of 100 (Supabase limit)
    const paths = (rows || []).map((r) => r.storage_path).filter(Boolean);
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100);
      const { error: storageError } = await supabase.storage.from('generated-images').remove(batch);
      if (storageError) console.warn('Storage bulk delete warn:', storageError.message);
    }

    // Delete all DB rows
    const { error: dbError } = await supabase
      .from('generated_images')
      .delete()
      .eq('user_id', authResult.user.id);

    if (dbError) return res.status(500).json({ success: false, error: 'Failed to delete generations' });

    _clearUserGalleryCache(authResult.user.id);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('deleteAllGenerations error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete generations' });
  }
}

function _clearUserGalleryCache(userId) {
  // Clear all cache keys for this user (pagination variants)
  // Since we don't track individual keys by user, clear the whole cache — it's small and TTL-managed
  galleryCache.clear();
}

// ---- Helpers ----

async function computeSteps(profile, supabase, userId) {
  let steps = 0;

  // Step 1: Name
  if (profile.full_name) steps++;

  // Step 2: Color preferences
  if (profile.colors && profile.colors.length > 0) steps++;

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
  const monthlyQuota = profile.monthly_quota || 0;
  const monthlyUsed = profile.monthly_used || 0;
  const extraCredits = profile.extra_credits || 0;
  const monthlyRemaining = Math.max(monthlyQuota - monthlyUsed, 0);
  return {
    id: profile.id,
    name: profile.full_name,
    phone: profile.phone,
    ageRange: profile.age_range,
    colors: profile.colors || [],
    styles: profile.styles || [],
    fit: profile.fit,
    bodyType: profile.body_type,
    avatarUrl: supabaseUser?.user_metadata?.avatar_url || supabaseUser?.user_metadata?.picture || null,
    isOnboardingComplete: profile.is_onboarding_complete,
    accountType: profile.account_type || 'free',
    monthlyQuota,
    monthlyUsed,
    extraCredits,
    creationsLeft: monthlyRemaining + extraCredits,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

function mapAddress(address) {
  return {
    id: address.id,
    userId: address.user_id,
    label: address.label,
    addressLine: address.address_line,
    city: address.city ?? null,
    state: address.state ?? null,
    pincode: address.pincode ?? null,
    lat: address.lat ?? null,
    lng: address.lng ?? null,
    isDefault: address.is_default ?? false,
    createdAt: address.created_at,
  };
}
