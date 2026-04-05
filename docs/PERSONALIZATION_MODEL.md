# Stiri — Personalization Engine: Complete Technical Model

> **Status**: Approved design — replaces all prior drafts.
> **PRD**: See [PRD_PERSONALIZATION_ENGINE.md](PRD_PERSONALIZATION_ENGINE.md) for decisions and rationale.
> **Issues**: See [PERSONALIZATION_ISSUES.md](PERSONALIZATION_ISSUES.md) for implementation breakdown.

---

## 1. Core Thesis

Every Stiri user should feel like the platform was built for them. The personalization engine ranks the entire product catalog for each user individually, using three signal sources blended with dynamic weights:

1. **Style DNA** — explicit profile preferences (current: 6 dimensions, extensible to 30+)
2. **Click behavior** — implicit signals from product interactions (views, try-ons, wishlists, carts, purchases)
3. **Product popularity** — collective demand signals (global trending + regional trends)

The engine eliminates the need for a fashion designer/specialist by acting as a **personal style advisor** — surfacing what the user likes AND gently boosting what would objectively suit them.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     USER DEVICE                           │
│              Swipe-style "For You" Feed                   │
│         (one product card per screen, snap scroll)        │
└───────────────────┬──────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
   Style DNA    Click Events   Feed Request
   (Profile)    (Batched)      (GET /api/feed/for-you)
        │           │           │
        ▼           ▼           ▼
┌──────────────────────────────────────────────────────────┐
│                   EXPRESS.JS API                          │
│                                                          │
│  POST /api/events/track     GET /api/feed/for-you        │
│  POST /api/admin/boost      POST /api/admin/product-sync │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │              RANKING ENGINE                      │     │
│  │                                                  │     │
│  │  score = w_style × style_dna_match               │     │
│  │        + w_clicks × user_click_affinity           │     │
│  │        + w_pop × product_popularity               │     │
│  │        + new_arrival_boost                        │     │
│  │        - fatigue_penalty                          │     │
│  │                                                  │     │
│  │  12% of slots replaced via exploration injection  │     │
│  │                                                  │     │
│  │  Weights: DYNAMIC (data maturity × seasonal      │     │
│  │           × self-tuning feedback)                 │     │
│  └─────────────────────────────────────────────────┘     │
└───────────────────┬──────────────────────────────────────┘
                    │
┌───────────────────┼──────────────────────────────────────┐
│               SUPABASE (Postgres)                        │
│                                                          │
│  ┌─────────────────┐  ┌────────────────────┐             │
│  │   profiles       │  │ product_catalog_   │             │
│  │   (6 style dims) │  │ cache (30 tags)    │             │
│  └─────────────────┘  └────────────────────┘             │
│                                                          │
│  ┌─────────────────┐  ┌────────────────────┐             │
│  │  click_events    │  │ user_click_profile │             │
│  │  (raw event log) │  │ (pre-aggregated)   │             │
│  └─────────────────┘  └────────────────────┘             │
│                                                          │
│  ┌─────────────────┐  ┌────────────────────┐             │
│  │ product_click_   │  │ ranking_weights    │             │
│  │ stats            │  │ (self-tuning)      │             │
│  └─────────────────┘  └────────────────────┘             │
│                                                          │
│  ┌─────────────────┐                                     │
│  │ admin_boost_     │  ← Nightly cron:                   │
│  │ queue            │    - Time decay recomputation       │
│  └─────────────────┘    - Popularity score refresh        │
│                          - Self-tuning weight adjustment   │
│                          - Housekeeping                    │
└──────────────────────────────────────────────────────────┘
                    │
┌───────────────────┼──────────────────────────────────────┐
│              SHOPIFY STOREFRONT API                       │
│  Products + Metafields (stiri.* namespace)               │
│  Synced to product_catalog_cache via webhook + full sync │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Signal Taxonomy

### 3.1 Style DNA — Explicit Profile (Source 1)

What the user tells us during onboarding. Currently 6 dimensions:

| Dimension | DB Column | Type | Values | Ranking Role |
|-----------|-----------|------|--------|-------------|
| **Colors** | `profiles.colors` | text[] | 12 options (red, blue, yellow, green, orange, purple, pink, black, white, brown, navy, teal) | First-party preference match |
| **Styles** | `profiles.styles` | text[] | 8 options (casual, formal, party, beachwear, streetwear, ethnic, sporty, minimalist) | First-party preference match |
| **Fit size** | `profiles.fit` | text | xs, s, m, l, xl, xxl | First-party + third-party (size availability) |
| **Body type** | `profiles.body_type` | text | hourglass, pear, inverted_triangle, rectangle, round | Third-party "suits them" boost |
| **Skin tone** | `profiles.skin_tone` | text | fair, medium, dark | Third-party "suits them" boost |
| **Age range** | `profiles.age_range` | text | gen_alpha, gen_z, millennial, gen_x, boomer | Weak preference signal |

**First-party** = "what they like" (score matches their preference).
**Third-party** = "what suits them" (gentle boost for flattering choices, never overrides preference).

#### Extensibility

When onboarding is redesigned to collect more dimensions (recommended priorities):

| Priority | New Dimension | Recommended UX |
|----------|---------------|---------------|
| 1 | Garment type preferences | Visual multi-select: shirts, kurtas, t-shirts, sarees, trousers, dresses, jackets |
| 2 | Pattern preference | Visual multi-select: solid, stripes, floral, checks, abstract, graphic |
| 3 | Occasion profile | Visual multi-select: daily, office, festive, party, date night, wedding |
| 4 | Fit silhouette | Single-select: slim, regular, relaxed, oversized |
| 5 | Price comfort range | Slider: ₹500 – ₹50,000 |
| 6 | Fabric preference | Visual multi-select: cotton, silk, linen, denim, wool |
| 7 | Origin aesthetic | Single-select: Indian traditional, Indo-western, Korean, Bohemian, European classic |

