# Stiri Wardrobe — Implementation Issues (Vertical Slices)

> **PRD**: [PRD_WARDROBE.md](PRD_WARDROBE.md)
> **Technical Model**: [WARDROBE_MODEL.md](WARDROBE_MODEL.md)
> **Dependencies flow top-down**: Each issue can begin once its prerequisites are done.

---

## Issue Map & Dependencies

```
Issue 1: Schema + Storage ─────────┐
                                    │
Issue 2: Garment Upload API ────────┤
                                    ├──→ Issue 5: Sync Pipeline API
Issue 3: Client Image Pipeline ─────┤         │
                                    │         ├──→ Issue 8: Outfit Display (Sets View)
Issue 4: Closet UI Shell + Nav ─────┤         │         │
                                    │         │         ├──→ Issue 10: AI Concierge Chat
                                    │         │         │
                                    │    Issue 6: Pairing Algorithm
                                    │         │
                                    │    Issue 7: Vibe Report Engine
                                    │
                                    │    Issue 9: All Items View
                                    │
                                    │    Issue 11: Gap Analysis Engine
                                    │         │
                                    │    Issue 12: Personalization Integration
                                    │
                                    │    Issue 13: Monetization Triggers
                                    │
                                    └──→ Issue 14: Polish, Performance & Edge Cases
```

---

## Issue 1: [AFK] Database Schema + Storage Bucket

### Context
Foundation for all wardrobe features. Creates the 4 new tables, RLS policies, indexes, and Supabase storage bucket.

### Acceptance Criteria
- [ ] `wardrobe_garments` table with all ~30 attribute columns + `is_analyzed` flag + `analysis_failed` flag + `original_image_url` column
- [ ] `wardrobe_outfits` table with garment_ids array, harmony/personalization scores, vibe report fields, composite_tags JSONB
- [ ] `wardrobe_style_profile` table with tag_affinities, category_counts, identified_gaps
- [ ] `wardrobe_chat_sessions` table with active_filters, messages JSONB
- [ ] RLS enabled on all 4 tables (users manage own rows only)
- [ ] Indexes: user_id on all tables, (user_id, garment_category) on garments, display_score DESC on outfits
- [ ] `wardrobe-items` Supabase Storage bucket (WebP only, 512KB limit)
- [ ] `ranking_weights` gains `w_wardrobe` column (decimal(4,3), default 0)
- [ ] All changes in `server/supabase/migrations/000_schema.sql` (idempotent)
- [ ] `docs/DATABASE_REFERENCE.md` updated with new tables + existing personalization tables (currently undocumented)
- [ ] `web/types/index.ts` updated with TypeScript interfaces
- [ ] `garment_category` includes `layer` value (server reclassifies from upperwear)

### Implementation Notes
- Follow the exact schema from WARDROBE_MODEL.md §Database Schema
- Pattern: same as existing personalization tables (RLS policies, service-role write)
- The `garment_ids uuid[]` column in wardrobe_outfits references wardrobe_garments.id (application-level enforcement, not FK on array)

### Testing
- Run migration against dev Supabase instance
- Verify RLS: user A cannot read user B's garments
- Verify storage bucket rejects non-WebP uploads and files >512KB

---

## Issue 2: [AFK] Garment Upload & Delete API Routes

### Context
Server-side endpoints for uploading garment photos, processing them (background removal + WebP compression), storing in Supabase Storage, and creating garment records. Also handles garment deletion with outfit staleness marking.

### Acceptance Criteria
- [ ] `POST /api/wardrobe/garments/upload` — accepts original photo (multipart/form-data, max 5MB), server performs background removal + WebP compression, stores clean WebP in `wardrobe-items` bucket, creates `wardrobe_garments` row with `is_analyzed: false`
- [ ] Server-side image pipeline: `@imgly/background-removal` (Node.js) + sharp/Canvas resize (1024px max) + WebP conversion (quality 0.85)
- [ ] If bg-removal fails, fall back to resize + compress only (still useful)
- [ ] `DELETE /api/wardrobe/garments/:id` — soft-enforces ownership, deletes image from storage, deletes DB row, marks affected outfits as `is_stale = true`
- [ ] `GET /api/wardrobe/garments` — returns all user garments grouped by `garment_category` (including `layer`), with counts
- [ ] Auth required on all endpoints (`getUserFromRequest` pattern)
- [ ] Input validation: file must be image (JPEG/PNG/WebP), max 5MB, garment_id must be valid UUID owned by user
- [ ] Garment cap enforcement: reject uploads above plan limit (free: 30, essentials: 75, ultimate: 150)
- [ ] Rate limiting: max 50 uploads per hour per user

