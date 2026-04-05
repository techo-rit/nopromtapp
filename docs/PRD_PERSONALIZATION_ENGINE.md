# PRD: Stiri Personalization Engine

## Problem

Stiri's home feed is static — every user sees the same trending templates in the same order. Products are not ranked by relevance. There is no mechanism to learn from user behavior. The platform cannot act as a personal fashion advisor because it doesn't know what each user likes beyond 6 basic onboarding dimensions, and it doesn't track what they do after onboarding.

**Who this is for**: Every Stiri user. The feed should feel hand-curated — "this app knows my taste" — eliminating the need for a fashion designer/specialist to advise what suits them.

**What "done" looks like**: Every product in the catalog has a personalized rank for every user. The home feed is a vertical swipe-style "For You" page where each card fills the screen. The ranking improves with every interaction. An admin can inject clearance products into exploration slots.

---

## Solution

A **three-signal weighted-blend ranking engine** that scores every product for every user:

```
final_score = w_style × style_dna_match
            + w_user_clicks × user_click_affinity
            + w_product_pop × product_popularity
            + boost_suits_them
            + boost_exploration
            - penalty_fatigue
```

Where:
- **Style DNA match** — dot product of user profile vector (colors, styles, fit, body type, skin tone, age range) against product meta-tags
- **User click affinity** — aggregated from per-user behavioral events (views, try-ons, wishlists, carts, purchases), with dual time decay
- **Product popularity** — aggregated from per-product click counts across all users, with seasonal/regional signals
- **Suits-them boost** — gentle score bump when product meta-tags match user's body type, skin tone, size (third-party / prescriptive)
- **Exploration boost** — 10-15% of feed slots reserved for admin-boosted clearance items + random discovery
- **Fatigue penalty** — 1-3% per ignored impression, prevents stale feed

**Weights are dynamic**, shifting on three axes:
1. **Data maturity** — as a user accumulates clicks + wardrobe data, click weight rises, style DNA weight falls
2. **Confidence/agreement** — when clicks and profile agree, reinforce; when they diverge, trust clicks more
3. **Temporal/seasonal** — product-popularity weight rises during festivals/sales when collective behavior signals are stronger

**Self-tuning feedback loop** — every 24 hours, the system measures engagement-depth ratio (try-ons + wishlists + carts + 2×buys / views). If the ratio improves, nudge weights further in the same direction (max ±0.03/cycle). If it drops, revert toward previous weights. No ML — just bounded hill-climbing.

---

## User Stories

### Core Feed
- As a user, I see a full-screen swipe-style "For You" feed of products ranked by my personal taste
- As a user, products I'd look good in (body type, skin tone match) rank slightly higher even if I haven't clicked similar items
- As a user, the feed changes over time as my clicks teach the system what I like
- As a new user with no clicks, I see regionally trending products until my behavior builds up
- As a returning user, products I've scrolled past without interacting drop slightly in ranking

### Click Tracking
- As a user, every product view, try-on, wishlist, cart-add, and purchase is recorded
- As the system, I aggregate clicks into a per-user taste profile and a per-product popularity score
- As the system, recent clicks matter more than old clicks (30-day half-life for browsing, 45-day for purchases)

### Admin Controls
- As an admin, I can boost up to 10 products into exploration slots with a time limit (default 14 days)
- As an admin, boosted products still respect minimum style-match threshold (no irrelevant clearance spam)

### Self-Tuning
- As the system, I adjust ranking weights daily based on whether engagement improved or declined
- As the system, I shift weight toward clicks as a user accumulates more behavioral data
- As the system, I increase product-popularity weight during seasonal/festival spikes

### Future Extensibility
- As the system, when new profile dimensions are added (onboarding redesign) or wardrobe data arrives, the vector expands without algorithm changes
- As a product, meta-tags cover 30 dimensions even though only 6 are matched to profile today — clicks infer the rest

---

## Implementation Decisions

