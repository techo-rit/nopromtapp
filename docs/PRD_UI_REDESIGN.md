# PRD: UI/UX Redesign — Restore Immersive Luxury Aesthetic

## Problem

The current stiri.in UI/UX has degraded from the original app.nopromt.ai experience. New features (Shopify integration, personalization engine, wardrobe, AI concierge, wishlist) were bolted on without preserving the original design language. The result is:

1. **Information overload** — The home page crams editorial headers, category sections, editorial snap cards, occasion tags, garment labels, prices, style tags, and color families into a dense feed. Users are overwhelmed instead of drawn in.
2. **Lost immersive feel** — The original felt like a luxury lifestyle app. The current feels like a cluttered e-commerce catalog.
3. **Navigation bloat** — 5 bottom nav tabs + floating search bar vs. the original's clean 3-tab layout. More taps ≠ better UX.
4. **Visual clutter** — Multiple card formats (hero carousel, category cards, editorial snap cards), each with overlapping metadata (prices, badges, tags, counters, quotes).
5. **Forced editorial copy** — "Your Edit", "Styled for you", "Keep scrolling", "Only For You", "5 looks curated from your style DNA" — feels performative rather than confident.
6. **Broken mobile experience** — Glass header/nav, floating search, and dense content fight for attention on small screens.

**Users leave** because the flow feels exhausting instead of aspirational. The old version had a magnetic quality — users kept scrolling because the content itself was the experience.

## Who This Is For

Style-conscious users (18-35, primarily female) who use the app for:
- **Virtual try-on** of curated fashion templates
- **Style inspiration** — browsing aspirational lifestyle/fashion imagery
- **Wardrobe management** — digital closet, outfit pairing
- **Shopping** — discovering and purchasing products via Shopify

## Solution

**Restore the original app.nopromt.ai immersive aesthetic** while cleanly integrating all current features. The redesign follows one principle: **content IS the UI**. Every pixel of chrome that isn't the image/content itself must justify its existence.

### Design Direction: "Obsidian Cinema"

