# UI Redesign — Vertical Slice Issues

> Generated from [PRD_UI_REDESIGN.md](PRD_UI_REDESIGN.md)
> Issues ordered by dependency. Each slice is independently testable.

---

## Issue 1: [AFK] Clean up index.css — Remove Legacy Tokens & Consolidate Design System

### Context
The CSS has two competing token systems: `@theme` block (Tailwind v4 tokens) and a `:root` block with legacy aliases that define DIFFERENT values for the same concepts (e.g., `--color-bg: #000000` in `:root` vs `--color-base: #0a0a0a` in `@theme`). This creates visual inconsistency and confusion. Also remove `Cormorant Garamond` font references from components — the design system uses Playfair Display + system stack only.

### Acceptance Criteria
- [ ] Remove the entire `:root { ... }` legacy token block from `web/index.css`
- [ ] Ensure all components that reference legacy tokens (`--color-bg`, `--color-text-primary`, `--font-serif`, `--font-sans`) use the `@theme` equivalents (`--color-base`, `--color-primary`, `--font-display`, `--font-body`) or Tailwind classes (`bg-base`, `text-primary`, `font-display`)
- [ ] Search codebase for `Cormorant Garamond` — replace all instances with `var(--font-display)` or remove the inline font-family override
- [ ] Build passes (`npx vite build`) with zero TypeScript or CSS errors
- [ ] Visual spot-check: no visible color/font changes on any page (the tokens should already be the active ones)

### Implementation Notes
- Files to modify: `web/index.css`, grep for `Cormorant Garamond` across `web/features/**/*.tsx`
- The `:root` block uses `--color-bg: #000000` but `@theme` uses `--color-base: #0a0a0a` — these are slightly different blacks. Verify which is actually rendered.
- Legacy `--font-serif` aliases to `'SF Pro Display', 'Inter'` which contradicts `--font-display: 'Playfair Display'`. The `@theme` version is correct.
- Pattern: use Tailwind classes (`bg-base`, `text-gold`, `font-display`) instead of `var()` references where possible.

### Testing
- `npx vite build` — clean build
- Open every page (/, /closet, /changing-room, /profile, /search, /for-you) — no visual regressions
- Check Chrome DevTools computed styles on key elements to confirm correct token values

---

## Issue 2: [AFK] Reduce BottomNav to 4 Tabs + Solid Black Background

### Context
Current BottomNav has 5 tabs (Home, Closet, Room, Bag, Profile). Per the redesign, Bag is removed (cart is accessible from desktop header and will be added to profile later). The glassmorphism background is replaced with solid black to reduce chrome and keep focus on content. Active color changes from gold to white.

### Acceptance Criteria
- [ ] Remove Bag tab from `tabs` array in BottomNav.tsx
- [ ] Remove `bag` icon definitions from the `icons` record
- [ ] Remove `cartCount` and `onCartClick` props from BottomNavProps interface
- [ ] Replace `.glass` class with solid background: `bg-[#0a0a0a]` (matching old design)
- [ ] Change active icon/text color from `--color-gold` to `#f5f5f5` (white)
- [ ] Change inactive color from `--color-tertiary` to `#6b6b6b` (keep same)
- [ ] Remove cart badge rendering logic
- [ ] Update App.tsx to stop passing `cartCount` and `onCartClick` to BottomNav
- [ ] Build passes

### Implementation Notes
- Files: `web/features/layout/BottomNav.tsx`, `web/App.tsx`
- BottomNav currently has `cartCount?: number` and `onCartClick?: () => void` props — both become unused
- The `isActive` function for `bag` tab checks `cartCount > 0` — remove this case
- Keep the SF Symbols icon style (outline/filled) — they're cleaner than the old custom SVGs
- Maintain safe-area-inset-bottom padding

### Testing
- Mobile viewport: exactly 4 tabs visible (Home, Closet, Room, Profile)
- Tap each tab → navigates to correct route
- Active tab shows white icon/text, inactive shows gray
- No glass/blur effect on bottom nav — solid black
- Cart still accessible from Header on desktop

---

## Issue 3: [AFK] Remove FloatingSearch from Mobile Layout

