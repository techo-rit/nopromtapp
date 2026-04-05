# PRD: Try-On Feature Redesign

## Problem

The current try-on experience has high friction and low conversion:
- Users must upload **both** a selfie and a garment photo, even when coming from a product page that already has the garment image
- The upload zone UI (drag-drop with dashed borders) is a desktop-centric pattern forced onto a mobile-first fashion app
- SmartSelfie face detection **blocks capture** until perfect alignment (900ms hold across 11 states) — a conversion killer
- 20-30 second generation wait shows only a spinner — users abandon
- Result screen is a dead-end (download + start over) with no path to purchase or share
- No selfie persistence — users retake photos for every try-on
- Trending carousel shows generic product images even for logged-in users who could see personalized try-ons

## Solution

Redesign the try-on into a streamlined, product-aware flow with selfie persistence, social sharing, and a personalized trending carousel powered by lazy background generation.

---

## User Stories

### Core Try-On Flow
- As a **shopper on a product page**, I want to tap "Try On" and only take a selfie, so that the garment is auto-filled from the product catalog
- As a **returning user with a saved profile photo**, I want my selfie pre-loaded when I try on a new garment, so I can generate in one tap
- As a **first-time user**, I want the camera to show alignment hints without blocking my capture, so I can take a photo quickly even in imperfect conditions

### Generation Experience
- As a **user waiting for generation**, I want to see the garment in a stylish animated showcase with staged progress text, so the 20-30 second wait feels intentional rather than broken

### Result Screen
- As a **user viewing my try-on result**, I want a "View Product" button that takes me to the product page, so I can purchase the item I just tried on
- As a **user who likes their try-on**, I want to share it on social media with a product link and Stiri watermark, so my friends can see and buy the same item
- As a **user**, I want to download my try-on image

### Profile Photo & Selfie Persistence
- As a **first-time try-on user**, I want to be asked "Save as profile photo?" after my first generation, so I don't have to retake photos in the future
- As a **user who declined**, I want to be told I can add a profile photo later in Profile for personalized features
- As a **user on the profile page**, I want to upload/change my profile photo

### Personalized Trending Carousel
- As a **logged-in user with a profile photo**, I want the trending carousel to show a 2×1 collage of the product and my personal try-on with that product
- As a **user scrolling the carousel**, I want try-ons to generate lazily (on viewport entry) with a shimmer placeholder, so I only wait for cards I actually see
- As a **user**, I want these auto-generated carousel try-ons to be free (no credit deduction)

### Free Remix Flow (unchanged)
- As a **user entering the changing room directly** (no product context), I want the existing two-upload-zone flow for custom selfie + garment combinations

---

## Implementation Decisions

### 1. Two distinct entry flows
**Decision**: Product Try-On (selfie only) vs. Free Remix (selfie + garment)
**Rationale**: When `?product=handle` is present, the garment image is fetched from Shopify catalog. No upload zone needed for the wearable. Free Remix retains the existing dual-upload pattern.

### 2. Face detection is guidance-only
**Decision**: SmartSelfie shows alignment overlay (face position, tilt, distance) as visual hints. Capture button is **always active**. Auto-capture still triggers on perfect alignment but manual capture is never blocked.
**Rationale**: Gemini handles slightly off-angle faces. Strict gating kills conversion for marginal quality improvement.

### 3. Animated product showcase during generation
**Decision**: While waiting for Gemini, show the garment image in a stylized animation (slow zoom into fabric detail, rotation) with staged progress text cycling through: "Analyzing your features" → "Tailoring the fit" → "Adding final touches"
**Rationale**: Gemini doesn't support streaming partial images, so real progress isn't available. Staged text with product animation creates perceived progress and keeps users engaged.

### 4. Result screen with View Product + Share
**Decision**: Result screen shows try-on image(s) + "View Product" button (navigates to `/product/:handle`) + "Share" button (native share sheet) + "Download" button.
**Rationale**: The product page is the single conversion point for Add to Bag / Buy Now. No need to duplicate purchase buttons on the result screen.