### Implementation Notes
- New file: `server/src/routes/wardrobe.js`
- New file: `server/src/lib/imageProcessing.js` — bg-removal + resize + WebP conversion
- Register in `server/src/app.js`
- Use `createAdminClient()` for storage operations
- Install `@imgly/background-removal` in server workspace (MIT, works in Node.js without WASM client download)
- Image path format: `wardrobe-items/{user_id}/{garment_id}.webp`
- On delete: query `wardrobe_outfits` where `garment_ids @> ARRAY[deleted_id]`, set `is_stale = true`
- Update `docs/API_CONTRACTS.md`

### Testing
- Upload valid JPEG → verify bg-removal, WebP stored, DB record created
- Upload non-image file → verify 400 rejection
- Upload >5MB → verify 400 rejection
- Upload when at garment cap → verify 403 with clear message
- Delete garment → verify storage cleaned, DB row gone, affected outfits marked stale
- Attempt to delete another user's garment → verify 403
- Bg-removal failure → verify fallback to resize+compress only

### Dependencies
- Issue 1 (schema + storage)

---

## Issue 3: [AFK] Server-Side Image Processing Pipeline

### Context
Server-side pipeline: `@imgly/background-removal` (Node.js) + sharp resize + WebP compression. Processes garment photos on upload to dramatically reduce size and improve analysis quality. Called by the upload route (Issue 2).

### Acceptance Criteria
- [ ] `@imgly/background-removal` package installed in server workspace
- [ ] Processing service: `server/src/lib/imageProcessing.js`
  - `processGarmentImage(buffer: Buffer, mimeType: string): Promise<{ cleanBuffer: Buffer, originalResized: Buffer }>`
  - bg removal → resize 1024px max dimension → WebP 0.85
  - Returns clean WebP buffer (~150-250KB) + resized original as fallback
- [ ] If bg-removal fails, fall back to resize + compress only (still useful for analysis and display)
- [ ] Processing time: <1s per image on server
- [ ] Memory-safe: processes one image at a time, no memory leaks from WASM model
- [ ] No client-side WASM download required — all processing server-side

### Implementation Notes
- `@imgly/background-removal` — MIT, works in Node.js environment
- Use `sharp` for resize + WebP conversion (already common in Node.js servers)
- Export single function consumed by upload route
- Log processing time per image for performance monitoring

### Testing
- Process a garment photo: verify background removed, WebP output, size <300KB
- Process non-garment photo (e.g., landscape): verify fallback works
- Process 10 images sequentially: verify no memory leak, consistent performance
- Corrupt/invalid image input: verify graceful error

### Dependencies
- None (can start immediately)

---

## Issue 4: [HITL] Closet UI Shell + Bottom Nav Update

### Context
Create the Closet page shell with two view tabs (Sets / All Items), empty state onboarding, and update BottomNav to add the Closet tab at position #2.

