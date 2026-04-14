# PRD: Stiri Digital Wardrobe — AI Fashion Director

## Problem

Indian Gen Z women (our primary audience) face a recurring, universal pain point captured in our user survey:

> "Event ke pehle, hazaro baar kapre badalti he, sabko dikhati he kaisi lag rhi hu... and in free time sare neye kapre pehen ke dekhti he kaisi lag rhi he"

**Translation**: Before events, she changes outfits hundreds of times, shows everyone, asks "how do I look?" And in free time, she tries on all her new clothes to see how they look.

### The Three Confusion Axes (from survey)

| Confusion | Weight | Description |
|-----------|--------|-------------|
| **Third-party factors** | ~50% | Body type, skin complexion, sizing, weather — "does this objectively suit me?" |
| **First-party preference** | ~30% | Personal color taste, fit preference (baggy vs tight), print/design preference |
| **Occasion appropriateness** | ~20% | "Is this dress okay for this event?" (date, mall, concert, party, wedding) |

### Decision Matrices When Choosing from Wardrobe (from survey)

1. "If the dress suits me" — body + complexion + fit
2. "Must be a complete match" — shoes, accessories must align
3. "Must suit the event" — occasion appropriateness

### Why This Matters

No fashion app today digitizes a user's actual closet and acts as a personal fashion director over their real clothes — pairing outfits, scoring them, explaining why combinations work, and identifying gaps. This feature transforms Stiri from "a try-on app" into "my personal stylist who knows my entire wardrobe."

**Who this is for**: Every Stiri user who owns clothes (everyone). Primary target: 18-28 women who stress about outfit choices for events and daily wear.

**What "done" looks like**: A user uploads 15+ garments, taps "Sync Pairs," and within seconds sees beautifully styled outfit combinations ranked by what suits THEM — with vibe reports explaining why each combo works, occasion tags, and the ability to AI try-on any outfit. An AI concierge lets them ask "what should I wear to a college fest?" and gets instant, personalized outfit recommendations from their own closet — plus tasteful Stiri set recommendations when their wardrobe has gaps.

---

## Solution

A **three-layer wardrobe intelligence system**:

### Layer 1 — Garment Intelligence (Gemini, on sync)

Each garment photo is analyzed once via a batched Gemini Flash call that extracts ~30 structured attributes (color hex values, fit, fabric, formality score, occasion tags, aesthetic alignment, etc.). Server-side background removal + WebP compression on upload minimizes storage and improves analysis quality.

### Layer 2 — Outfit Pairing Engine (Deterministic algorithm, on sync)

A two-phase server-side algorithm:
1. **Compatibility Filter** — eliminates impossible combinations (two bottoms, extreme fabric weight mismatches, clashing statement prints)
2. **Harmony Scorer** — scores valid combinations 0-100 across weighted dimensions (color theory, silhouette balance, occasion fit, aesthetic alignment, fabric compatibility, trend factor, practicality)

No AI calls per combination. Pure math on pre-extracted garment attributes.

### Layer 3 — Personalized Ranking + AI Concierge (Mixed, on demand)

- **Outfit ranking**: Existing personalization engine re-ranks outfits by user preference (wardrobe becomes 4th signal in the ranking blend)
- **Vibe Report**: Server-side template engine generates editorial-tone outfit analysis from algorithm scores (curated vibe title bank + slot-filled sentence templates)
- **AI Concierge Chat**: Natural language queries converted to structured filters via Gemini → algorithm surfaces matching outfits → Stiri set recommendations when wardrobe has gaps
- **Gap Analysis**: Server detects missing wardrobe categories/styles → inline Stiri set recommendations in the outfit feed

### Cost Model

| Operation | Engine | Cost per user | Frequency |
|-----------|--------|--------------|-----------|
| Image processing | Server-side (@imgly/background-removal + Canvas WebP) | ~$0 (200ms CPU) | Per upload |
| Garment analysis | Gemini Flash (batched, all unanalyzed in 1 call) | ~$0.008-0.012 per sync | Per sync |
| Outfit pairing | Server-side algorithm | $0 | Per sync |
| Outfit ranking | Server-side algorithm | $0 | Per page load |
| Vibe reports | Server-side templates | $0 | Every outfit |
| AI Concierge | Gemini Flash (1 call per free-text query) | ~$0.002-0.004 per query | On demand |
| Try-on | Existing FitIt pipeline | Credits-based | On demand |

**Total cost per active wardrobe user**: ~$0.02/month (assuming 2 syncs + 5 chat queries)

---

## User Stories

### Wardrobe Upload & Management

- As a user, I can upload garment photos from my gallery (batch select up to 10 at a time)
- As a user, I see my garments processing with background removal and compression before upload
- As a user, uploaded garments appear immediately in "All Items" view with a "pending analysis" state
- As a user, I see smart nudges after uploading ("You've added 8 tops and only 2 bottoms — add more bottoms to unlock better outfits!")
- As a user, I can delete garments I no longer own (triggers re-pairing on next sync)
- As a user, garment uploads are unlimited — no paywall on building my closet

### Outfit Generation & Display

