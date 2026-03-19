# Stiri.in — End-to-End Personalization Model

## The Core Thesis

Every user who completes onboarding hands you 5 explicit taste signals (colors, styles, fit, body type, skin tone). Every tap after that — template viewed, image generated, product wishlisted, item carted, purchase completed — is an **implicit** signal that's 10x more valuable than what they told you. The personalization engine fuses both into a living **Style DNA** vector that makes every surface of stiri.in feel hand-curated.

---

## 1. SIGNAL TAXONOMY — What Data Feeds the Engine

### 1.1 Explicit Signals (Already Collected)

| Signal | Source | Weight | Update Frequency |
|--------|--------|--------|------------------|
| Favorite colors (1-3) | Onboarding step 1 | High | User-editable |
| Style tags (casual, ethnic, etc.) | Onboarding step 2 | High | User-editable |
| Fit size (XS → XXL) | Onboarding step 3 | Medium | User-editable |
| Body type (hourglass, pear, etc.) | Onboarding step 3 | Medium | User-editable |
| Skin tone (fair/medium/dark) | Onboarding step 3 | Medium | User-editable |
| Age range (gen_z, millennial, etc.) | Onboarding step 4 | Low | User-editable |
| Location (city/state/pincode) | Onboarding step 5 | Medium | User-editable |

### 1.2 Behavioral Signals (NEW — Click Tracking)

These are the **highest-value signals** because they reflect real intent, not self-reported preference.

| Event | Object | Intent Strength | Weight |
|-------|--------|-----------------|--------|
| `template_view` | Template card on Home/Stack page | Curiosity (weak) | 1x |
| `template_dwell` | Template card viewed > 3 seconds | Interest (moderate) | 2x |
| `template_generate` | User actually generated with template | Strong intent | 5x |
| `template_save` | User saved/favorited a generated image | Satisfaction/approval | 7x |
| `template_share` | User shared generated image | Advocacy | 8x |
| `template_regenerate` | Used same template again | Strong repeat preference | 6x |
| `product_view` | Tapped Shopify product card | Curiosity | 1x |
| `product_wishlist` | **Add to Wishlist** button | Strong desire, not yet ready to buy | 6x |
| `product_add_to_cart` | **Add to Cart** button | Purchase intent (high) | 8x |
| `product_buy_now` | **Buy Now** button | Immediate purchase intent | 10x |
| `product_remove_from_cart` | Removed from cart | Negative signal | -3x |
| `product_checkout_complete` | Completed Shopify checkout | **Strongest signal** | 15x |
| `product_checkout_abandon` | Started checkout, didn't complete | Conflicted | 2x |
| `stack_view` | Opened a stack (Fitit, Animation, etc.) | Category interest | 2x |
| `search_query` | Used search bar | Active intent | 3x |
| `search_result_click` | Clicked a search result | Validated interest | 4x |

### 1.3 Transactional Signals (Shopify + Razorpay)

| Signal | Source | Weight |
|--------|--------|--------|
| Purchase history | Shopify order webhook | 15x |
| Purchase amount (₹) | Shopify order | Price-tier indicator |
| Product category purchased | Shopify product tags | Category affinity |
| Subscription tier | Razorpay payment | Engagement tier |
| Generation quota usage rate | `monthly_used / monthly_quota` | Engagement intensity |

### 1.4 Contextual Signals (Ambient)

| Signal | Source | Purpose |
|--------|--------|---------|
| Time of day | Request timestamp | Morning = professional, evening = aspirational |
| Day of week | Request timestamp | Weekend = casual, weekday = work |
| Season/month | Server clock | Winter coats in Dec, summer linen in May |
| Festival proximity | Holiday calendar | Diwali templates boost in Oct-Nov |
| City/region | User's default address | Regional fashion trends |
| Device type | User-Agent header | Mobile-first layout tuning |

---

## 2. DATA MODEL — New Tables & Migrations

### 2.1 `user_events` — The Behavioral Event Stream

This is the **backbone of personalization**. Every meaningful user action is an event.

```sql
CREATE TABLE public.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event classification
  event_type text NOT NULL,              -- 'template_view', 'product_wishlist', 'product_add_to_cart', 'product_buy_now', etc.
  event_category text NOT NULL,          -- 'template', 'product', 'stack', 'search', 'generation'
  
  -- Object reference (what was acted on)
  object_type text NOT NULL,             -- 'template', 'product', 'stack', 'generated_image'
  object_id text NOT NULL,               -- template_id, shopify_product_id, stack_id
  object_name text,                      -- Human-readable: "Classic Tailored Suit"
  
  -- Rich context
  metadata jsonb DEFAULT '{}',           -- Flexible context per event type
  -- Examples:
  --   template_generate: { "mode": "tryon", "aspect_ratio": "3:4", "stack_id": "fitit" }
  --   product_wishlist:  { "price": 8000, "currency": "INR", "variant_id": "...", "tags": ["formal","suit"] }
  --   product_buy_now:   { "price": 15000, "variant_id": "...", "size": "L", "color": "navy" }
  --   search_query:      { "query": "silk saree under 10000", "results_count": 12 }
  
  -- Contextual
  session_id text,                       -- Groups events within one browsing session
  source_page text,                      -- 'home', 'stack_view', 'product_detail', 'search'
  device_type text,                      -- 'mobile', 'desktop', 'tablet'
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast personalization queries
CREATE INDEX idx_user_events_user_time ON user_events(user_id, created_at DESC);
CREATE INDEX idx_user_events_type ON user_events(event_type, created_at DESC);
CREATE INDEX idx_user_events_object ON user_events(object_type, object_id);
CREATE INDEX idx_user_events_session ON user_events(session_id);

-- RLS: users can only read their own events
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own events" ON public.user_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role inserts events" ON public.user_events
  FOR INSERT WITH CHECK (true);  -- Server-side insert only (via service role)
```