### Acceptance Criteria
- [ ] New route: `/closet` in App.tsx, renders `ClosetPage` component
- [ ] BottomNav updated: `Home | Closet | Room | Bag` (4 tabs) with hanger icon for Closet
- [ ] Profile access moved to top-right avatar icon in header (removed from BottomNav)
- [ ] ClosetPage has two tabs: "Sets" and "All Items" (toggle at top)
- [ ] Empty state (0 garments): guided upload with category prompts (Tops, Bottoms, Shoes), "Add Your First Piece" CTA
- [ ] Progress state (<10 garments or <3 tops or <3 bottoms): progress counter "X/10 — add Y more", category counters showing ✓ when threshold met
- [ ] "Sync Pairs" button: disabled with clear message when thresholds not met, enabled + prominent when ready
- [ ] Upload button ("+" FAB or header button) visible in all states
- [ ] Garment cap indicator: "12/30 garments" (based on user's plan)
- [ ] Props from App.tsx: user, onLoginRequired
- [ ] Editorial aesthetic matching existing Home page (Playfair Display, Cormorant Garamond, dark theme, gold accents)

### Implementation Notes
- New files: `web/features/wardrobe/ClosetPage.tsx`, update `web/features/layout/BottomNav.tsx`
- Add hanger icon to `web/shared/ui/Icons.tsx`
- Move profile access from BottomNav to header (top-right avatar icon)
- BottomNav goes from 3 tabs to 4: Home, Closet, Room, Bag
- Route registration in `App.tsx` with user prop pass-through
- Follow the frontend-design skill: editorial, premium feel, not generic
- Empty state should feel inviting, not bare — use the serif typography, maybe a fashion illustration or abstract pattern

### Testing
- Navigate to /closet: verify page loads with empty state
- BottomNav: verify 4 tabs, correct active states, profile icon in header
- Verify login required to access (redirect to auth if not logged in)

### Dependencies
- None (can start immediately, parallel with Issue 3)

---

## Issue 5: [AFK] Sync Pipeline API (Gemini Analysis + Orchestration)

### Context
The "Sync Pairs" endpoint that orchestrates the full pipeline: batch Gemini analysis of unanalyzed garments → purge stale outfits → trigger pairing → trigger ranking → update wardrobe style profile → update gaps. Uses SSE for progress streaming.

### Acceptance Criteria
- [ ] `POST /api/wardrobe/sync` endpoint with SSE streaming
- [ ] Step 1: Query unanalyzed garments (`is_analyzed = false AND analysis_failed = false`), send to Gemini Flash in batched multi-image call (max 15 images per batch)
- [ ] Step 2: Parse Gemini JSON response, update `wardrobe_garments` rows with extracted attributes, set `is_analyzed = true`. Post-process: reclassify garment_category to `layer` where garment_type ∈ {jacket, cardigan, shrug, blazer, hoodie, coat, vest}. Match responses to images by index markers (handle non-deterministic ordering).
- [ ] Step 3: Mark garments with failed extraction as `analysis_failed = true`
- [ ] Step 3: Delete `wardrobe_outfits` where `is_stale = true`
- [ ] Step 4: Call pairing algorithm (Issue 6) with all analyzed garments
- [ ] Step 5: Call vibe report engine (Issue 7) for each outfit
- [ ] Step 6: Call personalization re-rank (Issue 12)
- [ ] Step 7: Compute wardrobe style profile and detect gaps
- [ ] Step 8: Store everything in DB
- [ ] SSE events: `analyzing`, `pairing`, `ranking`, `complete` with progress data
- [ ] Rate limiting: max 5 syncs per hour per user
- [ ] Gemini error handling: mark garments as `analysis_failed = true` if extraction fails, continue with remaining
- [ ] If 0 garments unanalyzed and no staleness, skip to re-rank only (fast path)
- [ ] Wardrobe activation threshold: ≥10 garments for sync, ≥10 garments for hasWardrobe signal

### Implementation Notes
- New file: `server/src/routes/wardrobe.js` (add sync handler to existing route file)
- New file: `server/src/lib/wardrobeSync.js` — orchestration logic
- New file: `server/src/lib/geminiWardrobe.js` — Gemini prompt construction + response parsing + layer reclassification
- Gemini model: `gemini-2.0-flash` via existing Google AI SDK
- For >15 unanalyzed garments: split into batches of 15, process sequentially
- Include image index markers in prompt for response ordering
- SSE pattern: `res.writeHead(200, { 'Content-Type': 'text/event-stream', ... })`
- Pass user profile to pairing algorithm for trend scoring

### Testing
- Sync with 5 unanalyzed garments: verify all analyzed, outfits generated, vibe reports created
- Sync with 0 unanalyzed (fast path): verify re-rank happens, no Gemini call
- Sync with mixed states (3 analyzed, 2 new): verify only new ones sent to Gemini
- Gemini returns malformed JSON for 1 garment: verify others still processed
- Rate limit: 6th sync in an hour returns 429

### Dependencies
- Issue 1 (schema), Issue 2 (garment data exists), Issue 6 (pairing algorithm), Issue 7 (vibe engine)

---

## Issue 6: [AFK] Outfit Pairing Algorithm

### Context
The deterministic two-phase algorithm: Phase 1 compatibility filter (hard rules) → Phase 2 harmony scorer (weighted 0-100). The core intelligence of the wardrobe feature. No AI involved.

### Acceptance Criteria
- [ ] New file: `server/src/lib/outfitPairing.js`
- [ ] Phase 1 — Compatibility Filter with 6 hard rules:
  1. Category validity (upper+lower OR fullbody OR fullbody+layer)
  2. Fabric weight extremes (reject if >1 step apart)
  3. Opacity conflict (two sheer without opaque base)
  4. Competing large-scale patterns
  5. Formality extreme mismatch (>0.5 gap)
  6. Season incompatibility (climatically opposed: summer↔winter, summer↔monsoon)
- [ ] Phase 2 — Harmony Scorer:
  - Color Harmony (25%) — hex-to-HSL, color wheel math, complementary/analogous/clash
  - Silhouette Balance (20%) — fit pairing matrix, length bonuses, volume contrast
  - Occasion Fit (15%) — tag overlap + formality coherence
  - Aesthetic Alignment (15%) — overlap + compatibility lookup table
  - Fabric Compatibility (10%) — texture contrast, weight, stretch
  - Trend Factor (10%) — current trends + user style match
  - Practicality (5%) — season coherence, comfort, quality
- [ ] Combo generation: Tier 1 (core) → Tier 2 (+footwear on surviving pairs) → Tier 3 (+accessories) → Layer variants
- [ ] **Incremental delta engine**: On garment add, only compute new pairs O(new×existing_category). On delete, remove affected pairs O(n). Store pair-intrinsic scores. Re-run diversity penalty + personalization globally (cheap sort).
- [ ] Diversity penalty: -5% per garment repeat in higher-ranked outfits (capped at 40%)
- [ ] Garment caps enforced: free 30, essentials 75, ultimate 150
- [ ] Layer reclassification: garment_type ∈ {jacket, cardigan, shrug, blazer, hoodie, coat, vest} → category = 'layer'
- [ ] Composite tags generation: union of garment attributes for personalization scoring
- [ ] Export functions: `generateOutfits(garments, userProfile)`, `isCompatible(garments)`, `harmonyScore(garments, userProfile)`
- [ ] All sub-scoring functions individually exported for unit testing

### Implementation Notes
- Follow WARDROBE_MODEL.md §4 exactly for algorithm spec
- `hexToHSL()` utility for color wheel math
- `FIT_SCORES` lookup table for silhouette balance
- `AESTHETIC_COMPAT` lookup table for cross-aesthetic compatibility
- `TEXTURE_COMPAT` lookup table for fabric pairing
- `CURRENT_TRENDS` set (update quarterly)
- Combo limit: generate max 500 raw combos, filter, score top 200, apply diversity penalty, return top 50
- Store pair-intrinsic scores in `wardrobe_outfits` for incremental reuse
- On garment add: delta-update pairs, score new ones, global diversity re-rank
- On garment delete: remove pairs with deleted garment, global diversity re-rank

### Testing
- Unit test each Phase 1 rule with PASS and REJECT cases
- Unit test each Phase 2 sub-scorer with known garment pairs and expected scores
- Integration: 15 tops + 10 bottoms + 4 shoes → verify correct combo count, reasonable scores
- Diversity penalty: verify same garment doesn't dominate top results
- Edge case: wardrobe with only fullbody items (dresses) → verify valid combos generated
- Edge case: wardrobe with no footwear → verify Tier 1 combos still valid
- Performance: 150 raw combos scored in <500ms

### Dependencies
- None (pure algorithm, no DB/API dependency — can start immediately)

---

## Issue 7: [HITL] Vibe Report Engine + Title Bank

### Context
Server-side template engine that generates editorial-tone Vibe Reports for each outfit. Manually curated vibe title bank + slot-filled sentence templates. Zero AI cost.

### Acceptance Criteria
- [ ] New file: `server/src/lib/vibeReport.js`
- [ ] Curated `VIBE_TITLES` bank: 100+ entries keyed by `{occasion}_{aesthetic}_{formality_bucket}`
- [ ] Sentence templates for "Why This Works": color harmony, silhouette balance, body proportion, texture contrast — at least 30-40 template variants to avoid repetition
- [ ] Accessory suggestions: from user's wardrobe accessories if matching, generic lookup table fallback
- [ ] Vibe match % = personalization score as friendly percentage
- [ ] Best occasions: top 3 from occasion tag intersection
- [ ] Export: `generateVibeReport(outfit, garments, userProfile, userAccessories)`
- [ ] Returns: `{ title, why, occasions, accessories, match_pct }`
- [ ] Deterministic: same outfit + same profile = same report (pseudo-random from outfit ID hash)

### Implementation Notes
- Vibe titles should feel like a cool stylist friend, NOT a lab report
- Good: "Off-Duty Cool", "Main Character Night", "He Won't Recover"
- Bad: "Color Score: 92/100", "Occasion: Casual Day Out"
- Sentence templates use slot-filling from garment attributes (see WARDROBE_MODEL.md §5)
- `simpleHash(string)` for deterministic pseudo-random template selection
- This is HITL because the vibe titles and sentence templates need human creative judgment

### Testing
- Generate vibe report for known outfit: verify title, sentences, occasions, accessories all populated
- Same outfit twice: verify identical output (deterministic)
- Different outfits: verify different titles/sentences (variety)
- Outfit with no matching accessories in wardrobe: verify generic suggestions used
- Check tone: no technical jargon, reads like fashion editorial

### Dependencies
- Issue 6 (pairing algorithm provides the scores that drive the report)

---

## Issue 8: [HITL] Outfit Display — Sets View (Editorial Cards)

### Context
Frontend display of generated outfits as editorial split-panel cards with vibe reports. The hero view of the Closet page.

### Acceptance Criteria
- [ ] `web/features/wardrobe/SetsView.tsx` — paginated outfit feed
- [ ] `web/features/wardrobe/OutfitCard.tsx` — split-panel editorial card:
  - Hero garment (~60% of card area) + supporting pieces as smaller panels
  - Background-removed garment cutouts on dark/gradient background
  - Vibe title (serif, gold accent), "Why This Works" text (Cormorant Garamond italic)
  - Best occasions as emoji + label pills
  - Accessory suggestions row
  - Vibe match % as warm circular indicator
  - "Try On" button generates flat-lay collage of outfit garments (Canvas API), sends as single "garment" image through existing FitIt pipeline (1 credit)
  - "View Details" expand to see full vibe report
- [ ] Inline gap cards every 5-6 outfit cards (when 15+ garments synced)
- [ ] Infinite scroll / "Load More" pagination
- [ ] Loading skeleton while outfits fetch
- [ ] Empty state after sync: "Syncing your outfits..." with animation
- [ ] Frontend service: `web/features/wardrobe/wardrobeService.ts` — `fetchOutfits(page, limit)`
- [ ] Premium editorial aesthetic: dark theme, serif typography, gold accents, smooth transitions

### Implementation Notes
- Follow frontend-design skill: bold aesthetic, distinctive typography, motion
- Cards should feel like a fashion magazine editorial spread
- Garment cutout images from Supabase Storage (already bg-removed WebP)
- Layout: CSS Grid or Flexbox for the split-panel garment arrangement
- IntersectionObserver for lazy loading images
- Gap cards reuse the editorial card format with Stiri product recommendation
- "Try On" generates collage → navigates to `/changing-room` with collage image data

### Testing
- Load page with 20+ outfits: verify cards render with correct garments, vibe reports, scores
- Scroll: verify lazy loading and pagination
- Gap cards: verify appear at correct intervals
- Tap "Try On": verify navigation to try-on flow with correct garment data
- Responsive: verify looks good on mobile (primary) and desktop

### Dependencies
- Issue 4 (Closet UI shell), Issue 5 (sync produces outfits), Issue 7 (vibe reports)

---

## Issue 9: [AFK] All Items View (Category Grid)

### Context
Second tab of the Closet page showing all uploaded garments organized by category.

### Acceptance Criteria
- [ ] `web/features/wardrobe/AllItemsView.tsx`
- [ ] Category sections: Tops, Bottoms, Dresses & Sets, Layers (server-reclassified), Footwear, Accessories
- [ ] Each section shows garment thumbnails in a grid (3 columns mobile, 4-5 desktop)
- [ ] Category header with count: "Tops (8)"
- [ ] Empty categories hidden (don't show "Footwear (0)")
- [ ] Sort within category: newest first (default)
- [ ] Tap garment: show detail overlay with extracted attributes (color family, fabric, occasion tags, etc.)
- [ ] Delete action: long-press or swipe to reveal delete option, confirmation dialog
- [ ] "Pending analysis" badge on garments with `is_analyzed = false`
- [ ] Upload FAB always visible for adding more garments

### Implementation Notes
- Grid uses CSS Grid with `aspect-ratio: 3/4` for garment thumbnails
- Garment detail overlay: simple bottom sheet showing key attributes as styled pills
- Delete calls `DELETE /api/wardrobe/garments/:id`
- After delete: remove from local state, show "Outfits will update on next sync" toast
- Category mapping: `garment_category` → display name + icon

### Testing
- Load with 25 garments across categories: verify correct grouping and counts
- Delete garment: verify removal from UI, API call, toast message
- Garment detail: verify attributes display correctly
- Empty category: verify hidden
- Upload button: verify navigates to upload flow

### Dependencies
- Issue 2 (garment API), Issue 4 (Closet UI shell)

---

## Issue 10: [AFK] AI Concierge Chat Interface + Backend

### Context
Natural language chat where users ask outfit questions. Gemini parses prompts to structured filters, algorithm surfaces outfits, attractive refinement buttons minimize AI calls.

### Acceptance Criteria
- [ ] `web/features/wardrobe/AIConcierge.tsx` — chat interface
  - Text input at bottom (styled as a sleek search bar, not a typical chat bubble)
  - Outfit results shown as mini outfit cards (horizontal scroll)
  - Refinement buttons: large, colorful, emoji-prefixed pills below results
  - Stiri product recommendation cards (when triggered)
  - Soft "Complete the look" module at bottom of each response
- [ ] `server/src/routes/wardrobe.js` — adds `POST /api/wardrobe/chat` handler
- [ ] `server/src/lib/wardrobeConcierge.js`:
  - `parsePrompt(message)` → Gemini call → structured filters
  - `filterOutfits(allOutfits, filters)` → matching outfits ranked
  - `generateRefinementButtons(filters, results)` → contextual button options
  - `getStiriRecommendation(filters, bestScore, products, profile)` → monetization
- [ ] Multi-turn support: conversation history stored in `wardrobe_chat_sessions`
- [ ] Button refinements: modify filters locally, no Gemini call, instant results, **do NOT count against rate limit**
- [ ] New free-text: new Gemini call with conversation context
- [ ] Rate limiting: max 20 free-text chat messages per hour (buttons exempt)
- [ ] Buttons are visually dominant — large, colorful, with emojis — making them clearly preferred over typing

### Implementation Notes
- Chat UI: NOT typical WhatsApp-style bubbles. More like a fashion assistant interface.
- Refinement buttons: `generateRefinementButtons()` produces 4-5 contextual options
- Stiri recommendation: runs existing `rankProducts()` against same filters
- Session management: create new session if `session_id` is null, reuse if provided
- Gemini model: same `gemini-2.0-flash` as garment analysis
- Frontend service: `web/features/wardrobe/conciergeService.ts`

### Testing
- Send "What should I wear to a date?": verify outfit results, refinement buttons
- Tap "More Casual" button: verify instant new results, no loading spinner (no AI call)
- Send new free-text: verify Gemini call, new results
- No matching outfits: verify Stiri recommendation appears
- Session persistence: verify conversation continues correctly

### Dependencies
- Issue 5 (outfits exist in DB), Issue 8 (outfit cards for display)

---

## Issue 11: [AFK] Gap Analysis Engine

### Context
Server-side engine that detects stylistic gaps in the user's wardrobe and matches Stiri products to fill them.

### Acceptance Criteria
- [ ] New file: `server/src/lib/gapAnalysis.js`
- [ ] 5 gap detectors:
  1. Occasion gap — fewer than 2 garments for core occasions (casual, office, party, date, festive)
  2. Aesthetic gap — Style DNA vs wardrobe composition mismatch
  3. Season gap — underrepresented seasons (includes spring + autumn)
  4. Color palette gap — >50% dominated by one color
  5. Versatility gap — >60% single-occasion garments
- [ ] Gap severity scoring (0-1) for prioritization
- [ ] Gap → Stiri set matching: filter Stiri products by gap type, rank by personalization
- [ ] Minimum 15 garments to activate gap analysis
- [ ] Gap results stored in `wardrobe_style_profile.identified_gaps`
- [ ] Export: `detectGaps(garments, userProfile)`, `matchStiriSetToGap(gap, products, profile)`

### Implementation Notes
- Follow WARDROBE_MODEL.md §6 for detector implementations
- Each detector returns `null` (no gap) or `{ gap_type, severity, headline, description, missing_tags }`
- Stiri set matching reuses existing `rankProducts()` infrastructure
- Headlines should be in the editorial tone: "Your Vibe is Evolving", "No party options", "Your palette is narrow"

### Testing
- Wardrobe with 0 formal garments: verify occasion gap detected
- Wardrobe 80% black: verify color palette gap detected
- Wardrobe matching Style DNA perfectly: verify no aesthetic gap
- <15 garments: verify no gaps returned
- Gap → product matching: verify returned Stiri sets are relevant to the gap

### Dependencies
- Issue 1 (schema), Issue 6 (garment data for analysis)

---

## Issue 12: [AFK] Personalization Engine Integration

### Context
Wardrobe data becomes the 4th signal in the ranking formula. Wardrobe style profile feeds into product recommendations. Personalization changes affect outfit ranking.

### Acceptance Criteria
- [ ] New function in `server/src/lib/ranking.js`: `wardrobeAffinity(wardrobeProfile, productTags)` — returns 0-1 score
- [ ] Updated `rankProducts()` to include wardrobe signal when available:
  - `final = w_style × S_style + w_wardrobe × S_wardrobe + w_clicks × S_user + w_pop × S_pop + ...`
- [ ] Updated data maturity thresholds for users with wardrobe (4 signals: style, wardrobe, clicks, popularity):
  - With wardrobe, <5 events: style 0.55, wardrobe 0.25, clicks 0.05, pop 0.15
  - With wardrobe, <20 events: style 0.45, wardrobe 0.30, clicks 0.10, pop 0.15
  - With wardrobe, <50 events: style 0.40, wardrobe 0.30, clicks 0.15, pop 0.15
  - With wardrobe, ≥50 events: self-tuned from ranking_weights table
- [ ] Wardrobe activation threshold: ≥10 garments (consistent with sync threshold)
- [ ] Wardrobe style profile computation: `computeWardrobeStyleProfile(garments)` → aggregated tag affinities
- [ ] Profile updated on every sync (stored in `wardrobe_style_profile` table)
- [ ] Feed API (`GET /api/feed/for-you`) reads wardrobe profile if available
- [ ] Outfit ranking in wardrobe uses personalization scores for re-ranking

### Implementation Notes
- `wardrobeAffinity()` follows same pattern as `userClickAffinity()` — iterate tag dimensions, find best match per dimension, average
- `computeWardrobeStyleProfile()` aggregates garment attributes into same JSONB structure as `user_click_profile.tag_affinities`
- Modify `dataMaturityWeights()` in ranking.js to check for wardrobe presence and use 4-signal thresholds
- Existing column `w_user_clicks` in `ranking_weights` maps to `w_clicks` in the formula — do NOT rename the column
- The wardrobe signal should reinforce/correct onboarding data — if user says "minimal" but owns 70% coquette, wardrobe signal pulls recommendations toward coquette

### Testing
- User with wardrobe (heavy on floral patterns) + Style DNA (minimal): verify feed includes more floral products
- User without wardrobe: verify no change to existing ranking behavior
- Wardrobe profile aggregation: verify tag affinities correctly computed from garment attributes
- Weight allocation: verify correct weights for each data maturity tier

### Dependencies
- Issue 1 (schema), Issue 5 (sync produces wardrobe profile)

---

## Issue 13: [HITL] Monetization Triggers (Stiri Set Recommendations)

### Context
The five monetization triggers integrated into gap cards (Sets view) and AI Concierge chat responses.

### Acceptance Criteria
- [ ] Trigger detection function: `detectTriggerType(gap, userProfile, outfit)` → identifies which of 5 triggers applies
- [ ] Trigger-specific copy templates for each of the 5 types:
  1. **Occasion Rescue** — "Your best wardrobe look for [event] scores [X], but this Stiri set was designed for exactly this"
  2. **Aesthetic Gap** — "Your vibe says [X] but your closet says [Y]"
  3. **Wardrobe Multiplier** — "This set creates [N] new combos with pieces you own"
  4. **Body Proportion Optimization** — "Engineered for your [body_type] body type"
  5. **Trend Injection** — "Modernize your rotation with one trend-forward set"
- [ ] Wardrobe Multiplier calculation: count how many existing garments pair with pieces in the Stiri set
- [ ] Body Proportion trigger: detect if wardrobe lacks flattering cuts for user's body type
- [ ] Copy tone: cool friend who's a stylist, NOT a sales pitch
- [ ] Frontend: editorial split card — Stiri set image + match badge + trigger-specific explanation
- [ ] Gap card component: `web/features/wardrobe/GapCard.tsx`

### Implementation Notes
- Server-side: trigger detection runs during gap analysis and chat recommendation
- Frontend: GapCard uses same editorial aesthetic as OutfitCard but with Stiri branding
- Wardrobe Multiplier requires cross-referencing Stiri set components against user's garments
- Match badge: "100% Match for College Fest", "6 New Combos", "Flatters Pear Shape"
- This is HITL because copy tone needs human judgment to feel authentic, not salesy

### Testing
- Each trigger type: create mock scenario → verify correct trigger detected → verify copy is appropriate
- Wardrobe Multiplier: Stiri set with blue trousers, user owns 4 blue-compatible tops → verify "5 new combos" calculated
- Copy review: verify no technical jargon, feels like fashion advice

### Dependencies
- Issue 11 (gap analysis), Issue 10 (chat integration)

---

## Issue 14: [AFK] Polish, Performance & Edge Cases

### Context
Final polish pass: performance optimization, edge case handling, error states, and integration testing across all wardrobe features.

### Acceptance Criteria
- [ ] Performance: outfit page loads <500ms with 50+ outfits (verify with cached data)
- [ ] Performance: sync pipeline <15s for 10 new garments (measure and optimize)
- [ ] Performance: AI Concierge button refinement <500ms (no AI call)
- [ ] Edge case: user deletes ALL garments → clean reset, back to empty state
- [ ] Edge case: sync with exactly 0 new garments → fast path (re-rank only)
- [ ] Edge case: Gemini rate limited during sync → graceful degradation, partial results
- [ ] Edge case: garment photo is extremely dark/blurry → Gemini extracts what it can, low `perceived_quality`
- [ ] Error states: network failure during upload → retry UI
- [ ] Error states: sync fails midway → partial results saved, user prompted to retry
- [ ] Loading states: skeleton screens for outfits, shimmer for garment grid
- [ ] Animations: outfit cards entrance (staggered reveal), vibe report expand, gap card appearance
- [ ] `cd web && npx vite build` passes clean
- [ ] Update `.github/project-state.md` with wardrobe feature status

### Implementation Notes
- Use React.memo for outfit cards (prevent re-renders during scroll)
- IntersectionObserver for lazy image loading
- Debounce outfit re-ranking on personalization change
- CSS `content-visibility: auto` for off-screen outfit cards

### Testing
- Full integration: upload 20 garments → sync → view outfits → chat → try on → delete garment → re-sync
- Performance profiling in Chrome DevTools (mobile throttling)
- Build verification: `cd web && npx vite build`

### Dependencies
- All previous issues (this is the final pass)
