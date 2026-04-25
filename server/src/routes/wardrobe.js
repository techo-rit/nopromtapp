/**
 * Wardrobe API Routes — Upload, delete, list, sync, outfits, chat, gaps.
 */

import { randomUUID } from 'crypto';
import { getUserFromRequest, createAdminClient } from '../lib/auth.js';
import { processGarmentImage } from '../lib/imageProcessing.js';
import { runWardrobeSync } from '../lib/wardrobeSync.js';
import { processChatMessage } from '../lib/wardrobeConcierge.js';
function makeLogger(req) {
  const logStream = req?.app?.locals?.logStream;
  const write = (level, msg) => {
    const line = `${new Date().toISOString()} [${level}] ${msg}\n`;
    if (logStream) logStream.write(line);
    (level === 'error' ? console.error : console.warn)(msg);
  };
  return { warn: (m) => write('WARN', m), error: (m) => write('ERROR', m) };
}
const logger = { warn: console.warn.bind(console), error: console.error.bind(console) };

const GARMENT_CAPS = { free: 30, essentials: 75, ultimate: 150 };
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB

// ────────────────────────────────────────────────────────────────────
// POST /api/wardrobe/garments/upload
// ────────────────────────────────────────────────────────────────────

export async function uploadGarmentHandler(req, res) {
  const authResult = await getUserFromRequest(req, res);
  if ('error' in authResult) return res.status(authResult.status).json({ error: authResult.error });
  const user = authResult.user;

  try {
    const { image, mimeType } = req.body;

    if (!image || !mimeType) {
      return res.status(400).json({ error: 'Image and mimeType are required' });
    }

    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      return res.status(400).json({ error: 'Invalid image type. Use JPEG, PNG, or WebP.' });
    }

    // Decode base64 image
    const buffer = Buffer.from(image, 'base64');

    if (buffer.length > MAX_UPLOAD_SIZE) {
      return res.status(400).json({ error: 'Image too large. Max 5MB.' });
    }

    const admin = createAdminClient();

    // Check garment cap
    const { count } = await admin
      .from('wardrobe_garments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const accountType = user.accountType || 'free';
    const cap = GARMENT_CAPS[accountType] || GARMENT_CAPS.free;

    if (count >= cap) {
      return res.status(403).json({
        error: `Garment limit reached (${count}/${cap}). Upgrade your plan for more.`,
        count,
        cap,
      });
    }

    // Process image (bg removal + resize + WebP)
    const { cleanBuffer, actualMimeType } = await processGarmentImage(buffer, mimeType);

    // Generate garment ID for storage path
    const garmentId = randomUUID();
    const storagePath = `${user.id}/${garmentId}.webp`;

    // Upload to Supabase Storage
    const { error: uploadError } = await admin.storage
      .from('wardrobe-items')
      .upload(storagePath, cleanBuffer, {
        contentType: actualMimeType || 'image/webp',
        upsert: false,
      });

    if (uploadError) {
      logger.error(`Storage upload failed: ${uploadError.message}`);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    // Get public URL
    const { data: { publicUrl } } = admin.storage
      .from('wardrobe-items')
      .getPublicUrl(storagePath);

    // Create garment record
    const { data: garment, error: insertError } = await admin
      .from('wardrobe_garments')
      .insert({
        id: garmentId,
        user_id: user.id,
        image_url: publicUrl,
        storage_path: storagePath,
        is_analyzed: false,
        analysis_failed: false,
      })
      .select()
      .single();

    if (insertError) {
      logger.error(`Garment insert failed: ${insertError.message}`);
      return res.status(500).json({ error: 'Failed to create garment record' });
    }

    return res.json({ garment, count: (count || 0) + 1, cap });
  } catch (err) {
    const log = makeLogger(req);
    log.error(`Garment upload error: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Upload failed' });
  }
}


// ────────────────────────────────────────────────────────────────────
// DELETE /api/wardrobe/garments/:id
// ────────────────────────────────────────────────────────────────────

export async function deleteGarmentHandler(req, res) {
  const authResult = await getUserFromRequest(req, res);
  if ('error' in authResult) return res.status(authResult.status).json({ error: authResult.error });
  const user = authResult.user;

  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Garment ID required' });

  try {
    const admin = createAdminClient();

    // Verify ownership
    const { data: garment } = await admin
      .from('wardrobe_garments')
      .select('id, storage_path, user_id')
      .eq('id', id)
      .single();

    if (!garment || garment.user_id !== user.id) {
      return res.status(403).json({ error: 'Not found or not authorized' });
    }

    // Delete from storage
    await admin.storage.from('wardrobe-items').remove([garment.storage_path]);

    // Mark affected outfits as stale
    const { data: affectedOutfits } = await admin
      .from('wardrobe_outfits')
      .select('id, garment_ids')
      .eq('user_id', user.id)
      .contains('garment_ids', [id]);

    if (affectedOutfits?.length > 0) {
      const outfitIds = affectedOutfits.map(o => o.id);
      await admin.from('wardrobe_outfits')
        .update({ is_stale: true })
        .in('id', outfitIds);
    }

    // Delete garment record
    await admin.from('wardrobe_garments').delete().eq('id', id);

    return res.json({ success: true, stale_outfits: affectedOutfits?.length || 0 });
  } catch (err) {
    logger.error(`Garment delete error: ${err.message}`);
    return res.status(500).json({ error: 'Delete failed' });
  }
}


// ────────────────────────────────────────────────────────────────────
// GET /api/wardrobe/garments
// ────────────────────────────────────────────────────────────────────

export async function listGarmentsHandler(req, res) {
  const authResult = await getUserFromRequest(req, res);
  if ('error' in authResult) return res.status(authResult.status).json({ error: authResult.error });
  const user = authResult.user;

  try {
    const admin = createAdminClient();

    const { data: garments, error } = await admin
      .from('wardrobe_garments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group by category and compute counts
    const counts = {};
    for (const g of garments) {
      const cat = g.garment_category || 'uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    }

    const accountType = user.accountType || 'free';
    const cap = GARMENT_CAPS[accountType] || GARMENT_CAPS.free;

    return res.json({
      garments,
      counts,
      total: garments.length,
      cap,
    });
  } catch (err) {
    logger.error(`List garments error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch garments' });
  }
}


// ────────────────────────────────────────────────────────────────────
// POST /api/wardrobe/sync — SSE streaming
// ────────────────────────────────────────────────────────────────────

export async function syncWardrobeHandler(req, res) {
  const authResult = await getUserFromRequest(req, res);
  if ('error' in authResult) return res.status(authResult.status).json({ error: authResult.error });
  const user = authResult.user;

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Track client disconnect to abort work
  let aborted = false;
  req.on('close', () => { aborted = true; });

  try {
    const admin = createAdminClient();

    // Fetch user profile for personalization
    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (aborted) return res.end();

    await runWardrobeSync(user.id, profile, res, () => aborted);
  } catch (err) {
    if (!aborted) {
      logger.error(`Wardrobe sync error: ${err.message}`);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Sync failed' })}\n\n`);
    }
  } finally {
    res.end();
  }
}


// ────────────────────────────────────────────────────────────────────
// GET /api/wardrobe/outfits
// ────────────────────────────────────────────────────────────────────

export async function listOutfitsHandler(req, res) {
  const authResult = await getUserFromRequest(req, res);
  if ('error' in authResult) return res.status(authResult.status).json({ error: authResult.error });
  const user = authResult.user;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  try {
    const admin = createAdminClient();

    // Get total count
    const { count: total } = await admin
      .from('wardrobe_outfits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_stale', false);

    // Get paginated outfits
    const { data: outfits, error } = await admin
      .from('wardrobe_outfits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_stale', false)
      .order('display_score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Fetch garment details for each outfit
    const allGarmentIds = [...new Set(outfits.flatMap(o => o.garment_ids))];

    let garmentMap = {};
    if (allGarmentIds.length > 0) {
      const { data: garments } = await admin
        .from('wardrobe_garments')
        .select('*')
        .in('id', allGarmentIds);

      if (garments) {
        garmentMap = Object.fromEntries(garments.map(g => [g.id, g]));
      }
    }

    // Attach garment objects to outfits
    const enrichedOutfits = outfits.map(o => ({
      ...o,
      garments: o.garment_ids.map(id => garmentMap[id]).filter(Boolean),
    }));

    return res.json({
      outfits: enrichedOutfits,
      total: total || 0,
      hasMore: offset + limit < (total || 0),
    });
  } catch (err) {
    logger.error(`List outfits error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch outfits' });
  }
}


// ────────────────────────────────────────────────────────────────────
// POST /api/wardrobe/chat
// ────────────────────────────────────────────────────────────────────

export async function chatHandler(req, res) {
  const authResult = await getUserFromRequest(req, res);
  if ('error' in authResult) return res.status(authResult.status).json({ error: authResult.error });
  const user = authResult.user;

  const { message, session_id, button_filter } = req.body;

  if (!message && !button_filter) {
    return res.status(400).json({ error: 'Message or button_filter required' });
  }

  try {
    const admin = createAdminClient();

    // Load or create session
    let session;
    if (session_id) {
      const { data } = await admin
        .from('wardrobe_chat_sessions')
        .select('*')
        .eq('id', session_id)
        .eq('user_id', user.id)
        .single();
      session = data;
    }

    if (!session) {
      const { data: newSession } = await admin
        .from('wardrobe_chat_sessions')
        .insert({ user_id: user.id, active_filters: {}, messages: [] })
        .select()
        .single();
      session = newSession;
    }

    // Load all user outfits
    const { data: allOutfits } = await admin
      .from('wardrobe_outfits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_stale', false)
      .order('display_score', { ascending: false });

    // Process chat message
    const result = await processChatMessage({
      message,
      buttonFilter: button_filter,
      sessionFilters: session.active_filters,
      conversationHistory: session.messages,
      allOutfits: allOutfits || [],
      stiriProducts: [], // Could load from templates if needed
      userProfile: user,
    });

    // Update session
    const updatedMessages = [...(session.messages || [])];
    if (message) {
      updatedMessages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
    }
    updatedMessages.push({
      role: 'assistant',
      content: result.message,
      outfits: result.outfits.map(o => o.id),
      refinement_buttons: result.refinement_buttons,
      timestamp: new Date().toISOString(),
    });

    await admin.from('wardrobe_chat_sessions').update({
      active_filters: result.filters,
      messages: updatedMessages,
    }).eq('id', session.id);

    // Enrich outfits with garments
    const allGarmentIds = [...new Set(result.outfits.flatMap(o => o.garment_ids))];
    let garmentMap = {};
    if (allGarmentIds.length > 0) {
      const { data: garments } = await admin
        .from('wardrobe_garments')
        .select('*')
        .in('id', allGarmentIds);
      if (garments) garmentMap = Object.fromEntries(garments.map(g => [g.id, g]));
    }

    const enrichedOutfits = result.outfits.map(o => ({
      ...o,
      garments: o.garment_ids.map(id => garmentMap[id]).filter(Boolean),
    }));

    return res.json({
      session_id: session.id,
      outfits: enrichedOutfits,
      refinement_buttons: result.refinement_buttons,
      stiri_recommendation: result.stiri_recommendation,
      message: result.message,
    });
  } catch (err) {
    logger.error(`Wardrobe chat error: ${err.message}`);
    return res.status(500).json({ error: 'Chat failed' });
  }
}


// ────────────────────────────────────────────────────────────────────
// GET /api/wardrobe/gaps
// ────────────────────────────────────────────────────────────────────

export async function gapsHandler(req, res) {
  const authResult = await getUserFromRequest(req, res);
  if ('error' in authResult) return res.status(authResult.status).json({ error: authResult.error });
  const user = authResult.user;

  try {
    const admin = createAdminClient();

    const { data: profile } = await admin
      .from('wardrobe_style_profile')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return res.json({ gaps: [], total_garments: 0 });
    }

    return res.json({
      gaps: profile.identified_gaps || [],
      total_garments: profile.total_garments,
      category_counts: profile.category_counts,
    });
  } catch (err) {
    logger.error(`Gaps fetch error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch gaps' });
  }
}
