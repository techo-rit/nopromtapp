import { createAdminClient, getUserFromRequest, ensureUserProfile } from '../lib/auth.js';
import { createTtlCache } from '../lib/cache.js';

const CACHE_TTL_MS = Number(process.env.SERVER_CACHE_TTL_MS || 60000);
const GALLERY_CACHE_TTL_MS = Number(process.env.GALLERY_CACHE_TTL_MS || 120000); // 2 min
const ONBOARDING_TOTAL_STEPS = 6;
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
    const forceRefresh = req.query?.force === '1' || req.query?.force === 'true';
    if (!forceRefresh) {
      const cached = profileCache.get(cacheKey);
      if (cached) {
        return res.status(200).json(cached);
      }
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
          phone: normalizeIndiaPhone(authResult.user.phone),
          ageRange: null,
          colors: [],
          styles: [],
          fit: null,
          bodyType: null,
          skinTone: null,
          avatarUrl: authResult.user.user_metadata?.avatar_url || authResult.user.user_metadata?.picture || null,
          profilePhotoUrl: null,
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

    // Compute steps completed and heal mistaken false flags when data is already complete.
    const steps = await computeSteps(profile, supabase, authResult.user.id);
    await syncOnboardingCompletionOnRead(profile, supabase, steps);

    const payload = {
      success: true,
      profile: mapProfile(profile, authResult.user, steps),
      onboardingSteps: steps,
      onboardingPercent: Math.round((steps / ONBOARDING_TOTAL_STEPS) * 100),
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

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('age_range, styles')
      .eq('id', userId)
      .single();

    // Build update object — only include fields that are provided
    const update = {};

    if (body.name !== undefined) update.full_name = body.name;
    if (body.phone !== undefined) update.phone = normalizeIndiaPhone(body.phone);
    if (body.ageRange !== undefined) update.age_range = body.ageRange;
    if (body.colors !== undefined) update.colors = body.colors;
    if (body.styles !== undefined) update.styles = body.styles;
    if (body.fit !== undefined) update.fit = body.fit;
    if (body.bust !== undefined) update.bust = body.bust;
    if (body.waist !== undefined) update.waist = body.waist;
    if (body.hip !== undefined) update.hip = body.hip;
    if (body.measurementUnit !== undefined) update.measurement_unit = body.measurementUnit;
    if (body.bodyType !== undefined) update.body_type = body.bodyType;
    if (body.skinTone !== undefined) update.skin_tone = body.skinTone;
    if (body.isOnboardingComplete !== undefined) {
      update.is_onboarding_complete = Boolean(body.isOnboardingComplete);
    }

    const ageRangeCleared = body.ageRange !== undefined && !body.ageRange;
    if (ageRangeCleared && existingProfile?.age_range) {
      return res.status(400).json({
        success: false,
        error: 'Generation cannot be empty once selected. You can change it, but not remove it.',
      });
    }

    const stylesCleared = body.styles !== undefined
      && Array.isArray(body.styles)
      && body.styles.length === 0
      && Array.isArray(existingProfile?.styles)
      && existingProfile.styles.length > 0;
    if (stylesCleared) {
      return res.status(400).json({
        success: false,
        error: 'Style preferences cannot be empty once selected. You can change them, but not remove all.',
      });
    }

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
    await syncOnboardingStatus(profile, supabase, steps);

    const payload = {
      success: true,
      profile: mapProfile(profile, authResult.user, steps),
      onboardingSteps: steps,
      onboardingPercent: Math.round((steps / ONBOARDING_TOTAL_STEPS) * 100),
    };
    profileCache.set(`profile:${userId}`, payload);
    return res.status(200).json(payload);
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
}

// ---- Profile Photo ----

// POST /api/profile/photo — upload profile photo (selfie) as base64
export async function uploadProfilePhotoHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    const userId = authResult.user.id;
    const { imageData } = req.body || {};

    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({ success: false, error: 'imageData (base64 data URL) is required' });
    }

    const match = /^data:(image\/(jpeg|jpg|png|webp));base64,(.+)$/.exec(imageData);
    if (!match) {
      return res.status(400).json({ success: false, error: 'Invalid image format. Must be JPEG, PNG, or WebP data URL.' });
    }

    const mimeType = match[1];
    const ext = match[2] === 'jpg' ? 'jpeg' : match[2];
    const base64Data = match[3];
    const buffer = Buffer.from(base64Data, 'base64');

    // Size limit: 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Image must be under 5MB' });
    }

    const storagePath = `${userId}/selfie.${ext}`;

    // Upload (upsert to overwrite existing)
    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Profile photo upload error:', uploadError);
      return res.status(500).json({ success: false, error: 'Failed to upload photo' });
    }

    const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(storagePath);
    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) {
      return res.status(500).json({ success: false, error: 'Failed to get photo URL' });
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ profile_photo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('Profile photo URL update error:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to update profile' });
    }

    profileCache.del(`profile:${userId}`);

    return res.status(200).json({ success: true, profilePhotoUrl: publicUrl });
  } catch (err) {
    console.error('uploadProfilePhoto error:', err);
    return res.status(500).json({ success: false, error: 'Failed to upload photo' });
  }
}

