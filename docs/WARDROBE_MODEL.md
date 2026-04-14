# Stiri — Digital Wardrobe: Complete Technical Model

> **Status**: Approved design — ready for implementation.
> **PRD**: See [PRD_WARDROBE.md](PRD_WARDROBE.md) for decisions and rationale.
> **Issues**: See [WARDROBE_ISSUES.md](WARDROBE_ISSUES.md) for implementation breakdown.

---

## 1. Core Thesis

The Digital Wardrobe transforms Stiri from "a try-on app" into "my personal AI fashion director." Users upload their real clothes, and Stiri acts as an always-available stylist — pairing outfits, explaining why combinations work, identifying wardrobe gaps, and recommending purchases that genuinely fill those gaps.

The system has three computational layers:

1. **Garment Intelligence** — Gemini extracts ~30 structured attributes per garment photo (one-time, batched)
2. **Outfit Pairing Engine** — Deterministic two-phase algorithm: compatibility filter → harmony scorer (no AI)
3. **Personalized Ranking + AI Concierge** — Re-ranks outfits by user preferences; natural language search powered by Gemini prompt parsing + algorithmic filtering

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          USER DEVICE                                  │
│                                                                       │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────────┐     │
│  │ Image Pipeline   │  │ Closet UI    │  │ AI Concierge Chat    │     │
│  │ @imgly/bg-remove │  │ Sets / Items │  │ Prompt + Refinement  │     │
│  │ Canvas WebP      │  │ Vibe Reports │  │ Buttons              │     │
│  │ (~3s/garment)    │  │ Gap Cards    │  │ Stiri Set Recs       │     │
│  └────────┬────────┘  └──────┬───────┘  └──────────┬───────────┘     │
│           │                   │                      │                │
└───────────┼───────────────────┼──────────────────────┼────────────────┘
            │                   │                      │
   Upload WebP          Fetch Outfits          POST /api/wardrobe/chat
   POST /api/wardrobe   GET /api/wardrobe      (prompt → filters → outfits)
   /garments/upload     /outfits
            │                   │                      │
┌───────────┼───────────────────┼──────────────────────┼────────────────┐
│           ▼                   ▼                      ▼                │
│                      EXPRESS.JS API                                   │
│                                                                       │
│  POST /api/wardrobe/garments/upload    — Store garment image          │
│  DELETE /api/wardrobe/garments/:id     — Remove garment               │
│  GET /api/wardrobe/garments            — List all garments            │
│  POST /api/wardrobe/sync               — Full sync pipeline           │
│  GET /api/wardrobe/outfits             — Ranked outfits               │
│  POST /api/wardrobe/chat               — AI Concierge                 │
│  GET /api/wardrobe/gaps                — Gap analysis                 │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │                    SYNC PIPELINE                               │    │
│  │                                                                │    │
│  │  1. Batch Gemini Analysis (unanalyzed garments, 1 API call)   │    │
│  │  2. Purge deleted garment records                              │    │
│  │  3. Compatibility Filter (hard rules)                          │    │
│  │  4. Harmony Scorer (weighted 0-100)                            │    │
│  │  5. Vibe Report Generator (template engine)                    │    │
│  │  6. Personalization Re-rank                                    │    │
│  │  7. Gap Analysis                                               │    │
│  │  8. Wardrobe Style Profile → Personalization Engine            │    │
│  │                                                                │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │                   AI CONCIERGE PIPELINE                        │    │
│  │                                                                │    │
│  │  1. Gemini: parse free-text → structured filters (1 call)     │    │
│  │  2. Filter outfits by structured filters (no AI)              │    │
│  │  3. Rank filtered outfits by harmony + personalization        │    │
│  │  4. Generate refinement buttons from current filters          │    │
│  │  5. Gap check: if best_score < 60 → Stiri set recommendation │    │
│  │  6. Soft companion: always append "Complete the look" module  │    │
│  │                                                                │    │
│  │  Button refinement: modify filters locally → re-run 2-6      │    │
│  │  New free-text: re-run 1-6 (new Gemini call)                 │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────┬──────────────────────────────────────────────────┘
                    │
┌───────────────────┼──────────────────────────────────────────────────┐
│               SUPABASE (Postgres + Storage)                          │
│                                                                       │
│  ┌───────────────────┐  ┌──────────────────────┐                     │
│  │ wardrobe_garments  │  │ wardrobe_outfits     │                     │
│  │ (~30 attrs/item)   │  │ (scored combos +     │                     │
│  │                    │  │  vibe reports)        │                     │
│  └───────────────────┘  └──────────────────────┘                     │
│                                                                       │
│  ┌───────────────────┐  ┌──────────────────────┐                     │
│  │ wardrobe_style_    │  │ wardrobe_chat_       │                     │
│  │ profile            │  │ sessions             │                     │
│  │ (→ personalization)│  │ (conversation state) │                     │
│  └───────────────────┘  └──────────────────────┘                     │
│                                                                       │
│  ┌───────────────────┐                                               │
│  │ Storage: wardrobe- │  WebP only, 512KB limit                      │
│  │ items bucket       │                                               │
│  └───────────────────┘                                               │
│                                                                       │
│  Existing tables (updated):                                          │
│  ┌───────────────────┐  ┌──────────────────────┐                     │
│  │ profiles           │  │ ranking_weights      │                     │
│  │ (+wardrobe_synced) │  │ (+w_wardrobe column) │                     │
│  └───────────────────┘  └──────────────────────┘                     │
│                                                                       │
└───────────────────┬──────────────────────────────────────────────────┘
                    │
┌───────────────────┼──────────────────────────────────────────────────┐
│              GOOGLE GEMINI FLASH                                      │
│                                                                       │
│  Batched garment analysis (multi-image, 1 call per sync)             │
│  AI Concierge prompt parsing (1 call per free-text query)            │
│  AI Try-on generation (existing FitIt pipeline, credit-based)        │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Layer 1: Garment Intelligence

### 3.1 Client-Side Image Pipeline

Before any image reaches the server, the client processes it:

```
User selects photo(s) from gallery
  → @imgly/background-removal (WASM, MIT license)
      Model: ~30MB, lazy-loaded on first Closet visit, cached in browser
      Processing: sequential, ~3s per image
      Output: garment cutout with transparent background (PNG)
  → Canvas API resize to 1024px max dimension
  → canvas.toBlob('image/webp', 0.85)
      Output: ~150-250KB WebP per garment
  → Upload to Supabase Storage (wardrobe-items bucket)
```

**Why client-side:**
- 95% size reduction (3-5MB → 150-250KB)
- Zero server processing cost
- Clean cutouts improve Gemini analysis accuracy
- Professional-looking outfit cards (no messy backgrounds)

**WASM model management:**
- First load: "Setting up your closet scanner..." progress indicator
- Subsequent loads: instant (cached)
- Memory: ~200MB during processing, released after
- Sequential processing prevents browser memory pressure

### 3.2 Gemini Batched Analysis

When user taps "Sync Pairs", all `is_analyzed = false` garments are sent to Gemini in a single multi-image call.

**Prompt structure:**