Each new dimension simply adds another comparison in `styleDnaMatch()`. No algorithm rewrite needed.

#### Wardrobe Feature (Future)

When the wardrobe feature launches (users upload/catalog their closet), wardrobe data supplements the Style DNA:
- **Cloth types owned** → garment_type affinity
- **Colors in closet** → color_family affinity (reinforces/corrects onboarding picks)
- **Prints/patterns** → pattern affinity
- **Brands** → brand_tier affinity
- **Size distribution** → fit confirmation

Wardrobe data folds into the style DNA score — it doesn't replace it. The algorithm weights wardrobe-derived dimensions the same as profile-derived ones. Not all users will upload their wardrobe, so the system must always work without it.

### 3.2 Click Behavior — Implicit Signals (Source 2)

What users do is more revealing than what they say. Two axes:

**User-wise** (per-user preference): "This user keeps clicking formal navy items" → their click-derived vector has high affinity for `style_tags.formal` and `color_family.navy`.

**Product-wise** (per-product popularity): "This product was viewed 500 times, carted 80 times, purchased 20 times" → high popularity score.

#### Event Types & Weights

| Event Type | Weight | Decay Half-Life | Product Stat? | User Affinity? | Description |
|------------|--------|-----------------|--------------|----------------|-------------|
| `view` | 1 | 30 days | ✅ view_count | ✅ | Product card in viewport > 2 seconds |
| `try_on` | 5 | 30 days | ✅ try_on_count | ✅ | User tapped "Try On" |
| `wishlist` | 6 | 30 days | ✅ wishlist_count | ✅ | Added to wishlist |
| `cart_add` | 8 | 45 days | ✅ cart_add_count | ✅ | Added to cart |
| `cart_remove` | -3 | 30 days | ❌ | ✅ (negative) | Removed from cart |
| `purchase` | 15 | 45 days | ✅ purchase_count | ✅ | Completed purchase |

**Key design**: `try_on` is weighted 5× a view. This is Stiri's unique signal — no other fashion platform knows "this user literally put this garment on their face." A try-on is a stronger intent signal than a view or even a wishlist.

### 3.3 Product Popularity — Collective Signal (Source 3)

What everyone is buying/viewing. Blends:
- **Global popularity**: weighted sum of recent (7-day) counts across all users
- **Regional popularity**: same counts but filtered by user's state/region

Formula: `60% global + 40% regional`

Regional trending enables:
- Seasonal fashion surges by region (e.g. ethnic wear spikes during major festivals)
- Regional fabric and style preferences reflected in feed

---

## 4. Product Meta-Tag Taxonomy (30 Dimensions)

Every product must be tagged on the Shopify side (metafield namespace `stiri.*`) and synced to `product_catalog_cache`.

### Tier 1 — Currently matchable to user profile (6)

| Meta-Tag Key | Matches Against | Type | Examples |
|-------------|----------------|------|---------|
| `color_family` | `profiles.colors` | text[] | navy, black, maroon, white, teal |
| `style_tags` | `profiles.styles` | text[] | formal, casual, ethnic, streetwear |
| `size_range` | `profiles.fit` | text[] | xs, s, m, l, xl, xxl |
| `body_type_fit` | `profiles.body_type` | text[] | hourglass, pear, rectangle |
| `skin_tone_complement` | `profiles.skin_tone` | text[] | fair, medium, dark |
| `age_group` | `profiles.age_range` | text[] | gen_z, millennial, gen_x |

### Tier 2 — Click-inferred now, profile-matchable after onboarding redesign (11)

| Meta-Tag Key | Type | Examples |
|-------------|------|---------|
| `garment_type` | text | shirt, kurta, saree, t-shirt, trousers, jacket |
| `garment_category` | text | upperwear, lowerwear, fullbody, accessory |
| `fit_silhouette` | text | slim, regular, relaxed, oversized |
| `pattern` | text | solid, stripes, floral, checks, abstract, graphic |
| `fabric` | text | cotton, silk, linen, denim, wool, polyester |
| `occasion` | text[] | daily, office, wedding, festive, party, date-night |
| `season` | text[] | summer, winter, monsoon, all-season |
| `price_tier` | text | budget, mid, premium, luxury |
| `neckline` | text | v-neck, round, collar, mandarin, off-shoulder |
| `sleeve_length` | text | sleeveless, short, three-quarter, full |
| `length` | text | crop, regular, long, ankle, floor |

### Tier 3 — Click-inferred only, enrichment dimensions (13)

| Meta-Tag Key | Type | Examples |
|-------------|------|---------|
| `embellishment` | text | plain, embroidered, sequin, lace, mirror-work |
| `brand_tier` | text | in-house, indie, designer, luxury-collab |
| `color_intensity` | text | pastel, muted, vibrant, neon, earth-tone |
| `layering` | text | standalone, layerable, set-piece |
| `care_level` | text | machine-wash, hand-wash, dry-clean |
| `origin_aesthetic` | text | indian-trad, indo-western, korean, boho, european-classic |
| `trend_tag` | text[] | quiet-luxury, old-money, cottagecore, mob-wife |
| `weight` | text | lightweight, midweight, heavyweight |
| `transparency` | text | opaque, semi-sheer, sheer |
| `sustainability` | text[] | organic, recycled, fair-trade |
| `versatility` | text | single-occasion, multi-occasion, everyday |
| `gender` | text | men, women, unisex |
| `is_new_arrival` | boolean | true, false |

**Total: 30 dimensions.** Even with only 6 matchable to profile today, all 30 are extractable from click behavior: if a user keeps clicking products tagged `pattern: floral`, their click-derived vector builds a high `pattern.floral` affinity — matching products with that tag without ever asking the user about prints.

---

## 5. Data Storage Schema

### 5.1 `click_events` — Raw Event Log

Append-only. Source of truth for all behavioral data.