### Decision 1: Weighted blend (not filter-then-rank)

**Choice**: All products are scored and ranked. No hard filtering by style DNA.

**Reason**: Filtering kills serendipity. During Diwali, a suits-lover should still see the trending floral kurta — it just won't be #1 in their feed. The blend ensures relevance without creating a filter bubble.

### Decision 2: Two-layer click storage (event log + pre-aggregated)

**Choice**: Raw `click_events` table (append-only, source of truth) + pre-aggregated `user_click_profile` (per-user tag affinities) and `product_click_stats` (per-product counts).

**Reason**: Ranking queries need to be fast (one row per user + one row per product). Can't aggregate thousands of raw events on every page load. The aggregated tables are caches rebuilt from the event log if they drift.

### Decision 3: Dual time-decay rates

**Choice**: Preference clicks (view, try-on, wishlist) decay with 30-day half-life. Transactional clicks (cart, purchase) decay with 45-day half-life.

**Reason**: A purchase is a stronger taste statement than a browse. A suit someone bought 6 weeks ago should still inform their vector. A kurta they merely glanced at 6 weeks ago should not.

### Decision 4: Product meta-tags — 30-dimension superset

**Choice**: Tag every product with 30 dimensions (see Meta-Tag Taxonomy below). Only 6 are currently matchable to profile data. All 30 are extractable from click patterns.

**Reason**: Future-proofing. When onboarding adds new questions or wardrobe launches, the product side is already tagged. Meanwhile, clicks implicitly teach every dimension.

### Decision 5: Gentle "suits them" boost (not override)

**Choice**: Third-party dimensions (body_type_fit, skin_tone_complement) act as score boosters (+X), never suppress user preference.

**Reason**: Makes Stiri feel like a fashion advisor ("this would look great on you") without being preachy or overriding what the user actually wants.

### Decision 6: Swipe-style full-screen product cards

**Choice**: Home feed uses the snap-scroll vertical feed format (one product per screen, `snap-y snap-mandatory`, focus engine with parallax zoom), matching the pre-Shopify `TemplateGrid` layout.

**Reason**: Maximizes engagement per product. Swipe-past = clear "not interested" signal for fatigue penalty. Full attention on each product drives higher try-on and cart rates.

### Decision 7: Exploration slots with admin boost queue

**Choice**: 10-15% of feed slots are exploration: admin-boosted clearance products first (style-match filtered, max 10, 14-day expiry), remaining slots are random.

**Reason**: Prevents filter bubble, enables inventory clearance, provides baseline engagement data for new/unpopular products.

### Decision 8: Self-tuning via engagement-depth ratio

**Choice**: Daily feedback loop measuring `(try_ons + wishlists + carts + 2×buys) / views`. Adjust weights ±0.03/cycle toward better engagement. No ML.

**Reason**: Simple, transparent, auditable. Naturally adapts to seasonal shifts (Diwali = more collective purchasing = product-popularity weight rises). Bounded adjustments prevent wild swings.

### Decision 9: Cold start strategy

| Phase | Data Available | Ranking Strategy |
|-------|---------------|-----------------|
| Pre-onboarding | Location only | Regional trending (pure product-popularity, filtered by region) |
| Post-onboarding, 0 clicks | Profile (6 dims) | Style DNA dominance (~85% weight) + product popularity (~15%) |
| Early learning (1-50 clicks) | Profile + sparse clicks | Blending in: style ~60%, clicks ~25%, popularity ~15% |
| Warm (50-200 clicks) | Profile + rich clicks | Balanced: style ~45%, clicks ~35%, popularity ~20% |
| Mature (200+ clicks) | Profile + dense clicks | Click-led: style ~35%, clicks ~42%, popularity ~23% |
| With wardrobe | All sources | Style DNA enriched by wardrobe. Click weight stays high. Wardrobe data folded into style_dna_match. |

### Decision 10: Regional trending for zero-data users

