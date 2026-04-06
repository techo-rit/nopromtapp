/**
 * Ranking Cron — Nightly recomputation tasks
 *
 * Called from an external cron trigger (e.g., Supabase pg_cron or external scheduler).
 * Reference: docs/PERSONALIZATION_MODEL.md §9-§11
 *
 * Tasks:
 * 1. Recompute tag_affinities for all user_click_profiles
 * 2. Recompute product_click_stats recent counts + popularity scores
 * 3. Self-tuning feedback loop (adjust ranking weights)
 * 4. Compute health metrics
 * 5. Housekeeping (prune impressions, expire boosts, archive old events, expire new arrivals)
 */

import { EVENT_WEIGHTS } from './ranking.js';

const RECENT_WINDOW_DAYS = 7;
const MAX_IMPRESSIONS = 200;
const EVENT_ARCHIVE_DAYS = 90;

// ────────────────────────────────────────────────────────────────
// 1. Recompute User Tag Affinities
// ────────────────────────────────────────────────────────────────

/**
 * For each user with events_since_compute > 0, recompute tag_affinities
 * from recent click_events joined with templates tag dimensions.
 */
export async function recomputeTagAffinities(supabase) {
  // Get users needing recomputation
  const { data: users, error: usersError } = await supabase
    .from('user_click_profile')
    .select('user_id')
    .gt('events_since_compute', 0);

  if (usersError) {
    console.error('[cron] Failed to fetch users:', usersError.message);
    return { processed: 0, errors: 0 };
  }

  if (!users || users.length === 0) return { processed: 0, errors: 0 };

  let processed = 0;
  let errors = 0;

  for (const { user_id } of users) {
    try {
      await recomputeUserAffinities(supabase, user_id);
      processed++;
    } catch (err) {
      console.error(`[cron] Affinity recompute failed for ${user_id}:`, err.message);
      errors++;
    }
  }

  return { processed, errors };
}