### 2.2 `user_wishlist` — Persistent Wishlist

```sql
CREATE TABLE public.user_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  item_type text NOT NULL,               -- 'product' | 'template'
  item_id text NOT NULL,                 -- Shopify product ID or template ID
  item_name text,                        -- "Silk Saree"
  item_image_url text,                   -- Thumbnail for fast rendering
  item_metadata jsonb DEFAULT '{}',      -- Price, tags, stack_id, etc.
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, item_type, item_id)    -- No duplicate wishlist entries
);

CREATE INDEX idx_user_wishlist_user ON user_wishlist(user_id, created_at DESC);

ALTER TABLE public.user_wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlist" ON public.user_wishlist
  FOR ALL USING (auth.uid() = user_id);
```

### 2.3 `user_cart` — Server-Synced Cart

```sql
CREATE TABLE public.user_cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  product_id text NOT NULL,              -- Shopify product ID
  variant_id text NOT NULL,              -- Shopify variant ID (size/color combo)
  product_name text,  
  variant_name text,                     -- "Navy / L"
  image_url text,
  price integer NOT NULL,                -- In paise
  currency text DEFAULT 'INR',
  quantity integer DEFAULT 1 CHECK (quantity > 0),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, variant_id)            -- One row per variant per user
);

CREATE INDEX idx_user_cart_user ON user_cart(user_id);

ALTER TABLE public.user_cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cart" ON public.user_cart
  FOR ALL USING (auth.uid() = user_id);
```

### 2.4 `user_style_vector` — Computed Style DNA

This stores the **pre-computed personalization vector** for each user, updated periodically (or on-demand after significant events).