**Choice**: Users with no profile and no clicks see products ranked by popularity within their geographic region (city/state from device location or address).

**Reason**: Mumbai trends differ from Jaipur. Free signal — no extra UX needed.

---

## Product Meta-Tag Taxonomy (30 Dimensions)

Every product in the Shopify catalog must be tagged with these dimensions. Stored as Shopify metafields (namespace `stiri`) and synced to `product_catalog_cache` table.

### Currently matchable to user profile (6)

| Tag Key | Matches | Type | Example |
|---------|---------|------|---------|
| `color_family` | `profiles.colors` | list | navy, black, maroon |
| `style_tags` | `profiles.styles` | list | formal, casual, ethnic |
| `size_range` | `profiles.fit` | list | s, m, l, xl |
| `body_type_fit` | `profiles.body_type` | list | hourglass, pear, rectangle |
| `skin_tone_complement` | `profiles.skin_tone` | list | fair, medium, dark |
| `age_group` | `profiles.age_range` | list | gen_z, millennial |

### Click-inferred + future-matchable (24)

| Tag Key | Purpose | Type | Example |
|---------|---------|------|---------|
| `garment_type` | Cloth type | single | shirt, kurta, saree, t-shirt |
| `garment_category` | Broad category | single | upperwear, lowerwear, fullbody |
| `fit_silhouette` | Cut/fit style | single | slim, regular, relaxed, oversized |
| `pattern` | Print/pattern | single | solid, stripes, floral, checks |
| `fabric` | Material | single | cotton, silk, linen, denim |
| `occasion` | When to wear | list | daily, office, wedding, festive |
| `season` | Seasonal relevance | list | summer, winter, monsoon, all-season |
| `price_tier` | Price bracket | single | budget, mid, premium, luxury |
| `gender` | Target gender | single | men, women, unisex |
| `neckline` | Neck style | single | v-neck, round, collar, mandarin |
| `sleeve_length` | Sleeve cut | single | sleeveless, short, three-quarter, full |
| `length` | Garment length | single | crop, regular, long, ankle |
| `embellishment` | Ornamentation | single | plain, embroidered, sequin, lace |
| `brand_tier` | Brand positioning | single | in-house, indie, designer |
| `color_intensity` | Color brightness | single | pastel, muted, vibrant, neon, earth-tone |
| `layering` | Layerability | single | standalone, layerable, set-piece |
| `care_level` | Maintenance | single | machine-wash, hand-wash, dry-clean |
| `origin_aesthetic` | Cultural style | single | indian-trad, indo-western, korean, boho |
| `trend_tag` | Rotating trend | list | quiet-luxury, old-money, cottagecore |
| `weight` | Fabric weight | single | lightweight, midweight, heavyweight |
| `transparency` | Opacity | single | opaque, semi-sheer, sheer |
| `sustainability` | Eco credentials | list | organic, recycled, fair-trade |
| `versatility` | Multi-occasion | single | single-occasion, multi-occasion, everyday |
| `is_new_arrival` | Recency flag | boolean | true/false |

---

## Database Schema

### `click_events` — Raw Event Log (append-only)

```sql
CREATE TABLE click_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id    text NOT NULL,          -- Shopify product handle (= template.id)
  event_type    text NOT NULL,          -- 'view','try_on','wishlist','cart_add','cart_remove','purchase'
  metadata      jsonb DEFAULT '{}',     -- { price, variant_id, source_page, position, tags... }
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_click_events_user_time ON click_events(user_id, created_at DESC);
CREATE INDEX idx_click_events_product ON click_events(product_id, created_at DESC);
CREATE INDEX idx_click_events_type ON click_events(event_type);
```

### `user_click_profile` — Per-User Aggregated Taste (updated on each event)