```sql
CREATE TABLE click_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id    text NOT NULL,
  event_type    text NOT NULL CHECK (event_type IN ('view','try_on','wishlist','cart_add','cart_remove','purchase')),
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_click_events_user_time ON click_events(user_id, created_at DESC);
CREATE INDEX idx_click_events_product ON click_events(product_id, created_at DESC);
CREATE INDEX idx_click_events_type ON click_events(event_type);
```

**metadata** includes at minimum:
```jsonc
{
  "source_page": "for_you",       // Where the user was when they clicked
  "position": 3,                  // Position in feed (for impression analysis)
  "product_tags": {               // Snapshot of product's 30 dimensions at time of click
    "color_family": ["navy"],
    "style_tags": ["formal"],
    "garment_type": "suit",
    // ... all applicable tags
  }
}
```

### 5.2 `user_click_profile` — Pre-Aggregated User Taste

One row per user. Updated incrementally on every click event. Full recomputation nightly.

```sql
CREATE TABLE user_click_profile (
  user_id             uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  tag_affinities      jsonb NOT NULL DEFAULT '{}',
  total_views         integer DEFAULT 0,
  total_try_ons       integer DEFAULT 0,
  total_wishlists     integer DEFAULT 0,
  total_cart_adds     integer DEFAULT 0,
  total_purchases     integer DEFAULT 0,
  engagement_ratio    decimal(5,4) DEFAULT 0,
  recent_impressions  jsonb DEFAULT '[]',   -- [{ product_id, shown_at, position, interacted }]
  last_computed_at    timestamptz DEFAULT now(),
  events_since_compute integer DEFAULT 0,
  updated_at          timestamptz DEFAULT now()
);
```

**tag_affinities** structure (time-decayed, normalized 0-1 per dimension):
```jsonc
{
  "color_family": { "navy": 0.82, "black": 0.65, "white": 0.30 },
  "style_tags": { "formal": 0.90, "casual": 0.45 },
  "garment_type": { "suit": 0.78, "shirt": 0.55 },
  "pattern": { "solid": 0.70, "stripes": 0.40 },
  "fabric": { "cotton": 0.60 },
  // ... any dimension the user has interacted with
}
```

**recent_impressions** (rolling window, last 100, pruned at 7 days):
```jsonc
[
  { "product_id": "classic-suit", "shown_at": "2026-04-05T10:00:00Z", "position": 1, "interacted": false },
  { "product_id": "silk-saree", "shown_at": "2026-04-05T10:00:00Z", "position": 2, "interacted": true }
]
```

### 5.3 `product_click_stats` — Pre-Aggregated Product Popularity

One row per product. Updated incrementally on every click event. Recent counts and popularity_score recomputed nightly.

```sql
CREATE TABLE product_click_stats (
  product_id      text PRIMARY KEY,
  view_count      integer DEFAULT 0,
  try_on_count    integer DEFAULT 0,
  wishlist_count  integer DEFAULT 0,
  cart_add_count  integer DEFAULT 0,
  purchase_count  integer DEFAULT 0,
  recent_views    integer DEFAULT 0,
  recent_try_ons  integer DEFAULT 0,
  recent_wishlists integer DEFAULT 0,
  recent_carts    integer DEFAULT 0,
  recent_purchases integer DEFAULT 0,
  regional_counts jsonb DEFAULT '{}',
  popularity_score decimal(5,4) DEFAULT 0,
  updated_at      timestamptz DEFAULT now()
);
```

**regional_counts**:
```jsonc
{ "maharashtra": 45, "delhi": 32, "karnataka": 28, "tamil_nadu": 15 }
```

### 5.4 `product_catalog_cache` — Shopify Mirror with 30 Meta-Tags

```sql
CREATE TABLE product_catalog_cache (
  product_id          text PRIMARY KEY,   -- Shopify handle = template.id
  shopify_gid         text,
  title               text NOT NULL,
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
  shopify_published_at timestamptz,        -- From Shopify publishedAt; drives newArrivalBoost()
  min_price           integer,
  max_price           integer,
  available_for_sale  boolean DEFAULT true,
  synced_at           timestamptz DEFAULT now()
);

CREATE INDEX idx_product_cache_style ON product_catalog_cache USING GIN(style_tags);
CREATE INDEX idx_product_cache_color ON product_catalog_cache USING GIN(color_family);
CREATE INDEX idx_product_cache_occasion ON product_catalog_cache USING GIN(occasion);
```

### 5.5 `admin_boost_queue` — Manual Clearance/Promotion Boosts

```sql
CREATE TABLE admin_boost_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      text NOT NULL,
  priority        integer DEFAULT 1,
  min_style_match decimal(3,2) DEFAULT 0.20,
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_boost_queue_active ON admin_boost_queue(expires_at) WHERE expires_at > now();
```

Constraints: Max 10 active (non-expired) rows at any time.

### 5.6 `ranking_weights` — Self-Tuning Weight History

```sql
CREATE TABLE ranking_weights (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  w_style             decimal(4,3) NOT NULL,
  w_user_clicks       decimal(4,3) NOT NULL,
  w_product_pop       decimal(4,3) NOT NULL,
  engagement_ratio    decimal(5,4),
  -- last_delta records the direction of each weight's last change,
  -- required by the self-tuning loop to know which way to nudge next cycle.
  -- e.g. { "w_style": -0.02, "w_user_clicks": +0.02, "w_product_pop": 0 }
  last_delta          jsonb DEFAULT '{}'::jsonb,
  is_active           boolean DEFAULT false,
  created_at          timestamptz DEFAULT now()
);
```

Seed row: `{ w_style: 0.75, w_user_clicks: 0.10, w_product_pop: 0.15, last_delta: {}, is_active: true }`.

---

## 6. Ranking Algorithm

### 6.1 The Formula

