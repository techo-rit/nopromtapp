# Personalization Engine — GitHub Issues

> Generated from [PRD_PERSONALIZATION_ENGINE.md](PRD_PERSONALIZATION_ENGINE.md)
> 18 vertical slices. Each independently implementable and testable.

---

## Issue #1: [AFK] Product catalog cache table + Shopify sync endpoint

### Context
The personalization engine needs a local mirror of Shopify products with all 30 meta-tag dimensions stored in Supabase. This table is the foundation — ranking, click aggregation, and style matching all read from it.

### Acceptance Criteria
- [ ] `product_catalog_cache` table created in `000_schema.sql` with all 30 tag columns, pricing, availability, GIN indexes on array columns
- [ ] RLS enabled (public read, service-role write)
- [ ] `POST /api/admin/product-sync` endpoint — fetches all products from Shopify Storefront API, upserts into `product_catalog_cache`
- [ ] `POST /api/shopify/webhook/product-update` endpoint — Shopify webhook handler, syncs single product on create/update
- [ ] Metafield extraction: reads `stiri.*` namespace metafields from Shopify and maps to the 30 columns
- [ ] Products without metafields get null/empty for untagged dimensions (graceful degradation)
- [ ] Types updated in `web/types/index.ts`
- [ ] Schema documented in `docs/DATABASE_REFERENCE.md`

### Implementation Notes
- Files: `server/supabase/migrations/000_schema.sql`, `server/src/routes/shopify.js`, `server/src/lib/shopify.js`
- Shopify GraphQL must request `metafields(identifiers: [...])` for all `stiri.*` keys
- Batch sync should handle pagination (Shopify returns max 250 products per page)
- Existing `getProductsByHandles()` in `shopify.js` can be extended to fetch metafields
- Webhook should verify Shopify HMAC signature

### Testing
- Sync endpoint populates table correctly from Shopify
- Webhook updates single product
- Missing metafields don't crash sync

### Dependencies
None — foundation slice.

---

## Issue #2: [HITL] Tag all Shopify products with 30-dimension metafields

### Context
The ranking engine matches user vectors against product meta-tags. Every product in the Shopify catalog needs `stiri.*` metafields populated. This is manual product-by-product work in Shopify admin.

### Acceptance Criteria
- [ ] Shopify metafield definitions created for all 30 `stiri.*` keys (via Shopify admin → Settings → Metafield definitions → Products)
- [ ] Every active product has at minimum: `color_family`, `style_tags`, `size_range`, `garment_type`, `garment_category`, `pattern`, `occasion`, `price_tier`, `gender`
- [ ] Remaining dimensions tagged where applicable (not all products need all 30)
- [ ] Run full sync (`POST /api/admin/product-sync`) and verify `product_catalog_cache` is populated

### Implementation Notes
- This is Shopify admin work, not code
- Consider creating a CSV template to bulk-import metafields via Shopify's bulk editor or a Matrixify-style app
- `body_type_fit` and `skin_tone_complement` may require fashion domain expertise — tag conservatively

### Dependencies
Issue #1 (sync endpoint must exist to verify tags land correctly)

---

## Issue #3: [AFK] Click events table + tracking endpoint

### Context
Every meaningful user action (view, try-on, wishlist, cart, purchase) must be recorded as a click event. This is the raw behavioral data stream that feeds all personalization signals.

### Acceptance Criteria
- [ ] `click_events` table created in `000_schema.sql` with columns: `id`, `user_id`, `product_id`, `event_type`, `metadata` (jsonb), `created_at`
- [ ] Indexes on `(user_id, created_at DESC)`, `(product_id, created_at DESC)`, `(event_type)`
- [ ] RLS: users can read own events, service role inserts
- [ ] `POST /api/events/track` endpoint — auth required, accepts batch: `{ events: [{ product_id, event_type, metadata }] }`, returns 202
- [ ] Input validation: `event_type` must be one of `view`, `try_on`, `wishlist`, `cart_add`, `cart_remove`, `purchase`
- [ ] `product_id` validated as non-empty string
- [ ] Rate limit: max 50 events per request, max 200 events per user per minute
- [ ] Route registered in `app.js`
- [ ] Documented in `docs/API_CONTRACTS.md`