```sql
CREATE TABLE user_click_profile (
  user_id             uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  -- Aggregated tag affinities from clicks, time-decayed
  -- { "color_family": { "navy": 0.82, "black": 0.65 }, "style_tags": { "formal": 0.90 }, ... }
  tag_affinities      jsonb NOT NULL DEFAULT '{}',
  -- Raw event counts (not decayed — for data-maturity calculation)
  total_views         integer DEFAULT 0,
  total_try_ons       integer DEFAULT 0,
  total_wishlists     integer DEFAULT 0,
  total_cart_adds     integer DEFAULT 0,
  total_purchases     integer DEFAULT 0,
  -- Engagement depth ratio (self-tuning input)
  engagement_ratio    decimal(5,4) DEFAULT 0,
  -- Last N product IDs shown (for fatigue penalty)
  recent_impressions  jsonb DEFAULT '[]',   -- [{ product_id, shown_at, position }]
  -- Recomputation watermark
  last_computed_at    timestamptz DEFAULT now(),
  events_since_compute integer DEFAULT 0,
  updated_at          timestamptz DEFAULT now()
);
```

### `product_click_stats` — Per-Product Popularity (updated on each event)

```sql
CREATE TABLE product_click_stats (
  product_id      text PRIMARY KEY,     -- Shopify handle
  -- Lifetime counts
  view_count      integer DEFAULT 0,
  try_on_count    integer DEFAULT 0,
  wishlist_count  integer DEFAULT 0,
  cart_add_count  integer DEFAULT 0,
  purchase_count  integer DEFAULT 0,
  -- Recent counts (last 7 days, for trending detection)
  recent_views    integer DEFAULT 0,
  recent_try_ons  integer DEFAULT 0,
  recent_carts    integer DEFAULT 0,
  recent_purchases integer DEFAULT 0,
  -- Regional popularity: { "maharashtra": 45, "delhi": 32, ... }
  regional_counts jsonb DEFAULT '{}',
  -- Popularity score (pre-computed, normalized 0-1)
  popularity_score decimal(5,4) DEFAULT 0,
  updated_at      timestamptz DEFAULT now()
);
```

### `product_catalog_cache` — Shopify Product Mirror with Meta-Tags

```sql
CREATE TABLE product_catalog_cache (
  product_id          text PRIMARY KEY,   -- Shopify handle (= template.id)
  shopify_gid         text,               -- Shopify global ID
  title               text NOT NULL,
  -- All 30 meta-tag dimensions as individual arrays/values
  color_family        text[] DEFAULT '{}',
  style_tags          text[] DEFAULT '{}',
  size_range          text[] DEFAULT '{}',
  body_type_fit       text[] DEFAULT '{}',
  skin_tone_complement text[] DEFAULT '{}',
  age_group           text[] DEFAULT '{}',
  garment_type        text,
  garment_category    text,
  fit_silhouette      text,
  pattern             text,
  fabric              text,
  occasion            text[] DEFAULT '{}',
  season              text[] DEFAULT '{}',
  price_tier          text,
  gender              text DEFAULT 'unisex',
  neckline            text,
  sleeve_length       text,
  length              text,
  embellishment       text,
  brand_tier          text,
  color_intensity     text,
  layering            text,
  care_level          text,
  origin_aesthetic    text,
  trend_tag           text[] DEFAULT '{}',
  weight              text,
  transparency        text,
  sustainability      text[] DEFAULT '{}',
  versatility         text,
  is_new_arrival      boolean DEFAULT false,
  -- Pricing
  min_price           integer,            -- In paise
  max_price           integer,
  -- Availability
  available_for_sale  boolean DEFAULT true,
  -- Sync
  synced_at           timestamptz DEFAULT now()
);

CREATE INDEX idx_product_cache_style ON product_catalog_cache USING GIN(style_tags);
CREATE INDEX idx_product_cache_color ON product_catalog_cache USING GIN(color_family);
CREATE INDEX idx_product_cache_occasion ON product_catalog_cache USING GIN(occasion);
```

### `admin_boost_queue` — Manual Product Boosts