```
You are a professional fashion analyst. Analyze each garment image and extract structured attributes.

For EACH image, return a JSON object with exactly these fields:
{
  "garment_type": "<one of: t-shirt, shirt, blouse, crop-top, tank-top, tunic, camisole, jeans, trousers, skirt, shorts, palazzos, leggings, dress, jumpsuit, saree, co-ord-set, romper, jacket, cardigan, shrug, blazer, hoodie, coat, heels, sneakers, flats, boots, sandals, slides, bag, watch, jewelry, glasses, scarf, belt, hair-accessory>",
  "garment_category": "<upperwear | lowerwear | fullbody | footwear | accessory>",
  "primary_color_hex": "<hex code of dominant color>",
  "secondary_color_hex": "<hex code of secondary color, or null>",
  "color_family": "<red | blue | green | yellow | orange | purple | pink | black | white | grey | brown | navy | teal | beige | maroon | olive | coral | lavender | burgundy | cream>",
  "color_temperature": "<warm | cool | neutral>",
  "color_intensity": "<pastel | muted | vibrant | neon | earth>",
  "fit": "<fitted | regular | relaxed | oversized>",
  "length": "<crop | regular | long | ankle | floor>",
  "waist_position": "<high | mid | low | null>",
  "volume": "<low | medium | high>",
  "fabric": "<cotton | silk | linen | denim | wool | polyester | chiffon | satin | velvet | knit | leather | mesh | nylon | rayon | georgette | crepe>",
  "texture": "<matte | glossy | rough | smooth | knit | velvet | satin>",
  "weight": "<lightweight | midweight | heavyweight>",
  "stretch": <true | false>,
  "opacity": "<opaque | semi-sheer | sheer>",
  "pattern": "<solid | stripes | floral | checks | abstract | geometric | graphic | animal | paisley | polka-dot | camo | tie-dye>",
  "pattern_scale": "<small | medium | large | null>",
  "neckline": "<v-neck | round | square | collar | off-shoulder | halter | mandarin | boat | sweetheart | cowl | null>",
  "sleeve_length": "<sleeveless | cap | short | three-quarter | full | null>",
  "embellishment": "<plain | embroidered | sequin | lace | mirror-work | beaded | printed | applique>",
  "hardware": <true | false>,
  "formality": <0.0 to 1.0>,
  "occasion_tags": ["<from: casual, office, party, date, wedding, festive, brunch, college, concert, gym, beach, travel, mall, religious, funeral>"],
  "aesthetic_tags": ["<from: minimal, coquette, streetwear, y2k, cottagecore, old-money, indie, boho, grunge, preppy, athleisure, ethnic-traditional, indo-western, korean, maximalist, goth, soft-girl, dark-academia>"],
  "season_tags": ["<from: summer, winter, monsoon, spring, autumn, all-season>"],
  "perceived_quality": <0.0 to 1.0>
}

Return a JSON array with one object per image, in the same order as the images provided.
Analyze based on visual evidence only - do not guess brand or exact fabric if not visible.
```

**Model selection: Gemini 2.0 Flash**
- Multi-image input support: ✅
- Structured JSON output: ✅
- Cost: ~$0.10/1M input tokens, ~$0.40/1M output tokens
- For 10 garment images: ~2000 input tokens (images) + ~500 prompt tokens + ~3000 output tokens
- **Estimated cost: $0.008-0.012 per sync of 10 garments**
- Latency: 3-6 seconds for batch of 10

**Error handling:**
- If Gemini returns malformed JSON for a garment → mark it as `analysis_failed`, show user "Couldn't analyze this item — try re-uploading a clearer photo"
- If rate-limited → queue and retry with exponential backoff
- If >20 garments in one sync → split into batches of 15 images per call (Gemini input limit)

### 3.3 Extraction Schema

See PRD §Garment Extraction Schema for the complete 30-field schema. Key design notes:

**Hex colors enable mathematical color theory:**
- Convert hex → HSL → extract hue (0-360°)
- Complementary: opposite on color wheel (180°)
- Analogous: neighbors (±30°)
- Triadic: three equidistant points (120° apart)
- This is dramatically more accurate than comparing string labels ("navy" vs "blue" are different labels but similar hues)

**Float formality (0-1) enables nuanced pairing:**
- 0.0 = loungewear (sweatpants, oversized tees)
- 0.2 = casual daily (jeans, basic tops)
- 0.4 = smart casual (chinos, button-downs)
- 0.6 = business casual (blazers, dress pants)
- 0.8 = formal (suits, cocktail dresses)
- 1.0 = black tie (gowns, tuxedos)
- Pairing rule: `|formality_A - formality_B| ≤ 0.5` (hard filter)

**Multi-select tags for flexible matching:**
- A garment can be tagged `occasion: [casual, date, brunch]` — it works for all three
- An outfit's occasion score = intersection of garment occasion tags
- This avoids the "this dress is ONLY for parties" trap

---

## 4. Layer 2: Outfit Pairing Engine

### 4.1 Combo Generation Strategy

Given garments G₁, G₂, ..., Gₙ categorized as:
- **U** = upperwear set
- **L** = lowerwear set
- **F** = fullbody set
- **Y** = layers set
- **S** = footwear set
- **A** = accessories set

**Core combos generated:**
```
Tier 1 (required): 
  For each u ∈ U, l ∈ L: generate (u, l) — upper + lower core
  For each f ∈ F: generate (f) — fullbody standalone

Tier 2 (if footwear available):
  For each Tier1_combo, s ∈ S: extend → (core, s)

Tier 3 (if accessories available):
  For each Tier2_combo, a ∈ A: extend → (core, s, a)
  Note: limit to 1-2 accessories per outfit to avoid over-accessorizing

Layer enhancement (if layers available):
  For each Tier1_combo, y ∈ Y where season_compatible(combo, y):
    Generate layered variant → (u, l, y) or (f, y)
```

**Complexity analysis for a typical wardrobe:**
```
15 tops × 10 bottoms = 150 Tier 1 core combos
+ 5 fullbody = 155 cores
× 4 shoes = 620 Tier 2 combos
+ 3 layers add ~200 layered variants

Total raw combos: ~820
After Phase 1 filtering (~50% pass): ~410
After Phase 2 scoring + top-N selection: display top 30-50
```

All generated within ~500ms on a modern server (pure arithmetic, no I/O per combo).

### 4.2 Phase 1: Compatibility Filter

Hard rules that eliminate impossible combinations. Each rule returns `PASS` or `REJECT`.