```sql
CREATE TABLE public.user_style_vector (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Affinity scores (0.0 → 1.0, computed from weighted events)
  color_affinities jsonb NOT NULL DEFAULT '{}',
    -- { "red": 0.85, "blue": 0.72, "black": 0.65, "white": 0.40, ... }
  
  style_affinities jsonb NOT NULL DEFAULT '{}',
    -- { "formal": 0.90, "ethnic": 0.75, "casual": 0.60, "streetwear": 0.20, ... }
  
  stack_affinities jsonb NOT NULL DEFAULT '{}',
    -- { "fitit": 0.80, "clothes": 0.70, "aesthetics": 0.60, "flex": 0.15, ... }
  
  price_affinity jsonb NOT NULL DEFAULT '{}',
    -- { "tier": "mid-premium", "avg_price": 8500, "max_price": 20000, "currency": "INR" }
  
  template_affinities jsonb NOT NULL DEFAULT '{}',
    -- Top 20 template IDs with scores
    -- { "clothes_template_1": 0.95, "fitit_template_2": 0.88, ... }
  
  -- Category tags extracted from behavioral pattern
  inferred_tags text[] DEFAULT '{}',
    -- ['luxury-seeker', 'ethnic-core', 'try-on-heavy', 'price-sensitive', 'aspirational']
  
  -- Temporal patterns
  active_hours jsonb DEFAULT '{}',
    -- { "peak_hour": 20, "peak_day": "saturday", "avg_sessions_per_week": 4.2 }
  
  -- Engagement level
  engagement_score decimal(5,2) DEFAULT 0.0,
    -- 0-100 scale based on recency, frequency, monetary value
  
  -- Versioning
  version integer DEFAULT 1,
  computed_at timestamptz NOT NULL DEFAULT now(),
  events_processed_until timestamptz,    -- Watermark for incremental recomputation
  
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 2.5 `product_catalog_cache` — Shopify Product Mirror

```sql
CREATE TABLE public.product_catalog_cache (
  shopify_product_id text PRIMARY KEY,
  handle text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  product_type text,                     -- "Kurta", "Saree", "Suit"
  vendor text,
  tags text[] DEFAULT '{}',              -- ["formal", "silk", "wedding", "premium"]
  
  -- Pricing
  min_price integer,                     -- In paise
  max_price integer,
  currency text DEFAULT 'INR',
  
  -- Images
  featured_image_url text,
  image_urls text[] DEFAULT '{}',
  
  -- Variant summary
  available_sizes text[] DEFAULT '{}',   -- ["S", "M", "L", "XL"]
  available_colors text[] DEFAULT '{}',  -- ["navy", "black", "maroon"]
  
  -- Metafields for personalization (synced from Shopify)
  style_tags text[] DEFAULT '{}',        -- ["formal", "ethnic", "party"]
  color_family text[] DEFAULT '{}',      -- ["blue", "dark"]
  season text[] DEFAULT '{}',            -- ["winter", "all-season"]
  occasion text[] DEFAULT '{}',          -- ["wedding", "office", "festive"]
  body_type_fit text[] DEFAULT '{}',     -- ["hourglass", "rectangle"] — which body types it suits
  skin_tone_complement text[] DEFAULT '{}', -- ["fair", "medium"] — which skin tones it complements
  age_group text[] DEFAULT '{}',         -- ["gen_z", "millennial"]
  
  -- Inventory
  available_for_sale boolean DEFAULT true,
  
  -- Sync metadata
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_tags ON product_catalog_cache USING GIN(tags);
CREATE INDEX idx_product_style_tags ON product_catalog_cache USING GIN(style_tags);
```

---

## 3. EVENT PIPELINE — How Clicks Flow Into the Engine

### 3.1 Frontend Event Tracker

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│                                                              │
│  User taps "Add to Wishlist" on Silk Saree                  │
│       ↓                                                      │
│  trackEvent({                                                │
│    eventType: 'product_wishlist',                            │
│    eventCategory: 'product',                                 │
│    objectType: 'product',                                    │
│    objectId: 'gid://shopify/Product/123456',                │
│    objectName: 'Silk Saree',                                │
│    metadata: {                                               │
│      price: 1500000,    // paise                             │
│      tags: ['ethnic', 'silk', 'wedding'],                   │
│      color: 'maroon',                                        │
│      sourcePage: 'home_trending',                           │
│      position: 3         // 3rd item in carousel            │
│    }                                                         │
│  })                                                          │
│       ↓                                                      │
│  Batches events in memory (max 10 or flush every 5s)        │
│       ↓                                                      │
│  POST /api/events/track (batch)                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Backend Event Processor

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Express)                         │
│                                                              │
│  POST /api/events/track                                      │
│       ↓                                                      │
│  1. Auth: Verify JWT, extract user_id                        │
│  2. Validate: Check event_type ∈ allowed set                │
│  3. Enrich: Add session_id, device_type, timestamp          │
│  4. Insert → user_events table (batch insert)               │
│  5. IF event is high-intent (wishlist/cart/buy):             │
│     → Also upsert user_wishlist or user_cart                │
│  6. IF event count since last recompute > threshold (50):    │
│     → Trigger async style vector recomputation              │
│  7. Return 202 Accepted                                      │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Style Vector Recomputation (Batch Job)

Runs either:
- **On-demand**: After 50+ new events since last computation
- **Scheduled**: Nightly cron at 3 AM IST via Supabase Edge Function or `pg_cron`

```
┌─────────────────────────────────────────────────────────────┐
│              STYLE VECTOR RECOMPUTATION                       │
│                                                              │
│  For each user with stale vector:                            │
│                                                              │
│  1. LOAD explicit profile:                                   │
│     colors, styles, fit, body_type, skin_tone, age_range    │
│                                                              │
│  2. LOAD behavioral events (last 90 days, decayed):          │
│     SELECT event_type, object_id, metadata, created_at      │
│       FROM user_events                                       │
│      WHERE user_id = $1                                      │
│        AND created_at > now() - interval '90 days'           │
│      ORDER BY created_at DESC                                │
│                                                              │
│  3. COMPUTE weighted affinity scores:                        │
│                                                              │
│     For each event, apply:                                   │
│       weight = BASE_WEIGHT[event_type]                       │
│               × TIME_DECAY(days_ago)                         │
│               × POSITION_BOOST(if position <= 3)             │
│                                                              │
│     Time decay formula:                                      │
│       decay = exp(-0.03 × days_since_event)                  │
│       (Half-life ≈ 23 days: recent actions count 2x          │
│        more than 3-week-old actions)                         │
│                                                              │
│  4. MERGE explicit + behavioral:                             │
│     final_score = 0.3 × explicit + 0.7 × behavioral        │
│     (behavioral weighted higher because it's action-based)  │
│                                                              │
│  5. NORMALIZE to 0.0–1.0 per category                       │
│                                                              │
│  6. EXTRACT inferred tags:                                   │
│     - If avg cart price > ₹10,000 → 'luxury-seeker'        │
│     - If 60%+ templates from fitit → 'try-on-heavy'        │
│     - If 70%+ styles are ethnic → 'ethnic-core'            │
│     - If wishlist > 10 items, cart = 0 → 'browser'         │
│     - If buy_now events > 3/month → 'impulse-buyer'        │
│                                                              │
│  7. COMPUTE engagement score (RFM):                          │
│     R = days since last event (lower = better)               │
│     F = events per week (higher = better)                    │
│     M = total spend (higher = better)                        │
│     engagement = normalize(0.4R + 0.35F + 0.25M)           │
│                                                              │
│  8. UPSERT → user_style_vector                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. PERSONALIZATION SURFACES — Where It Shows Up

### 4.1 Home Page — Personalized Template Feed

**Current**: Static "Trending Templates" (8 hardcoded).  
**After**: Dynamic, per-user ranked feed.

```
┌───────────────────────────────────────────────────────┐
│                    HOME FEED RANKING                    │
│                                                        │
│  Input: All available templates (100+)                 │
│  User: user_style_vector for this user                 │
│                                                        │
│  Score each template:                                  │
│                                                        │
│  template_score =                                      │
│    0.30 × style_match(template.tags, user.styles)      │
│  + 0.20 × color_match(template.colors, user.colors)   │
│  + 0.15 × stack_affinity(template.stack_id)            │
│  + 0.15 × template_affinity(template.id)  ← direct    │
│  + 0.10 × seasonal_boost(template, current_month)      │
│  + 0.05 × trending_score(template, all_users)          │
│  + 0.05 × novelty_bonus(not_seen_before)               │
│                                                        │
│  Apply diversity filter:                               │
│    Max 2 templates per stack in top 10                  │
│    At least 1 template from an unexplored stack        │
│                                                        │
│  Output: Ordered list, top 20                          │
│                                                        │
│  Section Layout:                                       │
│  ┌─ "Made for You" (top 5 personalized) ──────────┐   │
│  ├─ "Trending Now" (top 5 by all-user popularity) ┤   │
│  ├─ "Try Something New" (high-novelty picks) ─────┤   │
│  └─ "Because you liked X" (similarity-based) ─────┘   │
└───────────────────────────────────────────────────────┘
```

### 4.2 Product Recommendations — Shopify Integration

When the user browses Shopify products, rank them using their style vector:

```
┌───────────────────────────────────────────────────────┐
│              PRODUCT RANKING PIPELINE                   │
│                                                        │
│  1. Fetch products from product_catalog_cache           │
│     (pre-synced from Shopify, with metafield tags)     │
│                                                        │
│  2. Score each product:                                │
│                                                        │
│  product_score =                                       │
│    0.25 × style_overlap(product.style_tags,            │
│                          user.style_affinities)        │
│  + 0.20 × color_overlap(product.color_family,          │
│                          user.color_affinities)        │
│  + 0.15 × body_fit_match(product.body_type_fit,        │
│                           user.profile.body_type)      │
│  + 0.10 × skin_complement(product.skin_tone_complement,│
│                             user.profile.skin_tone)    │
│  + 0.10 × price_fit(product.price,                     │
│                      user.price_affinity.tier)         │
│  + 0.10 × occasion_relevance(product.occasion,         │
│                                current_context)        │
│  + 0.05 × age_match(product.age_group,                 │
│                      user.profile.age_range)           │
│  + 0.05 × wishlist_cart_boost(if wishlisted: +0.3)     │
│                                                        │
│  3. Return top-N ranked products                       │
└───────────────────────────────────────────────────────┘
```

### 4.3 "Complete the Look" — Post-Generation Recommendations

After a user generates an image with a template, surface related products:

```
User generates "Classic Tailored Suit" try-on
  ↓
System detects: formal, suit, office, navy
  ↓
Recommend from Shopify:
  1. Classic Tailored Suit (exact product if available)
  2. Business Casual (related style tag)
  3. Watches (accessory complement, from Fitit stack)
  ↓
CTA: "Love the look? Get it delivered"
  → Add to Wishlist | Add to Cart | Buy Now
  → Each click → user_events → feeds back into vector
```

### 4.4 AI Search — Semantic Query Understanding

When a user searches "something elegant for a wedding under 15000":

```
┌───────────────────────────────────────────────────────┐
│              SEMANTIC SEARCH PIPELINE                   │
│                                                        │
│  Query: "something elegant for a wedding under 15000"  │
│                                                        │
│  Step 1 — Intent Extraction (LLM call):                │
│    {                                                    │
│      "style": ["ethnic", "formal"],                    │
│      "occasion": ["wedding"],                          │
│      "price_max": 1500000, // paise                    │
│      "sentiment": "elegant"                            │
│    }                                                    │
│                                                        │
│  Step 2 — Search both catalogs:                        │
│    Templates: Match by style/occasion keywords          │
│    Products: Filter price ≤ 15000, match tags          │
│                                                        │
│  Step 3 — Re-rank by user's style vector:              │
│    Boost templates/products that align with user DNA   │
│                                                        │
│  Step 4 — Return blended results:                      │
│    "Try this look" (templates to generate with)        │
│    "Shop this look" (products to buy)                  │
└───────────────────────────────────────────────────────┘
```

### 4.5 Push/Nudge Triggers — Re-engagement

Based on behavioral patterns, trigger nudges:

| Trigger Pattern | Nudge | Channel |
|-----------------|-------|---------|
| Wishlisted item now on sale | "Your Silk Saree just dropped to ₹8,000" | WhatsApp / In-app |
| Cart abandoned > 2 hours | "Still thinking about the Tailored Suit?" | WhatsApp |
| Haven't generated in 7 days | "New templates drop: Summer Linen collection" | WhatsApp |
| Festival approaching + style match | "Diwali looks for you — see your Festive Kurta" | In-app banner |
| High engagement score + never purchased | "First order? Here's ₹500 off" | WhatsApp |
| Used try-on template for product that exists in shop | "You tried it on — now own it" | In-app CTA |

---

## 5. ARCHITECTURE DIAGRAM

```
                         ┌──────────────────────┐
                         │      USER DEVICE      │
                         │  (React PWA / Mobile) │
                         └─────────┬────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                     │
         Explicit Data       Behavioral Events     Search Queries
       (Profile, Prefs)    (Views, Clicks, Cart)    (Free text)
              │                    │                     │
              ▼                    ▼                     ▼
┌──────────────────────────────────────────────────────────────┐
│                     EXPRESS.JS API LAYER                       │
│                                                               │
│  /api/profile/*     /api/events/track    /api/search          │
│  /api/wishlist/*    /api/cart/*           /api/products/*      │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │ Auth + RLS   │  │ Event Batcher│  │ Search Coordinator│   │
│  └─────────────┘  └──────┬───────┘  └────────┬──────────┘   │
└──────────────────────────┼───────────────────┼───────────────┘
                           │                   │
              ┌────────────┼───────────────────┼────────┐
              │            ▼                   ▼        │
              │  ┌─────────────────┐  ┌──────────────┐  │
              │  │  SUPABASE (PG)  │  │  GEMINI LLM  │  │
              │  │                 │  │  (Intent +    │  │
              │  │ • profiles      │  │   Re-ranking) │  │
              │  │ • user_events   │  └──────────────┘  │
              │  │ • user_wishlist │                     │
              │  │ • user_cart     │  ┌──────────────┐  │
              │  │ • user_style_   │  │   SHOPIFY    │  │
              │  │   vector        │  │  Storefront  │  │
              │  │ • product_      │  │    API       │  │
              │  │   catalog_cache │  └──────────────┘  │
              │  │ • generated_    │                     │
              │  │   images        │                     │
              │  └────────┬────────┘                     │
              │           │                              │
              │           ▼                              │
              │  ┌─────────────────┐                     │
              │  │  STYLE VECTOR   │ ← Nightly cron OR  │
              │  │  RECOMPUTATION  │   on-demand after   │
              │  │  (SQL function) │   50+ new events    │
              │  └─────────────────┘                     │
              │                                          │
              │  ┌─────────────────┐                     │
              │  │  SHOPIFY SYNC   │ ← Webhook on        │
              │  │  (Product cache │   product update     │
              │  │   refresh)      │   OR hourly poll     │
              │  └─────────────────┘                     │
              └──────────────────────────────────────────┘
```

---

## 6. STYLE DNA COMPUTATION — The Math

### 6.1 Event Weight Table

```javascript
const EVENT_WEIGHTS = {
  // Template interactions
  template_view:        1,
  template_dwell:       2,
  template_generate:    5,
  template_save:        7,
  template_share:       8,
  template_regenerate:  6,
  
  // Product interactions
  product_view:              1,
  product_wishlist:          6,    // "Add to Wishlist"
  product_add_to_cart:       8,    // "Add to Cart"  
  product_buy_now:          10,    // "Buy Now"
  product_remove_from_cart: -3,    // Negative signal
  product_checkout_complete: 15,   // Strongest positive
  product_checkout_abandon:  2,    // Weak positive (showed interest)
  
  // Navigation
  stack_view:           2,
  search_query:         3,
  search_result_click:  4,
};
```

### 6.2 Time Decay Function

```javascript
function timeDecay(eventDate) {
  const daysSince = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
  // Exponential decay with ~23 day half-life
  return Math.exp(-0.03 * daysSince);
}
```

### 6.3 Affinity Computation (per dimension)

```javascript
function computeAffinities(events, dimension, extractFn) {
  // dimension: 'color', 'style', 'stack', 'template', 'price_tier'
  // extractFn: event → array of dimension values
  
  const scores = {};  // { "formal": 12.5, "ethnic": 8.3, ... }
  
  for (const event of events) {
    const values = extractFn(event);       // e.g., ["formal", "ethnic"]
    const weight = EVENT_WEIGHTS[event.event_type] || 1;
    const decay = timeDecay(event.created_at);
    const adjustedWeight = weight * decay;
    
    for (const val of values) {
      scores[val] = (scores[val] || 0) + adjustedWeight;
    }
  }
  
  // Normalize to 0.0–1.0
  const maxScore = Math.max(...Object.values(scores), 1);
  for (const key in scores) {
    scores[key] = Math.round((scores[key] / maxScore) * 100) / 100;
  }
  
  return scores;
}
```

### 6.4 Merge Explicit + Behavioral

```javascript
function mergeSignals(explicitProfile, behavioralAffinities) {
  const EXPLICIT_WEIGHT = 0.3;
  const BEHAVIORAL_WEIGHT = 0.7;
  
  const merged = {};
  
  // Explicit: user said they like "red", "blue" → these get 1.0 base score
  for (const color of explicitProfile.colors) {
    merged[color] = (merged[color] || 0) + EXPLICIT_WEIGHT * 1.0;
  }
  
  // Behavioral: user's actions showed affinity for "black": 0.8, "red": 0.6
  for (const [color, score] of Object.entries(behavioralAffinities)) {
    merged[color] = (merged[color] || 0) + BEHAVIORAL_WEIGHT * score;
  }
  
  // If user said "red" (explicit=0.3) and also clicked red products a lot (behavioral=0.7×0.6=0.42)
  // Final red score = 0.72 ← strong signal from both sides
  
  // If user said "blue" (explicit=0.3) but never interacted with blue items (behavioral=0)
  // Final blue score = 0.30 ← weaker, profile-only signal → may drift down over time
  
  return merged;
}
```

### 6.5 Inferred Tags (Behavioral Archetypes)

```javascript
function inferTags(styleVector, events, profile) {
  const tags = [];
  
  // Price sensitivity
  const avgCartPrice = avgPrice(events.filter(e => e.event_type === 'product_add_to_cart'));
  if (avgCartPrice > 1000000) tags.push('luxury-seeker');      // > ₹10,000 avg
  else if (avgCartPrice > 500000) tags.push('mid-premium');
  else if (avgCartPrice > 0) tags.push('value-conscious');
  
  // Engagement pattern
  const buyNowCount = events.filter(e => e.event_type === 'product_buy_now').length;
  if (buyNowCount > 3) tags.push('impulse-buyer');
  
  const wishlistCount = events.filter(e => e.event_type === 'product_wishlist').length;
  const cartCount = events.filter(e => e.event_type === 'product_add_to_cart').length;
  if (wishlistCount > 10 && cartCount === 0) tags.push('window-shopper');
  
  // Category dominance
  const stackEvents = groupBy(events, e => e.metadata?.stack_id);
  const totalStackEvents = events.filter(e => e.metadata?.stack_id).length;
  for (const [stackId, stackEvts] of Object.entries(stackEvents)) {
    if (stackEvts.length / totalStackEvents > 0.5) {
      tags.push(`${stackId}-heavy`);  // 'fitit-heavy', 'flex-heavy'
    }
  }
  
  // Style dominance  
  const topStyle = Object.entries(styleVector.style_affinities)
    .sort((a, b) => b[1] - a[1])[0];
  if (topStyle && topStyle[1] > 0.7) tags.push(`${topStyle[0]}-core`); // 'ethnic-core'
  
  // Try-on to purchase pipeline
  const tryOnEvents = events.filter(e => e.event_type === 'template_generate' && e.metadata?.mode === 'tryon');
  const purchaseEvents = events.filter(e => e.event_type === 'product_checkout_complete');
  if (tryOnEvents.length > 5 && purchaseEvents.length > 0) tags.push('try-then-buy');
  
  return tags;
}
```

---

## 7. SHOPIFY METAFIELD TAGGING STRATEGY

For the personalization engine to match products to users, every Shopify product needs rich metadata. Use **Shopify metafields** (custom namespace: `stiri`) to tag products.

### 7.1 Required Metafields per Product

| Metafield Key | Type | Example | Purpose |
|--------------|------|---------|---------|
| `stiri.style_tags` | list.single_line_text | `["formal", "ethnic"]` | Match user style affinities |
| `stiri.color_family` | list.single_line_text | `["navy", "blue"]` | Match user color affinities |
| `stiri.occasion` | list.single_line_text | `["wedding", "festive"]` | Contextual ranking |
| `stiri.season` | list.single_line_text | `["winter", "all-season"]` | Seasonal boost/suppress |
| `stiri.body_type_fit` | list.single_line_text | `["hourglass", "rectangle"]` | Body-appropriate suggestions |
| `stiri.skin_tone_complement` | list.single_line_text | `["fair", "medium"]` | Skin-tone aware suggestions |
| `stiri.age_group` | list.single_line_text | `["gen_z", "millennial"]` | Age relevance |
| `stiri.template_link` | single_line_text | `"clothes_template_1"` | Links product to a try-on template |
| `stiri.price_tier` | single_line_text | `"premium"` | `budget` / `mid` / `premium` / `luxury` |

### 7.2 Example: Fully Tagged Product

**Classic Tailored Suit** (₹8,000–₹20,000)

```json
{
  "title": "Classic Tailored Suit",
  "tags": ["formal", "suit", "office", "wedding", "premium"],
  "metafields": {
    "stiri.style_tags": ["formal", "minimalist"],
    "stiri.color_family": ["navy", "charcoal", "black"],
    "stiri.occasion": ["office", "wedding", "interview"],
    "stiri.season": ["all-season"],
    "stiri.body_type_fit": ["rectangle", "inverted_triangle"],
    "stiri.skin_tone_complement": ["fair", "medium", "dark"],
    "stiri.age_group": ["millennial", "gen_x"],
    "stiri.template_link": "clothes_template_2",
    "stiri.price_tier": "premium"
  }
}
```

### 7.3 Sync Pipeline

```
Shopify Product Create/Update Webhook
  ↓
POST /api/shopify/product-sync (server endpoint)
  ↓
Parse product + all metafields
  ↓
UPSERT → product_catalog_cache table
  ↓
Invalidate product cache (TTL cache)
```

---

## 8. RANKING ALGORITHM — Full Pseudocode

### 8.1 Template Ranking (Home Feed)

```javascript
function rankTemplatesForUser(allTemplates, userVector, userProfile) {
  const scored = allTemplates.map(template => {
    let score = 0;
    
    // 1. Style match (30%)
    const styleOverlap = cosineSimilarity(
      template.keywords?.filter(k => STYLE_TAGS.includes(k)) || [],
      userVector.style_affinities
    );
    score += 0.30 * styleOverlap;
    
    // 2. Color match (20%)
    const colorOverlap = cosineSimilarity(
      template.colorHints || [],
      userVector.color_affinities
    );
    score += 0.20 * colorOverlap;
    
    // 3. Stack affinity (15%)
    const stackScore = userVector.stack_affinities[template.stackId] || 0;
    score += 0.15 * stackScore;
    
    // 4. Direct template affinity (15%)
    const templateScore = userVector.template_affinities[template.id] || 0;
    score += 0.15 * templateScore;
    
    // 5. Seasonal boost (10%)
    const seasonScore = getSeasonalRelevance(template, new Date());
    score += 0.10 * seasonScore;
    
    // 6. Global trending (5%)
    const trendScore = getGlobalTrendScore(template.id);
    score += 0.05 * trendScore;
    
    // 7. Novelty bonus (5%) — boost templates user hasn't seen
    const seen = userVector.template_affinities[template.id] != null;
    score += seen ? 0 : 0.05;
    
    return { template, score };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Apply diversity: max 2 per stack in top 10
  return applyDiversityFilter(scored, { maxPerStack: 2, topN: 10 });
}
```

### 8.2 Product Ranking (Shopify Feed)

```javascript
function rankProductsForUser(products, userVector, userProfile) {
  return products.map(product => {
    let score = 0;
    
    // Style overlap
    score += 0.25 * overlapScore(product.style_tags, userVector.style_affinities);
    
    // Color overlap
    score += 0.20 * overlapScore(product.color_family, userVector.color_affinities);
    
    // Body type fit
    const bodyMatch = product.body_type_fit.includes(userProfile.bodyType) ? 1 : 0;
    score += 0.15 * bodyMatch;
    
    // Skin tone complement
    const skinMatch = product.skin_tone_complement.includes(userProfile.skinTone) ? 1 : 0;
    score += 0.10 * skinMatch;
    
    // Price tier alignment
    const priceMatch = product.price_tier === userVector.price_affinity?.tier ? 1 : 0.3;
    score += 0.10 * priceMatch;
    
    // Occasion relevance (contextual)
    score += 0.10 * occasionRelevance(product.occasion);
    
    // Age group match
    const ageMatch = product.age_group.includes(userProfile.ageRange) ? 1 : 0.5;
    score += 0.05 * ageMatch;
    
    // Wishlist/cart boost (direct interest signal)
    if (isInWishlist(product.shopify_product_id)) score += 0.30;
    if (isInCart(product.shopify_product_id)) score += 0.50;
    
    return { product, score };
  }).sort((a, b) => b.score - a.score);
}
```

---

## 9. FEEDBACK LOOPS — How the System Gets Smarter

```
            ┌─────────────────────────────────┐
            │         USER ACTIONS             │
            │  (view, wishlist, cart, buy)      │
            └─────────────┬───────────────────┘
                          │
                          ▼
            ┌─────────────────────────────────┐
            │       EVENT COLLECTION           │
            │  user_events table (append-only) │
            └─────────────┬───────────────────┘
                          │
                          ▼
            ┌─────────────────────────────────┐
            │    STYLE VECTOR RECOMPUTE        │
            │  (nightly or after 50 events)    │
            └─────────────┬───────────────────┘
                          │
               ┌──────────┼──────────┐
               ▼          ▼          ▼
         ┌──────────┐ ┌────────┐ ┌────────┐
         │ Template  │ │Product │ │ Search │
         │ Ranking   │ │Ranking │ │Re-rank │
         └─────┬────┘ └───┬────┘ └───┬────┘
               │          │          │
               ▼          ▼          ▼
         ┌─────────────────────────────────┐
         │     PERSONALIZED SURFACES        │
         │  (Home feed, shop, suggestions)  │
         └─────────────┬───────────────────┘
                       │
                       ▼
            ┌─────────────────────────────────┐
            │    USER SEES TAILORED CONTENT    │
            │    → Interacts → New events      │
            └─────────────┬───────────────────┘
                          │
                          └──────── (loops back to top)

    REINFORCEMENT: Clicking a recommended item strengthens
    the signal → more similar recommendations → conversion
    
    EXPLORATION: 5-10% of feed slots reserved for "novelty"
    items outside user's pattern → prevents filter bubble
```

---

## 10. COLD START STRATEGY — New Users

For users who just completed onboarding (zero behavioral data):

| Phase | Duration | Strategy |
|-------|----------|----------|
| **Phase 0: Pre-onboarding** | First visit | Show global trending (same for everyone). Most popular templates + top-selling products |
| **Phase 1: Post-onboarding** | 0–10 events | Use **explicit signals only** (colors, styles, fit). Match templates/products purely on profile tags. Behavioral weight = 0, Explicit = 1.0 |
| **Phase 2: Early learning** | 10–50 events | Blend starts: Explicit = 0.5, Behavioral = 0.5. Begin inferring tags. Still show diversity exploration items (30% feed) |
| **Phase 3: Warm** | 50–200 events | Shift to: Explicit = 0.3, Behavioral = 0.7. Inferred tags become reliable. Novelty slots drop to 10% |
| **Phase 4: Mature** | 200+ events | Full personalization. Explicit serves as baseline/anchor. Behavioral dominates. System can confidently predict: templates, products, price tier, purchase timing |

---

## 11. SHOPIFY METAFIELD → PRODUCT → TEMPLATE LINKING

The key insight: **every Shopify product should link to at least one try-on template**. This creates the "try before you buy" loop:

```
┌────────────────┐     ┌───────────────────┐     ┌────────────────┐
│ Shopify Product │────▶│ Try-On Template   │────▶│ Generated Image│
│ "Silk Saree"   │     │ (user's face +    │     │ (user wearing  │
│ ₹15,000        │     │  this garment)    │     │  the saree)    │
│                │     │                   │     │                │
│ [Wishlist]     │     │ [Generate]        │     │ [Buy Now]      │
│ [Add to Cart]  │     │                   │     │ [Share]        │
│ [Buy Now]      │     │                   │     │                │
└────────────────┘     └───────────────────┘     └────────────────┘
       │                                                  │
       │         ← All clicks tracked as events →         │
       │                                                  │
       ▼                                                  ▼
  user_events:                                    user_events:
  product_wishlist                               template_generate
  product_add_to_cart                            template_save
  product_buy_now                                template_share
```

**The flywheel**: User tries on → sees themselves wearing it → emotional connection → adds to cart → buys. Each step generates events that train the model to show more products they'll follow through on.

---

## 12. IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1–2)
- [ ] Create `user_events`, `user_wishlist`, `user_cart` tables (migrations)
- [ ] Build backend `POST /api/events/track` endpoint
- [ ] Build frontend `trackEvent()` utility + integrate into existing template views/generates
- [ ] Add Wishlist / Add to Cart / Buy Now buttons to product cards
- [ ] Wire button clicks → `trackEvent()` + `user_wishlist` / `user_cart` upserts

### Phase 2: Shopify Sync (Week 2–3)
- [ ] Tag all 5 Shopify products with `stiri.*` metafields
- [ ] Build `product_catalog_cache` sync (webhook + hourly poll)
- [ ] Build product listing/detail pages reading from cache
- [ ] Link products to try-on templates via `stiri.template_link`

### Phase 3: Style Vector (Week 3–4)
- [ ] Create `user_style_vector` table
- [ ] Build recomputation SQL function / Edge Function
- [ ] Schedule nightly cron (pg_cron or Supabase scheduled function)
- [ ] Build on-demand trigger (after 50 events threshold)

### Phase 4: Personalized Surfaces (Week 4–5)
- [ ] Replace static trending with personalized Home feed (ranked templates)
- [ ] Add "Made for You" section on Home
- [ ] Add "Because you liked X" section
- [ ] Personalize product ordering in shop
- [ ] Add "Complete the Look" post-generation recommendations

### Phase 5: Search + Nudges (Week 5–6)
- [ ] Build semantic search with LLM intent extraction
- [ ] Re-rank search results using style vector
- [ ] Build WhatsApp nudge triggers for cart abandonment + wishlist price drops
- [ ] Add festival-aware recommendation boosts

### Phase 6: Measure + Iterate (Ongoing)
- [ ] A/B test personalized vs. non-personalized feed (track CTR, generation rate, purchase conversion)
- [ ] Monitor diversity metrics (prevent filter bubbles)
- [ ] Tune weights based on real conversion data
- [ ] Expand product catalog as new Shopify products added (auto-tagged via metafield template)

---

## 13. KEY METRICS TO TRACK

| Metric | Formula | Target |
|--------|---------|--------|
| **Personalization CTR** | Clicks on "Made for You" / Impressions | > 15% (vs ~5% for generic) |
| **Try-On → Cart Rate** | Cart adds after try-on generation | > 8% |
| **Wishlist → Purchase Rate** | Purchases from wishlisted items | > 12% |
| **Cart Abandonment Recovery** | Purchases after abandon nudge | > 5% |
| **Feed Diversity Score** | Unique stacks in top 10 / Total stacks | > 0.5 |
| **Cold Start Time-to-Personal** | Events needed for >0.7 affinity confidence | < 30 events |
| **Revenue per Personalized User** | Revenue ÷ Users with mature vector | 2x non-personalized |
