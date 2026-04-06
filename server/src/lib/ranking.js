/**
 * Personalization Ranking Engine
 *
 * Core scoring functions for the For-You feed.
 * Reference: docs/PERSONALIZATION_MODEL.md §5-§8
 *
 * Final score = (w_style × S_style) + (w_user × S_user) + (w_pop × S_pop)
 *             + B_new + B_seasonal + B_boost − P_fatigue
 */

// ── Event weights for affinity computation ────────────────────────
const EVENT_WEIGHTS = {
  view: 1,
  try_on: 3,
  wishlist: 4,
  cart_add: 5,
  purchase: 7,
};

// ── Dimension weights for style DNA matching ───────────────────────
const DIMENSION_WEIGHTS = {
  style_tags: 1.5,
  color_family: 1.2,
  occasion: 1.0,
  season: 0.8,
  body_type_fit: 1.3,
  skin_tone_complement: 1.1,
  age_group: 0.9,
  garment_type: 1.0,
  garment_category: 1.0,
  fit_silhouette: 0.8,
  pattern: 0.7,
  fabric: 0.6,
  price_tier: 0.9,
  gender: 1.4,
  trend_tag: 0.5,
};

// ── Cold-start data maturity weights ───────────────────────────────
// (events, days) → { style, user, pop } weight overrides
const DATA_MATURITY_THRESHOLDS = [
  { maxEvents: 5, style: 0.85, user: 0.05, pop: 0.10 },
  { maxEvents: 20, style: 0.75, user: 0.10, pop: 0.15 },
  { maxEvents: 50, style: 0.60, user: 0.20, pop: 0.20 },
  // Above 50 events: use self-tuned weights from ranking_weights table
];


// ────────────────────────────────────────────────────────────────────
// §5.1 Style DNA Match — S_style ∈ [0,1]
// ────────────────────────────────────────────────────────────────────

/**
 * Compute style DNA match between a user profile and a product.
 * Uses weighted Jaccard similarity across all tag dimensions.
 *
 * @param {object} userProfile - profiles row (style_preferences, body_type, skin_tone, etc.)
 * @param {object} product     - templates row with style dimensions
 * @returns {number} score in [0,1]
 */