```sql
CREATE TABLE admin_boost_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      text NOT NULL,         -- Shopify handle
  priority        integer DEFAULT 1,     -- Higher = shown first among boosts
  min_style_match decimal(3,2) DEFAULT 0.20, -- Minimum style DNA match to show
  expires_at      timestamptz NOT NULL,  -- Auto-remove after this
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_boost_queue_active ON admin_boost_queue(expires_at) WHERE expires_at > now();
```

### `ranking_weights` — Self-Tuning Weight History

```sql
CREATE TABLE ranking_weights (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  w_style             decimal(4,3) NOT NULL,
  w_user_clicks       decimal(4,3) NOT NULL,
  w_product_pop       decimal(4,3) NOT NULL,
  engagement_ratio    decimal(5,4),        -- The ratio that produced this config
  is_active           boolean DEFAULT false,
  created_at          timestamptz DEFAULT now()
);
```

---

## Ranking Algorithm (Full Pseudocode)

### Step 1: Compute Style DNA Match

```javascript
function styleDnaMatch(userProfile, productTags) {
  let score = 0, maxScore = 0;

  // Color match (multi-value overlap)
  const colorOverlap = intersect(userProfile.colors, productTags.color_family).length;
  score += colorOverlap; maxScore += Math.min(userProfile.colors.length, 3);

  // Style match (multi-value overlap)
  const styleOverlap = intersect(userProfile.styles, productTags.style_tags).length;
  score += styleOverlap; maxScore += userProfile.styles.length;

  // Size match (exact)
  if (productTags.size_range.includes(userProfile.fit)) score += 1;
  maxScore += 1;

  // Body type fit (prescriptive — gentle boost, counts half)
  if (productTags.body_type_fit.includes(userProfile.bodyType)) score += 0.5;
  maxScore += 0.5;

  // Skin tone complement (prescriptive — gentle boost, counts half)
  if (productTags.skin_tone_complement.includes(userProfile.skinTone)) score += 0.5;
  maxScore += 0.5;

  // Age group
  if (productTags.age_group.includes(userProfile.ageRange)) score += 0.5;
  maxScore += 0.5;

  return maxScore > 0 ? score / maxScore : 0; // Normalized 0-1
}
```

### Step 2: Compute User Click Affinity

```javascript
function userClickAffinity(userClickProfile, productTags) {
  // userClickProfile.tag_affinities = { color_family: { navy: 0.8 }, style_tags: { formal: 0.9 }, ... }
  // Match across ALL 30 dimensions — whatever the user has clicked on
  let score = 0, dimensions = 0;

  for (const [dimension, affinities] of Object.entries(userClickProfile.tag_affinities)) {
    const productValue = productTags[dimension]; // string or string[]
    if (!productValue) continue;
    
    const values = Array.isArray(productValue) ? productValue : [productValue];
    let dimScore = 0;
    for (const val of values) {
      dimScore = Math.max(dimScore, affinities[val] || 0);
    }
    if (dimScore > 0) { score += dimScore; dimensions++; }
  }

  return dimensions > 0 ? score / dimensions : 0; // Normalized 0-1
}
```

### Step 3: Get Product Popularity

```javascript
function productPopularity(productStats, userRegion) {
  // Blend global + regional popularity
  const globalScore = productStats.popularity_score; // Pre-computed, 0-1

  const regionalCount = productStats.regional_counts[userRegion] || 0;
  const maxRegional = Math.max(...Object.values(productStats.regional_counts), 1);
  const regionalScore = regionalCount / maxRegional;

  return 0.6 * globalScore + 0.4 * regionalScore;
}
```

### Step 4: Dynamic Weights