```javascript
const WEIGHT_MAP = { lightweight: 1, midweight: 2, heavyweight: 3 };

function isCompatible(garments) {
  // RULE 1: Category validity
  const categories = garments.map(g => g.garment_category);
  const hasUpper = categories.includes('upperwear');
  const hasLower = categories.includes('lowerwear');
  const hasFullbody = categories.includes('fullbody');
  
  if (!hasFullbody && !(hasUpper && hasLower)) return false;
  if (hasFullbody && (hasUpper || hasLower)) return false; // fullbody is standalone
  
  // Allow max 1 of: footwear, layer, accessory
  const footwearCount = categories.filter(c => c === 'footwear').length;
  const accessoryCount = categories.filter(c => c === 'accessory').length;
  if (footwearCount > 1 || accessoryCount > 2) return false;

  // RULE 2: Fabric weight extremes (between core garments only)
  const coreGarments = garments.filter(g => 
    ['upperwear', 'lowerwear', 'fullbody'].includes(g.garment_category)
  );
  for (let i = 0; i < coreGarments.length; i++) {
    for (let j = i + 1; j < coreGarments.length; j++) {
      const wA = WEIGHT_MAP[coreGarments[i].weight] || 2;
      const wB = WEIGHT_MAP[coreGarments[j].weight] || 2;
      if (Math.abs(wA - wB) > 1) return false;
    }
  }

  // RULE 3: Opacity conflict
  const sheerCount = coreGarments.filter(g => 
    g.opacity === 'sheer' || g.opacity === 'semi-sheer'
  ).length;
  const opaqueCount = coreGarments.filter(g => g.opacity === 'opaque').length;
  if (sheerCount >= 2 && opaqueCount === 0) return false;

  // RULE 4: Competing large-scale patterns
  const largePrints = coreGarments.filter(g => 
    g.pattern !== 'solid' && g.pattern_scale === 'large'
  );
  if (largePrints.length >= 2) return false;

  // RULE 5: Formality extreme mismatch
  const formalities = coreGarments.map(g => g.formality);
  const maxF = Math.max(...formalities);
  const minF = Math.min(...formalities);
  if (maxF - minF > 0.5) return false;

  // RULE 6: Season incompatibility
  const seasonSets = coreGarments.map(g => new Set(g.season_tags));
  for (let i = 0; i < seasonSets.length; i++) {
    for (let j = i + 1; j < seasonSets.length; j++) {
      const overlap = [...seasonSets[i]].filter(s => seasonSets[j].has(s));
      if (overlap.length === 0) {
        const isSummerWinterClash = 
          (seasonSets[i].has('summer') && seasonSets[j].has('winter')) ||
          (seasonSets[i].has('winter') && seasonSets[j].has('summer'));
        if (isSummerWinterClash) return false;
      }
    }
  }

  return true;
}
```

### 4.3 Phase 2: Harmony Scorer

For each combo that passes Phase 1, compute a harmony score 0-100.

```javascript
function harmonyScore(garments, userProfile) {
  // Extract core pair (upper+lower or fullbody)
  const core = garments.filter(g => 
    ['upperwear', 'lowerwear', 'fullbody'].includes(g.garment_category)
  );
  const shoes = garments.find(g => g.garment_category === 'footwear');
  const accessories = garments.filter(g => g.garment_category === 'accessory');
  
  // Sub-scores (each 0-1)
  const color   = colorHarmony(core, shoes);
  const silh    = silhouetteBalance(core);
  const occ     = occasionFit(core);
  const aesth   = aestheticAlignment(core);
  const fabric  = fabricCompatibility(core);
  const trend   = trendFactor(core, userProfile);
  const pract   = practicality(core);

  // Weighted sum → 0-100
  return (
      25 * color
    + 20 * silh
    + 15 * occ
    + 15 * aesth
    + 10 * fabric
    + 10 * trend
    +  5 * pract
  );
}
```

#### 4.3.1 Color Harmony (weight: 25%)

The most impactful visual dimension. Uses hex-to-HSL conversion for mathematical precision.

```javascript
function hexToHSL(hex) {
  // Standard hex → RGB → HSL conversion
  // Returns { h: 0-360, s: 0-100, l: 0-100 }
}

const NEUTRALS = new Set(['black', 'white', 'grey', 'beige', 'cream']);

function colorHarmony(garments, shoes) {
  // Compare all pairs of garments
  let totalScore = 0;
  let pairs = 0;
  
  const allItems = shoes ? [...garments, shoes] : garments;
  
  for (let i = 0; i < allItems.length; i++) {
    for (let j = i + 1; j < allItems.length; j++) {
      const A = allItems[i];
      const B = allItems[j];
      
      const isNeutralA = NEUTRALS.has(A.color_family);
      const isNeutralB = NEUTRALS.has(B.color_family);
      
      let pairScore;
      
      if (isNeutralA && isNeutralB) {
        // Both neutrals — always safe
        pairScore = 0.90;
      } else if (isNeutralA || isNeutralB) {
        // One neutral + one statement — neutral grounds the outfit
        pairScore = 0.85;
      } else {
        // Both chromatic — use color wheel
        const hslA = hexToHSL(A.primary_color_hex);
        const hslB = hexToHSL(B.primary_color_hex);
        const hueDiff = Math.abs(hslA.h - hslB.h);
        const normalizedDiff = hueDiff > 180 ? 360 - hueDiff : hueDiff;
        
        if (normalizedDiff <= 30) {
          pairScore = 0.92;  // Monochromatic / very analogous
        } else if (normalizedDiff <= 60) {
          pairScore = 0.88;  // Analogous
        } else if (normalizedDiff >= 150 && normalizedDiff <= 210) {
          pairScore = 0.95;  // Complementary (bold, intentional)
        } else if (normalizedDiff >= 100 && normalizedDiff <= 140) {
          pairScore = 0.75;  // Triadic (playful)
        } else {
          // Clash zone (60-100 or 140-150)
          pairScore = 0.30 + (normalizedDiff > 100 ? 0.15 : 0);
        }
      }
      
      // Temperature bonus
      if (A.color_temperature === B.color_temperature) {
        pairScore = Math.min(1.0, pairScore + 0.05);
      }
      
      // Vibrant overload penalty
      if (A.color_intensity === 'vibrant' && B.color_intensity === 'vibrant') {
        pairScore = Math.max(0, pairScore - 0.10);
      }
      if (A.color_intensity === 'neon' && B.color_intensity === 'neon') {
        pairScore = Math.max(0, pairScore - 0.15);
      }
      
      totalScore += pairScore;
      pairs++;
    }
  }
  
  return pairs > 0 ? totalScore / pairs : 0.5;
}
```

#### 4.3.2 Silhouette Balance (weight: 20%)

```javascript
const FIT_SCORES = {
  // [top_fit][bottom_fit] → score
  'fitted_relaxed': 0.95,   'fitted_regular': 0.85,
  'fitted_fitted': 0.70,    'fitted_oversized': 0.90,
  'regular_regular': 0.75,  'regular_relaxed': 0.80,
  'regular_fitted': 0.80,   'regular_oversized': 0.65,
  'relaxed_fitted': 0.95,   'relaxed_regular': 0.80,
  'relaxed_relaxed': 0.55,  'relaxed_oversized': 0.40,
  'oversized_fitted': 0.90, 'oversized_regular': 0.75,
  'oversized_relaxed': 0.45,'oversized_oversized': 0.35,
};

const LENGTH_BONUSES = {
  'crop_high': 0.15,    // Crop top + high-waist → waist definition
  'regular_high': 0.10, // Regular top + high-waist → clean proportion
  'crop_mid': 0.05,
};

function silhouetteBalance(garments) {
  if (garments.length === 1) {
    // Fullbody — score based on fit alone
    const g = garments[0];
    return g.fit === 'fitted' ? 0.85 : g.fit === 'regular' ? 0.80 : 0.65;
  }
  
  const top = garments.find(g => g.garment_category === 'upperwear');
  const bottom = garments.find(g => g.garment_category === 'lowerwear');
  
  if (!top || !bottom) return 0.5;
  
  const fitKey = `${top.fit}_${bottom.fit}`;
  let score = FIT_SCORES[fitKey] ?? 0.60;
  
  // Length bonus (crop top + high-waist bottom = chef's kiss)
  const lengthKey = `${top.length}_${bottom.waist_position}`;
  score += LENGTH_BONUSES[lengthKey] ?? 0;
  
  // Volume contrast bonus
  const volumes = { low: 1, medium: 2, high: 3 };
  const vDiff = Math.abs((volumes[top.volume] || 2) - (volumes[bottom.volume] || 2));
  if (vDiff >= 2) score += 0.05; // Strong contrast
  if (vDiff === 0 && top.volume === 'high') score -= 0.10; // Both voluminous = overwhelming
  
  return Math.min(1.0, Math.max(0, score));
}
```