```
final_score = w_style × style_dna_match(user, product)
            + w_clicks × user_click_affinity(user_click_profile, product)
            + w_pop   × product_popularity(product_stats, region)
            + new_arrival_boost(product)
            - fatigue_penalty(product, impressions)
```

Where `w_style + w_clicks + w_pop = 1.0`, always. `new_arrival_boost` is additive and outside the normalised weight system — it does not steal from the three signals.

> **Naming convention:** In the formula, abbreviated forms `w_clicks` and `w_pop` are used for readability. In the database schema (§5.6), these are stored as columns `w_user_clicks` and `w_product_pop` for clarity. In code, they become camelCase variables `wClicks` and `wPop`.

### 6.2 Style DNA Match (0-1)

Measures overlap between user profile and product tags. First-party dimensions contribute full points; third-party dimensions (body_type_fit, skin_tone_complement) contribute half (gentle boost, not override).

```javascript
function styleDnaMatch(userProfile, productTags) {
  let score = 0, maxScore = 0;

  // Color overlap (multi-value)
  const colorHits = intersect(userProfile.colors, productTags.color_family).length;
  score += colorHits;
  maxScore += Math.min(userProfile.colors.length, 3);

  // Style overlap (multi-value)
  const styleHits = intersect(userProfile.styles, productTags.style_tags).length;
  score += styleHits;
  maxScore += userProfile.styles.length;

  // Size match (exact)
  if (productTags.size_range.includes(userProfile.fit)) score += 1;
  maxScore += 1;

  // Body type fit — THIRD PARTY (half weight: gentle boost)
  if (productTags.body_type_fit.includes(userProfile.bodyType)) score += 0.5;
  maxScore += 0.5;

  // Skin tone complement — THIRD PARTY (half weight)
  if (productTags.skin_tone_complement.includes(userProfile.skinTone)) score += 0.5;
  maxScore += 0.5;

  // Age group (weak signal, half weight)
  if (productTags.age_group.includes(userProfile.ageRange)) score += 0.5;
  maxScore += 0.5;

  // Future dimensions slot in here identically:
  // if (userProfile.garmentTypes) { ... }
  // if (userProfile.patterns) { ... }

  return maxScore > 0 ? score / maxScore : 0;
}
```

### 6.3 User Click Affinity (-1 to 1)

Measures how well a product matches the user's behavioral taste across all 30 dimensions. Uses pre-aggregated tag affinities from `user_click_profile`. Negative affinities (from `cart_remove` events) actively penalise products the user has rejected.

```javascript
function userClickAffinity(userClickProfile, productTags) {
  const affinities = userClickProfile.tag_affinities; // { dim: { val: score } }
  let totalScore = 0, matchedDims = 0;

  for (const [dimension, userAffinityMap] of Object.entries(affinities)) {
    const productValue = productTags[dimension];
    if (!productValue) continue;

    const values = Array.isArray(productValue) ? productValue : [productValue];
    // Initialise to null so we can distinguish "no match" from "explicit 0"
    let bestMatch: number | null = null;
    for (const v of values) {
      const val = userAffinityMap[v];
      if (val !== undefined) {
        bestMatch = bestMatch === null ? val : Math.max(bestMatch, val);
      }
    }
    // Include negative affinities (cart_remove produces negative scores)
    if (bestMatch !== null) {
      totalScore += bestMatch;
      matchedDims++;
    }
  }

  return matchedDims > 0 ? totalScore / matchedDims : 0;
}
```

This naturally covers all 30 dimensions — even ones the user never explicitly stated a preference for. If they've clicked 10 products tagged `embellishment: embroidered`, their affinity for that value is high, and embroidered products rank higher.

### 6.4 Product Popularity (0-1)

Blends global demand with regional trends.

```javascript
function productPopularity(productStats, userRegion) {
  const globalScore = productStats.popularity_score; // Pre-computed nightly, 0-1

  const regionalCount = productStats.regional_counts[userRegion] || 0;
  const maxRegional = Math.max(...Object.values(productStats.regional_counts), 1);
  const regionalScore = regionalCount / maxRegional;

  return 0.6 * globalScore + 0.4 * regionalScore;
}
```

**popularity_score computation** (during nightly batch):
```javascript
function computePopularityScore(stats) {
  // Weighted recent activity (last 7 days)
  const raw = stats.recent_views * 1
            + stats.recent_try_ons * 3
            + stats.recent_wishlists * 4
            + stats.recent_carts * 6
            + stats.recent_purchases * 10;
  return raw; // Normalized across all products later (divide each by max)
}
```

### 6.5 New Arrival Boost

A newly-added product has `popularity_score = 0`, `view_count = 0`, and zero click history. Without intervention it ranks near the bottom permanently — users who would have loved it never see it, it never accumulates clicks, and the low rank is self-reinforcing. The new-arrival boost breaks this death spiral by injecting a temporary score bump for the first 14 days.

```javascript
function newArrivalBoost(product) {
  if (!product.is_new_arrival) return 0;

  // shopify_published_at is stored in product_catalog_cache at sync time
  const daysOld = (Date.now() - new Date(product.shopify_published_at).getTime())
                  / (1000 * 60 * 60 * 24);

  if (daysOld > 14) return 0;

  // Linear fade: +0.15 on day 0, down to 0 on day 14
  return 0.15 * (1 - daysOld / 14);
}
```

**Properties:**
- **+0.15 on day 0** — strong enough to surface a new arrival in the top third of a typical ranked feed
- **Linear fade over 14 days** — by day 7 it's +0.075; by day 14 it's 0. The product earns its rank organically from that point
- **Not style-gated** — applies regardless of profile match. A new kurta surfaces for everyone briefly so it can gather the initial clicks needed to build its own signal
- **Stackable** — a new arrival that also matches the user's style DNA will score even higher, which is the correct outcome
- **Auto-expiry** — once `shopify_published_at` is more than 14 days ago the function returns 0 with no database writes needed. `is_new_arrival` can be set to `false` by the nightly cron as a housekeeping step (see §9)