```javascript
function computeWeights(userClickProfile, seasonalBoost = 0) {
  const totalClicks = userClickProfile.total_views
    + userClickProfile.total_try_ons
    + userClickProfile.total_wishlists
    + userClickProfile.total_cart_adds
    + userClickProfile.total_purchases;

  // Data maturity: 0 → 1 (saturates around 200 clicks)
  const dataRichness = Math.min(1.0, totalClicks / 200);

  // Base weights shift with data maturity
  let wStyle = 0.85 * (1 - 0.55 * dataRichness);     // 0.85 → 0.38
  let wClicks = 0.05 + 0.38 * dataRichness;            // 0.05 → 0.43
  let wPop = 0.10 + 0.08 * seasonalBoost;              // 0.10 → 0.18

  // Load active self-tuned adjustments (from ranking_weights)
  // Apply bounded delta to base weights
  // ...

  // Normalize to sum = 1
  const sum = wStyle + wClicks + wPop;
  return { wStyle: wStyle/sum, wClicks: wClicks/sum, wPop: wPop/sum };
}
```

### Step 5: Fatigue Penalty

```javascript
function fatiguePenalty(productId, recentImpressions) {
  // Count how many times this product was shown without interaction
  const ignoredCount = recentImpressions.filter(
    imp => imp.product_id === productId && !imp.interacted
  ).length;

  // 2% penalty per ignored impression, max 30%
  return Math.min(0.30, ignoredCount * 0.02);
}
```

### Step 6: Final Score

```javascript
function rankProducts(products, userProfile, userClickProfile, userRegion, boostQueue) {
  const weights = computeWeights(userClickProfile, getSeasonalBoost());
  const totalSlots = products.length;
  const explorationSlots = Math.ceil(totalSlots * 0.12); // 12%

  // Score all products
  const scored = products.map(product => {
    const style = styleDnaMatch(userProfile, product.tags);
    const clicks = userClickAffinity(userClickProfile, product.tags);
    const pop = productPopularity(product.stats, userRegion);
    const fatigue = fatiguePenalty(product.id, userClickProfile.recent_impressions);

    const score = weights.wStyle * style
                + weights.wClicks * clicks
                + weights.wPop * pop
                - fatigue;

    return { product, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Insert exploration slots
  const feed = [];
  const mainProducts = scored.slice();
  let explorationInserted = 0;

  // Boosted products first (filtered by style match threshold)
  const activeBoosted = boostQueue
    .filter(b => b.expires_at > now())
    .filter(b => styleDnaMatch(userProfile, getProductTags(b.product_id)) >= b.min_style_match)
    .sort((a, b) => b.priority - a.priority);

  // Build feed: every ~8th slot is exploration
  for (let i = 0; i < totalSlots; i++) {
    if (i > 0 && i % 8 === 0 && explorationInserted < explorationSlots) {
      if (activeBoosted.length > 0) {
        feed.push({ ...activeBoosted.shift(), isExploration: true });
      } else {
        // Random product not in main feed top 20
        feed.push({ ...randomFromTail(mainProducts), isExploration: true });
      }
      explorationInserted++;
    } else {
      feed.push(mainProducts.shift());
    }
  }

  return feed;
}
```

---

## Click Event Types & Weights

| Event Type | Weight | Decay Half-Life | Product-wise? | User-wise? |
|------------|--------|-----------------|---------------|------------|
| `view` | 1 | 30 days | ✅ view_count | ✅ tag affinities |
| `try_on` | 5 | 30 days | ✅ try_on_count | ✅ tag affinities |
| `wishlist` | 6 | 30 days | ✅ wishlist_count | ✅ tag affinities |
| `cart_add` | 8 | 45 days | ✅ cart_add_count | ✅ tag affinities |
| `cart_remove` | -3 | 30 days | ❌ | ✅ negative signal |
| `purchase` | 15 | 45 days | ✅ purchase_count | ✅ tag affinities |

---

## API Endpoints

### Event Tracking
- `POST /api/events/track` — Auth required. Body: `{ events: [{ product_id, event_type, metadata }] }`. Batch insert. Updates `user_click_profile` and `product_click_stats` atomically. Returns 202.