#### 4.3.3 Occasion Fit (weight: 15%)

```javascript
function occasionFit(garments) {
  // Compute intersection of occasion tags
  let commonOccasions;
  for (const g of garments) {
    const tags = new Set(g.occasion_tags || []);
    if (!commonOccasions) {
      commonOccasions = tags;
    } else {
      commonOccasions = new Set([...commonOccasions].filter(t => tags.has(t)));
    }
  }
  
  const overlapCount = commonOccasions ? commonOccasions.size : 0;
  const maxTags = Math.max(...garments.map(g => (g.occasion_tags || []).length), 1);
  const tagScore = overlapCount / maxTags;
  
  // Formality coherence
  const formalities = garments.map(g => g.formality);
  const formalityRange = Math.max(...formalities) - Math.min(...formalities);
  const formalityScore = 1.0 - (formalityRange * 2); // 0 range = 1.0, 0.5 range = 0.0
  
  return 0.6 * tagScore + 0.4 * Math.max(0, formalityScore);
}
```

#### 4.3.4 Aesthetic Alignment (weight: 15%)

```javascript
// Compatible aesthetic pairs (score when no direct overlap)
const AESTHETIC_COMPAT = {
  'minimal_coquette': 0.60,
  'streetwear_y2k': 0.65,
  'boho_cottagecore': 0.70,
  'old-money_preppy': 0.75,
  'minimal_old-money': 0.70,
  'indie_grunge': 0.65,
  'athleisure_streetwear': 0.70,
  'korean_minimal': 0.65,
  'ethnic-traditional_indo-western': 0.60,
  // ... more pairs
};

function aestheticAlignment(garments) {
  // Collect all aesthetic tags
  const allTags = garments.flatMap(g => g.aesthetic_tags || []);
  const uniqueTags = [...new Set(allTags)];
  
  // Count overlap (same aesthetic appears in multiple garments)
  const overlapCount = allTags.length - uniqueTags.length;
  
  if (overlapCount >= 1) {
    return Math.min(1.0, 0.85 + (overlapCount * 0.05));
  }
  
  // No direct overlap — check compatibility pairs
  const garmentTags = garments.map(g => g.aesthetic_tags || []);
  if (garmentTags.length >= 2) {
    for (const tagA of garmentTags[0]) {
      for (const tagB of garmentTags[1] || []) {
        const key1 = `${tagA}_${tagB}`;
        const key2 = `${tagB}_${tagA}`;
        const compat = AESTHETIC_COMPAT[key1] || AESTHETIC_COMPAT[key2];
        if (compat) return compat;
      }
    }
  }
  
  // No overlap and no known compatibility
  return 0.35;
}
```

#### 4.3.5 Fabric Compatibility (weight: 10%)

```javascript
const TEXTURE_COMPAT = {
  'matte_glossy': 0.85,     // Nice contrast
  'matte_matte': 0.70,      // Safe but flat
  'rough_smooth': 0.85,     // Intentional contrast
  'smooth_smooth': 0.75,
  'knit_smooth': 0.80,
  'velvet_smooth': 0.85,
  'satin_matte': 0.90,      // Luxe contrast
  // symmetric: also check reverse
};

function fabricCompatibility(garments) {
  let score = 0.5;
  
  if (garments.length < 2) return 0.7;
  
  const A = garments[0];
  const B = garments[1];
  
  // Texture contrast/complement
  const tKey1 = `${A.texture}_${B.texture}`;
  const tKey2 = `${B.texture}_${A.texture}`;
  score = TEXTURE_COMPAT[tKey1] || TEXTURE_COMPAT[tKey2] || 0.60;
  
  // Weight compatibility (already filtered by Phase 1, so this is fine-tuning)
  const WEIGHT_VAL = { lightweight: 1, midweight: 2, heavyweight: 3 };
  const wDiff = Math.abs((WEIGHT_VAL[A.weight] || 2) - (WEIGHT_VAL[B.weight] || 2));
  if (wDiff === 0) score = Math.min(1.0, score + 0.05);
  if (wDiff === 1) score = Math.min(1.0, score + 0.02);
  
  // Stretch contrast (structured + stretch = dynamic)
  if (A.stretch !== B.stretch) score = Math.min(1.0, score + 0.05);
  
  return score;
}
```

#### 4.3.6 Trend Factor (weight: 10%)

```javascript
// These rotate seasonally — update quarterly
const CURRENT_TRENDS = new Set([
  'quiet-luxury', 'old-money', 'coquette', 'mob-wife',
  'coastal-grandmother', 'clean-girl', 'tomato-girl'
]);

function trendFactor(garments, userProfile) {
  const outfitAesthetics = garments.flatMap(g => g.aesthetic_tags || []);
  const hasTrend = outfitAesthetics.some(a => CURRENT_TRENDS.has(a));
  const allBasic = outfitAesthetics.every(a => 
    ['minimal', 'casual'].includes(a) || !a
  );
  
  if (hasTrend) {
    // Check if trend matches user's style DNA
    const userStyles = userProfile?.styles || [];
    const matchesUser = outfitAesthetics.some(a => userStyles.includes(a));
    return matchesUser ? 0.95 : 0.65;
  }
  
  if (allBasic) return 0.50; // Reliable but not exciting
  
  return 0.60; // Neutral
}
```

#### 4.3.7 Practicality (weight: 5%)

```javascript
function practicality(garments) {
  let score = 0.5;
  
  // Season coherence (do they all work in the same season?)
  const seasonSets = garments.map(g => new Set(g.season_tags || ['all-season']));
  let commonSeasons = seasonSets[0];
  for (let i = 1; i < seasonSets.length; i++) {
    commonSeasons = new Set([...commonSeasons].filter(s => seasonSets[i].has(s)));
  }
  score += commonSeasons.size > 0 ? 0.20 : 0;
  
  // Is all-season? (maximum versatility)
  if (commonSeasons.has('all-season')) score += 0.10;
  
  // Comfort indicators
  const allStretch = garments.every(g => g.stretch);
  if (allStretch) score += 0.10;
  
  const hasBreathable = garments.some(g => 
    ['cotton', 'linen', 'rayon'].includes(g.fabric)
  );
  if (hasBreathable) score += 0.05;
  
  // Perceived quality average
  const avgQuality = garments.reduce((sum, g) => sum + (g.perceived_quality || 0.5), 0) / garments.length;
  score += avgQuality * 0.05;
  
  return Math.min(1.0, score);
}
```