### 6.6 Fatigue Penalty

Products shown repeatedly without interaction get a mild penalty to keep the feed fresh.

```javascript
function fatiguePenalty(productId, recentImpressions) {
  const ignoredCount = recentImpressions.filter(
    imp => imp.product_id === productId && !imp.interacted
  ).length;

  return Math.min(0.30, ignoredCount * 0.02); // 2% per skip, max 30%
}
```

### 6.7 Putting It Together

```javascript
function rankProducts(products, userProfile, userClickProfile, statsMap, region, boostQueue) {
  const weights = computeWeights(userClickProfile, getSeasonalBoost());

  const scored = products
    .filter(p => p.available_for_sale)
    .map(product => {
      const stats   = statsMap[product.product_id] || {};
      const style   = styleDnaMatch(userProfile, product);
      const clicks  = userClickAffinity(userClickProfile, product);
      const pop     = productPopularity(stats, region);
      const arrival = newArrivalBoost(product);                              // §6.5
      const fatigue = fatiguePenalty(product.product_id, userClickProfile.recent_impressions || []);

      const score = weights.wStyle * style
                  + weights.wClicks * clicks
                  + weights.wPop * pop
                  + arrival
                  - fatigue;

      // Clamp to 0 — negative scores (from strong cart_remove affinity) just
      // push the product to the bottom; they should not invert sort order.
      return { product, score: Math.max(0, score), isExploration: false };
    });

  scored.sort((a, b) => b.score - a.score);

  // Inject exploration slots (see §8)
  return injectExplorationSlots(scored, userProfile, boostQueue);
}
```

---

## 7. Dynamic Weight System

### 7.1 Three Axes of Adaptation

Weights shift based on three independent factors:

#### Axis 1 — Data Maturity (per user)

```javascript
function dataMaturityWeights(userClickProfile) {
  const totalClicks = userClickProfile.total_views
    + userClickProfile.total_try_ons
    + userClickProfile.total_wishlists
    + userClickProfile.total_cart_adds
    + userClickProfile.total_purchases;

  // 0→1, saturates at ~200 clicks
  const richness = Math.min(1.0, totalClicks / 200);

  return {
    wStyle:  0.85 * (1 - 0.55 * richness),  // 0.85 → 0.38
    wClicks: 0.05 + 0.38 * richness,         // 0.05 → 0.43
    wPop:    0.10                              // Base, adjusted by seasonal
  };
}
```

| Phase | Total Clicks | wStyle | wClicks | wPop |
|-------|-------------|--------|---------|------|
| Cold start | 0 | 0.85 | 0.05 | 0.10 |
| Early learning | ~50 | 0.62 | 0.15 | 0.10 (+ seasonal) |
| Warm | ~100 | 0.50 | 0.24 | 0.10 (+ seasonal) |
| Mature | 200+ | 0.38 | 0.43 | 0.10 (+ seasonal) |

After normalization to sum = 1.0.

#### Axis 2 — Confidence/Agreement

When style DNA and clicks **agree** (user said casual + keeps clicking casual): weights stay as computed above.

When they **disagree** (user said casual + keeps clicking formal): the self-tuning loop (§7.3) naturally shifts weight toward clicks because engagement improves when the system trusts behavioral data. No special logic needed — the feedback loop handles it.

#### Axis 3 — Temporal/Seasonal

```javascript
function getSeasonalBoost() {
  // Returns 0-1 based on proximity to seasonal events that affect clothing demand.
  // v1: stub returning 0. Future: load seasonal calendar from DB or config.
  // Seasonal events (festivals, sales, weather shifts) are NOT hardcoded here —
  // they will be managed via an admin-configurable seasonal_calendar table.
  return 0;
}
```

During seasonal events, product-popularity weight increases: `wPop = 0.10 + 0.08 × seasonalBoost`. This lets collective buying trends break through individual preferences.

### 7.2 Combined Weight Function

```javascript
function computeWeights(userClickProfile, seasonalBoost = 0) {
  const base = dataMaturityWeights(userClickProfile);
  let wStyle = base.wStyle;
  let wClicks = base.wClicks;
  let wPop = base.wPop + 0.08 * seasonalBoost;

  // Apply self-tuned adjustment (from ranking_weights table)
  const tuned = loadActiveWeights(); // { w_style, w_user_clicks, w_product_pop }
  if (tuned) {
    const baseTuned = { w_style: 0.75, w_user_clicks: 0.10, w_product_pop: 0.15 }; // Seed values
    wStyle  += (tuned.w_style - baseTuned.w_style);       // Apply delta
    wClicks += (tuned.w_user_clicks - baseTuned.w_user_clicks);
    wPop    += (tuned.w_product_pop - baseTuned.w_product_pop);
  }

  // Clamp: no weight below 0.05
  wStyle  = Math.max(0.05, wStyle);
  wClicks = Math.max(0.05, wClicks);
  wPop    = Math.max(0.05, wPop);

  // Normalize to sum = 1
  const sum = wStyle + wClicks + wPop;
  return {
    wStyle: wStyle / sum,
    wClicks: wClicks / sum,
    wPop: wPop / sum
  };
}
```

### 7.3 Self-Tuning Feedback Loop

Runs daily at 3 AM IST. Adjusts the global weight bias based on engagement outcomes.

```
1. Compute engagement_ratio for last 7 days (all users):
   ratio = (total_try_ons + total_wishlists + total_cart_adds + 2 × total_purchases)
           / total_views

2. Load previous period's ratio (from ranking_weights history, 7 days ago)

3. delta = current_ratio - previous_ratio

4. Load active ranking_weights row

5. IF delta > +0.001 (engagement improved):
     Nudge each weight +0.02 in the direction of last change
     (If last change increased wClicks, increase it another 0.02)

   IF delta < -0.001 (engagement dropped):
     Revert: nudge -0.01 toward previous config

   IF |delta| <= 0.001 (flat):
     No change

6. Clamp all adjustments to ±0.03 per cycle per weight
7. Normalize weights to sum = 1.0
8. INSERT new ranking_weights row (is_active = true)
9. Set previous row is_active = false
```