- As a user, I see a "Sync Pairs" button that activates when I have ≥10 garments with ≥3 tops and ≥3 bottoms
- As a user, tapping "Sync Pairs" triggers the full pipeline: analyze new garments → purge deleted → generate outfit pairs → rank by my preferences → display
- As a user, I see my outfits in the "Sets" view as editorial split-panel cards (hero garment + supporting pieces)
- As a user, every outfit card shows a Vibe Report: catchy vibe title, "why this works" explanation, best occasions, accessory suggestions, and my personal vibe match %
- As a user, I see diverse outfits (the same black jeans don't appear in 15 of 20 outfits — diversity penalty ensures variety)
- As a user, outfits are ranked by what suits ME — my style preferences, body type, click history, and wardrobe composition
- As a user, I can try on any outfit using the AI try-on (same FitIt pipeline, uses my credits)

### All Items View

- As a user, I can switch between "Sets" view and "All Items" view
- As a user, "All Items" shows my garments organized by category: Tops, Bottoms, Dresses & Sets, Layers, Footwear, Accessories
- As a user, items within a category are sorted by recency (newest first) by default

### AI Concierge Chat

- As a user, I can ask natural language questions: "What should I wear to a college fest tomorrow?"
- As a user, I see top 3 outfit recommendations from my wardrobe matching my query
- As a user, I see attractive refinement buttons below results ("More casual", "Swap shoes", "Different colors", "Bolder vibe") that refine results without typing
- As a user, refinement buttons are so well-designed and contextual that I prefer clicking them over typing
- As a user, if I type a completely new question, it processes naturally (multi-turn supported)
- As a user, if my wardrobe can't fully nail the requested vibe, I see tasteful Stiri set recommendations that fill the gap
- As a user, Stiri set recommendations show an editorial layout: the set image + a visual breakdown of how it matches my specific query

### Gap Analysis & Monetization

- As a user with 15+ garments, I see inline "gap cards" woven into my outfit feed every 5-6 cards
- As a user, gap cards identify what's missing from my wardrobe (no formal options, narrow color palette, no winter pieces, etc.)
- As a user, each gap card recommends a specific Stiri complete set that fills the identified gap
- As a user, gap-triggered recommendations in chat only fire when my best wardrobe outfit scores below threshold — they feel honest, not pushy
- As a user, every chat response has a soft "Complete the look" module suggesting complementary Stiri sets

### Personalization Integration

- As the system, when a wardrobe is synced, I aggregate garment attributes into a wardrobe_style_profile
- As the system, wardrobe data becomes the 4th signal in the ranking formula: `w_wardrobe × S_wardrobe`
- As the system, changes to the wardrobe (adds/deletes) trigger updates to the personalization profile
- As the system, personalization changes (from clicks, purchases, profile edits) affect outfit ranking order on next page load

### Empty State & Onboarding

- As a new user opening Closet for the first time, I see a guided upload experience with category-driven prompts
- As a user, I see a progress counter: "3/10 — add 7 more pieces to unlock your first outfits"
- As a user, individual category counters show: "Tops: 2/3 ✓" and "Bottoms: 1/3 — add 2 more"
- As a user with <10 garments OR <3 tops OR <3 bottoms, the "Sync Pairs" button is disabled with a clear message explaining what's needed

---

## Implementation Decisions

### Decision 1: Three-tier AI usage (garment analysis only, algorithm pairing, on-demand vibe/chat)

**Choice**: Gemini is used ONLY for garment attribute extraction (on sync, batched) and AI Concierge prompt parsing (on demand). Outfit pairing, scoring, vibe reports, and ranking are 100% deterministic algorithms.

**Reason**: At 15 tops × 10 bottoms × 4 shoes, a medium wardrobe produces 600+ candidate combos. AI-scoring each combo would cost $1.20/user just on initial pairing. The deterministic algorithm costs $0. Gemini per-garment analysis (~$0.008-0.012 per batch) is a one-time cost that provides the structured data the algorithm needs.

### Decision 2: Two-phase pairing algorithm (filter → score)

**Choice**: Phase 1 eliminates impossible combos with hard rules (category compatibility, extreme fabric mismatches, competing statement prints). Phase 2 scores remaining combos 0-100 with weighted dimensions. Personalization re-ranks the scored results.

**Reason**: Hard filtering reduces the search space before the expensive scoring pass. A wardrobe with 150 raw top+bottom combos might filter to 80 valid ones, reducing scoring work by 47%. The separation also makes debugging easier — "why wasn't this combo shown?" is either "it was filtered" or "it scored low."

### Decision 3: Server-side image pipeline (background removal + WebP)

**Choice**: `@imgly/background-removal` + sharp/Canvas WebP compression, all server-side after upload. User uploads original photo (~1-2MB), server returns clean WebP cutout (~150-250KB) stored in Supabase.

**Reason**: Eliminates 30MB WASM client download (critical for Indian users on slow networks — first-time friction kills retention). Server processing adds ~200ms per image (negligible). Drops stored size from 3-5MB to 150-250KB per garment (95% reduction). Background-removed garment cutouts improve Gemini analysis accuracy AND make outfit cards look dramatically more professional. Universal device compatibility — no browser WASM support required.

### Decision 4: Batched Gemini analysis via "Sync Pairs" button

**Choice**: No per-upload Gemini calls. All unanalyzed garments are sent in a single batched Gemini Flash call when user taps "Sync Pairs." One multi-image call instead of N individual calls.

**Reason**: 10 garments in 1 batched call costs ~$0.008-0.012 vs. $0.030 for 10 individual calls (60% cost reduction). User controls when the expensive operation fires. Creates a satisfying "reveal moment" — press the button, see your outfits appear.

### Decision 5: Wardrobe as 4th personalization signal

**Choice**: Wardrobe data adds a new term to the ranking formula: `w_wardrobe × S_wardrobe`. It doesn't replace Style DNA — it supplements it. Users without wardrobes experience no change.

**Reason**: Wardrobe data is the strongest first-party signal available — it's what the user ACTUALLY owns, not what they say they like (onboarding) or what they browse (clicks). But not all users will upload a wardrobe, so the system must always work without it.

**Updated ranking formula**:
```
final_score = w_style    × S_style
            + w_wardrobe × S_wardrobe      ← NEW
            + w_clicks   × S_user
            + w_pop      × S_pop
            + new_arrival_boost
            − fatigue_penalty
```

**Weight allocation with wardrobe** (events = total tracked events; matches existing `dataMaturityWeights` structure):
| Phase | Style | Wardrobe | Clicks | Popularity |
|-------|-------|----------|--------|------------|
| No wardrobe (any events) | Use existing DATA_MATURITY_THRESHOLDS (3-signal) | — | — | — |
| With wardrobe, <5 events | 0.55 | 0.25 | 0.05 | 0.15 |
| With wardrobe, <20 events | 0.45 | 0.30 | 0.10 | 0.15 |
| With wardrobe, <50 events | 0.40 | 0.30 | 0.15 | 0.15 |
| With wardrobe, ≥50 events | Self-tuned (w_wardrobe added to ranking_weights table) |

### Decision 6: Outfit slot structure with diversity penalty + layer reclassification

**Choice**: Minimum viable outfit = 1 upper + 1 lower OR 1 fullbody. Optional slots: layer, footwear, accessories. After an outfit containing garment X is ranked, subsequent outfits with X get -5% score penalty per repetition.

**Layer category**: Gemini extracts all tops/jackets as `upperwear`. Server-side post-processing reclassifies garments where `garment_type ∈ {jacket, cardigan, shrug, blazer, hoodie, coat, vest}` to `garment_category = 'layer'`. This enables 3-piece combos (top + bottom + layer) and populates the "Layers" section in All Items view.

**Garment caps** (tiered by plan):
| Plan | Max Garments |
|------|-------------|
| Free | 30 |
| Essentials | 75 |
| Ultimate | 150 |

**Reason**: The required minimum keeps combos manageable. Optional slots enrich when available but don't block outfit generation. Diversity penalty ensures the top 20 displayed outfits feel varied — not "10 ways to wear your black jeans." Garment caps provide a business upsell lever while keeping costs negligible (~$0.27-$1.35 one-time analysis cost per tier).

### Decision 7: Vibe Report — server-side template engine, not AI

**Choice**: Every outfit gets a Vibe Report generated from: (a) manually curated vibe title bank (100-200 entries mapped by occasion × aesthetic × formality), (b) sentence templates with slot-filling from garment/outfit attributes, (c) computed scores presented warmly.

**Reason**: Zero AI cost. Every combo gets a vibe report (not on-demand). The editorial tone ("The contrast between your ivory knit and high-waist denim creates that effortless waist moment") comes from well-crafted templates, not Gemini. The algorithm already computes all the scores needed — the templates just humanize them.

### Decision 8: AI Concierge — multi-turn with button-first design

**Choice**: Multi-turn conversation is supported, but the UI is designed with attractive, contextual refinement buttons so that 80%+ of interactions are free filter adjustments (no Gemini call). Only new free-text prompts trigger Gemini.

**Rate limit**: 20 free-text messages per hour. **Button refinements do NOT count against the rate limit** — they are client-side filter operations that never call Gemini.

**Reason**: Each Gemini call costs ~$0.002-0.004. If 80% of refinements are button-based, average cost drops from ~$0.012/session (3 turns) to ~$0.003/session (1 Gemini + 2 button refinements). The buttons also deliver faster response times and guide users toward better queries.

**Flow**:
1. User types prompt → Gemini parses to structured filters (1 call) → algorithm returns top 3 outfits
2. Below results: contextual refinement pills ("More casual", "Swap shoes", "Different colors", "Bolder vibe")
3. Each pill modifies structured filters locally (e.g., "More casual" → `formality -= 0.2`) → re-run algorithm → instant results
4. New free-text prompt → Gemini (new call)

### Decision 9: Stiri set monetization — hybrid (gap-triggered + soft companion)

**Choice**: Gap-triggered hard recommendations only fire when best wardrobe outfit < 60/100 score for the query. Soft "Complete the look" module always shows a Stiri set that complements the chosen outfit. Stiri sells COMPLETE SETS only — never individual piece upsells.

**Reason**: Respects the user's wardrobe as primary. Hard pushes only when genuinely helpful (high conversion rate). Soft companion module provides consistent monetization surface without feeling like ads. Selling complete sets aligns with "we sell fashion, not clothes."

**Five monetization triggers**:
1. **Occasion Rescue** — wardrobe can't meet the event's formality/vibe → recommend a complete set
2. **Aesthetic Gap** — Style DNA mismatches wardrobe composition → recommend a set in user's aspirational aesthetic  
3. **Wardrobe Multiplier** — Stiri set's individual pieces create N new combos with existing wardrobe
4. **Body Proportion Optimization** — wardrobe lacks cuts that flatter user's body type → recommend engineered sets
5. **Trend Injection** — wardrobe is all classics, no current trends → recommend a trend-forward set

### Decision 10: Inline gap analysis at 15-garment threshold

**Choice**: After 15+ garments are synced, inline "gap cards" appear in the Sets feed every 5-6 outfit cards. Gap types: occasion gaps, aesthetic gaps, season gaps, color palette gaps, versatility gaps.

**Reason**: Below 15 garments, gaps are trivially obvious ("you only have 3 things, of course you're missing formal wear"). At 15+, the wardrobe has enough composition to identify meaningful, actionable gaps. Inline placement (not a separate tab) prevents the "ads section" stigma.

### Decision 11: Collage-based outfit try-on (same FitIt pipeline)

**Choice**: "Try On" button on outfit cards generates a **flat-lay collage** of all garments in the outfit (via Canvas API), then sends the collage as a single "garment" image through the existing FitIt pipeline. 1 credit per try-on, same model, same prompt.

**Reason**: Tested approach — Gemini 3.1 Flash Image Preview produces accurate full-outfit composites when given a well-composed collage. No new prompt engineering. No multi-image complexity. Reuses the entire proven FitIt pipeline unchanged. Single credit keeps the cost model simple.

### Decision 12: Navigation placement — Closet as second tab (4-tab nav)

**Choice**: Bottom nav becomes `Home | Closet | Room | Bag` (4 tabs). Profile access moves to a top-right avatar icon in the header (like Instagram). Wardrobe occupies position #2 with a hanger icon and "Closet" label.

**Reason**: Position #2 signals "hero feature" — it's the natural thumb path after Home. 4 tabs instead of 5 avoids cramped mobile nav on Indian devices (5.5-6.1" screens). Profile is accessed infrequently and works well as a header icon. "Closet" (6 chars) fits cleanly. The hanger icon (🪝) is universally recognized as a closet/wardrobe symbol.

### Decision 13: Incremental outfit caching and recalculation strategy

**Choice**: Outfit combinations are computed and stored in the database (not generated per page load). Recalculation uses an **incremental delta engine**:

**On garment add**: Only compute new pairs involving the added garment(s) — `O(new × existing_category)` instead of `O(all × all)`.
**On garment delete**: Remove stored pairs containing the deleted garment — `O(n)` scan. Then re-run diversity penalty + personalization re-rank globally on remaining pre-scored outfits.
**Sequential tier building**: Footwear attaches to surviving base pairs (not full cross-product). Accessories attach to surviving footwear combos. Each tier multiplies only against the previous tier's results.
**Set-relative re-scoring**: Pair-intrinsic scores (color, silhouette, fabric, etc.) are stored and reused. Only diversity penalty + personalization re-rank (both cheap sort operations) run globally after incremental changes.
**Personalization change**: Re-rank only (reorder existing scored outfits). Cached outfits re-ranked if stale > 24h.

**Reason**: A wardrobe of 50 tops × 30 bottoms × 10 shoes = 15,000 raw combos with full recalc. Adding 2 new tops incrementally = `2 × 30 = 60` new pairs — 99.6% reduction. Caching means page loads are instant (read from DB).

---

## AI Concierge — Monetization Trigger Examples

### 1. "Occasion Rescue" Trigger

**User prompt**: "I have a college fest tomorrow night. I want to look edgy but comfortable."

**System detects**: Best wardrobe combo scores 42/100 (only basic jeans + casual tees available for "edgy party" aesthetic).

**Response**:
> I put together your strongest look from your closet — **Black Ripped Jeans + Graphic Tee + White Sneakers**. It's a solid casual base, but honestly? It's playing it safe for a fest night.
>
> **[ Your Best Look: outfit card ]**
>
> For a guaranteed head-turner that nails the edgy fest vibe with zero styling stress:
>
> **[ Stiri 'Midnight Rebel' Set: editorial card with "100% Match for College Fest" badge ]**
>
> Pre-styled, perfectly proportioned, and ready to wear.

### 2. "Aesthetic Gap" Trigger

**System detects**: Style DNA is 75% "Soft Feminine" but uploaded wardrobe is 80% dark streetwear.

**Response** (inline gap card in Sets feed):
> **✨ Your Vibe is Evolving**
>
> Your style taste screams soft feminine — but your closet is still heavy on streetwear. Instead of forcing old pieces into your new aesthetic:
>
> **[ Stiri 'Pastel Dreamscape' Set: editorial card with "Your Aesthetic, Ready to Wear" badge ]**
>
> One set. Instant entry into the look you actually want.

### 3. "Wardrobe Multiplier" Trigger

**System detects**: Stiri set X contains pieces that color-match with 4 existing user garments.

**Response** (soft companion module in AI chat):
> **[ Complete the Look ]**
>
> The Stiri 'Old Money Brunch' Set is a perfect Sunday look on its own. But the magic? The tailored linen trousers pair with 4 of your existing crop tops, and the vest works with your denim. You're buying 1 look, but unlocking **6 new combos** in your rotation.
>
> **[ Stiri set card with "6 New Combos" visual breakdown ]**

### 4. "Body Proportion Optimization" Trigger

**System detects**: User is Petite Hourglass but wardrobe is 70% oversized/boxy fits.

**Response** (inline gap card):
> **Your Shape Deserves Better**
>
> You love oversized fits (comfort is queen 👑), but they're hiding your natural waistline. This set is engineered with a cropped-to-high-waist ratio that elongates your legs and flatters your exact body type — effortlessly.
>
> **[ Stiri 'Sculpted Elegance' Set: editorial card with "Flatters Petite Hourglass" badge ]**

### 5. "Trend Injection" Trigger

**System detects**: Wardrobe is 90% timeless basics, 0% current trends.

**Response** (inline gap card):
> **Your Basics are 🔥. Now Add the Spark.**
>
> You've got an incredible foundation of timeless staples. To modernize your rotation this season, you don't need a full overhaul — just one curated trend-forward set.
>
> **[ Stiri 'Y2K Nostalgia' Set: editorial card with "Season Trend Upgrade" badge ]**

---

## Garment Extraction Schema (Gemini Output per Garment)

```jsonc
{
  // Identity
  "garment_type": "crop_top",           // from fixed enum
  "garment_category": "upperwear",      // upperwear | lowerwear | fullbody | footwear | accessory | layer (server-reclassified)

  // Color (critical for pairing — hex enables color-wheel math)
  "primary_color_hex": "#2B3A55",       // extracted from image
  "secondary_color_hex": "#FFFFFF",     // if applicable, null otherwise
  "color_family": "navy",              // human-readable label
  "color_temperature": "cool",          // warm | cool | neutral
  "color_intensity": "muted",           // pastel | muted | vibrant | neon | earth

  // Silhouette
  "fit": "fitted",                      // fitted | regular | relaxed | oversized
  "length": "crop",                     // crop | regular | long | ankle | floor
  "waist_position": null,               // high | mid | low (bottoms/fullbody only)
  "volume": "low",                      // low | medium | high

  // Fabric & Texture
  "fabric": "cotton",                   // from enum
  "texture": "matte",                   // matte | glossy | rough | smooth | knit
  "weight": "lightweight",              // lightweight | midweight | heavyweight
  "stretch": true,                      // boolean
  "opacity": "opaque",                  // opaque | semi-sheer | sheer

  // Pattern
  "pattern": "solid",                   // solid | stripes | floral | checks | abstract | geometric | graphic | animal
  "pattern_scale": null,                // small | medium | large (if patterned)

  // Details
  "neckline": "square",                 // v-neck | round | square | collar | off-shoulder | halter | mandarin | boat
  "sleeve_length": "sleeveless",        // sleeveless | cap | short | three-quarter | full
  "embellishment": "plain",             // plain | embroidered | sequin | lace | mirror-work | beaded
  "hardware": false,                    // visible zippers, chains, buckles

  // Occasion & Vibe (float + multi-select)
  "formality": 0.3,                     // 0.0 (loungewear) → 1.0 (black tie)
  "occasion_tags": ["casual", "date"],  // multi-select from enum
  "aesthetic_tags": ["minimal", "coquette"], // multi-select from enum
  "season_tags": ["summer", "spring"],  // multi-select from enum

  // Condition (from image quality)
  "perceived_quality": 0.8              // 0-1 (fabric quality, stitching, freshness)
}
```

**~30 fields per garment.** All extracted in a single batched Gemini Flash call.

---

## Pairing Algorithm Specification

### Phase 1: Compatibility Filter (Hard Rules)

Eliminates impossible combinations before scoring.

```
RULE 1 — Category compatibility:
  Valid cores: (upperwear + lowerwear) OR (fullbody alone) OR (fullbody + layer)
  Invalid: two of same category except layering combos
  Layers can stack: upperwear + lowerwear + layer ✓
  Fullbody + layer ✓ (e.g., dress + jacket)

RULE 2 — Fabric weight extremes:
  |garmentA.weight - garmentB.weight| must not exceed 1 step
  lightweight + heavyweight = REJECT (e.g., silk cami + heavy wool skirt)
  lightweight + midweight = OK
  midweight + heavyweight = OK

RULE 3 — Opacity conflict:
  Two sheer/semi-sheer garments without an opaque base = REJECT

RULE 4 — Competing statement patterns:
  Two garments both with pattern ≠ "solid" AND pattern_scale = "large" = REJECT
  One large print + one solid = OK
  One large print + one small print = OK (controlled pattern mixing)

RULE 5 — Formality extreme mismatch:
  |garmentA.formality - garmentB.formality| > 0.5 = REJECT
  Ball gown top (0.9) + joggers (0.2) = REJECT
  Smart blouse (0.6) + casual jeans (0.3) = OK (difference 0.3)

RULE 6 — Season incompatibility:
  No overlap in season_tags AND seasons are climatically opposed = REJECT
  Opposed pairs: summer↔winter, summer↔monsoon (heavy layering vs minimal)
  Wool sweater (winter) + linen shorts (summer) = REJECT
  Spring + autumn garments with no overlap = OK (mild seasons, compatible)
```

### Phase 2: Harmony Scorer (Weighted 0-100)

For each valid combination, compute a harmony score.

```
harmony_score = 
    25 × color_harmony(A, B)
  + 20 × silhouette_balance(A, B)
  + 15 × occasion_fit(A, B)
  + 15 × aesthetic_alignment(A, B)
  + 10 × fabric_compatibility(A, B)
  + 10 × trend_factor(A, B, user)
  +  5 × practicality(A, B)
```

**Color Harmony (0-1)** — uses hex values for mathematical color-wheel scoring:
```
hue_A = hue_from_hex(A.primary_color_hex)
hue_B = hue_from_hex(B.primary_color_hex)
hue_diff = abs(hue_A - hue_B) mod 360

If both solid neutrals (black, white, grey, beige): 0.90 (always safe)
If one neutral + one statement: 0.85 (neutral grounds the outfit)
Complementary (hue_diff ∈ [150°, 210°]): 0.95 (high contrast, bold)
Analogous (hue_diff ∈ [0°, 60°]): 0.90 (harmonious, cohesive)
Triadic (hue_diff ∈ [100°, 140°]): 0.75 (playful, needs balance)
Clash zone (hue_diff ∈ [60°, 100°] or [140°, 150°]): 0.30-0.50 (risky)

Bonus: +0.05 if color_temperature matches (both warm or both cool)
Penalty: -0.10 if both garments are vibrant/neon intensity (visual overload)
```

**Silhouette Balance (0-1)**:
```
Perfect contrasts score highest:
  fitted + relaxed = 0.95 (volume balance)
  fitted + fitted = 0.70 (can feel rigid)
  oversized + oversized = 0.40 (shapeless)
  crop + high-waist = 0.95 (waist definition)
  regular + regular = 0.75 (safe but unremarkable)

Volume distribution:
  low + high = 0.90 (intentional contrast)
  low + low = 0.80 (sleek)
  high + high = 0.35 (overwhelming)
```

**Occasion Fit (0-1)**:
```
occasion_overlap = intersect(A.occasion_tags, B.occasion_tags)
base_score = occasion_overlap.length / max(A.occasion_tags.length, B.occasion_tags.length)

formality_diff = abs(A.formality - B.formality)
formality_bonus = 1.0 - (formality_diff × 2)  // 0 diff = 1.0, 0.5 diff = 0.0

score = 0.6 × base_score + 0.4 × formality_bonus
```

**Aesthetic Alignment (0-1)**:
```
aesthetic_overlap = intersect(A.aesthetic_tags, B.aesthetic_tags)
If overlap ≥ 1: 0.85 + (0.05 × additional overlaps, max 1.0)
If overlap = 0 but compatible aesthetics: 0.50-0.65
  (e.g., minimal + coquette = 0.60, streetwear + Y2K = 0.65)
If clash (e.g., cottagecore + cyberpunk): 0.20
```

**Fabric Compatibility (0-1)**:
```
Same fabric: 0.70 (safe, can feel monotonous)
Complementary textures (matte + slight glossy): 0.90
Same texture: 0.75
Contrasting textures (rough + smooth): 0.85 (intentional contrast)
Weight compatibility (within 1 step): 0.80
Stretch vs structured: 0.75 (movement contrast)
Both same stretch value: 0.70
```

**Trend Factor (0-1)** — personalized:
```
If either garment has trending aesthetic_tags matching user's Style DNA: 0.90
If either garment has trending tags but not matching user: 0.60
Both evergreen/basic: 0.50 (reliable but not exciting)
Both highly trendy: 0.70 (can feel tryhard)
One trend + one basic: 0.85 (grounded trend expression)
```

**Practicality (0-1)**:
```
Season overlap score: intersect(A.season_tags, B.season_tags) / union(A, B)
Both comfortable stretch: +0.10
Both breathable fabric: +0.10
Weight appropriate for current season: +0.20
```

### Phase 3: Personalization Re-Rank

Each outfit gets a composite tag profile (union of garment tags). Run through existing `rankProducts()` style scoring:

```
personalized_score = 
    w_style    × styleDnaMatch(user, outfit_tags)
  + w_wardrobe × wardrobeAffinity(wardrobe_profile, outfit_tags)
  + w_clicks   × userClickAffinity(click_profile, outfit_tags)
  + w_pop      × S_pop  // (0 for wardrobe outfits — no cross-user popularity data)
```

Final display score = `0.6 × harmony_score + 0.4 × personalized_score`

Diversity penalty (-5% per garment repeat, capped at 40%) is applied AFTER scoring — see §Diversity Penalty.

---

## Vibe Report Generation

### Vibe Title Bank (manually curated examples)

```javascript
const VIBE_TITLES = {
  // Keyed by: `${primary_occasion}_${primary_aesthetic}_${formality_bucket}`
  "casual_minimal_low":       ["Off-Duty Cool", "Effortless Monday", "Less is More Energy"],
  "casual_minimal_mid":       ["Clean Slate Chic", "Quiet Confidence", "Understated wins"],
  "party_coquette_mid":       ["Main Character Night", "Sweet & Dangerous", "She's Arrived"],
  "party_streetwear_mid":     ["After Dark Mode", "Night Owl Energy", "Street After Sunset"],
  "date_coquette_mid":        ["Soft Power Move", "He Won't Recover", "Effortless Crush"],
  "date_minimal_mid":         ["Mysteriously Chic", "First Impression Queen", "Cool Girl Date"],
  "brunch_minimal_low":       ["Sunday Brunch Energy", "Golden Hour Ready", "Weekend State of Mind"],
  "office_formal_high":       ["Boss Mode On", "Corner Office Energy", "Powerplay"],
  "wedding_ethnic_high":      ["Desi Royalty", "Wedding Season Queen", "Grace & Grandeur"],
  "festive_ethnic_mid":       ["Festival Glow", "Desi Girl Vibes", "Celebration Mode"],
  "college_streetwear_low":   ["Campus Legend", "Zero Effort, All Style", "That Cool Senior"],
  "mall_casual_low":          ["Shopping Slay", "Mall Ready & Unbothered", "Casual But Make It Fashion"],
  "concert_streetwear_mid":   ["Front Row Energy", "Mosh Pit Chic", "Sound Check Ready"],
  // ... 100-200 entries covering all common combinations
};
```

### Sentence Templates (slot-filling from garment attributes)

```javascript
const WHY_TEMPLATES = {
  color_harmony: [
    "The {colorA} against {colorB} creates a {harmony_type} palette that feels {mood}.",
    "This {colorA}-{colorB} combination hits that {harmony_type} sweet spot — bold without trying.",
    "{colorA} and {colorB} together? Classic {harmony_type} harmony. Your undertone makes it pop."
  ],
  silhouette_balance: [
    "The {fitA} {garmentA} with {fitB} {garmentB} creates that effortless waist moment everyone notices.",
    "Pairing {fitA} on top with {fitB} below gives you legs for days.",
    "{fitA} meets {fitB} — the volume contrast makes this look intentional, not accidental."
  ],
  body_proportion: [
    "This combo draws the eye to your {feature} — your best asset.",
    "The {lengthA}-to-{lengthB} ratio elongates your silhouette beautifully.",
    "This {waist_effect} effect is exactly what flatters your {body_type} shape."
  ],
  texture_contrast: [
    "Mixing {textureA} with {textureB} adds dimension without trying too hard.",
    "The {textureA}-{textureB} contrast gives depth to a simple palette.",
    "{fabricA} against {fabricB}? That's a texture moment."
  ]
};
```

### Accessory Suggestions

If user has accessories in wardrobe matching the outfit's color/aesthetic:
→ Show those specific items ("Your gold hoops + white canvas bag")

If not:
→ Show generic recommendations from a lookup table keyed by (aesthetic + formality):
```javascript
const ACCESSORY_SUGGESTIONS = {
  "minimal_low": ["White sneakers", "Simple chain", "Canvas tote"],
  "coquette_mid": ["Kitten heels", "Pearl studs", "Mini crossbody"],
  "streetwear_mid": ["Chunky sneakers", "Chain necklace", "Belt bag"],
  "ethnic_high": ["Jhumkas", "Embroidered clutch", "Bangles"],
  // ...
};
```

---

## Database Schema (New Tables)

### `wardrobe_garments` — Individual closet items

```sql
CREATE TABLE wardrobe_garments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Image
  image_url           text NOT NULL,         -- Supabase Storage URL (bg-removed WebP)
  original_image_url  text,                  -- Original uploaded image (before bg removal)
  
  -- Identity
  garment_type        text NOT NULL,         -- from Gemini: crop_top, jeans, dress, etc.
  garment_category    text NOT NULL,         -- upperwear | lowerwear | fullbody | footwear | accessory | layer (server-reclassified)
  
  -- Color
  primary_color_hex   text,                  -- #2B3A55
  secondary_color_hex text,                  -- nullable
  color_family        text,                  -- navy, black, red, etc.
  color_temperature   text,                  -- warm | cool | neutral
  color_intensity     text,                  -- pastel | muted | vibrant | neon | earth
  
  -- Silhouette
  fit                 text,                  -- fitted | regular | relaxed | oversized
  length              text,                  -- crop | regular | long | ankle | floor
  waist_position      text,                  -- high | mid | low (bottoms/fullbody)
  volume              text,                  -- low | medium | high
  
  -- Fabric & Texture
  fabric              text,                  -- cotton, silk, linen, denim, etc.
  texture             text,                  -- matte | glossy | rough | smooth | knit
  weight              text,                  -- lightweight | midweight | heavyweight
  stretch             boolean DEFAULT false,
  opacity             text DEFAULT 'opaque', -- opaque | semi-sheer | sheer
  
  -- Pattern
  pattern             text DEFAULT 'solid',
  pattern_scale       text,                  -- small | medium | large
  
  -- Details
  neckline            text,                  -- v-neck | round | square | collar | etc.
  sleeve_length       text,                  -- sleeveless | cap | short | three-quarter | full
  embellishment       text DEFAULT 'plain',
  hardware            boolean DEFAULT false,
  
  -- Occasion & Vibe
  formality           decimal(3,2) DEFAULT 0.5,  -- 0.0-1.0
  occasion_tags       text[] DEFAULT '{}',
  aesthetic_tags      text[] DEFAULT '{}',
  season_tags         text[] DEFAULT '{}',
  
  -- Condition
  perceived_quality   decimal(3,2) DEFAULT 0.5,  -- 0.0-1.0
  
  -- State
  is_analyzed         boolean DEFAULT false,      -- false until Gemini extraction completes
  analysis_failed     boolean DEFAULT false,      -- true if Gemini extraction failed for this garment
  
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_wardrobe_user ON wardrobe_garments(user_id);
CREATE INDEX idx_wardrobe_category ON wardrobe_garments(user_id, garment_category);
CREATE INDEX idx_wardrobe_unanalyzed ON wardrobe_garments(user_id) WHERE is_analyzed = false;
```

### `wardrobe_outfits` — Generated outfit combinations

```sql
CREATE TABLE wardrobe_outfits (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Garment references (array of garment IDs in this outfit)
  garment_ids         uuid[] NOT NULL,       -- references wardrobe_garments.id
  
  -- Scores (from pairing algorithm)
  harmony_score       decimal(5,2) NOT NULL,  -- 0-100
  color_harmony       decimal(3,2),           -- 0-1 (sub-score)
  silhouette_balance  decimal(3,2),           -- 0-1
  occasion_fit        decimal(3,2),           -- 0-1
  aesthetic_alignment decimal(3,2),           -- 0-1
  fabric_compatibility decimal(3,2),          -- 0-1
  trend_factor        decimal(3,2),           -- 0-1
  practicality        decimal(3,2),           -- 0-1
  
  -- Personalization (re-ranked on page load)
  personalized_score  decimal(5,2),           -- 0-100
  display_score       decimal(5,2),           -- 0.6×harmony + 0.4×personalized
  
  -- Vibe Report (pre-generated)
  vibe_title          text,                   -- "Sunday Brunch Energy"
  vibe_why            text,                   -- "The cropped ivory knit against..."
  vibe_occasions      text[] DEFAULT '{}',    -- ["Brunch", "Mall Day", "Instagram"]
  vibe_accessories    text[] DEFAULT '{}',    -- ["Gold hoops", "White sneakers"]
  vibe_match_pct      integer,                -- 0-100 personalization match
  
  -- Composite tag profile (union of garment tags, for personalization scoring)
  composite_tags      jsonb DEFAULT '{}',     -- { color_family: [...], style_tags: [...], ... }
  
  -- State
  is_stale            boolean DEFAULT false,  -- true when garments added/deleted
  
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_outfits_user ON wardrobe_outfits(user_id);
CREATE INDEX idx_outfits_display ON wardrobe_outfits(user_id, display_score DESC);
CREATE INDEX idx_outfits_stale ON wardrobe_outfits(user_id) WHERE is_stale = true;
```

### `wardrobe_style_profile` — Aggregated wardrobe composition (for personalization)

```sql
CREATE TABLE wardrobe_style_profile (
  user_id             uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Aggregated from all garments (same structure as click_profile.tag_affinities)
  tag_affinities      jsonb NOT NULL DEFAULT '{}',
  -- { "color_family": { "navy": 0.40, "black": 0.30 }, "aesthetic_tags": { "minimal": 0.60 }, ... }
  
  -- Wardrobe composition stats
  total_garments      integer DEFAULT 0,
  category_counts     jsonb DEFAULT '{}',    -- { upperwear: 8, lowerwear: 5, footwear: 3, ... }
  total_outfits       integer DEFAULT 0,
  
  -- Gap analysis results (precomputed on sync)
  identified_gaps     jsonb DEFAULT '[]',    
  -- [{ "gap_type": "occasion", "description": "No formal options", "missing_tags": { "formality": ">0.7" } }]
  
  updated_at          timestamptz DEFAULT now()
);
```

### `wardrobe_chat_sessions` — AI Concierge conversation state

```sql
CREATE TABLE wardrobe_chat_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Current active filters (structured, from Gemini parse or button refinements)
  active_filters      jsonb DEFAULT '{}',
  -- { "occasion": "college_fest", "formality_range": [0.3, 0.6], "aesthetic": ["edgy"], "mood": "bold" }
  
  -- Conversation history (for multi-turn context)
  messages            jsonb DEFAULT '[]',
  -- [{ "role": "user", "content": "...", "timestamp": "..." }, { "role": "assistant", "content": "...", "outfit_ids": [...] }]
  
  -- Session state
  last_active_at      timestamptz DEFAULT now(),
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_chat_user ON wardrobe_chat_sessions(user_id, last_active_at DESC);
```

### RLS Policies

```sql
-- wardrobe_garments
ALTER TABLE wardrobe_garments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own garments" ON wardrobe_garments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- wardrobe_outfits
ALTER TABLE wardrobe_outfits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own outfits" ON wardrobe_outfits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- wardrobe_style_profile
ALTER TABLE wardrobe_style_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own style profile" ON wardrobe_style_profile
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- wardrobe_chat_sessions
ALTER TABLE wardrobe_chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own chats" ON wardrobe_chat_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Supabase Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, file_size_limit, allowed_mime_types)
VALUES ('wardrobe-items', 'wardrobe-items', 524288, ARRAY['image/webp'])
ON CONFLICT (id) DO NOTHING;
-- 512KB limit, WebP only (server compresses after upload, stores clean version)
```

---

## Testing Strategy

### Unit Tests
- Compatibility filter: test each rule with edge cases (two bottoms, weight extremes, pattern clashes)
- Harmony scorer: test each sub-score with known garment pairs, verify weighted sum
- Color harmony: test hex-to-hue conversion, verify complementary/analogous/clash detection
- Vibe report generator: test title lookup, sentence template slot-filling, accessory suggestion fallback
- Wardrobe style profile aggregation: verify tag affinity computation from garment attributes
- Gap analysis: test each gap type detection with mock wardrobe compositions

### Integration Tests
- Full sync pipeline: upload garments → batch Gemini analysis → outfit generation → ranking → display
- Personalization integration: verify wardrobe signal affects product feed ranking
- AI Concierge: prompt → structured filters → outfit results → refinement buttons → re-filter
- Garment deletion: delete garment → verify affected outfits removed/recalculated
- Gap card injection: verify gap cards appear at correct intervals in Sets feed

### Manual Verification
- Upload flow: batch selection, background removal quality, processing progress
- Outfit card visual quality: split-panel layout, garment cutout rendering
- Vibe Report tone: verify editorial feel, no technical jargon
- AI Concierge conversation: natural language understanding, button interactions
- Monetization flow: gap detection → Stiri set recommendation → product page navigation
- Performance: page load time with 50+ outfits, sync time with 10+ new garments

---

## Out of Scope (V1)

- **Outfit scheduling/calendar**: "What to wear Monday, Tuesday..." — future feature
- **Weather API integration**: Current weather affecting recommendations — future
- **Social sharing of outfits**: Sharing closet combos with friends — future
- **Garment wear tracking**: "You haven't worn this in 3 months" — future
- **Resale/donation suggestions**: "These don't match your style anymore" — future
- **Multi-user wardrobe**: Shared family closets — future
- **Garment price estimation**: Estimating value of closet items — future
- **Brand recognition**: Identifying brands from photos — future
- **Automatic seasonal rotation**: Hiding off-season items — future
- **Outfit history**: "You wore this combo last Thursday" — future