### 4.4 Diversity Penalty

After scoring all outfits, sort by `harmony_score` descending. Then apply diversity penalty:

```javascript
function applyDiversityPenalty(outfits) {
  const garmentAppearances = {}; // garment_id → count of appearances in higher-ranked outfits
  
  return outfits.map(outfit => {
    // Calculate penalty
    let penalty = 0;
    for (const gId of outfit.garment_ids) {
      const appearances = garmentAppearances[gId] || 0;
      penalty += appearances * 0.05; // -5% per repeat
    }
    
    // Record appearances
    for (const gId of outfit.garment_ids) {
      garmentAppearances[gId] = (garmentAppearances[gId] || 0) + 1;
    }
    
    return {
      ...outfit,
      harmony_score: outfit.harmony_score * (1 - Math.min(penalty, 0.40)), // Cap at 40% max penalty
    };
  });
}
```

### 4.5 Personalization Re-Rank

Each outfit gets a composite tag profile (union of garment attributes), then scored against the user's personalization signals:

```javascript
function personalizeOutfits(outfits, userProfile, clickProfile, wardrobeProfile, activeWeights) {
  const hasWardrobe = wardrobeProfile && wardrobeProfile.total_garments >= 15;
  
  // Get data-maturity-aware weights
  const totalEvents = clickProfile ? 
    (clickProfile.total_views + clickProfile.total_try_ons + clickProfile.total_wishlists + 
     clickProfile.total_cart_adds + clickProfile.total_purchases) : 0;
  
  const weights = getOutfitWeights(totalEvents, hasWardrobe, activeWeights);
  
  return outfits.map(outfit => {
    const tags = outfit.composite_tags;
    
    const styleScore = styleDnaMatch(userProfile, tags);
    const wardrobeScore = hasWardrobe ? wardrobeAffinity(wardrobeProfile, tags) : 0;
    const clickScore = clickProfile ? userClickAffinity(clickProfile, tags) : 0;
    
    const personalizedScore = 
        weights.style    * styleScore * 100
      + weights.wardrobe * wardrobeScore * 100
      + weights.clicks   * clickScore * 100;
    
    const displayScore = 0.6 * outfit.harmony_score + 0.4 * personalizedScore;
    
    return { ...outfit, personalizedScore, displayScore };
  }).sort((a, b) => b.displayScore - a.displayScore);
}

function getOutfitWeights(totalEvents, hasWardrobe, activeWeights) {
  if (hasWardrobe && totalEvents >= 200) {
    return { style: 0.20, wardrobe: 0.25, clicks: 0.55 };
  }
  if (hasWardrobe && totalEvents >= 50) {
    return { style: 0.30, wardrobe: 0.25, clicks: 0.45 };
  }
  if (hasWardrobe) {
    return { style: 0.45, wardrobe: 0.30, clicks: 0.25 };
  }
  // No wardrobe — shouldn't happen on wardrobe page, but fallback
  return { style: 0.60, wardrobe: 0, clicks: 0.40 };
}
```

---

## 5. Layer 3: Vibe Reports

### 5.1 Vibe Title Resolution

```javascript
function resolveVibeTitle(outfit) {
  // Determine primary occasion from occasion overlap
  const allOccasions = outfit.garments.flatMap(g => g.occasion_tags);
  const primaryOccasion = mode(allOccasions) || 'casual';
  
  // Determine primary aesthetic
  const allAesthetics = outfit.garments.flatMap(g => g.aesthetic_tags);
  const primaryAesthetic = mode(allAesthetics) || 'minimal';
  
  // Determine formality bucket
  const avgFormality = outfit.garments.reduce((s, g) => s + g.formality, 0) / outfit.garments.length;
  const formalityBucket = avgFormality < 0.35 ? 'low' : avgFormality < 0.7 ? 'mid' : 'high';
  
  // Lookup in curated bank
  const key = `${primaryOccasion}_${primaryAesthetic}_${formalityBucket}`;
  const titles = VIBE_TITLES[key];
  
  if (titles && titles.length > 0) {
    // Pick pseudo-randomly based on outfit ID to ensure consistency
    const hash = simpleHash(outfit.id);
    return titles[hash % titles.length];
  }
  
  // Fallback: generate from components
  return `${capitalize(primaryAesthetic)} ${capitalize(primaryOccasion)} Energy`;
}
```

### 5.2 "Why This Works" Generation

```javascript
function generateWhyThisWorks(outfit, scores) {
  // Pick the top 2 scoring dimensions to talk about
  const dimensionScores = [
    { dim: 'color', score: scores.color_harmony, templates: WHY_TEMPLATES.color_harmony },
    { dim: 'silhouette', score: scores.silhouette_balance, templates: WHY_TEMPLATES.silhouette_balance },
    { dim: 'body', score: scores.body_proportion_match, templates: WHY_TEMPLATES.body_proportion },
    { dim: 'texture', score: scores.fabric_compatibility, templates: WHY_TEMPLATES.texture_contrast },
  ].sort((a, b) => b.score - a.score);
  
  const top2 = dimensionScores.slice(0, 2);
  
  // Fill template slots
  const sentences = top2.map(({ dim, templates }) => {
    const template = templates[simpleHash(outfit.id + dim) % templates.length];
    return fillSlots(template, outfit);
  });
  
  return sentences.join(' ');
}

function fillSlots(template, outfit) {
  const top = outfit.garments.find(g => g.garment_category === 'upperwear');
  const bottom = outfit.garments.find(g => g.garment_category === 'lowerwear');
  const primary = top || outfit.garments[0];
  const secondary = bottom || outfit.garments[1];
  
  return template
    .replace('{colorA}', primary?.color_family || 'dark')
    .replace('{colorB}', secondary?.color_family || 'light')
    .replace('{fitA}', primary?.fit || 'relaxed')
    .replace('{fitB}', secondary?.fit || 'fitted')
    .replace('{garmentA}', formatGarmentType(primary?.garment_type))
    .replace('{garmentB}', formatGarmentType(secondary?.garment_type))
    .replace('{textureA}', primary?.texture || 'smooth')
    .replace('{textureB}', secondary?.texture || 'matte')
    .replace('{fabricA}', primary?.fabric || 'cotton')
    .replace('{fabricB}', secondary?.fabric || 'linen')
    .replace('{lengthA}', primary?.length || 'regular')
    .replace('{lengthB}', secondary?.length || 'regular')
    .replace('{harmony_type}', detectHarmonyType(primary, secondary))
    .replace('{mood}', deriveMood(outfit))
    .replace('{body_type}', 'your') // Personalized if profile available
    .replace('{feature}', 'waist')  // From body proportion analysis
    .replace('{waist_effect}', detectWaistEffect(outfit));
}
```

### 5.3 Accessory Suggestions