**Safety**: Max ±0.03 per cycle means it takes ~10 days of consistent improvement to shift a weight by 0.30. No wild swings.

---

## 8. Exploration & Admin Boost System

### 8.1 Exploration Slots

12% of feed positions are reserved for non-algorithmic products:

```javascript
function injectExplorationSlots(rankedProducts, userProfile, boostQueue) {
  const totalSlots = rankedProducts.length;
  const explorationBudget = Math.ceil(totalSlots * 0.12);
  const explorationInterval = 8; // Every 8th slot

  // Prepare boosted products (style-match filtered)
  const activeBoosted = boostQueue
    .filter(b => new Date(b.expires_at) > new Date())
    .filter(b => styleDnaMatch(userProfile, getProductTags(b.product_id)) >= b.min_style_match)
    .sort((a, b) => b.priority - a.priority);

  // Prepare random products (from bottom 50% of rankings)
  const bottomHalf = rankedProducts.slice(Math.floor(rankedProducts.length / 2));

  const feed = [];
  let mainIdx = 0, explorationUsed = 0;

  for (let pos = 0; pos < totalSlots; pos++) {
    if (pos > 0 && pos % explorationInterval === 0 && explorationUsed < explorationBudget) {
      if (activeBoosted.length > 0) {
        const boost = activeBoosted.shift();
        feed.push({ ...getProduct(boost.product_id), isExploration: true, boostReason: 'promoted' });
      } else {
        const rand = bottomHalf[Math.floor(Math.random() * bottomHalf.length)];
        feed.push({ ...rand, isExploration: true, boostReason: 'discovery' });
      }
      explorationUsed++;
    } else {
      feed.push(rankedProducts[mainIdx++]);
    }
  }

  return feed;
}
```

### 8.2 Admin Boost Queue Rules

| Rule | Value |
|------|-------|
| Max concurrent boosts | 10 |
| Default expiry | 14 days |
| Min style match threshold | 0.20 (configurable per boost) |
| Priority | Integer, higher = shown first |
| Auto-cleanup | Nightly cron deletes expired entries |

Boosted products are still **style-match filtered** — a user with zero overlap (match < 0.20) won't see the boosted product. This prevents irrelevant clearance spam.

---

## 9. Time Decay

### 9.1 Two Decay Rates

| Click Category | Events | Half-Life | Decay Constant |
|---------------|--------|-----------|----------------|
| Preference | view, try_on, wishlist, cart_remove | 30 days | λ = ln(2)/30 ≈ 0.0231 |
| Transactional | cart_add, purchase | 45 days | λ = ln(2)/45 ≈ 0.0154 |

```javascript
function timeDecay(daysAgo, isTransactional) {
  const lambda = isTransactional ? 0.0154 : 0.0231;
  return Math.exp(-lambda * daysAgo);
}
```

**Effect over time:**

| Age | Preference retained | Transactional retained |
|-----|----|----|
| 1 week | 85% | 90% |
| 2 weeks | 72% | 81% |
| 1 month | 50% | 65% |
| 6 weeks | 35% | 50% |
| 2 months | 25% | 40% |
| 3 months | 13% | 25% |

### 9.2 Tag Affinity Recomputation (Nightly)

For each user with `events_since_compute > 0`:

```javascript
function recomputeTagAffinities(userId) {
  // Load click_events from last 90 days
  const events = loadEvents(userId, 90);

  const affinities = {};

  for (const event of events) {
    const isTransactional = ['cart_add', 'purchase'].includes(event.event_type);
    const daysAgo = daysSince(event.created_at);
    const decay = timeDecay(daysAgo, isTransactional);
    const eventWeight = EVENT_WEIGHTS[event.event_type]; // 1, 5, 6, 8, -3, 15
    const weight = eventWeight * decay;

    const tags = event.metadata.product_tags || {};
    for (const [dim, vals] of Object.entries(tags)) {
      if (!affinities[dim]) affinities[dim] = {};
      const values = Array.isArray(vals) ? vals : [vals];
      for (const v of values) {
        affinities[dim][v] = (affinities[dim][v] || 0) + weight;
      }
    }
  }

  // Normalize each dimension to [-1, 1] using absolute max.
  // This preserves negative signals from cart_remove events.
  for (const dim of Object.keys(affinities)) {
    const absMax = Math.max(...Object.values(affinities[dim]).map(Math.abs), 0.001);
    for (const key of Object.keys(affinities[dim])) {
      affinities[dim][key] = Math.round((affinities[dim][key] / absMax) * 1000) / 1000;
    }
  }

  return affinities; // Upsert into user_click_profile.tag_affinities
}
```

---

## 10. Cold Start Strategy

| Phase | Data Available | Ranking | Weight Distribution |
|-------|---------------|---------|-------------------|
| **Anonymous** | IP location only | Regional trending (product popularity filtered by region) | 0/0/100 (pop only) |
| **Pre-onboarding** | User exists, no profile | Global trending | 0/0/100 |
| **Post-onboarding** | 6 profile dimensions, 0 clicks | Style DNA + global popularity | ~85/5/10 |
| **Early learning** | Profile + 1-50 clicks | Style DNA dominant, clicks emerging | ~62/25/13 |
| **Warm** | Profile + 50-200 clicks | Balanced blend | ~48/35/17 |
| **Mature** | Profile + 200+ clicks | Click-led ranking | ~38/43/19 |
| **With wardrobe** | Profile + clicks + wardrobe | Style DNA enriched by wardrobe data | Wardrobe expands style dimensions, same weight system |

