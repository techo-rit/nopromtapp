/**
 * Feed Route — GET /api/feed/for-you
 *
 * Returns a personalized product feed for the current user.
 * Auth optional: anonymous users get popularity-based cold start.
 * 60s in-memory cache per user.
 * Reference: docs/PERSONALIZATION_MODEL.md §8, §12
 */

import { createAdminClient, getUserFromRequest } from '../lib/auth.js';
import { createTtlCache } from '../lib/cache.js';
import { feedCache } from '../lib/feedCache.js';
import {
  rankProducts,
  injectExplorationSlots,
} from '../lib/ranking.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function feedHandler(req, res) {
  try {
    const supabase = createAdminClient();

    // Auth optional — try to get user, but don't fail if not logged in
    let userId = null;
    let userProfile = null;
    let clickProfile = null;

    try {
      const authResult = await getUserFromRequest(req, res);
      if (!('error' in authResult)) {
        userId = authResult.user.id;
      }
    } catch {
      // Anonymous user — that's fine
    }

    // Parse query params
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    // Check cache
    const cacheKey = `${userId || 'anon'}:${limit}:${offset}`;
    const cached = feedCache.get(cacheKey);
    if (cached) return res.json(cached);

    // Fetch all available products from templates
    const { data: products, error: productsError } = await supabase
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .eq('available_for_sale', true);

    if (productsError || !products?.length) {
      return res.json({ items: [], total: 0, hasMore: false });
    }

    // Parallel fetch: product stats, weights, boosts, and user data (all independent)
    const productIds = products.map((p) => p.id);
    const parallelQueries = [
      supabase.from('product_click_stats').select('*').in('product_id', productIds),
      supabase.from('ranking_weights').select('*').eq('is_active', true).single(),
      supabase.from('admin_boost_queue').select('*').gt('expires_at', new Date().toISOString()),
    ];

    if (userId) {
      parallelQueries.push(
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_click_profile').select('*').eq('user_id', userId).single(),
      );
    }

    const results = await Promise.all(parallelQueries);

    const productStatsMap = {};
    for (const s of (results[0].data || [])) {
      productStatsMap[s.product_id] = s;
    }

    const weights = results[1].data || { w_style: 0.75, w_user_clicks: 0.10, w_product_pop: 0.15 };
    const boosts = results[2].data || [];

    if (userId) {
      userProfile = results[3]?.data;
      clickProfile = results[4]?.data;
    }

    // If no user profile, create minimal one for cold start
    if (!userProfile) {
      userProfile = { style_preferences: {} };
    }

    // Rank products
    let ranked = rankProducts({
      userProfile,
      clickProfile,
      products,
      productStatsMap,
      activeWeights: weights,
      boosts: boosts || [],
    });

    // Inject exploration slots
    ranked = injectExplorationSlots(ranked);

    // Paginate
    const total = ranked.length;
    const paged = ranked.slice(offset, offset + limit);

    const response = {
      items: paged.map((r) => ({
        product_id: r.product.id,
        title: r.product.title,
        image: r.product.image,
        score: Math.round(r.score * 1000) / 1000,
        isExploration: r.isExploration,
        style_tags: r.product.style_tags,
        color_family: r.product.color_family,
        occasion: r.product.occasion,
        garment_type: r.product.garment_type,
        min_price: r.product.min_price,
        max_price: r.product.max_price,
        is_new_arrival: r.product.is_new_arrival,
      })),
      total,
      hasMore: offset + limit < total,
    };

    feedCache.set(cacheKey, response);
    return res.json(response);
  } catch (err) {
    console.error('[feed] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