```javascript
function suggestAccessories(outfit, userWardrobe) {
  const primaryAesthetic = mode(outfit.garments.flatMap(g => g.aesthetic_tags)) || 'minimal';
  const avgFormality = outfit.garments.reduce((s, g) => s + g.formality, 0) / outfit.garments.length;
  const formalityBucket = avgFormality < 0.35 ? 'low' : avgFormality < 0.7 ? 'mid' : 'high';
  
  // Check if user owns matching accessories
  const userAccessories = userWardrobe.filter(g => g.garment_category === 'accessory');
  const outfitColors = outfit.garments.map(g => g.color_family);
  
  const matchingOwned = userAccessories.filter(acc => {
    const colorMatch = outfitColors.includes(acc.color_family) || 
                       NEUTRALS.has(acc.color_family);
    const aestheticMatch = (acc.aesthetic_tags || []).some(a => 
      outfit.garments.some(g => (g.aesthetic_tags || []).includes(a))
    );
    return colorMatch || aestheticMatch;
  });
  
  if (matchingOwned.length >= 2) {
    // Use user's own accessories
    return matchingOwned.slice(0, 3).map(a => formatGarmentType(a.garment_type));
  }
  
  // Fallback to generic suggestions
  const key = `${primaryAesthetic}_${formalityBucket}`;
  return ACCESSORY_SUGGESTIONS[key] || ['Simple jewelry', 'Clean sneakers', 'Minimal bag'];
}
```

---

## 6. Gap Analysis Engine

### 6.1 Gap Detection (runs on sync, stored in wardrobe_style_profile)

```javascript
const GAP_DETECTORS = [
  {
    type: 'occasion',
    detect: (garments) => {
      const allOccasions = new Set(garments.flatMap(g => g.occasion_tags));
      const missing = [];
      
      const CORE_OCCASIONS = ['casual', 'office', 'party', 'date', 'festive'];
      for (const occ of CORE_OCCASIONS) {
        if (!allOccasions.has(occ)) {
          const count = garments.filter(g => (g.occasion_tags || []).includes(occ)).length;
          if (count < 2) missing.push(occ);
        }
      }
      
      if (missing.length > 0) {
        return {
          gap_type: 'occasion',
          severity: missing.length / CORE_OCCASIONS.length, // 0-1
          missing_occasions: missing,
          headline: `No ${missing[0]} options`,
          description: `Your closet is missing looks for ${missing.join(', ')} occasions.`,
        };
      }
      return null;
    }
  },
  {
    type: 'aesthetic',
    detect: (garments, userProfile) => {
      // Compare user's Style DNA aesthetics vs wardrobe reality
      const userStyles = userProfile?.styles || [];
      const wardrobeAesthetics = garments.flatMap(g => g.aesthetic_tags || []);
      const wardrobeCounts = {};
      wardrobeAesthetics.forEach(a => { wardrobeCounts[a] = (wardrobeCounts[a] || 0) + 1; });
      
      for (const style of userStyles) {
        const count = wardrobeCounts[style] || 0;
        const total = garments.length;
        if (count / total < 0.15) { // Less than 15% of wardrobe matches desired style
          return {
            gap_type: 'aesthetic',
            severity: 1 - (count / total),
            desired_aesthetic: style,
            wardrobe_percentage: Math.round((count / total) * 100),
            headline: `Your vibe is evolving`,
            description: `Your Style DNA says ${style}, but only ${Math.round((count / total) * 100)}% of your closet matches.`,
          };
        }
      }
      return null;
    }
  },
  {
    type: 'season',
    detect: (garments) => {
      const seasonCounts = { summer: 0, winter: 0, monsoon: 0, 'all-season': 0 };
      garments.forEach(g => {
        (g.season_tags || []).forEach(s => { seasonCounts[s] = (seasonCounts[s] || 0) + 1; });
      });
      
      const total = garments.length;
      for (const [season, count] of Object.entries(seasonCounts)) {
        if (season !== 'all-season' && count / total < 0.10) {
          return {
            gap_type: 'season',
            severity: 1 - (count / total),
            missing_season: season,
            headline: `Not ${season}-ready`,
            description: `You have almost no ${season} pieces. One good ${season} set changes everything.`,
          };
        }
      }
      return null;
    }
  },
  {
    type: 'color_palette',
    detect: (garments) => {
      const colorCounts = {};
      garments.forEach(g => {
        colorCounts[g.color_family] = (colorCounts[g.color_family] || 0) + 1;
      });
      
      const total = garments.length;
      const dominantColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0];
      
      if (dominantColor && dominantColor[1] / total > 0.50) {
        return {
          gap_type: 'color_palette',
          severity: dominantColor[1] / total,
          dominant_color: dominantColor[0],
          percentage: Math.round((dominantColor[1] / total) * 100),
          headline: `Your palette is narrow`,
          description: `${Math.round((dominantColor[1] / total) * 100)}% of your closet is ${dominantColor[0]}. A pop of contrast would open up new combos.`,
        };
      }
      return null;
    }
  },
  {
    type: 'versatility',
    detect: (garments) => {
      const singleOccasionCount = garments.filter(g => 
        (g.occasion_tags || []).length <= 1
      ).length;
      
      if (singleOccasionCount / garments.length > 0.60) {
        return {
          gap_type: 'versatility',
          severity: singleOccasionCount / garments.length,
          headline: `Low outfit flexibility`,
          description: `Most of your pieces are single-occasion. Versatile sets multiply your daily rotation.`,
        };
      }
      return null;
    }
  }
];

function detectGaps(garments, userProfile) {
  return GAP_DETECTORS
    .map(detector => detector.detect(garments, userProfile))
    .filter(Boolean)
    .sort((a, b) => b.severity - a.severity);
}
```

### 6.2 Gap → Stiri Set Matching

```javascript
function matchStiriSetToGap(gap, stiriProducts, userProfile) {
  // Filter Stiri products that address the gap
  let candidates;
  
  switch (gap.gap_type) {
    case 'occasion':
      candidates = stiriProducts.filter(p => 
        gap.missing_occasions.some(occ => (p.occasion || []).includes(occ))
      );
      break;
    case 'aesthetic':
      candidates = stiriProducts.filter(p =>
        (p.style_tags || []).includes(gap.desired_aesthetic)
      );
      break;
    case 'season':
      candidates = stiriProducts.filter(p =>
        (p.season || []).includes(gap.missing_season)
      );
      break;
    case 'color_palette':
      candidates = stiriProducts.filter(p =>
        !(p.color_family || []).includes(gap.dominant_color)
      );
      break;
    case 'versatility':
      candidates = stiriProducts.filter(p =>
        p.versatility === 'multi-occasion' || p.versatility === 'everyday'
      );
      break;
    default:
      candidates = stiriProducts;
  }
  
  // Rank by personalization match
  return rankProducts({
    userProfile,
    products: candidates,
    // ... existing ranking params
  }).slice(0, 3); // Top 3 Stiri sets for this gap
}
```

---

## 7. AI Concierge Pipeline

### 7.1 Prompt → Structured Filters (Gemini)

```javascript
const CONCIERGE_SYSTEM_PROMPT = `
You are a fashion concierge for Stiri. The user will describe an outfit need.
Extract structured filters from their request. Return ONLY valid JSON:

{
  "occasion": "<from: casual, office, party, date, wedding, festive, brunch, college, concert, gym, beach, travel, mall, religious>",
  "formality_min": <0.0-1.0>,
  "formality_max": <0.0-1.0>,
  "aesthetics": ["<from: minimal, coquette, streetwear, y2k, cottagecore, old-money, indie, boho, grunge, preppy, athleisure, ethnic-traditional, indo-western, korean, maximalist>"],
  "mood": "<from: bold, subtle, edgy, romantic, playful, serious, confident, relaxed, mysterious, cheerful>",
  "color_preference": "<color or null>",
  "season": "<from: summer, winter, monsoon, all-season or null>",
  "keywords": ["<any other important words from the query>"]
}

If a field is not mentioned or unclear, set it to null.
For formality, infer from context: college fest = 0.3-0.5, wedding = 0.7-1.0, date = 0.4-0.7, etc.
`;
```

### 7.2 Filter → Outfit Selection (No AI)

```javascript
function filterOutfitsByQuery(allOutfits, filters) {
  return allOutfits
    .filter(outfit => {
      const tags = outfit.composite_tags;
      
      // Occasion filter
      if (filters.occasion) {
        const outfitOccasions = tags.occasion_tags || [];
        if (!outfitOccasions.includes(filters.occasion)) return false;
      }
      
      // Formality range
      if (filters.formality_min != null || filters.formality_max != null) {
        const avgFormality = outfit.garments.reduce((s, g) => s + g.formality, 0) / outfit.garments.length;
        if (filters.formality_min != null && avgFormality < filters.formality_min) return false;
        if (filters.formality_max != null && avgFormality > filters.formality_max) return false;
      }
      
      // Aesthetic filter
      if (filters.aesthetics && filters.aesthetics.length > 0) {
        const outfitAesthetics = tags.aesthetic_tags || [];
        const hasMatch = filters.aesthetics.some(a => outfitAesthetics.includes(a));
        if (!hasMatch) return false;
      }
      
      // Color preference
      if (filters.color_preference) {
        const outfitColors = tags.color_families || [];
        if (!outfitColors.includes(filters.color_preference)) return false;
      }
      
      // Season
      if (filters.season) {
        const outfitSeasons = tags.season_tags || [];
        if (!outfitSeasons.includes(filters.season) && !outfitSeasons.includes('all-season')) return false;
      }
      
      return true;
    })
    .sort((a, b) => b.display_score - a.display_score)
    .slice(0, 3); // Top 3
}
```

### 7.3 Refinement Button Generation

```javascript
function generateRefinementButtons(currentFilters, results) {
  const buttons = [];
  
  // Formality adjustments
  if (currentFilters.formality_max > 0.3) {
    buttons.push({
      label: 'More Casual',
      icon: '👟',
      action: { formality_min: Math.max(0, (currentFilters.formality_min || 0) - 0.2),
                formality_max: Math.max(0.2, (currentFilters.formality_max || 0.5) - 0.2) }
    });
  }
  if (currentFilters.formality_min < 0.8) {
    buttons.push({
      label: 'Dress It Up',
      icon: '✨',
      action: { formality_min: Math.min(1.0, (currentFilters.formality_min || 0.3) + 0.2),
                formality_max: Math.min(1.0, (currentFilters.formality_max || 0.6) + 0.2) }
    });
  }
  
  // Aesthetic shifts
  const AESTHETIC_SHIFTS = [
    { label: 'Bolder Vibe', icon: '🔥', add: 'streetwear' },
    { label: 'Softer Touch', icon: '🌸', add: 'coquette' },
    { label: 'Keep It Clean', icon: '🤍', add: 'minimal' },
    { label: 'Desi Charm', icon: '🪷', add: 'ethnic-traditional' },
  ];
  
  for (const shift of AESTHETIC_SHIFTS) {
    const currentAesthetics = currentFilters.aesthetics || [];
    if (!currentAesthetics.includes(shift.add)) {
      buttons.push({
        label: shift.label,
        icon: shift.icon,
        action: { aesthetics: [...currentAesthetics, shift.add] }
      });
    }
  }
  
  // Footwear swap
  if (results.length > 0 && results[0].garments.some(g => g.garment_category === 'footwear')) {
    buttons.push({
      label: 'Swap Shoes',
      icon: '👠',
      action: { exclude_footwear: results[0].garments.find(g => g.garment_category === 'footwear')?.id }
    });
  }
  
  // Color shift
  buttons.push({
    label: 'Different Colors',
    icon: '🎨',
    action: { exclude_colors: results.map(r => r.composite_tags.primary_colors?.[0]).filter(Boolean) }
  });
  
  return buttons.slice(0, 5); // Max 5 buttons
}
```

### 7.4 Stiri Set Recommendation in Chat

```javascript
function getStiriRecommendation(query, bestOutfitScore, filters, stiriProducts, userProfile) {
  const result = { hardPush: null, softCompanion: null };
  
  // Hard push: only when wardrobe genuinely can't fulfill
  if (bestOutfitScore < 60) {
    const matchingProducts = stiriProducts.filter(p => {
      if (filters.occasion && !(p.occasion || []).includes(filters.occasion)) return false;
      if (filters.aesthetics) {
        const hasMatch = filters.aesthetics.some(a => (p.style_tags || []).includes(a));
        if (!hasMatch) return false;
      }
      return true;
    });
    
    // Rank by personalization
    const ranked = rankProducts({ userProfile, products: matchingProducts, /* ... */ });
    if (ranked.length > 0) {
      result.hardPush = {
        product: ranked[0],
        trigger: detectTriggerType(filters, userProfile, ranked[0]),
        matchPercentage: computeQueryMatch(filters, ranked[0]),
      };
    }
  }
  
  // Soft companion: always present
  const complementaryProducts = stiriProducts.filter(p => {
    // Products that complement the user's wardrobe (not duplicate what they own)
    return true; // filtering logic based on wardrobe gaps
  });
  
  const softRanked = rankProducts({ userProfile, products: complementaryProducts, /* ... */ });
  if (softRanked.length > 0) {
    result.softCompanion = {
      product: softRanked[0],
      hook: generateWardrobeMultiplierHook(softRanked[0], userProfile),
    };
  }
  
  return result;
}
```

---

## 8. Wardrobe → Personalization Integration

### 8.1 Wardrobe Style Profile Computation

After sync, aggregate all garment attributes into a style profile that feeds the personalization engine:

```javascript
function computeWardrobeStyleProfile(garments) {
  const affinities = {};
  const total = garments.length;
  
  // Aggregate each dimension
  const DIMENSIONS = [
    'color_family', 'fit', 'fabric', 'pattern', 'texture',
    'garment_type', 'garment_category', 'color_intensity',
    'weight', 'opacity', 'embellishment'
  ];
  
  const ARRAY_DIMENSIONS = [
    'occasion_tags', 'aesthetic_tags', 'season_tags'
  ];
  
  for (const dim of DIMENSIONS) {
    affinities[dim] = {};
    garments.forEach(g => {
      const val = g[dim];
      if (val) {
        affinities[dim][val] = (affinities[dim][val] || 0) + (1 / total);
      }
    });
  }
  
  for (const dim of ARRAY_DIMENSIONS) {
    affinities[dim] = {};
    garments.forEach(g => {
      (g[dim] || []).forEach(val => {
        affinities[dim][val] = (affinities[dim][val] || 0) + (1 / total);
      });
    });
  }
  
  // Category counts
  const categoryCounts = {};
  garments.forEach(g => {
    categoryCounts[g.garment_category] = (categoryCounts[g.garment_category] || 0) + 1;
  });
  
  return {
    tag_affinities: affinities,
    total_garments: total,
    category_counts: categoryCounts,
  };
}
```