export function styleDnaMatch(userProfile, product) {
  if (!userProfile || !product) return 0;

  // Map profile fields to product dimensions
  const dimensionPairs = buildDimensionPairs(userProfile, product);

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [dimName, { userSet, productSet }] of Object.entries(dimensionPairs)) {
    const w = DIMENSION_WEIGHTS[dimName] || 1.0;
    totalWeight += w;

    if (!userSet.length || !productSet.length) continue;

    const intersection = userSet.filter((t) => productSet.includes(t)).length;
    const union = new Set([...userSet, ...productSet]).size;
    if (union === 0) continue;

    weightedSum += w * (intersection / union);
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Map user profile fields to corresponding product catalog dimensions.
 * Returns { dimensionName: { userSet: string[], productSet: string[] } }
 */
function buildDimensionPairs(profile, product) {
  const prefs = profile.style_preferences || {};

  const toArr = (v) => {
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string' && v) return [v];
    return [];
  };

  return {
    style_tags: {
      userSet: toArr(prefs.preferred_styles || prefs.style_tags),
      productSet: toArr(product.style_tags),
    },
    color_family: {
      userSet: toArr(prefs.preferred_colors || prefs.color_family),
      productSet: toArr(product.color_family),
    },
    occasion: {
      userSet: toArr(prefs.occasions || prefs.occasion),
      productSet: toArr(product.occasion),
    },
    season: {
      userSet: toArr(prefs.seasons || prefs.season),
      productSet: toArr(product.season),
    },
    body_type_fit: {
      userSet: toArr(profile.body_type),
      productSet: toArr(product.body_type_fit),
    },
    skin_tone_complement: {
      userSet: toArr(profile.skin_tone),
      productSet: toArr(product.skin_tone_complement),
    },
    age_group: {
      userSet: toArr(prefs.age_group || profile.age_group),
      productSet: toArr(product.age_group),
    },
    garment_type: {
      userSet: toArr(prefs.garment_type),
      productSet: toArr(product.garment_type),
    },
    garment_category: {
      userSet: toArr(prefs.garment_category),
      productSet: toArr(product.garment_category),
    },
    fit_silhouette: {
      userSet: toArr(prefs.fit_silhouette),
      productSet: toArr(product.fit_silhouette),
    },
    pattern: {
      userSet: toArr(prefs.pattern),
      productSet: toArr(product.pattern),
    },
    fabric: {
      userSet: toArr(prefs.fabric),
      productSet: toArr(product.fabric),
    },
    price_tier: {
      userSet: toArr(prefs.price_tier),
      productSet: toArr(product.price_tier),
    },
    gender: {
      userSet: toArr(profile.gender),
      productSet: toArr(product.gender),
    },
    trend_tag: {
      userSet: toArr(prefs.trend_tag),
      productSet: toArr(product.trend_tag),
    },
  };
}


// ────────────────────────────────────────────────────────────────────
// §5.2 User Click Affinity — S_user ∈ [0,1]
// ────────────────────────────────────────────────────────────────────

/**
 * Compute click-based affinity between a user's click profile and a product.
 * Uses tag_affinities from user_click_profile (pre-aggregated nightly).
 *
 * @param {object} clickProfile - user_click_profile row
 * @param {object} product      - templates row with style dimensions
 * @returns {number} score in [0,1]
 */
export function userClickAffinity(clickProfile, product) {
  if (!clickProfile?.tag_affinities) return 0;

  const affinities = clickProfile.tag_affinities;
  const productTags = collectProductTags(product);

  if (productTags.length === 0) return 0;

  let sum = 0;
  for (const tag of productTags) {
    sum += affinities[tag] || 0;
  }

  // Normalize: average of matching tag affinities, capped at 1
  return Math.min(sum / productTags.length, 1);
}

/**
 * Collect all tags from a product into a flat list.
 */
function collectProductTags(product) {
  const tags = [];
  const arrayFields = [
    'style_tags', 'color_family', 'occasion', 'season', 'body_type_fit',
    'skin_tone_complement', 'age_group', 'trend_tag', 'sustainability',
  ];
  const scalarFields = [
    'garment_type', 'garment_category', 'fit_silhouette', 'pattern',
    'fabric', 'price_tier', 'gender', 'neckline', 'sleeve_length',
    'length', 'embellishment', 'brand_tier', 'color_intensity',
    'layering', 'care_level', 'origin_aesthetic', 'weight',
    'transparency', 'versatility',
  ];

  for (const f of arrayFields) {
    if (Array.isArray(product[f])) tags.push(...product[f]);
  }
  for (const f of scalarFields) {
    if (product[f]) tags.push(product[f]);
  }
  return tags;
}


// ────────────────────────────────────────────────────────────────────
// §5.3 Product Popularity — S_pop ∈ [0,1]
// ────────────────────────────────────────────────────────────────────

/**
 * Return the pre-computed popularity score for a product.
 * This is normalized during the nightly cron to [0,1].
 *
 * @param {object} productStats - product_click_stats row
 * @returns {number}
 */
export function productPopularity(productStats) {
  return productStats?.popularity_score ?? 0;
}


// ────────────────────────────────────────────────────────────────────
// §6 Bonus & Penalty Signals
// ────────────────────────────────────────────────────────────────────

/**
 * New arrival boost: +0.15 for products published within last 7 days.
 * §6.2
 */
export function newArrivalBoost(product) {
  if (!product.is_new_arrival) return 0;
  if (!product.created_at) return 0;

  const daysSince = (Date.now() - new Date(product.created_at).getTime()) / 86_400_000;
  return daysSince <= 7 ? 0.15 : 0;
}

/**
 * Seasonal boost — configurable stub.
 * §6.3 — Returns 0 until seasonal config is set up.
 */
export function getSeasonalBoost(/* product, config */) {
  return 0;
}

/**
 * Fatigue penalty: reduces score for products the user has seen recently.
 * §6.4 — Uses recent_impressions from user_click_profile.
 *
 * @param {string} productId
 * @param {string[]} recentImpressions - array of recently viewed product IDs
 * @returns {number} penalty ∈ [0, 0.30]
 */
export function fatiguePenalty(productId, recentImpressions) {
  if (!Array.isArray(recentImpressions) || recentImpressions.length === 0) return 0;

  const idx = recentImpressions.indexOf(productId);
  if (idx === -1) return 0;

  // Linear decay: most recent = highest penalty (0.30), decaying to 0
  const recency = 1 - idx / recentImpressions.length;
  return recency * 0.30;
}


// ────────────────────────────────────────────────────────────────────
// §7 Data Maturity Weights (Cold Start)
// ────────────────────────────────────────────────────────────────────

/**
 * Determine effective weight overrides based on user's data maturity.
 *
 * @param {number} totalEvents - total events from user_click_profile
 * @returns {{ style: number, user: number, pop: number } | null}
 *   null means "use self-tuned weights"
 */
export function dataMaturityWeights(totalEvents) {
  for (const t of DATA_MATURITY_THRESHOLDS) {
    if (totalEvents <= t.maxEvents) {
      return { style: t.style, user: t.user, pop: t.pop };
    }
  }
  return null; // Use self-tuned weights
}


// ────────────────────────────────────────────────────────────────────
// §8 Final Ranking
// ────────────────────────────────────────────────────────────────────

/**
 * Rank a list of products for a user.
 *
 * @param {object} params
 * @param {object}      params.userProfile       - profiles row
 * @param {object|null} params.clickProfile      - user_click_profile row (null for anonymous)
 * @param {object[]}    params.products          - templates rows with style dimensions
 * @param {object}      params.productStatsMap   - { product_id: product_click_stats row }
 * @param {object}      params.activeWeights     - ranking_weights row (is_active=true)
 * @param {object[]}    params.boosts            - admin_boost_queue active rows
 * @returns {{ product: object, score: number, isExploration: boolean }[]}
 */
export function rankProducts({
  userProfile,
  clickProfile,
  products,
  productStatsMap,
  activeWeights,
  boosts,
}) {
  const totalEvents = clickProfile
    ? (clickProfile.total_views || 0) + (clickProfile.total_try_ons || 0) +
      (clickProfile.total_wishlists || 0) + (clickProfile.total_cart_adds || 0) +
      (clickProfile.total_purchases || 0)
    : 0;

  // Decide weights: data maturity override or self-tuned
  const maturity = dataMaturityWeights(totalEvents);
  const wStyle = maturity ? maturity.style : Number(activeWeights.w_style);
  const wUser = maturity ? maturity.user : Number(activeWeights.w_user_clicks);
  const wPop = maturity ? maturity.pop : Number(activeWeights.w_product_pop);

  const recentImpressions = clickProfile?.recent_impressions || [];
  const boostMap = new Map(boosts.map((b) => [b.product_id, b]));

  const scored = products.map((product) => {
    const productId = product.id;
    const sStyle = styleDnaMatch(userProfile, product);
    const sUser = userClickAffinity(clickProfile, product);
    const sPop = productPopularity(productStatsMap[productId]);
    const bNew = newArrivalBoost(product);
    const bSeasonal = getSeasonalBoost(product);
    const pFatigue = fatiguePenalty(productId, recentImpressions);

    // Admin boost: inject if style match exceeds minimum threshold
    let bBoost = 0;
    const boost = boostMap.get(productId);
    if (boost && sStyle >= Number(boost.min_style_match)) {
      bBoost = 0.20 + (boost.priority - 1) * 0.05; // priority 1=+0.20, 2=+0.25, 3=+0.30, etc.
    }

    const score =
      wStyle * sStyle +
      wUser * sUser +
      wPop * sPop +
      bNew +
      bSeasonal +
      bBoost -
      pFatigue;

    return { product, score, isExploration: false };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}


// ────────────────────────────────────────────────────────────────────
// §8.2 Exploration Slot Injection
// ────────────────────────────────────────────────────────────────────

/**
 * Inject exploration slots into the ranked results.
 * Every Nth position is replaced with a random low-score product.
 * §8.2 — Fixed positions approach.
 *
 * @param {{ product: object, score: number, isExploration: boolean }[]} ranked
 * @param {number} explorationRate - insert every N items (default: 5)
 * @returns {{ product: object, score: number, isExploration: boolean }[]}
 */
export function injectExplorationSlots(ranked, explorationRate = 5) {
  if (ranked.length < explorationRate * 2) return ranked;

  // Take bottom 20% as exploration candidates
  const cutoff = Math.floor(ranked.length * 0.8);
  const exploreCandidates = ranked.slice(cutoff);
  const mainItems = ranked.slice(0, cutoff);

  // Shuffle exploration candidates (Fisher-Yates)
  for (let i = exploreCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [exploreCandidates[i], exploreCandidates[j]] = [exploreCandidates[j], exploreCandidates[i]];
  }

  const result = [];
  let exploreIdx = 0;

  for (let i = 0; i < mainItems.length; i++) {
    if ((i + 1) % explorationRate === 0 && exploreIdx < exploreCandidates.length) {
      const ex = exploreCandidates[exploreIdx++];
      result.push({ ...ex, isExploration: true });
    }
    result.push(mainItems[i]);
  }

  return result;
}

export { EVENT_WEIGHTS };