// DELETE /api/profile/photo — remove profile photo
export async function deleteProfilePhotoHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    const userId = authResult.user.id;

    // List files in the user's profile-photos folder and remove them
    const { data: files } = await supabase.storage.from('profile-photos').list(userId);
    if (files && files.length > 0) {
      const paths = files.map(f => `${userId}/${f.name}`);
      await supabase.storage.from('profile-photos').remove(paths);
    }

    // Clear the URL in the profile
    await supabase
      .from('profiles')
      .update({ profile_photo_url: null, updated_at: new Date().toISOString() })
      .eq('id', userId);

    profileCache.del(`profile:${userId}`);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('deleteProfilePhoto error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete photo' });
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
    const forceRefresh = req.query?.force === '1' || req.query?.force === 'true';
    if (!forceRefresh) {
      const cached = addressCache.get(cacheKey);
      if (cached) {
        return res.status(200).json(cached);
      }
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

    const { label, addressLine1, addressLine, city, state, pincode, lat, lng, isDefault } = req.body || {};
    if (!addressLine) return res.status(400).json({ success: false, error: 'Address line is required' });

    const validatedAddress = await validateAndNormalizeAddress({
      addressLine1,
      addressLine,
      city,
      state,
      pincode,
      lat,
      lng,
    });

    if (!validatedAddress.valid) {
      return res.status(400).json({ success: false, error: validatedAddress.error || 'Please enter a valid address.' });
    }

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
        address_line_1: validatedAddress.addressLine1,
        address_line: validatedAddress.addressLine,
        city: validatedAddress.city,
        state: validatedAddress.state,
        pincode: validatedAddress.pincode,
        lat: validatedAddress.lat,
        lng: validatedAddress.lng,
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authResult.user.id)
      .single();

    if (profile) {
      const steps = await computeSteps(profile, supabase, authResult.user.id);
      await syncOnboardingStatus(profile, supabase, steps);
    }

    profileCache.del(`profile:${authResult.user.id}`);

    return res.status(200).json({ success: true, address: mapped });
  } catch (err) {
    console.error('addAddress error:', err);
    return res.status(500).json({ success: false, error: 'Failed to add address' });
  }
}

// PUT /api/profile/addresses/:id
export async function updateAddressHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    const addressId = req.params.id;
    const body = req.body || {};
    const { label, addressLine1, addressLine, city, state, pincode, lat, lng } = body;
    if (!addressId) return res.status(400).json({ success: false, error: 'Address ID required' });

    const { data: existingAddress, error: existingError } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('id', addressId)
      .eq('user_id', authResult.user.id)
      .single();

    if (existingError || !existingAddress) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    const candidate = {
      addressLine1: addressLine1 !== undefined ? addressLine1 : existingAddress.address_line_1,
      addressLine: addressLine !== undefined ? addressLine : existingAddress.address_line,
      city: city !== undefined ? city : existingAddress.city,
      state: state !== undefined ? state : existingAddress.state,
      pincode: pincode !== undefined ? pincode : existingAddress.pincode,
      lat: lat !== undefined ? lat : existingAddress.lat,
      lng: lng !== undefined ? lng : existingAddress.lng,
    };

    const validatedAddress = await validateAndNormalizeAddress(candidate, { requireAddressLine1: true });

    if (!validatedAddress.valid) {
      return res.status(400).json({ success: false, error: validatedAddress.error || 'Please enter a valid address.' });
    }

    const { data, error } = await supabase
      .from('user_addresses')
      .update({
        label: typeof label === 'string' && label.trim() ? label.trim() : existingAddress.label,
        address_line_1: validatedAddress.addressLine1,
        address_line: validatedAddress.addressLine,
        city: validatedAddress.city,
        state: validatedAddress.state,
        pincode: validatedAddress.pincode,
        lat: validatedAddress.lat,
        lng: validatedAddress.lng,
      })
      .eq('id', addressId)
      .eq('user_id', authResult.user.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    const cacheKey = `addresses:${authResult.user.id}`;
    const cached = addressCache.get(cacheKey);
    const mapped = mapAddress(data);
    if (cached?.addresses) {
      addressCache.set(cacheKey, {
        success: true,
        addresses: cached.addresses.map((address) => (
          address.id === addressId ? mapped : address
        )),
      });
    } else {
      addressCache.del(cacheKey);
    }

    return res.status(200).json({ success: true, address: mapped });
  } catch (err) {
    console.error('updateAddress error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update address' });
  }
}