async function recomputeUserAffinities(supabase, userId) {
  // Fetch recent events (last 90 days)
  const cutoff = new Date(Date.now() - EVENT_ARCHIVE_DAYS * 86_400_000).toISOString();

  const { data: events } = await supabase
    .from('click_events')
    .select('product_id, event_type, created_at')
    .eq('user_id', userId)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (!events?.length) return;

  // Fetch product tags for these products
  const productIds = [...new Set(events.map((e) => e.product_id))];
  const { data: products } = await supabase
    .from('templates')
    .select('id, style_tags, color_family, occasion, season, garment_type, garment_category, body_type_fit, skin_tone_complement, age_group, trend_tag, pattern, fabric, price_tier, gender, fit_silhouette')
    .in('id', productIds);

  const productMap = new Map((products || []).map((p) => [p.id, p]));

  // Compute tag affinities
  const tagScores = {};
  const tagCounts = {};

  // Track event totals
  let totalViews = 0, totalTryOns = 0, totalWishlists = 0, totalCartAdds = 0, totalPurchases = 0;

  for (const event of events) {
    const weight = EVENT_WEIGHTS[event.event_type] || 1;
    const product = productMap.get(event.product_id);

    // Time decay: events older than 30 days get 50% weight
    const ageMs = Date.now() - new Date(event.created_at).getTime();
    const dayAge = ageMs / 86_400_000;
    const timeDecay = dayAge > 30 ? 0.5 : 1.0;

    const effectiveWeight = weight * timeDecay;

    // Count event types
    switch (event.event_type) {
      case 'view': totalViews++; break;
      case 'try_on': totalTryOns++; break;
      case 'wishlist': totalWishlists++; break;
      case 'cart_add': totalCartAdds++; break;
      case 'purchase': totalPurchases++; break;
    }

    if (!product) continue;

    // Accumulate scores per tag
    const tags = collectAllTags(product);
    for (const tag of tags) {
      tagScores[tag] = (tagScores[tag] || 0) + effectiveWeight;
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  // Normalize tag affinities to [0,1]
  const maxScore = Math.max(...Object.values(tagScores), 1);
  const affinities = {};
  for (const [tag, score] of Object.entries(tagScores)) {
    affinities[tag] = Math.round((score / maxScore) * 1000) / 1000;
  }

  // Compute engagement ratio
  const totalHigh = totalTryOns + totalWishlists + totalCartAdds + totalPurchases;
  const totalAll = totalViews + totalHigh;
  const engagementRatio = totalAll > 0 ? totalHigh / totalAll : 0;

  // Update user_click_profile
  const { error } = await supabase
    .from('user_click_profile')
    .upsert({
      user_id: userId,
      tag_affinities: affinities,
      total_views: totalViews,
      total_try_ons: totalTryOns,
      total_wishlists: totalWishlists,
      total_cart_adds: totalCartAdds,
      total_purchases: totalPurchases,
      engagement_ratio: Math.round(engagementRatio * 10000) / 10000,
      last_computed_at: new Date().toISOString(),
      events_since_compute: 0,
    }, { onConflict: 'user_id' });

  if (error) throw error;
}

function collectAllTags(product) {
  const tags = [];
  const arrFields = ['style_tags', 'color_family', 'occasion', 'season', 'body_type_fit', 'skin_tone_complement', 'age_group', 'trend_tag'];
  const scalarFields = ['garment_type', 'garment_category', 'pattern', 'fabric', 'price_tier', 'gender', 'fit_silhouette'];

  for (const f of arrFields) {
    if (Array.isArray(product[f])) tags.push(...product[f]);
  }
  for (const f of scalarFields) {
    if (product[f]) tags.push(product[f]);
  }
  return tags;
}


// ────────────────────────────────────────────────────────────────
// 2. Recompute Product Click Stats
// ────────────────────────────────────────────────────────────────

/**
 * Recompute recent counts and popularity_score for all products
 * that received events recently.
 */
export async function recomputeProductStats(supabase) {
  const recentCutoff = new Date(Date.now() - RECENT_WINDOW_DAYS * 86_400_000).toISOString();

  // Get all products with recent events
  const { data: recentProducts } = await supabase
    .from('click_events')
    .select('product_id')
    .gte('created_at', recentCutoff);

  if (!recentProducts?.length) return { processed: 0 };

  const uniqueIds = [...new Set(recentProducts.map((r) => r.product_id))];

  let processed = 0;

  for (const productId of uniqueIds) {
    try {
      // Get lifetime counts
      const { data: lifetimeEvents } = await supabase
        .from('click_events')
        .select('event_type')
        .eq('product_id', productId);

      // Get recent counts
      const { data: recentEvents } = await supabase
        .from('click_events')
        .select('event_type')
        .eq('product_id', productId)
        .gte('created_at', recentCutoff);

      const lifetime = countByType(lifetimeEvents || []);
      const recent = countByType(recentEvents || []);

      // Popularity = weighted sum of recent events, normalized later
      const rawPopularity =
        (recent.view || 0) * 1 +
        (recent.try_on || 0) * 3 +
        (recent.wishlist || 0) * 4 +
        (recent.cart_add || 0) * 5 +
        (recent.purchase || 0) * 7;

      const { error } = await supabase
        .from('product_click_stats')
        .upsert({
          product_id: productId,
          view_count: lifetime.view || 0,
          try_on_count: lifetime.try_on || 0,
          wishlist_count: lifetime.wishlist || 0,
          cart_add_count: lifetime.cart_add || 0,
          purchase_count: lifetime.purchase || 0,
          recent_views: recent.view || 0,
          recent_try_ons: recent.try_on || 0,
          recent_wishlists: recent.wishlist || 0,
          recent_carts: recent.cart_add || 0,
          recent_purchases: recent.purchase || 0,
          popularity_score: rawPopularity, // Will be normalized below
        }, { onConflict: 'product_id' });

      if (!error) processed++;
    } catch (err) {
      console.error(`[cron] Product stats failed for ${productId}:`, err.message);
    }
  }

  // Normalize popularity_score to [0,1] across all products
  await normalizePopularityScores(supabase);

  return { processed };
}

function countByType(events) {
  const counts = {};
  for (const e of events) {
    counts[e.event_type] = (counts[e.event_type] || 0) + 1;
  }
  return counts;
}

async function normalizePopularityScores(supabase) {
  // Get max popularity
  const { data } = await supabase
    .from('product_click_stats')
    .select('popularity_score')
    .order('popularity_score', { ascending: false })
    .limit(1)
    .single();

  const maxPop = data?.popularity_score || 1;
  if (maxPop <= 0) return;

  // Normalize all scores
  const { data: all } = await supabase
    .from('product_click_stats')
    .select('product_id, popularity_score');

  if (!all) return;

  for (const row of all) {
    const normalized = Math.round((Number(row.popularity_score) / maxPop) * 10000) / 10000;
    await supabase
      .from('product_click_stats')
      .update({ popularity_score: normalized })
      .eq('product_id', row.product_id);
  }
}


// ────────────────────────────────────────────────────────────────
// 3. Self-Tuning Feedback Loop
// ────────────────────────────────────────────────────────────────

/**
 * Adjust ranking weights based on global engagement ratio trends.
 * §10 — If engagement is improving, keep current direction.
 * If declining, shift more weight toward style match.
 */
export async function selfTuneWeights(supabase) {
  // Get current active weights
  const { data: current } = await supabase
    .from('ranking_weights')
    .select('*')
    .eq('is_active', true)
    .single();

  if (!current) {
    console.error('[cron] No active ranking weights found');
    return null;
  }

  // Compute global engagement ratio from all active users
  const { data: profiles } = await supabase
    .from('user_click_profile')
    .select('engagement_ratio')
    .gt('total_views', 10); // Only users with meaningful data

  if (!profiles?.length) return current;

  const avgEngagement =
    profiles.reduce((sum, p) => sum + Number(p.engagement_ratio), 0) / profiles.length;

  const prevEngagement = Number(current.engagement_ratio) || 0;
  const delta = avgEngagement - prevEngagement;

  // Step size for weight adjustment
  const step = 0.01;
  let wStyle = Number(current.w_style);
  let wUser = Number(current.w_user_clicks);
  let wPop = Number(current.w_product_pop);

  if (delta < -0.005) {
    // Engagement declining → increase style weight (more personalization)
    wStyle = Math.min(wStyle + step, 0.90);
    wUser = Math.max(wUser - step / 2, 0.05);
    wPop = Math.max(wPop - step / 2, 0.05);
  } else if (delta > 0.005) {
    // Engagement improving → slightly increase user_clicks weight
    wUser = Math.min(wUser + step, 0.40);
    wStyle = Math.max(wStyle - step / 2, 0.40);
    // Keep pop stable
  }
  // If delta is small, no change needed

  // Ensure weights sum to 1
  const total = wStyle + wUser + wPop;
  wStyle = Math.round((wStyle / total) * 1000) / 1000;
  wUser = Math.round((wUser / total) * 1000) / 1000;
  wPop = Math.round((1 - wStyle - wUser) * 1000) / 1000;

  // Deactivate old weights
  await supabase
    .from('ranking_weights')
    .update({ is_active: false })
    .eq('id', current.id);

  // Insert new weights
  const { data: newWeights, error } = await supabase
    .from('ranking_weights')
    .insert({
      w_style: wStyle,
      w_user_clicks: wUser,
      w_product_pop: wPop,
      engagement_ratio: Math.round(avgEngagement * 10000) / 10000,
      last_delta: {
        prev_engagement: prevEngagement,
        new_engagement: avgEngagement,
        delta,
        style_change: wStyle - Number(current.w_style),
        user_change: wUser - Number(current.w_user_clicks),
        pop_change: wPop - Number(current.w_product_pop),
      },
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('[cron] Failed to insert new weights:', error.message);
    // Re-activate old weights
    await supabase
      .from('ranking_weights')
      .update({ is_active: true })
      .eq('id', current.id);
    return current;
  }

  return newWeights;
}


// ────────────────────────────────────────────────────────────────
// 4. Compute Health Metrics
// ────────────────────────────────────────────────────────────────

/**
 * Compute and log nightly health metrics.
 * §11 — Tracks coverage, diversity, engagement, cold-start.
 */
export async function computeMetrics(supabase) {
  const metrics = [];
  const now = new Date().toISOString();

  // 4a. Catalog coverage — % of templates with at least 3 filled meta-tags
  const { data: allProducts } = await supabase
    .from('templates')
    .select('id, style_tags, color_family, occasion, garment_type, body_type_fit')
    .eq('is_active', true);

  const totalProducts = allProducts?.length || 0;
  const taggedProducts = (allProducts || []).filter((p) => {
    let filled = 0;
    if (p.style_tags?.length) filled++;
    if (p.color_family?.length) filled++;
    if (p.occasion?.length) filled++;
    if (p.garment_type) filled++;
    if (p.body_type_fit?.length) filled++;
    return filled >= 3;
  }).length;

  metrics.push({
    metric_name: 'catalog_coverage',
    metric_value: totalProducts > 0 ? taggedProducts / totalProducts : 0,
    target_value: 0.80,
    passed: totalProducts > 0 ? (taggedProducts / totalProducts) >= 0.80 : false,
    computed_at: now,
  });

  // 4b. Active users with click profiles
  const { count: profileCount } = await supabase
    .from('user_click_profile')
    .select('user_id', { count: 'exact', head: true })
    .gt('total_views', 0);

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  metrics.push({
    metric_name: 'user_profile_coverage',
    metric_value: totalUsers > 0 ? (profileCount || 0) / totalUsers : 0,
    target_value: 0.50,
    passed: totalUsers > 0 ? ((profileCount || 0) / totalUsers) >= 0.50 : false,
    computed_at: now,
  });

  // 4c. Average engagement ratio across active users
  const { data: engagementData } = await supabase
    .from('user_click_profile')
    .select('engagement_ratio')
    .gt('total_views', 10);

  const avgEngagement = engagementData?.length
    ? engagementData.reduce((s, e) => s + Number(e.engagement_ratio), 0) / engagementData.length
    : 0;

  metrics.push({
    metric_name: 'avg_engagement_ratio',
    metric_value: avgEngagement,
    target_value: 0.15,
    passed: avgEngagement >= 0.15,
    computed_at: now,
  });

  // Insert all metrics
  if (metrics.length > 0) {
    const { error } = await supabase.from('metrics_log').insert(metrics);
    if (error) console.error('[cron] Metrics insert failed:', error.message);
  }

  return metrics;
}


// ────────────────────────────────────────────────────────────────
// 5. Housekeeping
// ────────────────────────────────────────────────────────────────

/**
 * Run all housekeeping tasks:
 * - Prune old impressions from user_click_profile
 * - Expire old admin boosts
 * - Archive old click_events
 * - Expire new arrival flags (>7 days)
 */
export async function runHousekeeping(supabase) {
  const stats = { impressionsPruned: 0, boostsExpired: 0, eventsArchived: 0, arrivalsExpired: 0 };

  // 5a. Prune recent_impressions to MAX_IMPRESSIONS
  const { data: bloated } = await supabase
    .from('user_click_profile')
    .select('user_id, recent_impressions')
    .not('recent_impressions', 'eq', '[]');

  for (const profile of (bloated || [])) {
    const impressions = profile.recent_impressions || [];
    if (impressions.length > MAX_IMPRESSIONS) {
      const { error } = await supabase
        .from('user_click_profile')
        .update({ recent_impressions: impressions.slice(0, MAX_IMPRESSIONS) })
        .eq('user_id', profile.user_id);
      if (!error) stats.impressionsPruned++;
    }
  }

  // 5b. Delete expired boosts
  const { data: expired } = await supabase
    .from('admin_boost_queue')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  stats.boostsExpired = expired?.length || 0;

  // 5c. Archive old events (> EVENT_ARCHIVE_DAYS)
  const archiveCutoff = new Date(Date.now() - EVENT_ARCHIVE_DAYS * 86_400_000).toISOString();
  const { data: archived } = await supabase
    .from('click_events')
    .delete()
    .lt('created_at', archiveCutoff)
    .select('id');

  stats.eventsArchived = archived?.length || 0;

  // 5d. Expire new arrival flags (created > 7 days ago)
  const arrivalCutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: arrivals } = await supabase
    .from('templates')
    .update({ is_new_arrival: false })
    .eq('is_new_arrival', true)
    .lt('created_at', arrivalCutoff)
    .select('id');

  stats.arrivalsExpired = arrivals?.length || 0;

  return stats;
}


// ────────────────────────────────────────────────────────────────
// Master Cron Entry Point
// ────────────────────────────────────────────────────────────────

/**
 * Run all nightly cron tasks in sequence.
 * @param {object} supabase - admin Supabase client
 */
export async function runNightlyCron(supabase) {
  console.log('[cron] Starting nightly personalization cron...');
  const start = Date.now();

  const results = {};

  try {
    results.affinities = await recomputeTagAffinities(supabase);
    console.log('[cron] Tag affinities:', results.affinities);
  } catch (err) {
    console.error('[cron] Tag affinities failed:', err.message);
    results.affinities = { error: err.message };
  }

  try {
    results.productStats = await recomputeProductStats(supabase);
    console.log('[cron] Product stats:', results.productStats);
  } catch (err) {
    console.error('[cron] Product stats failed:', err.message);
    results.productStats = { error: err.message };
  }

  try {
    results.weights = await selfTuneWeights(supabase);
    console.log('[cron] Weights tuned:', results.weights);
  } catch (err) {
    console.error('[cron] Weight tuning failed:', err.message);
    results.weights = { error: err.message };
  }

  try {
    results.metrics = await computeMetrics(supabase);
    console.log('[cron] Metrics computed:', results.metrics?.length, 'metrics');
  } catch (err) {
    console.error('[cron] Metrics failed:', err.message);
    results.metrics = { error: err.message };
  }

  try {
    results.housekeeping = await runHousekeeping(supabase);
    console.log('[cron] Housekeeping:', results.housekeeping);
  } catch (err) {
    console.error('[cron] Housekeeping failed:', err.message);
    results.housekeeping = { error: err.message };
  }

  const durationMs = Date.now() - start;
  console.log(`[cron] Nightly cron completed in ${durationMs}ms`);

  return { ...results, durationMs };
}