The transition is **smooth** (sigmoid-like via the `min(1, totalClicks/200)` formula), not step-based.

---

## 11. Impression Tracking & Feed Freshness

### 11.1 Tracking

When `GET /api/feed/for-you` is served:
1. Record products shown: `{ product_id, shown_at, position, interacted: false }`
2. Append to `user_click_profile.recent_impressions` (jsonb array)
3. Cap at 100 entries (drop oldest)
4. Prune entries older than 7 days

When a click event arrives for a product that has an uninteracted impression:
1. Mark `interacted: true` on the matching impression

### 11.2 Fatigue Penalty

- **2% per ignored impression** (product shown, user scrolled past)
- **Capped at 30%** (after 15 ignores, penalty maxes out)
- **Resets** if user interacts with the product
- **Impressions expire** after 7 days (penalty naturally decays)

This creates gentle feed rotation: products a user ignores gradually sink, making room for others. Combined with exploration slots, the feed stays fresh without needing a manual refresh.

---

## 12. API Endpoints

### Event Tracking

```
POST /api/events/track
  Auth: Required
  Body: { events: [{ product_id: string, event_type: string, metadata?: object }] }
  Response: 202 Accepted
  Rate limit: 50 events/request, 200 events/user/minute
```

### Personalized Feed

```
GET /api/feed/for-you?limit=20&offset=0
  Auth: Optional (anonymous → regional trending)
  Response: {
    products: [{
      product_id, title, image_url, price, compare_at_price,
      score, isExploration, boostReason?,
      tags: { color_family, style_tags, ... }
    }],
    total: number,
    hasMore: boolean
  }
  Cache: 60s per user
```

### Admin Boost

```
POST /api/admin/boost
  Auth: Admin only
  Body: { product_id, priority?: number, min_style_match?: number, expires_in_days?: number }
  Constraint: Max 10 active boosts

GET /api/admin/boost
  Auth: Admin only
  Response: { boosts: [{ id, product_id, priority, min_style_match, expires_at }] }

DELETE /api/admin/boost/:id
  Auth: Admin only
```

### Product Sync

```
POST /api/admin/product-sync
  Auth: Admin only
  Triggers full Shopify → product_catalog_cache sync

POST /api/shopify/webhook/product-update
  Auth: Shopify HMAC verification
  Syncs single product on create/update

POST /api/shopify/webhook/product-delete
  Auth: Shopify HMAC verification
  Deletes product from product_catalog_cache + product_click_stats + admin_boost_queue
```

### Weight Management

```
GET /api/admin/weights
  Auth: Admin only
  Response: { active: {...}, history: [...last 30] }

POST /api/admin/weights/tune
  Auth: Admin only
  Triggers manual weight recalibration (same logic as nightly cron)
```

---

## 13. Frontend Integration

### Event Tracking Service

`web/features/tracking/trackingService.ts`:
- `trackEvent(productId, eventType, metadata?)` — queues in memory
- Auto-flush: every 5 seconds OR at 10 queued events
- `visibilitychange` + `beforeunload` → `navigator.sendBeacon()` flush
- No-op for unauthenticated users

### Integration Points

| Component | Event | Trigger |
|-----------|-------|---------|
| ForYouFeed card | `view` | IntersectionObserver, 2s dwell |
| ProductCard "Try On" | `try_on` | Button tap |
| Wishlist heart | `wishlist` | Toggle on |
| "Add to Cart" | `cart_add` | Button tap |
| Cart item remove | `cart_remove` | Remove button |
| Payment success | `purchase` | Razorpay callback |

### ForYouFeed Component

`web/features/feed/ForYouFeed.tsx`:
- Fetches from `GET /api/feed/for-you`
- Snap-scroll container (`snap-y snap-mandatory`)
- One card per viewport (`h-[68svh]`)
- Focus engine (IntersectionObserver → scale/opacity/blur transitions)
- Product image with parallax zoom on focus
- CTA buttons: Try On, Wishlist, Add to Cart
- Exploration badges for promoted/discovery slots
- Infinite scroll: loads next page at last 3 cards

---

## 14. Nightly Cron Job Summary

Runs at **3 AM IST** daily:

| Task | What It Does |
|------|-------------|
| **Tag affinity decay** | For each user with new events: recompute `user_click_profile.tag_affinities` from `click_events` with time decay |
| **Product recent counts** | Recompute `product_click_stats.recent_*` as 7-day rolling counts |
| **Popularity scores** | Recompute `product_click_stats.popularity_score` (normalized 0-1) |
| **Engagement ratio** | Recompute per-user `engagement_ratio` |
| **Self-tuning** | Compare engagement ratio to previous period, adjust `ranking_weights` |
| **Impression cleanup** | Prune `recent_impressions` entries older than 7 days |
| **Boost cleanup** | Delete expired `admin_boost_queue` rows |
| **Event archival** | Optionally archive `click_events` older than 180 days |

---

## 15. Shopify Metafield Setup

### Metafield Definitions

In Shopify admin → Settings → Custom data → Products, create definitions for:

| Key | Namespace | Type | Description |
|-----|-----------|------|-------------|
| `stiri.color_family` | stiri | List of text | Product color families |
| `stiri.style_tags` | stiri | List of text | Style classifications |
| `stiri.size_range` | stiri | List of text | Available sizes |
| `stiri.body_type_fit` | stiri | List of text | Flattering body types |
| `stiri.skin_tone_complement` | stiri | List of text | Complementing skin tones |
| `stiri.age_group` | stiri | List of text | Target age groups |
| `stiri.garment_type` | stiri | Single line text | shirt, kurta, saree, etc. |
| `stiri.garment_category` | stiri | Single line text | upperwear, lowerwear, fullbody |
| `stiri.fit_silhouette` | stiri | Single line text | slim, regular, relaxed, oversized |
| `stiri.pattern` | stiri | Single line text | solid, stripes, floral, etc. |
| `stiri.fabric` | stiri | Single line text | cotton, silk, linen, etc. |
| `stiri.occasion` | stiri | List of text | daily, office, wedding, etc. |
| `stiri.season` | stiri | List of text | summer, winter, all-season |
| `stiri.price_tier` | stiri | Single line text | budget, mid, premium, luxury |
| `stiri.gender` | stiri | Single line text | men, women, unisex |
| `stiri.neckline` | stiri | Single line text | v-neck, round, collar, etc. |
| `stiri.sleeve_length` | stiri | Single line text | sleeveless, short, full, etc. |
| `stiri.length` | stiri | Single line text | crop, regular, long, etc. |
| `stiri.embellishment` | stiri | Single line text | plain, embroidered, etc. |
| `stiri.brand_tier` | stiri | Single line text | in-house, indie, designer |
| `stiri.color_intensity` | stiri | Single line text | pastel, muted, vibrant, etc. |
| `stiri.layering` | stiri | Single line text | standalone, layerable, set-piece |
| `stiri.care_level` | stiri | Single line text | machine-wash, dry-clean, etc. |
| `stiri.origin_aesthetic` | stiri | Single line text | indian-trad, indo-western, etc. |
| `stiri.trend_tag` | stiri | List of text | quiet-luxury, old-money, etc. |
| `stiri.weight` | stiri | Single line text | lightweight, midweight, heavyweight |
| `stiri.transparency` | stiri | Single line text | opaque, semi-sheer, sheer |
| `stiri.sustainability` | stiri | List of text | organic, recycled, fair-trade |
| `stiri.versatility` | stiri | Single line text | single-occasion, everyday, etc. |
| `stiri.is_new_arrival` | stiri | Boolean | true/false |

### Sync Pipeline

```
Shopify product create/update webhook
  → POST /api/shopify/webhook/product-update
  → Verify HMAC signature
  → Extract all stiri.* metafields from payload
  → UPSERT → product_catalog_cache
  → Invalidate product cache (existing TTL cache)

Manual full sync:
  → POST /api/admin/product-sync
  → Paginate through all Shopify products (250/page)
  → For each product, fetch metafields
  → Bulk UPSERT → product_catalog_cache
```

### GraphQL Metafield Query

```graphql
query ProductWithMetafields($handle: String!) {
  product(handle: $handle) {
    id
    handle
    title
    metafields(identifiers: [
      { namespace: "stiri", key: "color_family" },
      { namespace: "stiri", key: "style_tags" },
      { namespace: "stiri", key: "garment_type" },
      # ... all 30 keys
    ]) {
      namespace
      key
      value
      type
    }
  }
}
```

---

## 16. Example: Full Ranking Walkthrough

**User**: Priya, 25 (gen_z), Mumbai. Profile: colors=[navy, black], styles=[formal, minimalist], fit=m, bodyType=hourglass, skinTone=medium. Has 120 clicks: mostly formal suits and minimal dresses. No wardrobe yet.

**Product A**: Classic Navy Suit — `color_family:[navy], style_tags:[formal,minimalist], body_type_fit:[hourglass,rectangle], skin_tone_complement:[fair,medium,dark], garment_type:suit, pattern:solid, price_tier:premium`

**Product B**: Floral Party Kurta — `color_family:[pink,red], style_tags:[party,ethnic], garment_type:kurta, pattern:floral, occasion:[festive,party]`

**Product C**: Festive Silk Saree — `color_family:[maroon,gold], style_tags:[ethnic], body_type_fit:[hourglass,pear], occasion:[wedding,festive]` — currently trending nationally (seasonal spike).

**Weights** (120 clicks, seasonal_boost=0.8):
- data_richness = 120/200 = 0.60
- wStyle = 0.85 × (1 - 0.55 × 0.60) = 0.85 × 0.67 = 0.57
- wClicks = 0.05 + 0.38 × 0.60 = 0.278
- wPop = 0.10 + 0.08 × 0.8 = 0.164
- Normalized: wStyle=0.56, wClicks=0.28, wPop=0.16

**Scores**:

| | Style DNA | Click Affinity | Popularity | Fatigue | **Final** |
|---|---|---|---|---|---|
| Product A (Navy Suit) | 0.92 (color+style+body+skin match) | 0.85 (clicks align with formal+suit+navy) | 0.30 (moderate global) | 0 | **0.56×0.92 + 0.28×0.85 + 0.16×0.30 = 0.80** |
| Product B (Party Kurta) | 0.15 (no color/style overlap) | 0.10 (no click pattern) | 0.20 | 0 | **0.56×0.15 + 0.28×0.10 + 0.16×0.20 = 0.14** |
| Product C (Festive Saree) | 0.25 (body_type match only) | 0.05 (minimal click pattern) | 0.90 (seasonal trending!) | 0 | **0.56×0.25 + 0.28×0.05 + 0.16×0.90 = 0.30** |

**Result**: Navy Suit ranks #1 (strongly aligned). Festive Saree ranks #2 (trending lifts it past the kurta despite low style/click match). Party Kurta ranks #3. Even during seasonal spikes, the user's preference still dominates — but the trending product doesn't get buried.

---

## 17. Metrics & Monitoring

| Metric | Formula | Target |
|--------|---------|--------|
| Feed engagement rate | (try_ons + wishlists + carts) / views | > 12% |
| Try-on → Cart rate | cart_adds from users who tried on / total try_ons | > 8% |
| Feed diversity | Unique garment_types in top 10 / total garment types | > 0.4 |
| Cold start quality | Engagement rate for users with < 10 clicks | > 6% |
| Self-tuning stability | Weight variance over 30 days | < 0.15 |
| Exploration slot CTR | Clicks on exploration slots / exploration impressions | > 3% |
| Boost effectiveness | Engagement on boosted products vs. baseline | > 1.5× |
| Feed freshness | % of top-10 products unchanged vs. yesterday | < 70% |