// PUT /api/profile/addresses/:id/default
export async function setDefaultAddressHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ success: false, error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ success: false, error: authResult.error });

    const addressId = req.params.id;
    if (!addressId) return res.status(400).json({ success: false, error: 'Address ID required' });

    const { data: existing, error: existingError } = await supabase
      .from('user_addresses')
      .select('id')
      .eq('id', addressId)
      .eq('user_id', authResult.user.id)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    const { error: unsetError } = await supabase
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', authResult.user.id);

    if (unsetError) {
      return res.status(500).json({ success: false, error: 'Failed to update default address' });
    }

    const { data, error } = await supabase
      .from('user_addresses')
      .update({ is_default: true })
      .eq('id', addressId)
      .eq('user_id', authResult.user.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ success: false, error: 'Failed to update default address' });
    }

    const cacheKey = `addresses:${authResult.user.id}`;
    const cached = addressCache.get(cacheKey);
    if (cached?.addresses) {
      addressCache.set(cacheKey, {
        success: true,
        addresses: cached.addresses.map((address) => ({
          ...address,
          isDefault: address.id === addressId,
        })),
      });
    } else {
      addressCache.del(cacheKey);
    }

    return res.status(200).json({ success: true, address: mapAddress(data) });
  } catch (err) {
    console.error('setDefaultAddress error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update default address' });
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

    const { data: targetAddress, error: targetError } = await supabase
      .from('user_addresses')
      .select('id, is_default')
      .eq('id', addressId)
      .eq('user_id', authResult.user.id)
      .single();

    if (targetError || !targetAddress) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    if (targetAddress.is_default) {
      return res.status(400).json({ success: false, error: 'You cannot delete your default address. Set another address as default first.' });
    }

    const { count, error: countError } = await supabase
      .from('user_addresses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authResult.user.id);

    if (countError) return res.status(500).json({ success: false, error: 'Failed to validate addresses' });
    if ((count || 0) <= 1) {
      return res.status(400).json({ success: false, error: 'You cannot delete your only saved address.' });
    }

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

async function syncOnboardingStatus(profile, supabase, steps) {
  const wasComplete = profile.is_onboarding_complete ?? false;
  const isCompleteNow = steps >= ONBOARDING_TOTAL_STEPS;
  const nextIsComplete = wasComplete || isCompleteNow;
  if (wasComplete === nextIsComplete) {
    return;
  }

  profile.is_onboarding_complete = nextIsComplete;
  await supabase
    .from('profiles')
    .update({
      is_onboarding_complete: nextIsComplete,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);
}

async function syncOnboardingCompletionOnRead(profile, supabase, steps) {
  const wasComplete = profile.is_onboarding_complete ?? false;
  const isCompleteNow = steps >= ONBOARDING_TOTAL_STEPS;

  // Allow manual false resets, but heal them on the next visit if the data is already complete.
  if (wasComplete || !isCompleteNow) {
    return;
  }

  profile.is_onboarding_complete = true;
  await supabase
    .from('profiles')
    .update({
      is_onboarding_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);
}

// ---- Helpers ----

async function computeSteps(profile, supabase, userId) {
  let steps = 0;

  // Step 1: Color preferences
  if (profile.colors && profile.colors.length > 0) steps++;

  // Step 2: Style preferences
  if (profile.styles && profile.styles.length > 0) steps++;

  // Step 3: Fit size (size label selected)
  if (profile.fit) steps++;

  // Step 4: Body type + Skin tone
  if (profile.body_type && profile.skin_tone) steps++;

  // Step 5: Name
  if (profile.full_name) steps++;

  // Step 6: Location — check user_addresses table
  try {
    const { count } = await supabase
      .from('user_addresses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (count && count > 0) steps++;
  } catch { /* ignore if table doesn't exist */ }

  return steps;
}

function mapProfile(profile, supabaseUser, steps) {
  const monthlyQuota = profile.monthly_quota || 0;
  const monthlyUsed = profile.monthly_used || 0;
  const extraCredits = profile.extra_credits || 0;
  const monthlyRemaining = Math.max(monthlyQuota - monthlyUsed, 0);
  const isOnboardingComplete = profile.is_onboarding_complete ?? false;
  return {
    id: profile.id,
    name: profile.full_name,
    phone: normalizeIndiaPhone(profile.phone) || normalizeIndiaPhone(supabaseUser?.phone),
    ageRange: profile.age_range,
    colors: profile.colors || [],
    styles: profile.styles || [],
    fit: profile.fit,
    bust: profile.bust != null ? Number(profile.bust) : null,
    waist: profile.waist != null ? Number(profile.waist) : null,
    hip: profile.hip != null ? Number(profile.hip) : null,
    measurementUnit: profile.measurement_unit || 'in',
    bodyType: profile.body_type,
    skinTone: profile.skin_tone,
    avatarUrl: supabaseUser?.user_metadata?.avatar_url || supabaseUser?.user_metadata?.picture || null,
    profilePhotoUrl: profile.profile_photo_url || null,
    isOnboardingComplete,
    accountType: profile.account_type || 'free',
    monthlyQuota,
    monthlyUsed,
    extraCredits,
    creationsLeft: monthlyRemaining + extraCredits,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

function normalizeIndiaPhone(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function isValidLatLng(lat, lng) {
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180;
}

function normalizeAddressLine1(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function validateAndNormalizeAddress(input, options = {}) {
  const rawAddress = String(input?.addressLine || '').trim();
  if (!rawAddress) {
    return { valid: false, error: 'Address line is required.' };
  }

  if (rawAddress.length < 8) {
    return { valid: false, error: 'Please enter a valid address.' };
  }

  const addressLine1 = normalizeAddressLine1(input?.addressLine1);
  if (options.requireAddressLine1 && !addressLine1) {
    return { valid: false, error: 'Address details are required.' };
  }
  if (addressLine1 && addressLine1.length > 160) {
    return { valid: false, error: 'Address line 1 is too long.' };
  }

  const latNum = toFiniteNumber(input?.lat);
  const lngNum = toFiniteNumber(input?.lng);

  if (latNum !== null || lngNum !== null) {
    if (!isValidLatLng(latNum, lngNum)) {
      return { valid: false, error: 'Invalid location coordinates. Please reselect the address.' };
    }

    return {
      valid: true,
      addressLine1,
      addressLine: rawAddress,
      city: input?.city ? String(input.city).trim() : null,
      state: input?.state ? String(input.state).trim() : null,
      pincode: input?.pincode ? String(input.pincode).trim() : null,
      lat: latNum,
      lng: lngNum,
    };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { valid: false, error: 'Address validation service is unavailable. Please use location suggestion or current location.' };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(rawAddress)}&components=country:in&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
      return { valid: false, error: 'Please enter a valid address from suggestions or use current location.' };
    }

    const first = data.results[0];
    const components = first.address_components || [];
    const get = (type) => components.find((c) => Array.isArray(c.types) && c.types.includes(type))?.long_name || null;
    const geoLat = toFiniteNumber(first?.geometry?.location?.lat);
    const geoLng = toFiniteNumber(first?.geometry?.location?.lng);

    if (!isValidLatLng(geoLat, geoLng)) {
      return { valid: false, error: 'Unable to validate this address. Please choose a suggested address.' };
    }

    return {
      valid: true,
      addressLine1,
      addressLine: String(first.formatted_address || rawAddress),
      city: get('locality') || get('administrative_area_level_2'),
      state: get('administrative_area_level_1'),
      pincode: get('postal_code'),
      lat: geoLat,
      lng: geoLng,
    };
  } catch {
    return { valid: false, error: 'Could not validate address right now. Please try again.' };
  }
}

function mapAddress(address) {
  return {
    id: address.id,
    userId: address.user_id,
    label: address.label,
    addressLine1: address.address_line_1 ?? null,
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