### Context
FloatingSearch.tsx renders a floating search bar above the bottom nav on the home page. Per the redesign, this is removed entirely — search is available via Header (desktop) and the `/search` route. The component is cosmetic-only (doesn't use its props).

### Acceptance Criteria
- [ ] Remove `<FloatingSearch>` from App.tsx layout
- [ ] Remove the FloatingSearch import from App.tsx
- [ ] Delete `web/features/layout/FloatingSearch.tsx`
- [ ] Remove `searchQuery` and `handleSearchChange` state/handlers from App.tsx IF no other component uses them
- [ ] Build passes

### Implementation Notes
- Files: `web/App.tsx`, `web/features/layout/FloatingSearch.tsx` (delete)
- Check if `searchQuery` and `handleSearchChange` are still used by Header.tsx — if yes, keep them. If no, remove.
- Header.tsx currently has a `searchQuery` and `onSearchChange` prop — check if it actually uses them or just navigates to `/search`

### Testing
- Mobile home page: no floating search bar visible
- Desktop: search button in header still works
- `/search` route still accessible and functional
- No console errors or TypeScript warnings

---

## Issue 4: [HITL] Restore Home Page — Carousel + Stack Grid (Strip Editorial Clutter)

### Context
This is the most impactful visual change. The current Home page has: Editorial Header → Hero Carousel → Category Sections → Transition Divider → Full-Viewport Editorial Snap Feed. The redesign strips it to: Hero Carousel → Stack Grid. This restores the original app.nopromt.ai layout.

**HITL because**: The exact layout, spacing, and flow need human review. The balance between "enough content" and "too sparse" is a judgment call.

### Acceptance Criteria
- [ ] Home page renders exactly two sections: (1) Hero Carousel, (2) "Choose your form" Stack Grid
- [ ] Remove: Editorial header ("Your Edit" / "Styled for you"), category sections, transition divider, editorial snap feed
- [ ] Hero Carousel uses `TrendingCarousel` component (already exists, currently unused)
- [ ] Stack Grid uses `StackGrid` component (already exists, currently unused)
- [ ] TrendingCarousel receives personalized feed items (converted from `fetchFeed` API) instead of just `trendingTemplates`
- [ ] Remove unused props from `HomeProps` interface (`templatesByStack`, `isLoading`, `onSelectTemplate`, `onTryOn`, `wishlistedIds`, `onToggleWishlist`)
- [ ] Add new props: `stacks: Stack[]`, `onSelectStack: (stack: Stack) => void`
- [ ] Update App.tsx to pass correct props to Home
- [ ] "Choose your form" heading appears above Stack Grid with border-top separator (matching old design)
- [ ] Onboarding prompt appears as first card in carousel (if incomplete) OR as a subtle prompt above the carousel
- [ ] Add "See all looks" link after carousel that navigates to `/for-you`
- [ ] Build passes
- [ ] Page scrolls smoothly with bottom padding for nav

### Implementation Notes
- Files: `web/features/pages/Home.tsx` (major rewrite), `web/App.tsx` (props update)
- Home currently has its own `HeroCarousel` and `EditorialCard` sub-components inline — these are removed in favor of the existing `TrendingCarousel` and `StackGrid` components
- Home currently calls `fetchFeed()` directly — this should stay (feed data drives the carousel)
- `templateToFeedItem` helper converts Template → FeedItem — may need reverse conversion (FeedItem → Template) for TrendingCarousel
- The `STACKS` constant from `web/data/constants.ts` provides the stacks array
- StackGrid's `CLICKABLE_STACK_IDS` gate should be updated in a separate issue (Issue 6)
- Keep tracking logic (cardObserver for view/skip events) on carousel cards

### Testing
- Mobile: Full-screen carousel cards → scroll down → "Choose your form" heading → stack grid cards
- Desktop: Wide carousel → 2-column stack grid
- No prices, tags, badges, or metadata on carousel cards
- "See all looks" link navigates to `/for-you`
- Onboarding prompt visible for incomplete profiles
- Smooth scroll, no layout shifts

---

## Issue 5: [AFK] Restore TrendingCarousel Card Design — "Step into" CTA, No Metadata

### Context
The old TrendingCarousel cards were magnetic: huge image, gradient, "Step into" button with gold hover fill, bold uppercase name, gold italic quote on focus. NO prices, tags, badges, or card numbers. The current HeroCarousel (inline in Home.tsx) adds prices, tags, colors, badges, and "Try On" text. This issue restores the old card aesthetic.

### Acceptance Criteria
- [ ] TrendingCarousel card shows: image, gradient overlay, "Step into" CTA button, template name, manifestation quote
- [ ] "Step into" CTA button: white bg, black text, on hover: gold (#BFA770) fill slides up, text turns white (exactly like old design)
- [ ] Template name: bold uppercase, system font (--font-sans not --font-display), large (32px mobile, 48px tablet, 64px desktop)
- [ ] Manifestation quote: gold (#E4C085) italic text, fades in/out with focus state
- [ ] Remove from cards: prices, style tags, color family dots, occasion badges, "New"/"Discover" labels, card index numbers, "Try On" text, "View Details" button
- [ ] Scroll arrows: transparent background (no bg-black/30 or backdrop-blur), just white text
- [ ] Card dimensions: 85vw width, 4:5 aspect ratio mobile, 16:9 desktop
- [ ] Padding: px-[7.5vw] on container (first card starts centered)
- [ ] Focus state: scale 1.02 mobile, 1.01 desktop, border becomes white/20
- [ ] Image Ken Burns: focused = scale 105%, unfocused = 100%
- [ ] Build passes

### Implementation Notes
- File: `web/features/templates/TrendingCarousel.tsx`
- Reference old commit (0dd4a1b) card design — the structure is identical
- The component already has `onSelectTemplate` callback — wire "Step into" button to it
- Keep IntersectionObserver logic for focus detection
- Keep snap-scroll behavior (snap-center snap-always)
- Keep `getManifestationQuote()` integration for quotes
- `templateAvailability` imports can stay but `isTemplateAvailable` is likely always true now

### Testing
- Cards show ONLY: image + "Step into" button + name + gold quote
- Hover "Step into" → gold fill slides up, text turns white
- Swipe carousel → cards snap, focused card scales up
- Quote appears on focused card, disappears on others
- No prices anywhere on carousel
- Desktop: wider aspect ratio (16:9)

---

## Issue 6: [AFK] Restore StackGrid — Remove "Coming Soon" Gate, All Stacks Clickable

### Context
StackGrid currently has `CLICKABLE_STACK_IDS = new Set(['aesthetics', 'flex'])` which locks most stacks. Since more stacks are now live, this gate should be removed. Also refresh the visual design to match the old immersive style.

### Acceptance Criteria
- [ ] Remove `CLICKABLE_STACK_IDS` set and all "coming soon" conditional logic
- [ ] All stacks are clickable and navigate to their stack view
- [ ] Mobile: full-screen vertical snap cards (75svh height) with focus animation (scale 1.02, gold border, shadow)
- [ ] Desktop: 2-column grid with hover overlay reveal
- [ ] Stack name centered on card, bold text, drop shadow
- [ ] Focused card on mobile: reduced overlay (bg-black/20), unfocused: darker overlay (bg-black/60)
- [ ] Build passes

### Implementation Notes
- File: `web/features/templates/StackGrid.tsx`
- Remove `CLICKABLE_STACK_IDS` constant
- Remove `isComingSoon` variable and all branches that check it
- Remove "(coming soon...)" text rendering
- Keep IntersectionObserver for mobile focus detection
- Keep `firstCardRef` prop support

### Testing
- Mobile: All stack cards are tappable, navigate to `/stack/:stackId`
- No "coming soon" text anywhere
- Desktop: hover reveals stack name with overlay
- Smooth snap scrolling on mobile

---

## Issue 7: [AFK] Simplify Desktop Header — Logo + Icons Only

### Context
Current Header has: logo, 4 nav links (Home, Closet, Changing Room, Concierge), full search bar, cart icon, user dropdown. The redesign simplifies to: logo + search icon + cart icon + user avatar/sign-in. Nav links are removed — desktop users navigate via content or URL.

### Acceptance Criteria
- [ ] Remove `NAV_LINKS` array and nav link rendering
- [ ] Replace full search bar with a search icon button (navigates to `/search`)
- [ ] Keep: logo (left), search icon + cart icon + user avatar (right)
- [ ] Logo: "stiri" text + RemixLogoIcon, clickable → home
- [ ] User menu dropdown: keep as-is (account info, upgrade, profile, logout)
- [ ] Remove `searchQuery` and `onSearchChange` props from HeaderProps (if no longer needed)
- [ ] Header remains desktop-only (`hidden md:block`)
- [ ] Height stays at 72px
- [ ] Keep glass background (desktop glass is fine — the issue was mobile glass)
- [ ] Build passes

### Implementation Notes
- File: `web/features/layout/Header.tsx`, `web/App.tsx`
- The search bar currently just navigates to `/search` on click — replacing it with an icon button does the same thing
- Check if removing `searchQuery`/`onSearchChange` from Header breaks App.tsx compilation
- Keep back button for secondary pages (isSecondaryPage prop)

### Testing
- Desktop header: logo left, search icon + cart + user right
- No nav links visible
- Search icon → navigates to `/search`
- Cart icon → opens CartDrawer
- User avatar → shows dropdown
- Back button appears on secondary pages

---

## Issue 8: [HITL] Add Onboarding Prompt as First Carousel Card

### Context
Currently, onboarding shows as a small progress ring + button in the editorial header. The redesign makes it the FIRST card in the hero carousel — full-size, impossible to miss but part of the content flow.

**HITL because**: The card design (background, copy, CTA style) needs creative direction and human review.

### Acceptance Criteria
- [ ] When user is logged in AND onboarding < 100%, the first card in TrendingCarousel is an onboarding prompt
- [ ] Card dimensions match template cards (85vw, 4:5 aspect ratio mobile)
- [ ] Background: abstract gold gradient or dark textured background (not a product image)
- [ ] Content: progress ring, "Tell us your style" or "Complete your profile" CTA, brief copy
- [ ] CTA button: same style as "Step into" (white bg, gold hover fill)
- [ ] Tapping the card or CTA opens `OnboardingModal`
- [ ] If onboarding is 100% or user is logged out, this card does NOT appear
- [ ] Build passes

### Implementation Notes
- Files: `web/features/pages/Home.tsx` (pass onboarding state to carousel), `web/features/templates/TrendingCarousel.tsx` (render special first card)
- May need to add a special "isOnboarding" flag to the first carousel item, or prepend a synthetic item
- Progress ring uses the same SVG circle from the current editorial header

### Testing
- New user: first carousel card is onboarding prompt
- Complete onboarding: prompt disappears, first card is a template
- Tapping prompt → OnboardingModal opens
- Card matches the style of template cards (no visual mismatch)

---

## Issue 9: [AFK] Add "See All Looks" Link + Cart Access in Profile

### Context
Removing the editorial feed from home and the Bag tab means users need alternative paths to: (1) discover more looks beyond the carousel, and (2) access their cart on mobile.

### Acceptance Criteria
- [ ] After the carousel section on Home, add a subtle "See all looks →" link that navigates to `/for-you`
- [ ] Style: small text, gold color, right-aligned or centered, with arrow icon
- [ ] In ProfilePage, add a "Cart" or "My Bag" section/button that opens CartDrawer
- [ ] Cart button shows current cart count if > 0
- [ ] Build passes

### Implementation Notes
- Files: `web/features/pages/Home.tsx` (add link), `web/features/pages/ProfilePage.tsx` (add cart access)
- ProfilePage will need `onCartClick` and `cartCount` props passed from App.tsx
- The CartDrawer is already a global component in App.tsx — just need to expose the trigger

### Testing
- Home page: "See all looks" link visible after carousel, tapping navigates to `/for-you`
- Profile page: cart button visible, shows count, opens CartDrawer
- Mobile: users can access cart from profile (replacing the removed Bag tab)

---

## Issue 10: [HITL] Final Visual Polish + Responsive QA

### Context
After all structural changes are in place, this issue covers the final visual polish: spacing, transitions, animation timing, responsive behavior across breakpoints, and overall "feel" of the redesigned app.

**HITL because**: This requires subjective design judgment and testing on real devices.

### Acceptance Criteria
- [ ] Home page feels immersive and cinematic — content fills the screen
- [ ] No visual clutter — no unnecessary text, badges, prices, or chrome on browse screens
- [ ] Transitions are smooth (700ms+ for card animations, 300ms for nav)
- [ ] Mobile: zero top chrome, minimal bottom nav, content edge-to-edge
- [ ] Desktop: clean header, wide content area, proper max-width constraints
- [ ] Test on: iPhone SE, iPhone 15, iPad, 1440px desktop, 1920px desktop
- [ ] Lighthouse performance score ≥ 90 on home page
- [ ] No accessibility regressions (tab navigation, screen reader labels)
- [ ] No console errors or warnings
- [ ] All existing features (try-on, closet, search, cart, wishlist, payments, auth) still work

### Implementation Notes
- This is a QA/polish pass, not a structural change
- Focus on: padding consistency, safe area insets, scroll behavior, snap points
- May need minor tweaks to transition timings, font sizes, spacing
- Check that old image URLs still load (templates may reference old image paths)

### Testing
- Manual walkthrough of every user flow on mobile and desktop
- Screenshot comparison with app.nopromt.ai for aesthetic match
- Lighthouse audit
- Tab-through entire app for keyboard accessibility

---

## Dependency Graph

```
Issue 1 (CSS cleanup)
  ↓
Issue 2 (BottomNav 4 tabs)  ──┐
Issue 3 (Remove FloatingSearch) ──┤
Issue 5 (TrendingCarousel cards) ──┤
Issue 6 (StackGrid unlocked)  ──┤
  ↓                              │
Issue 4 (Home page rewrite) ←────┘
  ↓
Issue 7 (Header simplify)
  ↓
Issue 8 (Onboarding card)
  ↓
Issue 9 (See all + cart in profile)
  ↓
Issue 10 (Final polish + QA)
```

Issues 1, 2, 3, 5, 6 can be done **in parallel** (no dependencies on each other).
Issue 4 depends on 2, 3, 5, 6 being done (it integrates them).
Issues 7, 8, 9 are sequential after Issue 4.
Issue 10 is last (polish pass after everything is in place).
