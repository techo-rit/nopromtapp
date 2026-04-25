/**
 * Wardrobe Sync Pipeline — Orchestrates full analysis → pairing → ranking → gaps.
 * See WARDROBE_MODEL.md §2 for pipeline specification.
 */

import { createAdminClient } from './auth.js';
import { analyzeGarmentsBatch } from './geminiWardrobe.js';
import { generateOutfits } from './outfitPairing.js';
import { generateVibeReport } from './vibeReport.js';
import { detectGaps } from './gapAnalysis.js';
const logger = { warn: console.warn.bind(console), error: console.error.bind(console) };

const WARDROBE_ACTIVATION_THRESHOLD = 10;

/**
 * Run the full wardrobe sync pipeline with SSE progress streaming.
 * @param {string} userId
 * @param {object} userProfile - profiles row
 * @param {object} res - Express response (for SSE)
 * @param {function} isAborted
 * @param {object} log - optional logger that writes to server.log
 */
export async function runWardrobeSync(userId, userProfile, res, isAborted = () => false, log = logger) {
  const admin = createAdminClient();

  const sendEvent = (type, data) => {
    if (isAborted()) return;
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    // ── Step 1: Fetch all garments ──
    const { data: allGarments, error: gErr } = await admin
      .from('wardrobe_garments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (gErr) throw gErr;

    // ── Step 2: Analyze unanalyzed garments ──
    // Retry analysis_failed garments too — previous failures may have been transient (network/API)
    const unanalyzed = allGarments.filter(g => !g.is_analyzed);

    if (unanalyzed.length > 0) {
      sendEvent('analyzing', { progress: 0, message: `Analyzing ${unanalyzed.length} garments...` });

      // Reset analysis_failed flag so this sync attempt is treated as fresh
      const failedIds = unanalyzed.filter(g => g.analysis_failed).map(g => g.id);
      if (failedIds.length > 0) {
        await admin.from('wardrobe_garments')
          .update({ analysis_failed: false })
          .in('id', failedIds);
      }

      // Fetch image buffers in parallel.
      // Primary: Supabase storage download. Fallback: direct HTTP fetch of the public URL.
      // NOTE: Gemini fileData.fileUri only works with Files API URIs, NOT arbitrary HTTPS URLs —
      // so we always need a real buffer; never rely on the fileData path.
      const garmentInputs = await Promise.all(unanalyzed.map(async (g) => {
        // Try storage SDK download first
        try {
          const { data: fileData } = await admin.storage
            .from('wardrobe-items')
            .download(g.storage_path);
          if (fileData) {
            const buffer = Buffer.from(await fileData.arrayBuffer());
            return { id: g.id, imageUrl: g.image_url, imageBuffer: buffer };
          }
        } catch { /* fall through to HTTP fetch */ }

        // Fallback: fetch the public URL directly as a buffer
        try {
          const { default: https } = await import('https');
          const { default: http } = await import('http');
          const imageBuffer = await new Promise((resolve, reject) => {
            const url = new URL(g.image_url);
            const client = url.protocol === 'https:' ? https : http;
            client.get(g.image_url, (res) => {
              const chunks = [];
              res.on('data', chunk => chunks.push(chunk));
              res.on('end', () => resolve(Buffer.concat(chunks)));
              res.on('error', reject);
            }).on('error', reject);
          });
          return { id: g.id, imageUrl: g.image_url, imageBuffer };
        } catch (fetchErr) {
          logger.warn(`Could not fetch image for garment ${g.id}: ${fetchErr.message}`);
          return { id: g.id, imageUrl: g.image_url, imageBuffer: null };
        }
      }));

      if (isAborted()) return;

      const analysisResults = await analyzeGarmentsBatch(garmentInputs, log);

      // Update garments with extracted attributes in parallel
      await Promise.all(analysisResults.map(async (result) => {
        if (result.attributes) {
          const attrs = result.attributes;
          await admin.from('wardrobe_garments').update({
            garment_type: attrs.garment_type,
            garment_category: attrs.garment_category,
            primary_color_hex: attrs.primary_color_hex,
            secondary_color_hex: attrs.secondary_color_hex,
            color_family: attrs.color_family,
            color_temperature: attrs.color_temperature,
            color_intensity: attrs.color_intensity,
            fit: attrs.fit,
            fit_silhouette: attrs.fit_silhouette,
            length: attrs.length,
            waist_position: attrs.waist_position,
            volume: attrs.volume,
            fabric: attrs.fabric,
            texture: attrs.texture,
            weight: attrs.weight,
            stretch: attrs.stretch ?? false,
            opacity: attrs.opacity,
            pattern: attrs.pattern,
            pattern_scale: attrs.pattern_scale,
            neckline: attrs.neckline,
            sleeve_length: attrs.sleeve_length,
            embellishment: attrs.embellishment,
            hardware: attrs.hardware ?? false,
            formality: attrs.formality ?? 0.5,
            occasion_tags: attrs.occasion_tags || [],
            aesthetic_tags: attrs.aesthetic_tags || [],
            season_tags: attrs.season_tags || [],
            perceived_quality: attrs.perceived_quality ?? 0.5,
            // 30-dimension classification fields
            style_tags: attrs.style_tags || [],
            body_type_fit: attrs.body_type_fit || [],
            skin_tone_complement: attrs.skin_tone_complement || [],
            age_group: attrs.age_group || [],
            trend_tag: attrs.trend_tag || [],
            sustainability: attrs.sustainability || [],
            price_tier: attrs.price_tier,
            gender: attrs.gender,
            brand_tier: attrs.brand_tier,
            layering: attrs.layering,
            care_level: attrs.care_level,
            origin_aesthetic: attrs.origin_aesthetic,
            versatility: attrs.versatility,
            is_analyzed: true,
          }).eq('id', result.id);
        } else {
          // Mark as failed
          await admin.from('wardrobe_garments').update({
            analysis_failed: true,
          }).eq('id', result.id);
          log.warn(`Garment ${result.id} analysis failed: ${result.error}`);
        }
      }));

      if (isAborted()) return;
      sendEvent('analyzing', { progress: 100, message: 'Analysis complete' });
    }

    // ── Step 3: Purge stale outfits ──
    await admin.from('wardrobe_outfits')
      .delete()
      .eq('user_id', userId)
      .eq('is_stale', true);

    // ── Step 4: Re-fetch analyzed garments ──
    const { data: analyzedGarments } = await admin
      .from('wardrobe_garments')
      .select('*')
      .eq('user_id', userId)
      .eq('is_analyzed', true);

    if (!analyzedGarments || analyzedGarments.length < WARDROBE_ACTIVATION_THRESHOLD) {
      sendEvent('complete', {
        message: `Need at least ${WARDROBE_ACTIVATION_THRESHOLD} analyzed garments to generate outfits. You have ${analyzedGarments?.length || 0}.`,
        garment_count: analyzedGarments?.length || 0,
      });
      return;
    }

    // ── Step 5: Generate outfit pairings ──
    if (isAborted()) return;
    sendEvent('pairing', { progress: 0, message: 'Creating outfit combinations...' });

    const outfits = generateOutfits(analyzedGarments, userProfile);

    sendEvent('pairing', { progress: 100, message: `Generated ${outfits.length} outfits` });

    // ── Step 6: Generate vibe reports ──
    if (isAborted()) return;
    sendEvent('ranking', { progress: 0, message: 'Crafting vibe reports...' });

    const userAccessories = analyzedGarments.filter(g => g.garment_category === 'accessory');

    // Delete existing non-stale outfits and replace with new ones
    await admin.from('wardrobe_outfits')
      .delete()
      .eq('user_id', userId);

    // Build all outfit rows and batch insert
    const outfitRows = outfits.map(outfit => {
      const vibe = generateVibeReport(outfit, outfit.garments, userProfile, userAccessories);
      return {
        user_id: userId,
        garment_ids: outfit.garment_ids,
        harmony_score: outfit.harmony_score,
        color_harmony: outfit.color_harmony,
        silhouette_balance: outfit.silhouette_balance,
        occasion_fit: outfit.occasion_fit,
        aesthetic_alignment: outfit.aesthetic_alignment,
        fabric_compatibility: outfit.fabric_compatibility,
        trend_factor: outfit.trend_factor,
        practicality: outfit.practicality,
        display_score: outfit.harmony_score,
        composite_tags: outfit.composite_tags,
        vibe_title: vibe.title,
        vibe_why: vibe.why,
        vibe_occasions: vibe.occasions,
        vibe_accessories: vibe.accessories,
        vibe_match_pct: vibe.match_pct,
      };
    });

    if (outfitRows.length > 0) {
      await admin.from('wardrobe_outfits').insert(outfitRows);
    }

    // ── Step 7: Compute wardrobe style profile + gaps ──
    const wardrobeProfile = computeWardrobeStyleProfile(analyzedGarments);
    const gaps = detectGaps(analyzedGarments, userProfile);

    await admin.from('wardrobe_style_profile').upsert({
      user_id: userId,
      tag_affinities: wardrobeProfile.tag_affinities,
      category_counts: wardrobeProfile.category_counts,
      total_garments: analyzedGarments.length,
      identified_gaps: gaps,
    });

    sendEvent('ranking', { progress: 100, message: 'Ranking complete' });

    sendEvent('complete', {
      message: 'Wardrobe synced successfully',
      outfit_count: outfits.length,
      garment_count: analyzedGarments.length,
      gap_count: gaps.length,
    });
  } catch (err) {
    log.error(`Wardrobe sync failed for user ${userId}: ${err.stack || err.message}`);
    sendEvent('error', { message: 'Sync failed. Please try again.' });
  }
}

/**
 * Compute wardrobe style profile from analyzed garments.
 * Aggregates tag affinities in same structure as user_click_profile.tag_affinities.
 */
export function computeWardrobeStyleProfile(garments) {
  const tagCounts = {};
  const categoryCounts = {};

  for (const g of garments) {
    // Category counts
    if (g.garment_category) {
      categoryCounts[g.garment_category] = (categoryCounts[g.garment_category] || 0) + 1;
    }

    // Aggregate tags
    const allTags = [
      ...(g.aesthetic_tags || []),
      ...(g.occasion_tags || []),
      ...(g.season_tags || []),
      g.color_family,
      g.garment_type,
      g.fit,
      g.fabric,
      g.pattern,
    ].filter(Boolean);

    for (const tag of allTags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  // Normalize to 0-1 affinities
  const total = garments.length || 1;
  const tag_affinities = {};
  for (const [tag, count] of Object.entries(tagCounts)) {
    tag_affinities[tag] = Math.round((count / total) * 1000) / 1000;
  }

  return { tag_affinities, category_counts: categoryCounts };
}