### 5. Share = product link + watermarked image
**Decision**: Share uses Web Share API where available (fallback: copy link). Shared content includes:
- **Image**: Try-on result with a subtle "Tried on with Stiri" watermark (bottom-right, semi-transparent)
- **Text**: Product name + link (`stiri.app/product/:handle`)
**Rationale**: Every share is organic brand exposure (watermark) + a referral link (product URL). Watermark applied client-side via Canvas API before sharing.

### 6. Profile photo persistence in Supabase Storage
**Decision**: Selfie stored at `profile-photos/{user_id}/selfie.jpg` in Supabase Storage. Profile page gets an "Update Photo" option. First try-on triggers a one-time prompt.
**Rationale**: Eliminates repeated selfie capture for returning users. Storage path is predictable (no table needed — just convention-based path).

**DB change**: Add `profile_photo_url` column to `profiles` table (text, nullable).

### 7. Lazy carousel try-on generation
**Decision**: When a profile-photo user scrolls the trending carousel, Intersection Observer triggers generation for cards entering viewport. Max 2 concurrent generations (FIFO queue). Results cached in `generated_images` table with `mode = 'carousel_tryon'`.
**Rationale**: Eager generation (all at once on profile save) wastes API credits on unseen cards. Lazy generation only pays for impressions.

### 8. Carousel auto-generations are free
**Decision**: Server-side generation queue uses an internal system flag (`source: 'carousel'`) that bypasses credit deduction. This flag is **only settable by server code** — never exposed to frontend API.
**Rationale**: Auto-generated carousel try-ons are a "gift" to incentivize profile photo adoption. Credit-gating would discourage the feature.

**Security**: The `/api/generate` endpoint checks for an internal header or server-side context flag. Frontend-originated requests always deduct credits regardless of any client-sent parameters.

### 9. Generation queue with rate limit
**Decision**: Max 2 concurrent system-initiated generations per server. Max 20 auto-generations per user per day (prevents runaway costs if trending carousel grows).
**Rationale**: Prevents Gemini API saturation from carousel scroll-through. 20/day cap covers a carousel of 10-15 trending items with room for re-tries.

### 10. 2×1 collage card format
**Decision**: If a cached try-on exists for a trending template + user, the carousel card shows a side-by-side: product image (left) | try-on result (right). If no cached try-on yet, show product image + shimmer placeholder (right half).
**Rationale**: The collage provides instant "this is personalized for you" signal. Shimmer communicates "generating" without blocking interaction.

---

## Screens & Components

### New Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `ProductTryOn` | `web/features/templates/ProductTryOn.tsx` | Streamlined selfie-only try-on for product-page flow |
| `GenerationShowcase` | `web/features/templates/GenerationShowcase.tsx` | Animated garment display during generation wait |
| `TryOnResult` | `web/features/templates/TryOnResult.tsx` | Result screen with View Product / Share / Download |
| `ProfilePhotoPrompt` | `web/features/profile/ProfilePhotoPrompt.tsx` | Post-generation "Save as profile photo?" modal |
| `ProfilePhotoUpload` | `web/features/profile/ProfilePhotoUpload.tsx` | Profile page photo upload/change widget |
| `PersonalizedCard` | `web/features/templates/PersonalizedCard.tsx` | 2×1 collage carousel card with lazy generation |

### Modified Components
| Component | Changes |
|-----------|---------|
| `SmartSelfieModal` | Remove capture-blocking logic. Capture button always enabled. Face detection becomes visual-only hints. |
| `TrendingCarousel` | Detect profile photo → render `PersonalizedCard` instead of default card. Generation queue management. |
| `ProfilePage` | Add profile photo section at top. |
| `ChangingRoom` | Route product-context requests to `ProductTryOn`. Keep existing flow for no-product context. |
| `App.tsx` | Wire new route or conditional rendering in `/changing-room`. |