### 8.2 Updated Ranking Formula

The existing `rankProducts()` in `ranking.js` gains a 4th signal:

```javascript
// Updated DATA_MATURITY_THRESHOLDS
const DATA_MATURITY_THRESHOLDS_WITH_WARDROBE = [
  { maxEvents: 5,   style: 0.45, wardrobe: 0.30, user: 0.10, pop: 0.15 },
  { maxEvents: 20,  style: 0.35, wardrobe: 0.30, user: 0.15, pop: 0.20 },
  { maxEvents: 50,  style: 0.30, wardrobe: 0.25, user: 0.25, pop: 0.20 },
  // Above 50: use self-tuned weights from ranking_weights table
];

// wardrobeAffinity — matches product tags against wardrobe composition
function wardrobeAffinity(wardrobeProfile, productTags) {
  const affinities = wardrobeProfile.tag_affinities;
  let totalScore = 0;
  let matchedDims = 0;
  
  for (const [dimension, userAffinityMap] of Object.entries(affinities)) {
    const productValue = productTags[dimension];
    if (!productValue) continue;
    
    const values = Array.isArray(productValue) ? productValue : [productValue];
    let bestMatch = null;
    for (const v of values) {
      const val = userAffinityMap[v];
      if (val !== undefined) {
        bestMatch = bestMatch === null ? val : Math.max(bestMatch, val);
      }
    }
    
    if (bestMatch !== null) {
      totalScore += bestMatch;
      matchedDims++;
    }
  }
  
  return matchedDims > 0 ? totalScore / matchedDims : 0;
}
```

### 8.3 Schema Changes to Existing Tables

```sql
-- Add w_wardrobe column to ranking_weights
ALTER TABLE ranking_weights ADD COLUMN IF NOT EXISTS w_wardrobe decimal(4,3) DEFAULT 0;

-- Update seed row
UPDATE ranking_weights SET w_wardrobe = 0 WHERE is_active = true;
-- (stays 0 until user has wardrobe — weights are dynamically overridden per-user)
```

---

## 9. API Contracts

### POST /api/wardrobe/garments/upload
Upload a processed garment image.

**Request**: `multipart/form-data` with `image` (WebP file, max 512KB)
**Response**: `{ garment_id, image_url, is_analyzed: false }`

### DELETE /api/wardrobe/garments/:id
Remove a garment. Sets `is_stale = true` on all outfits containing it.

**Response**: `{ deleted: true }`

### GET /api/wardrobe/garments
List all user's garments grouped by category.

**Response**: `{ garments: [...], counts: { upperwear: 8, lowerwear: 5, ... }, total: 25 }`

### POST /api/wardrobe/sync
Full sync pipeline: analyze → purge → pair → rank → cache.

**Request**: `{}` (no body needed)
**Response** (SSE stream):
```
event: analyzing
data: { total: 5, completed: 0 }

event: analyzing
data: { total: 5, completed: 3 }

event: pairing
data: { total_combos: 150, valid_combos: 82 }

event: ranking
data: { total_outfits: 82 }

event: complete
data: { outfits_count: 82, gaps_found: 2 }
```

### GET /api/wardrobe/outfits?page=1&limit=20
Paginated ranked outfits with vibe reports + inline gap cards.

**Response**:
```json
{
  "outfits": [
    {
      "id": "uuid",
      "garments": [{ "id": "uuid", "image_url": "...", "garment_type": "crop_top", "color_family": "ivory", ... }],
      "harmony_score": 87.5,
      "display_score": 82.3,
      "vibe": {
        "title": "Sunday Brunch Energy",
        "why": "The cropped ivory knit against high-waist denim...",
        "occasions": ["Brunch", "Mall Day", "Instagram"],
        "accessories": ["Gold hoops", "White sneakers", "Mini crossbody"],
        "match_pct": 92
      }
    }
  ],
  "gap_cards": [
    {
      "gap_type": "occasion",
      "position": 5,
      "headline": "No party options",
      "description": "...",
      "recommended_product": { ... }
    }
  ],
  "total": 82,
  "has_more": true
}
```

### POST /api/wardrobe/chat
AI Concierge message.

**Request**:
```json
{
  "session_id": "uuid or null (new session)",
  "message": "What should I wear to a college fest?",
  "refinement": null
}
```
Or for button refinement:
```json
{
  "session_id": "uuid",
  "message": null,
  "refinement": { "formality_min": 0.2, "formality_max": 0.4 }
}
```

**Response**:
```json
{
  "session_id": "uuid",
  "outfits": [{ ... }, { ... }, { ... }],
  "refinement_buttons": [
    { "label": "More Casual", "icon": "👟", "action": { ... } },
    { "label": "Bolder Vibe", "icon": "🔥", "action": { ... } }
  ],
  "stiri_recommendation": {
    "type": "hard_push",
    "trigger": "occasion_rescue",
    "product": { ... },
    "match_pct": 95,
    "headline": "Zero styling stress",
    "description": "..."
  },
  "soft_companion": {
    "product": { ... },
    "hook": "This set creates 6 new combos with pieces you already own"
  }
}
```

### GET /api/wardrobe/gaps
Standalone gap analysis.

**Response**:
```json
{
  "gaps": [
    { "gap_type": "occasion", "severity": 0.6, "headline": "...", "recommended_products": [...] }
  ],
  "wardrobe_summary": { "total": 25, "categories": { ... } }
}
```

---

## 10. Performance Budgets

| Operation | Target | Strategy |
|-----------|--------|----------|
| Garment upload (client processing) | <5s per image | Sequential bg-removal + WebP |
| Sync: Gemini analysis | <8s for 10 garments | Single batched call |
| Sync: Pairing + scoring | <2s for 150 combos | Pure computation, no I/O per combo |
| Sync: Total pipeline | <15s for 10 new garments | SSE progress stream |
| Outfits page load | <500ms | Cached outfits from DB, re-rank in <100ms |
| AI Concierge (free-text) | <3s | Gemini parse + algorithm filter |
| AI Concierge (button refinement) | <500ms | Local filter modification, no AI |
| Wardrobe style profile update | <200ms | Aggregation on sync, stored in DB |

---

## 11. Security Considerations

- All wardrobe endpoints require authentication (`getUserFromRequest`)
- RLS on all wardrobe tables (user can only access their own data)
- Image upload validation: WebP only, max 512KB, no executable content
- Gemini prompts are server-side only — user input never injected into system prompts
- AI Concierge: user message sanitized before Gemini call (no prompt injection)
- Storage bucket: private, signed URLs for image access
- Rate limiting: max 50 garment uploads per hour, max 5 syncs per hour, max 20 chat messages per hour