### Personalized Feed
- `GET /api/feed/for-you` — Auth optional. If authed, returns personalized ranked products. If anonymous, returns regional trending. Accepts `?limit=20&offset=0`.

### Admin Boost
- `POST /api/admin/boost` — Admin only. Body: `{ product_id, priority, min_style_match, expires_in_days }`. Max 10 concurrent.
- `GET /api/admin/boost` — List active boosts.
- `DELETE /api/admin/boost/:id` — Remove a boost.

### Product Catalog Sync
- `POST /api/admin/product-sync` — Trigger full catalog sync from Shopify → `product_catalog_cache`.
- `POST /api/shopify/webhook/product-update` — Shopify webhook. Syncs single product on create/update.

### Weight Management
- `GET /api/admin/weights` — Current active weights + history.
- `POST /api/admin/weights/tune` — Trigger manual weight recalibration.

---

## Self-Tuning Feedback Loop

**Runs daily at 3 AM IST** (pg_cron or scheduled Edge Function):

```
1. Compute current engagement ratio across all users (last 7 days):
   engagement = (try_ons + wishlists + carts + 2×purchases) / views

2. Compare to previous period (7 days before that):
   delta = current_engagement - previous_engagement

3. Load active ranking_weights row

4. Adjust:
   IF delta > 0 (engagement improved):
     Continue in same direction: nudge weights by +0.02 in the direction of last change
   IF delta < 0 (engagement dropped):
     Revert: nudge weights by -0.01 toward the previous config
   IF delta ≈ 0 (±0.001):
     No change

5. Clamp all adjustments to ±0.03 per cycle
6. Normalize weights to sum = 1
7. Insert new ranking_weights row, set is_active = true
8. Log the change for audit

ALSO: Recompute product_click_stats.recent_* counts (rolling 7-day window)
ALSO: Recompute product_click_stats.popularity_score (normalized)
ALSO: Decay user_click_profile.tag_affinities (apply time decay to raw scores)
ALSO: Clear expired admin_boost_queue entries
```

---

## Time Decay Mathematics

```javascript
// Preference events: 30-day half-life
function preferenceDecay(daysAgo) {
  return Math.exp(-0.0231 * daysAgo); // ln(2)/30 ≈ 0.0231
}

// Transactional events: 45-day half-life
function transactionalDecay(daysAgo) {
  return Math.exp(-0.0154 * daysAgo); // ln(2)/45 ≈ 0.0154
}

// Applied when recomputing user_click_profile.tag_affinities:
function recomputeTagAffinities(clickEvents) {
  const affinities = {};

  for (const event of clickEvents) {
    const isTransactional = ['cart_add', 'purchase'].includes(event.event_type);
    const daysAgo = daysSince(event.created_at);
    const decay = isTransactional ? transactionalDecay(daysAgo) : preferenceDecay(daysAgo);
    const weight = EVENT_WEIGHTS[event.event_type] * decay;

    // Extract all tags from event.metadata (product's 30 dimensions)
    const productTags = event.metadata.product_tags || {};
    for (const [dimension, values] of Object.entries(productTags)) {
      if (!affinities[dimension]) affinities[dimension] = {};
      const vals = Array.isArray(values) ? values : [values];
      for (const v of vals) {
        affinities[dimension][v] = (affinities[dimension][v] || 0) + weight;
      }
    }
  }

  // Normalize each dimension to 0-1
  for (const dim of Object.keys(affinities)) {
    const maxVal = Math.max(...Object.values(affinities[dim]), 1);
    for (const key of Object.keys(affinities[dim])) {
      affinities[dim][key] = Math.round((affinities[dim][key] / maxVal) * 1000) / 1000;
    }
  }

  return affinities;
}
```

---

## Impression Tracking (Fatigue System)