### Implementation Notes
- Files: `server/supabase/migrations/000_schema.sql`, `server/src/routes/events.js` (new), `server/src/app.js`
- Use `createAdminClient()` for inserts (bypasses RLS)
- Metadata should include `product_tags` (the product's 30 dimensions at time of click) for future recomputation — fetch from `product_catalog_cache` on insert
- Batch insert via single Supabase `insert()` call

### Testing
- Batch insert of 5 events succeeds, returns 202
- Invalid event_type rejected with 400
- Unauthenticated request rejected with 401
- Rate limit triggers on excessive events

### Dependencies
None — can parallel with #1.

---

## Issue #4: [AFK] User click profile + product click stats (pre-aggregation tables)

### Context
Raw click events are too expensive to aggregate on every ranking request. Pre-aggregated tables give O(1) lookups per user and per product.

### Acceptance Criteria
- [ ] `user_click_profile` table created: `user_id` (PK), `tag_affinities` (jsonb), count fields, `engagement_ratio`, `recent_impressions` (jsonb), watermark fields
- [ ] `product_click_stats` table created: `product_id` (PK), lifetime counts, recent counts (7-day), `regional_counts` (jsonb), `popularity_score`
- [ ] RLS: users read own click profile, service role writes both tables
- [ ] On every `POST /api/events/track`, atomically update:
  - `user_click_profile`: increment relevant count, bump `events_since_compute`
  - `product_click_stats`: increment relevant count + regional count
- [ ] `user_click_profile` row auto-created on first event for a user
- [ ] `product_click_stats` row auto-created on first event for a product

### Implementation Notes
- Files: `server/supabase/migrations/000_schema.sql`, `server/src/routes/events.js` (extend from #3)
- Use upsert for both tables (ON CONFLICT DO UPDATE)
- Regional count key extracted from user's default address state/city (join `user_addresses` in the event handler)
- `tag_affinities` full recomputation happens in #18 (nightly cron); here just increment counts

### Testing
- After 3 view events + 1 cart_add, user profile shows correct counts
- Product stats show correct view_count and cart_add_count
- Regional counts increment for user's region

### Dependencies
Issue #3 (event table + endpoint must exist)

---

## Issue #5: [AFK] Frontend event tracker (trackEvent utility + integration)

### Context
The frontend needs a `trackEvent()` utility that batches events and sends them to the tracking endpoint. Must be integrated into every product interaction point.

### Acceptance Criteria
- [ ] `web/features/tracking/trackingService.ts` created with:
  - `trackEvent(productId, eventType, metadata?)` — queues event in memory
  - Auto-flush: every 5 seconds OR when batch reaches 10 events
  - Flush on `visibilitychange` (user leaves tab) and `beforeunload`
  - Graceful failure (no error toasts, silent retry once)
- [ ] Integrated at all interaction points:
  - Product card visible in viewport > 2 seconds → `view` event (IntersectionObserver)
  - "Try On" button tap → `try_on` event
  - Wishlist heart toggle → `wishlist` event
  - "Add to Cart" → `cart_add` event
  - Cart item removed → `cart_remove` event
  - Purchase completed (Razorpay success callback) → `purchase` event
- [ ] Each event includes `metadata`: `{ source_page, position (index in feed), product_tags (from product data) }`
- [ ] No tracking for unauthenticated users (skip silently)

### Implementation Notes
- Files: `web/features/tracking/trackingService.ts` (new), touch `ProductCard.tsx`, `ProductDetailModal.tsx`, `CartDrawer.tsx`, `shopifyService.ts`, payment success handler
- Use `navigator.sendBeacon()` for `visibilitychange`/`beforeunload` flushes (survives tab close)
- IntersectionObserver for view tracking: threshold 0.5, 2-second debounce before firing

### Testing
- Tapping "Try On" fires try_on event (verify in network tab)
- Scrolling past a product for 2+ seconds fires view event
- Batch flushes every 5s or at 10 events
- No events fire when logged out

### Dependencies
Issue #3 (endpoint must exist)

---

## Issue #6: [AFK] Style DNA scoring function

### Context
Computes how well a product matches a user's explicit profile (colors, styles, fit, body type, skin tone, age range). Returns a normalized 0-1 score.

### Acceptance Criteria
- [ ] `server/src/lib/ranking.js` created (new module)
- [ ] `styleDnaMatch(userProfile, productTags)` function exported
- [ ] Scoring: color overlap + style overlap + size match + body_type_fit boost (0.5) + skin_tone_complement boost (0.5) + age_group match (0.5)
- [ ] Normalized to 0-1
- [ ] Handles missing profile fields gracefully (skip dimension if null/empty)
- [ ] Handles missing product tags gracefully (skip dimension if null/empty)

### Implementation Notes
- File: `server/src/lib/ranking.js` (new)
- Pure function, no DB access — takes objects as input
- Used by the ranking endpoint (#11) and boost queue filtering (#13)

### Testing
- User with `colors: [navy, black]`, product with `color_family: [navy, white]` → color overlap = 1/2
- User with `bodyType: hourglass`, product with `body_type_fit: [hourglass, pear]` → 0.5 boost
- Missing user colors → color dimension skipped, maxScore adjusted

### Dependencies
Issue #1 (product tags must exist in cache)

---

## Issue #7: [AFK] User click affinity scoring function

### Context
Computes how well a product matches a user's *behavioral* preferences (what they've clicked on). Reads from the pre-aggregated `user_click_profile.tag_affinities`.

### Acceptance Criteria
- [ ] `userClickAffinity(userClickProfile, productTags)` function added to `ranking.js`
- [ ] Matches across all 30 tag dimensions — whatever dimensions exist in `tag_affinities`
- [ ] Per-dimension: takes max affinity value across product's tag values
- [ ] Averages across matched dimensions, normalized 0-1
- [ ] Returns 0 for users with empty tag_affinities (cold start)

### Implementation Notes
- File: `server/src/lib/ranking.js`
- Pure function, no DB access
- `tag_affinities` structure: `{ "color_family": { "navy": 0.82, "black": 0.65 }, "style_tags": { "formal": 0.90 }, ... }`

### Testing
- User affinities `{ color_family: { navy: 0.8 } }`, product `color_family: [navy]` → high score
- User affinities empty → returns 0
- Product missing dimensions → those dimensions skipped

### Dependencies
Issue #4 (user click profile must be populated)

---

## Issue #8: [AFK] Product popularity scoring function (global + regional)

### Context
Computes a product's popularity score blending global demand with regional trends. Enables regional trending for cold-start users.

### Acceptance Criteria
- [ ] `productPopularity(productStats, userRegion)` function added to `ranking.js`
- [ ] Blends: 60% global `popularity_score` + 40% regional proportion
- [ ] Regional proportion: product's regional count / max regional count across all regions for that product
- [ ] Returns global-only if no regional data or user has no region
- [ ] `computePopularityScore(stats)` helper — weighted sum of recent counts: `views×1 + try_ons×3 + wishlists×4 + carts×6 + purchases×10`, normalized 0-1 across all products

### Implementation Notes
- File: `server/src/lib/ranking.js`
- `computePopularityScore` runs during nightly recomputation (#18) and stores result in `product_click_stats.popularity_score`
- The ranking-time function just reads the pre-computed score

### Testing
- Product with high recent purchases → high popularity
- Product popular in Mumbai, user from Mumbai → boosted vs. user from Delhi
- Product with zero clicks → popularity = 0

### Dependencies
Issue #4 (product click stats must exist)

---

## Issue #9: [AFK] Dynamic weight computation

### Context
The three ranking weights (style DNA, user clicks, product popularity) shift based on data maturity, confidence, and seasonal context.

### Acceptance Criteria
- [ ] `computeWeights(userClickProfile, seasonalBoost)` function added to `ranking.js`
- [ ] Data maturity formula: `richness = min(1.0, totalClicks / 200)`
- [ ] Weight curves: `wStyle: 0.85→0.38`, `wClicks: 0.05→0.43`, `wPop: 0.10 + seasonal`
- [ ] Loads active self-tuned delta from `ranking_weights` table and applies bounded adjustment
- [ ] Normalizes weights to sum = 1.0
- [ ] `ranking_weights` table created in `000_schema.sql` with columns: `id`, `w_style`, `w_user_clicks`, `w_product_pop`, `engagement_ratio`, `is_active`, `created_at`
- [ ] Initial seed row inserted: `{ w_style: 0.75, w_user_clicks: 0.10, w_product_pop: 0.15, is_active: true }`
- [ ] `getSeasonalBoost()` helper — returns 0-1 based on proximity to configured festival dates (simple calendar lookup, can be hardcoded initially)

### Implementation Notes
- Files: `server/src/lib/ranking.js`, `server/supabase/migrations/000_schema.sql`
- Seasonal boost: start with a simple lookup table `{ "diwali": { month: 10, day_range: [15, 31], boost: 0.8 }, "christmas": { month: 12, ... } }`
- Weight adjustment from `ranking_weights` is additive (delta from base), clamped to ±0.03

### Testing
- New user (0 clicks) → wStyle ≈ 0.85
- Mature user (200 clicks) → wStyle ≈ 0.38, wClicks ≈ 0.43
- During Diwali mock date → wPop increases

### Dependencies
Issues #6, #7, #8 (scoring functions must exist)

---

## Issue #10: [AFK] Ranking engine (blend scores + fatigue penalty)

### Context
The core ranking function that combines all three scores with dynamic weights, applies fatigue penalty, and produces a sorted product list.

### Acceptance Criteria
- [ ] `rankProducts(products, userProfile, userClickProfile, productStatsMap, userRegion, boostQueue)` function in `ranking.js`
- [ ] For each product: `score = w_style × styleDna + w_clicks × clickAffinity + w_pop × popularity - fatigue`
- [ ] `fatiguePenalty(productId, recentImpressions)`: 2% per ignored impression, capped at 30%
- [ ] Returns sorted array of `{ product, score, isExploration }` objects
- [ ] Exploration slot injection delegated to #13 (this function returns the raw ranked list)

### Implementation Notes
- File: `server/src/lib/ranking.js`
- Orchestration function that calls #6, #7, #8, #9 functions
- `recentImpressions` from `user_click_profile.recent_impressions`

### Testing
- Product matching both style DNA and click history ranks higher than one matching only popularity
- Product ignored 5 times gets 10% penalty
- Products with no data score based on popularity only

### Dependencies
Issue #9 (dynamic weights)

---

## Issue #11: [AFK] `GET /api/feed/for-you` endpoint

### Context
The API endpoint that serves the personalized feed. Reads user profile, click profile, product catalog, and stats, runs the ranking engine, returns ordered products.

### Acceptance Criteria
- [ ] `GET /api/feed/for-you?limit=20&offset=0` — auth optional
- [ ] **Authed user**: loads profile, click profile, all products from `product_catalog_cache`, product stats, active boosts → runs `rankProducts()` → returns ranked list
- [ ] **Anonymous/pre-onboarding user**: returns products sorted by regional popularity (cold start)
- [ ] Response shape: `{ products: [{ product_id, title, image, price, score, isExploration, tags... }], total, hasMore }`
- [ ] Products marked `available_for_sale = false` excluded
- [ ] Pagination via limit/offset
- [ ] Response cached per-user for 60 seconds (short TTL — feed should feel fresh but not re-rank on every scroll)
- [ ] Route registered in `app.js`, documented in `docs/API_CONTRACTS.md`

### Implementation Notes
- Files: `server/src/routes/feed.js` (new), `server/src/app.js`
- Loads all available products from `product_catalog_cache` (should be manageable — likely <1000 products)
- For anonymous users: detect region from request IP or default to "all-india"
- Consider pre-computing the ranked feed and caching it, invalidating on new click events

### Testing
- Authed user gets personalized order (different from anonymous)
- Anonymous user gets popularity-based order
- Offset/limit pagination works correctly
- Unavailable products excluded

### Dependencies
Issue #10 (ranking engine)

---

## Issue #12: [AFK] Admin boost queue (table + CRUD endpoints)

### Context
Admin can inject up to 10 products into exploration slots for clearance/promotion. Style-match filtered, time-limited.

### Acceptance Criteria
- [ ] `admin_boost_queue` table created: `id`, `product_id`, `priority`, `min_style_match` (default 0.20), `expires_at`, `created_at`
- [ ] Index on `expires_at` for active boost filtering
- [ ] `POST /api/admin/boost` — admin only, body: `{ product_id, priority?, min_style_match?, expires_in_days? (default 14) }`. Max 10 active boosts enforced.
- [ ] `GET /api/admin/boost` — list active boosts (not expired)
- [ ] `DELETE /api/admin/boost/:id` — remove a boost
- [ ] Admin auth check (verify user is admin role)
- [ ] Routes registered and documented

### Implementation Notes
- Files: `server/supabase/migrations/000_schema.sql`, `server/src/routes/admin.js` (new or extend existing), `server/src/app.js`
- Admin check: could use a simple `profiles.is_admin` boolean or check against a hardcoded admin user ID list
- Expired boosts cleaned up by nightly cron (#18)

### Testing
- Create boost → appears in list
- 11th boost rejected with 400
- Expired boost not returned in list
- Delete removes boost

### Dependencies
Issue #10 (ranking engine references boosts)

---

## Issue #13: [AFK] Exploration slot injection (boosted + random)

### Context
10-15% of feed slots are reserved for exploration: admin-boosted clearance products first, then random picks from outside the user's normal feed.

### Acceptance Criteria
- [ ] Exploration logic added to feed endpoint (#11)
- [ ] 12% of total slots are exploration (configurable)
- [ ] Every ~8th position is an exploration slot
- [ ] Boosted products inserted first (style-match filtered per `min_style_match` threshold against user profile)
- [ ] Remaining exploration slots filled with random products from bottom 50% of rankings (products that wouldn't normally be seen)
- [ ] Exploration products marked with `isExploration: true` in response
- [ ] Boosted products marked with `boostReason: 'clearance'` or similar for UI badge

### Implementation Notes
- File: `server/src/routes/feed.js` (extend #11)
- Exploration products should not duplicate main feed products
- Random selection uses DB `ORDER BY random()` or JS `Math.random()`

### Testing
- Feed with 20 products has ~2-3 exploration slots
- Boosted product with sufficient style match appears in exploration slot
- Boosted product below style match threshold is skipped for that user
- Random products are from outside top-ranked items

### Dependencies
Issue #11 (feed endpoint), Issue #12 (boost queue)

---

## Issue #14: [AFK] Impression tracking + fatigue penalty

### Context
Track which products are shown to each user so that repeatedly ignored products get a mild ranking penalty.

### Acceptance Criteria
- [ ] When feed is served (`GET /api/feed/for-you`), record impressions in `user_click_profile.recent_impressions`
- [ ] Impression format: `{ product_id, shown_at, position, interacted: false }`
- [ ] Keep only last 100 impressions (rolling window)
- [ ] Prune impressions older than 7 days
- [ ] When a click event arrives, mark matching impression as `interacted: true`
- [ ] Fatigue penalty applied in ranking: 2% per uninteracted impression, capped at 30%

### Implementation Notes
- Files: `server/src/routes/feed.js` (record impressions), `server/src/routes/events.js` (mark interacted), `server/src/lib/ranking.js` (penalty function already in #10)
- Impressions stored as jsonb array in `user_click_profile` — updated via jsonb array operations
- Pruning: filter out entries where `shown_at < now() - 7 days` on every write

### Testing
- Product shown 3 times without click → 6% penalty
- Product shown then clicked → penalty resets (0%)
- Impressions older than 7 days pruned
- Max 100 impressions stored

### Dependencies
Issue #5 (frontend tracking), Issue #11 (feed endpoint)

---

## Issue #15: [AFK] Self-tuning feedback loop (daily cron)

### Context
The system adjusts ranking weights daily based on whether engagement improved. No ML — bounded hill-climbing on the engagement-depth ratio.

### Acceptance Criteria
- [ ] Scheduled job runs daily at 3 AM IST
- [ ] Computes engagement ratio: `(try_ons + wishlists + carts + 2×purchases) / views` across all users, last 7 days
- [ ] Compares to previous 7-day period
- [ ] If improved: nudge weights +0.02 in same direction as last change
- [ ] If declined: nudge weights -0.01 toward previous config
- [ ] If flat (±0.001): no change
- [ ] All adjustments clamped to ±0.03 per cycle
- [ ] Weights normalized to sum = 1
- [ ] New `ranking_weights` row inserted with `is_active = true`, previous row set `is_active = false`
- [ ] Change logged for audit (the row itself is the log)

### Implementation Notes
- Options for scheduling: Supabase pg_cron, Supabase Edge Function (scheduled), or a simple `setInterval` in the Express server process
- pg_cron is simplest if available; otherwise use `node-cron` in Express server
- File: `server/src/lib/rankingCron.js` (new) or `server/src/lib/ranking.js` (extend)
- The cron also triggers recomputation tasks from #18

### Testing
- Mock data showing improved engagement → weights shift in positive direction
- Mock data showing declined engagement → weights revert
- Weights always sum to 1.0
- Adjustment never exceeds ±0.03

### Dependencies
Issue #4 (click data must exist), Issue #9 (weight system)

---

## Issue #16: [AFK] Cold start: regional trending

### Context
Users with no profile and no clicks see products ranked by regional popularity. Uses device location or stored address.

### Acceptance Criteria
- [ ] Feed endpoint (#11) detects unauthenticated or zero-data users
- [ ] Determines region: from user's default address (if exists) or IP geolocation fallback
- [ ] Returns products sorted by `product_click_stats.regional_counts[region]` descending
- [ ] If no regional data, falls back to global `popularity_score`
- [ ] IP geolocation: use a simple free API or MaxMind GeoLite2 DB (or just default to "all-india" if no region detectable)

### Implementation Notes
- File: `server/src/routes/feed.js` (extend #11)
- Region key: state-level (e.g., "maharashtra", "delhi", "karnataka") — not city-level (too sparse)
- For simplicity, v1 can default to global trending if IP geo isn't set up. Regional becomes effective once users have addresses.

### Testing
- User from Maharashtra sees Maharashtra-popular products ranked higher
- User with no region sees global trending
- Anonymous user gets reasonable default results

### Dependencies
Issue #8 (product popularity with regional counts)

---

## Issue #17: [AFK] Swipe-style "For You" feed UI

### Context
The home page transforms into a full-screen vertical swipe feed. One product card fills the screen. Snap-scroll with focus engine, parallax zoom, and exploration badges.

### Acceptance Criteria
- [ ] New feed component: `web/features/feed/ForYouFeed.tsx`
- [ ] Snap-scroll container: `snap-y snap-mandatory`, each card `snap-center h-[68svh]`
- [ ] Focus engine: IntersectionObserver detects center card → `scale-100 opacity-100` (focused) vs `scale-95 opacity-60 blur-[1px]` (unfocused)
- [ ] Card content: full-bleed product image, product title, price (with discount if applicable), "Try On" CTA, wishlist heart, cart button
- [ ] Exploration cards show badge: "Picked for you" or "Clearance" (from `isExploration` flag)
- [ ] Fetches from `GET /api/feed/for-you`, paginated (load more on reaching last 3 cards)
- [ ] View tracking: fires `view` event when card is centered for 2+ seconds (IntersectionObserver)
- [ ] Pass-through without interaction → feeds fatigue system (impression tracked server-side)
- [ ] Wired into `Home.tsx` replacing or augmenting the current trending + grid layout for logged-in users
- [ ] Falls back to current layout for anonymous users (or shows global trending in same swipe format)

### Implementation Notes
- Files: `web/features/feed/ForYouFeed.tsx` (new), `web/features/feed/feedService.ts` (new), `web/features/pages/Home.tsx` (modify), `web/App.tsx` (wire)
- Reference: old `TemplateGrid.tsx` from commit `0dd4a1b` for the snap-scroll + focus engine pattern
- Product data comes from the feed API, not from `useTemplates()` hook
- Ensure smooth performance: virtualize if feed is 100+ products (or rely on image lazy loading)

### Testing
- Swipe between cards snaps correctly
- Focus/blur transitions are smooth
- View event fires after 2s dwell on centered card
- "Try On" navigates to try-on flow
- Exploration badge visible on boosted products
- Infinite scroll loads next page

### Dependencies
Issue #11 (feed endpoint), Issue #5 (event tracking)

---

## Issue #18: [AFK] Time decay recomputation (nightly cron)

### Context
Nightly batch job that recomputes all time-decayed aggregates: user tag affinities, product popularity scores, recent counts, and housekeeping.

### Acceptance Criteria
- [ ] Runs nightly (alongside self-tuning cron from #15, or as part of same job)
- [ ] **User tag affinities**: For each user with `events_since_compute > 0`, recompute `tag_affinities` from `click_events` with dual time decay (30-day preference, 45-day transactional). Reset `events_since_compute = 0`.
- [ ] **Product recent counts**: Recompute `recent_views`, `recent_try_ons`, `recent_carts`, `recent_purchases` as counts from last 7 days only
- [ ] **Product popularity score**: Recompute `popularity_score` using weighted recent counts, normalized 0-1 across all products
- [ ] **Engagement ratio**: Recompute per-user `engagement_ratio` in `user_click_profile`
- [ ] **Housekeeping**: Prune `recent_impressions` older than 7 days, delete expired `admin_boost_queue` entries, archive `click_events` older than 180 days (optional — move to archive table or just delete)
- [ ] **Performance**: Process in batches of 100 users to avoid long-running transactions

### Implementation Notes
- File: `server/src/lib/rankingCron.js` (new or extend from #15)
- Time decay formulas:
  - Preference: `exp(-0.0231 × daysAgo)` (30-day half-life)
  - Transactional: `exp(-0.0154 × daysAgo)` (45-day half-life)
- For each user: load their `click_events` from last 90 days, compute weighted tag affinities, upsert into `user_click_profile`
- For popularity normalization: compute max weighted score across all products, divide each by max

### Testing
- After decay recomputation, 30-day-old preference event carries ~50% weight
- After decay recomputation, 45-day-old purchase carries ~50% weight
- Product with recent spike in purchases gets higher popularity_score
- Expired boosts removed from queue

### Dependencies
Issue #4 (aggregation tables), Issue #15 (cron infrastructure)

---

## Execution Order

```
Phase 1 — Foundation (parallel):
  #1  Product catalog cache + sync     ─┐
  #3  Click events table + endpoint     ─┤── No dependencies, start together
                                         │
Phase 2 — Data Layer:                    │
  #2  [HITL] Tag Shopify products      ←─┘ (needs #1)
  #4  Pre-aggregation tables           ←── (needs #3)
  #5  Frontend event tracker           ←── (needs #3)

Phase 3 — Scoring Functions (parallel after #1, #4):
  #6  Style DNA scoring
  #7  User click affinity scoring
  #8  Product popularity scoring

Phase 4 — Ranking Engine:
  #9  Dynamic weights                  ←── (needs #6, #7, #8)
  #10 Ranking engine                   ←── (needs #9)

Phase 5 — API + UI:
  #11 Feed endpoint                    ←── (needs #10)
  #12 Admin boost queue                ←── (needs #10)
  #13 Exploration slots                ←── (needs #11, #12)
  #14 Impression tracking              ←── (needs #5, #11)
  #16 Cold start regional              ←── (needs #8)
  #17 Swipe feed UI                    ←── (needs #11, #5)

Phase 6 — Self-Tuning:
  #15 Self-tuning feedback loop        ←── (needs #4, #9)
  #18 Time decay recomputation         ←── (needs #4, #15)
```