- **Tone**: Luxury minimalist. Cinematic. Aspirational. Silent confidence.
- **What makes it unforgettable**: Full-bleed imagery with zero visual noise. You feel like you're inside a fashion editorial, not browsing a store.
- **Typography**: Playfair Display for display text (keep), system font stack for body (keep). Drop 'Cormorant Garamond' — it adds inconsistency.
- **Color**: Pure black (#0a0a0a) + Gold (#c9a962) accent. That's it. No white/8, no backdrop-blur pills, no rgba noise.
- **Motion**: Slow, cinematic transitions (700ms+). Ken Burns zoom on focused images. Gold quotes that fade in on focus. No bouncy micro-animations.

---

## Design Decisions & Rationale

### Decision 1: Strip the Home Page Back to Two Sections

**Old**: Trending Carousel → Stack Grid ("Choose your form"). Done.
**Current**: Editorial Header → Hero Carousel → Category Sections → Transition Divider → Full-Viewport Editorial Feed. Way too much.

**New approach**:
- **Section 1: Hero Carousel** — Full-screen immersive cards (same as old TrendingCarousel). Shows personalized feed items instead of just trending. CTA says "Step into" (aspirational) not "Try On" (transactional).
- **Section 2: Stack Grid** — "Choose your form" section with immersive snap cards (mobile) / hover grid (desktop).
- **No category sections, no editorial snap feed, no transition dividers.**

The For You feed becomes its own route (`/for-you`), not part of the home page scroll. This keeps home clean and focused.

**Rationale**: The old home page worked because it was a curated gallery, not a product catalog. Two sections = two decisions for the user. Simple.

### Decision 2: Return to 3-Tab Mobile Navigation (No Top Header on Mobile)

**Old**: Create | Changing Room | Profile — 3 tabs, bottom only
**Current**: Home | Closet | Room | Bag | Profile — 5 tabs + floating search

**New approach — 4 tabs**:
| Tab | Icon | Route | Notes |
|-----|------|-------|-------|
| Home | House | `/` | Feed + browse |
| Closet | Hanger | `/closet` | Wardrobe (new feature, deserves a tab) |
| Room | Camera | `/changing-room` | Try-on (core feature) |
| Profile | User | `/profile` | Profile + bag + settings |

**Removed**:
- **Bag tab** → Cart lives in Profile page or as a swipe-up sheet (the old way — not a dedicated tab).
- **Floating search** → Search is accessible from the header (desktop) and a search icon in the nav or Profile page (mobile). Not a persistent floating element.
- **No top header on mobile** (per user requirement). Zero chrome above the content.

**Rationale**: 4 tabs is the sweet spot — more discoverable than 3 (wardrobe is important), less noisy than 5. Cart doesn't deserve permanent tab real estate.

### Decision 3: Kill the Floating Search on Mobile

**Current**: FloatingSearch.tsx hovers above bottom nav, collapses to pill on scroll.

**New**: Remove entirely on mobile. Search is accessible via:
1. **Concierge button in header** (desktop only)
2. **Long-press on the Home tab** or a search icon inside the home hero section
3. The `/search` (AI Concierge) route still exists for direct navigation

**Rationale**: Floating elements over content break immersion. The old app had no search on mobile and worked beautifully. Users who want search will find it; casual browsers shouldn't be interrupted.

### Decision 4: Hero Carousel — Restore the Original Card Design

The old TrendingCarousel card was perfect:
- **85vw wide**, 4:5 aspect ratio on mobile, 16:9 on desktop
- Large image, gradient overlay, white "Step into" CTA button with gold hover fill
- Bold uppercase template name (system font, not serif)
- Gold italic manifestation quote that fades in on focus
- No prices, no tags, no badges, no metadata

**New hero carousel**:
- Keep the exact same card design
- Feed from personalized API instead of hardcoded trending
- Add subtle "New" badge ONLY for genuinely new arrivals (not occasion/garment/exploration labels)
- Keep the scroll arrows (transparent, no background)
- Keep snap-scroll behavior
- Remove: prices, style tags, color family, garment labels, occasion labels, "Discover" badges, card numbers

**Rationale**: The old cards were magnetic because they showed ONE thing — the image + a name + a feeling. The current cards show 6+ data points per card. Information density kills aspiration.

### Decision 5: Stack Grid — Restore the Immersive Snap Cards

The old StackGrid was:
- Mobile: Full-screen vertical snap cards (75svh height) with focus/scale animation
- Desktop: 2-column hover grid with dark overlay reveal
- Stack name centered, "coming soon" for locked stacks

**New stack grid**: Same exact design, but with all stacks now clickable (no more "coming soon" since more stacks are live). Add a subtle gold underline under the active/focused stack name.

### Decision 6: Product Discovery Flow (Prices Live on Product Pages, Not Browse)

**Current**: Prices appear on hero cards, category cards, and editorial cards.
**New**: Prices ONLY appear on:
- Product detail page (`/product/:handle`)
- Cart drawer
- Wishlist items (in profile)

**Not on**: Home carousel, stack views, feed cards.

**Rationale**: The old app had zero prices on the browse experience. This is the key to feeling "luxury" — you discover, fall in love, then see the price. Not the other way around.

### Decision 7: Simplify the Bottom Nav Visual Design

**Current**: Glass morphism navbar with SF Symbols, gold active color.
**Old**: Solid black (#0a0a0a) navbar, simple custom SVG icons, white active color.

**New**: Return to solid black background. Keep SF Symbols icons (they're cleaner than the old custom SVGs). Use **white** for active state, **muted gray** for inactive. Gold is reserved for accents in content, not chrome.

**Rationale**: Glass morphism on nav feels iOS-generic. Solid black makes the nav disappear into the background, keeping focus on content.

### Decision 8: Desktop Header — Simplify

**Current**: Full header with logo, 4 nav links, search bar, cart, user dropdown.
**New**: Minimal header:
- Left: Logo + "stiri"
- Center: Nothing (or very subtle page title)
- Right: Search icon + Cart icon + User avatar
- Nav links move to a slide-out menu or are removed (desktop users can use URLs; the real navigation is the bottom tabs on mobile and the content itself)

**Rationale**: The header currently competes with content. Desktop users don't need 4 nav links always visible.

### Decision 9: Onboarding CTA — Make It Part of the Hero, Not a Floating Element

**Current**: Small circular progress + "Complete style profile" button in editorial header.
**New**: If onboarding is incomplete, the FIRST card in the hero carousel is a full-size onboarding prompt card (same size as template cards). Background: abstract gold gradient. CTA: "Tell us your style" button. This makes it unmissable but not annoying — it's part of the content flow, not bolted on.

### Decision 10: For You Feed Becomes a Dedicated Route

**Current**: ForYouFeed is at `/for-you` AND the home page embeds a full editorial feed.
**New**: Home page is ONLY the carousel + stack grid. `/for-you` is the infinite scroll feed (accessible from a "See all" link after the carousel, or from the stack view). This keeps the home page clean.

---

## User Stories

1. As a **new user**, I want to land on a cinematic home page that makes me want to explore, so I stay on the app instead of bouncing.
2. As a **browser**, I want to swipe through full-screen template cards without prices/tags distracting me, so I can discover styles I love.
3. As a **returning user**, I want my personalized picks shown first in the carousel, so I feel recognized.
4. As a **shopper**, I want to tap a template card and see product details on a separate page, so I can decide to buy without clutter on the browse screen.
5. As a **mobile user**, I want zero top chrome and minimal bottom nav, so the content fills my entire screen.
6. As a **wardrobe user**, I want quick access to my closet from the bottom nav, so I can check my wardrobe without deep navigation.
7. As a **desktop user**, I want a clean header that doesn't compete with the full-screen imagery below.

---

## Implementation Decisions

### Files to Modify

| File | Change |
|------|--------|
| `web/features/pages/Home.tsx` | Strip to carousel + stack grid. Remove editorial header, category sections, editorial cards, transition dividers. |
| `web/features/layout/BottomNav.tsx` | Reduce to 4 tabs (Home, Closet, Room, Profile). Solid black background. White active state. |
| `web/features/layout/FloatingSearch.tsx` | Delete entirely. |
| `web/features/layout/Header.tsx` | Simplify to logo + search icon + cart + user avatar. Remove nav links. |
| `web/index.css` | Clean up legacy tokens. Remove `--font-serif` alias confusion. Solidify "Obsidian Cinema" tokens. |
| `web/App.tsx` | Remove FloatingSearch from layout. Update BottomNav props. |
| `web/features/templates/TrendingCarousel.tsx` | Restore old card design. Remove prices/tags/badges. "Step into" CTA. |
| `web/features/templates/StackGrid.tsx` | Restore old immersive snap card design. Remove "coming soon" gates. |
| `web/features/feed/ForYouFeed.tsx` | Keep as-is but only on `/for-you` route. Not embedded in home. |

### Files to Delete

| File | Reason |
|------|--------|
| `web/features/layout/FloatingSearch.tsx` | Replaced by search icon in nav/profile |

### Design Tokens to Update (index.css)

```css
/* Remove legacy :root block — single source of truth in @theme only */
/* Remove Cormorant Garamond references from components */
/* Simplify glass to solid black for nav elements */
```

---

## Testing Strategy

- **Visual regression**: Screenshot comparison of old (app.nopromt.ai) vs. new on mobile and desktop
- **Mobile flow test**: Load home → swipe carousel → tap "Step into" → lands on product/template. Under 3 taps to core action.
- **Navigation test**: All 4 tabs work, no dead ends. Cart accessible from profile.
- **Responsive**: Test on iPhone SE (small), iPhone 15 (standard), iPad (tablet), 1440px+ desktop
- **Performance**: Lighthouse score ≥ 90 (home page). No layout shifts from removed elements.
- **Feature parity**: All current features (try-on, closet, search, cart, wishlist, payments, onboarding) still accessible — just not all on the home page.

---

## Out of Scope

- **Backend changes** — This is purely frontend UI/UX
- **New features** — No new functionality. Only reorganizing existing features.
- **Shopify product page redesign** — ProductPage.tsx stays as-is for now
- **Auth flow redesign** — AuthModal stays as-is
- **Payment flow redesign** — PaymentModal stays as-is
- **AI Concierge redesign** — AIConcierge page stays as-is (it's already separate)
- **Onboarding flow redesign** — OnboardingModal stays as-is (just the trigger location changes)

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Users can't find search | Search icon in desktop header. Concierge accessible from profile or direct URL. Monitor analytics for search usage drop. |
| Users miss cart | Cart stays in desktop header. On mobile, accessible from profile page or slide-up gesture. |
| Feed discovery drops | "See all" link after carousel leads to `/for-you`. Stack views show all templates in that category. |
| Existing deep links break | No URL changes. All routes stay the same. Only visual layout changes. |
| Onboarding completion drops | First-card onboarding prompt in carousel is MORE visible than the current small button. |

---

## Stress-Test Findings (Grill Review)

### Critical: Home.tsx Props Mismatch
Home.tsx interface declares 12 props but only destructures 5 (`trendingTemplates`, `user`, `onLoginRequired`, `onboardingPercent`, `onOpenOnboarding`). App.tsx passes all 12. When stripping Home to carousel + stack grid, we MUST:
1. Update `HomeProps` interface to only declare what's needed
2. Update App.tsx to stop passing unused props
3. Add new props: `stacks`, `onSelectStack` (for StackGrid)

### Confirmed Safe: FloatingSearch Removal
FloatingSearch.tsx is cosmetic-only — it doesn't actually use its `searchQuery` or `onSearchChange` props. It just navigates to `/search` on click. Zero downstream dependencies. Safe to delete.

### Confirmed Safe: Bag Tab Removal
Cart is already accessible from Header's cart icon (desktop). Removing the Bag tab from BottomNav is safe. Cart count badge should move to Profile tab or remain in Header.

### Confirmed: Existing Components Ready
- `TrendingCarousel.tsx` — exists, has clean API, not currently used in any page. Ready to integrate.
- `StackGrid.tsx` — exists, has clean API, not currently used. Has `CLICKABLE_STACK_IDS` gate that should be removed (all stacks are now live).

### Confirmed: All Routes Intact
`/for-you`, `/search`, `/closet`, `/changing-room`, `/profile`, `/product/:handle` — all routes exist and are properly wired. No routing conflicts with the redesign.

### Export Pattern
All page components use named exports (`export const Home`). App.tsx wraps them with `React.lazy(() => import(...).then(m => ({ default: m.Home })))`. This pattern is safe for the refactor.