When the "For You" feed is served:
1. Record which products were shown, at which position, in `user_click_profile.recent_impressions`
2. Keep the last 100 impressions (rolling window)
3. When a click event arrives for a product, mark its impression as `interacted: true`
4. Uninteracted impressions apply 2% penalty per occurrence (capped at 30%)
5. Impressions older than 7 days are pruned regardless

---

## Feed Display Format

The home "For You" feed uses the snap-scroll vertical card layout:

- **Container**: `snap-y snap-mandatory overflow-y-scroll h-full`
- **Cards**: `snap-center snap-always h-[68svh]` — one card fills the screen
- **Focus engine**: IntersectionObserver detects center card → scale/opacity/blur transitions
- **Content per card**: Full-bleed product image, product name, price, "Try On" CTA, wishlist heart, discount badge if applicable
- **Exploration cards**: Subtle "Picked for you" or "Clearing sale" badge to distinguish from organic rankings

---

## Testing Strategy

- **Unit tests**: Style DNA scoring function, click affinity computation, time decay math, weight normalization, fatigue penalty
- **Integration tests**: Event tracking endpoint (batch insert → aggregation update), feed ranking endpoint (verify ordering), admin boost CRUD
- **Manual verification**: Cold start behavior (new user sees regional trending), feed rotation after skips, seasonal weight shift during mock festival, admin boost appearing in exploration slots

---

## Out of Scope

- **Wardrobe feature** — Will expand the style DNA vector when launched. The algorithm is designed to absorb new dimensions without changes.
- **Onboarding redesign** — New dimensions (cloth type, print, silhouette, etc.) will be added to the profile vector when collected. See "Future Onboarding Dimensions" below.
- **ML-based ranking** — The self-tuning loop is rule-based (hill-climbing), not ML. ML may replace it later if data volume justifies it.
- **Collaborative filtering** — "Users like you also liked X" is not in v1. The per-product popularity provides a simpler form of social signal.
- **Push notifications / WhatsApp nudges** — Described in the old model but not part of this engine. Can be built on top of the event stream later.
- **A/B testing framework** — Not built in v1, but the weight history table enables manual comparison of weight configurations.

---

## Future Onboarding Dimensions (Recommended)

When the onboarding is redesigned, these are the highest-value dimensions to collect. Ordered by ranking impact:

| Priority | Dimension | Suggested UX | Why |
|----------|-----------|-------------|-----|
| 1 | **Garment type preferences** | Visual grid: "What do you wear most?" (shirts, kurtas, t-shirts, sarees, dresses, trousers, jeans) — multi-select | Largest differentiator between users. Currently inferred only from clicks. |
| 2 | **Pattern preference** | Visual grid: "Which patterns do you love?" (solid, stripes, floral, checks, abstract, graphic) — multi-select | Strong taste signal. Solid vs. floral alone segments 70% of preference. |
| 3 | **Occasion profile** | Visual grid: "Where do you dress up most?" (daily, office, festive, party, date night, wedding) — multi-select | Drives product discovery. Office worker vs. party-goer see completely different feeds. |
| 4 | **Fit silhouette** | Visual: "How do you like your clothes?" (slim, regular, relaxed, oversized) — single select | Directly matches product cut. Huge impact on satisfaction. |
| 5 | **Price range** | Slider: "Your comfortable budget per piece" (₹500-₹50,000) | Filters irrelevant price tiers. Reduces "I love it but can't afford it" frustration. |
| 6 | **Fabric preference** | Visual: "Fabrics you love" (cotton, silk, linen, denim, wool, synthetic) — multi-select | Comfort + season signal. Cotton lovers ≠ silk lovers. |
| 7 | **Origin aesthetic** | Visual: "Your style vibe" (Indian traditional, Indo-western, Korean, Bohemian, European classic, Minimalist) — single | Cultural fashion identity. Strong clustering dimension. |

These 7 additions would give the profile vector 13 explicit dimensions (matching 13 of the 30 product meta-tags), dramatically reducing cold-start time and click dependency.