### Server Changes
| File | Changes |
|------|---------|
| `server/src/routes/generate.js` | Accept `source` field (server-internal only). Skip credit deduction when `source === 'carousel'`. |
| `server/src/routes/profile.js` | New endpoints: `POST /api/profile/photo` (upload), `DELETE /api/profile/photo` (remove). |
| `server/supabase/migrations/000_schema.sql` | Add `profile_photo_url text` to `profiles`. |
| New: `server/src/lib/generationQueue.js` | FIFO queue for system-initiated generations. Max concurrency 2. Daily per-user cap 20. |
| New: `server/src/routes/carouselTryon.js` | Endpoint: `POST /api/carousel-tryon` — triggers lazy generation for a specific user + template. Returns cached result or queues generation. |

---

## DB Schema Changes

```sql
-- Add profile photo URL to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_photo_url text;

-- Index for carousel try-on cache lookups
CREATE INDEX IF NOT EXISTS idx_generated_images_carousel
  ON generated_images (user_id, template_id, mode)
  WHERE mode = 'carousel_tryon';
```

Update `generated_images.mode` CHECK constraint to include `'carousel_tryon'`:
```sql
ALTER TABLE generated_images DROP CONSTRAINT IF EXISTS generated_images_mode_check;
ALTER TABLE generated_images ADD CONSTRAINT generated_images_mode_check
  CHECK (mode IN ('tryon', 'remix', 'carousel_tryon'));
```

---

## User Flow Diagrams

### Product Try-On (new)
```
Product Page → "Try On" button
  → /changing-room?product=handle
  → [Has profile photo?]
      Yes → Show pre-loaded selfie + "Retake" option + "Generate" button
      No  → Open camera (guidance-only face detection) → capture selfie
  → Tap "Generate"
  → GenerationShowcase (animated garment + staged progress text, 20-30s)
  → TryOnResult screen
      → "View Product" → /product/:handle
      → "Share" → native share (watermarked image + product link)
      → "Download" → save image
  → [First try-on ever?]
      Yes → ProfilePhotoPrompt: "Save as profile photo?"
          → Yes → store to Supabase, update profiles.profile_photo_url
          → No  → toast: "Add in Profile anytime for personalized features"
```

### Personalized Carousel (new)
```
User with profile_photo_url lands on Home
  → TrendingCarousel renders PersonalizedCard for each template
  → Card enters viewport (IntersectionObserver, 50%+ visible)
      → [Cached try-on exists in generated_images?]
          Yes → Show 2×1 collage (product | try-on)
          No  → Show product | shimmer placeholder
               → Queue generation (max 2 concurrent, FIFO)
               → On completion → cache result → swap shimmer for try-on image
  → User taps card → navigates to /product/:handle (same as before)
```

---

## Testing Strategy

### Unit Tests
- `generationQueue.js`: FIFO ordering, concurrency limit (max 2), daily cap enforcement, queue drain
- Watermark canvas rendering: correct position, opacity, dimensions
- Credit deduction bypass: verify `source === 'carousel'` skips RPC call

### Integration Tests
- Product Try-On flow: product handle → selfie capture → generation → result screen
- Profile photo upload + retrieval
- Carousel lazy generation: Intersection Observer trigger → queue → API call → cache → UI update
- Share: Web Share API called with correct image blob + text

### Manual Verification
- SmartSelfie capture works with face detection as guidance-only (no blocking)
- Generation showcase animation quality and timing
- Collage card rendering at various screen sizes
- Share on WhatsApp, Instagram Stories, Twitter (watermark visible, link works)
- Browser back from result screen returns to product page correctly
- Profile photo prompt only appears on first-ever try-on

---

## Out of Scope

- **Gallery page** for viewing all past try-on results (future feature)
- **Free Remix flow redesign** — keeps existing dual-upload-zone interface
- **Real-time AR overlay** — this is AI-generated static imagery, not live AR
- **Multi-angle generation** — Gemini returns 1-2 images per request
- **Personalization data in prompts** — profile preferences (age, colors, styles) are not yet fed into Gemini prompts
- **Privacy policy page** — face storage consent UI exists (prompt + profile management) but legal copy for privacy policy is not part of this PRD
- **Admin panel for trending curation** — trending templates are managed via direct DB edits
