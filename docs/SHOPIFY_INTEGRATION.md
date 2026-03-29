# Stiri × Shopify — Integration Architecture & Plan

## Hydrogen vs Headless (Your Own Stack): Verdict

**Use Headless (your own stack). Do NOT use Hydrogen.**

| Factor | Hydrogen | Headless (Your Stack) |
|--------|----------|-----------------------|
| Framework | Forces React Router + Remix architecture, deploys to Oxygen | You already have Vite + React SPA + Express backend |
| Migration cost | Would require **rewriting your entire frontend** — routing, auth, state, camera, MediaPipe, Gemini integration | Zero migration — just add Shopify Storefront API calls to your existing stack |
| Hosting | Locked to Shopify Oxygen (free, but vendor lock-in) | You control your own server |
| AI generation | Hydrogen has no concept of your Gemini generation flow, credit system, or multi-account auth | Everything already works |
| Cart/Checkout | Built-in cart components | You call the same Storefront API; Shopify hosts checkout via `checkoutUrl` |
| Effort | 3-6 months rewrite | 1-2 weeks integration |

**Bottom line:** Hydrogen is for building a **new storefront from scratch** where Shopify IS the product. Stiri is an **AI generation platform with commerce as a feature**. Headless Storefront API is the right choice.

---

## What to Store Where — The Exact Split

### Shopify (Source of Truth for Commerce)

| Data | Why Shopify |
|------|------------|
| Product catalog (title, description, images, pricing, variants, inventory) | Shopify Admin manages this. Single source of truth. |
| Cart state (lines, quantities, totals) | Shopify's Cart API handles stock validation, pricing rules, discount codes |
| Checkout + payment processing | Shopify-hosted checkout (`checkoutUrl`) — PCI compliant, handles Shopify Payments/UPI/COD |
| Order history + fulfillment | Shopify manages fulfillment, shipping, refunds |
| Product metafields | Store AI prompt references, template IDs, style tags as Shopify metafields |

### Supabase (Source of Truth for AI + User Identity)

| Data | Why Supabase |
|------|-------------|
| User profiles (auth, onboarding, style DNA) | Already exists and works |
| **AI generation templates + prompts** | **Supabase `templates` table** — complex Gemini prompts with identity constraints, rendering pipelines, fabric physics. Needs versioning, querying, and scales to 1000s of products. See "Template & Product Storage Strategy" below. |
| Generated images | Already in Supabase Storage |
| Credit system (quotas, subscriptions) | Already works via Razorpay + Supabase RPC |
| User events / behavioral signals | `user_events` table per the personalization model |
| Wishlist + recent views | `user_wishlist` table referencing Shopify product handles |
| Template ↔ Product mapping | `shopify_handle` column on `templates` table — the 1:1 link between AI generation and commerce |
| Cart ID ↔ User mapping | `shopify_cart_id` column on `profiles` table — persists across server restarts, multi-device, and scaling. Already fetched on every authenticated request via `fetchUserProfile()`. |

### Express Server (Proxy + Cache Layer)

| Data | Why Server |
|------|-----------|
| Shopify product cache (TTL 5 min) | Avoid hitting Shopify API on every page load. Use existing `createTtlCache` |
| Template cache (TTL 10 min) | Templates fetched from Supabase, cached in-memory. Avoids DB round-trip on every page load |

### Client (localStorage / React State)

| Data | Why Client |
|------|-----------|
| Shopify cart ID | `profiles.shopify_cart_id` in DB (primary). Client `localStorage` as fast-read cache, synced from DB on login. |
| Cart item count (badge) | React state, synced on cart mutations |
| Recently viewed products | `localStorage` array (max 10) |

---

## The Offline Store Analogy — Core UX Principle

Stiri works like a premium offline clothing store. When a customer walks in, they have **two independent options**:

1. **Try On** — Walk to the changing room, try the garment on yourself (= AI generation with Gemini)
2. **Product Details** — Ask the salesperson about fabric, price, sizes, availability → then Buy / Add to Cart / Wishlist (= Shopify product page)

These are **parallel paths, not sequential**. A user might try on first then buy, or buy directly without trying. Both buttons exist side-by-side on every template.

### UX — Dual Buttons Everywhere

**TrendingCarousel (Home.tsx):**
- Current: Single "Step into" button
- New: **"Try On"** button + **"Product Details"** button, side by side
- "Try On" → navigates to TemplateExecution (AI generation)
- "Product Details" → opens ProductDetailModal (Shopify: images, variants, price, Buy Now / Add to Cart / Wishlist)

**TemplateExecution.tsx:**
- Current: Single "Transform your soul" generate button
- New: Keep generate button AS-IS + add **"Product Details"** button alongside it
- "Product Details" → opens ProductDetailModal for the Shopify product linked to this template
- This button is **always present** (not conditional) — every template IS a product

**ProductDetailModal.tsx:**
- Image gallery (Shopify product images)
- Variant selector (size, color)
- Price display (with compare-at price / discount)
- **Buy Now** → Shopify checkout via `checkoutUrl`
- **Add to Cart** → Shopify Cart API → updates cart badge
- **Add to Wishlist** → Supabase `user_wishlist` table
- **Try On** → navigate to the linked template's AI generation page

---

## Template & Product Storage Strategy

### Why NOT `constants.ts` at Scale

Currently: 35 templates hardcoded in `web/data/constants.ts` (~4400 lines). This works at small scale but breaks at 1000s:

| Problem | Impact at 1000 products |
|---------|------------------------|
| **Bundle size** | 35 templates = ~100KB. 1000 templates = ~3MB+ of JSON in your JS bundle. Mobile users download ALL prompts even though they'll use 1-2. |
| **Deploy to edit** | Adding a new product requires a code change → git commit → build → deploy. Should be a Shopify Admin + DB operation. |
| **No querying** | Can't filter by `WHERE stack = 'fitit' AND style_tags @> '{ethnic}'` in a JS array efficiently. DB does this natively. |
| **No admin UI** | Store managers can't add/edit templates without developer involvement. |
| **Shopify sync** | When you add a product in Shopify Admin, you want the template created automatically — not a manual `constants.ts` edit. |

### The Answer: Supabase `templates` Table + Server Cache

**Store templates in Supabase. Cache on the server. Fetch on demand from frontend.**

```sql
CREATE TABLE public.templates (
  id text PRIMARY KEY,                    -- 'flex_template_1'
  name text NOT NULL,                     -- 'Bugatti Coastal Drive'
  stack_id text NOT NULL,                 -- 'flex'
  image_url text NOT NULL,                -- '/images/flex_template_1.webp'
  prompt jsonb NOT NULL,                  -- The full Gemini prompt object
  aspect_ratio text DEFAULT '3:4',
  keywords text[] DEFAULT '{}',           -- ['luxury', 'car', 'coastal']
  shopify_handle text,                    -- 'bugatti-coastal-drive' (1:1 link to Shopify product)
  is_trending boolean DEFAULT false,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_templates_stack ON public.templates(stack_id) WHERE is_active;
CREATE INDEX idx_templates_shopify ON public.templates(shopify_handle) WHERE shopify_handle IS NOT NULL;
CREATE INDEX idx_templates_trending ON public.templates(sort_order) WHERE is_trending AND is_active;
```

**Migration path (no big-bang rewrite):**

1. **Phase 1 (now):** Keep `constants.ts` as-is. Add `shopifyHandle` field to the Template type. Ship the Shopify integration.
2. **Phase 2 (when scaling):** Create the `templates` table, seed it from `constants.ts`, add a `/api/templates` endpoint with server-side caching (TTL 10 min), update frontend to fetch from API instead of import. Delete `constants.ts`.
3. **Phase 3 (admin):** Build a simple admin page or use Supabase dashboard to manage templates. Shopify webhook on `products/create` auto-creates a template row.

**Caching ensures zero latency penalty:**

| Layer | What's cached | TTL |
|-------|--------------|-----|
| Server in-memory | All active templates (by stack, by ID) | 10 min |
| Frontend | Template list per stack (React state) | Session |
| Prompt (generation time) | Single template prompt fetched by ID | Already in server memory from cache |

### Why NOT Store Prompts in Shopify

1. **Shopify metafields max 512KB** — many prompts are complex multi-paragraph JSON with rendering pipelines, identity constraints, fabric physics
2. **No conditional logic** — prompts reference user profile data (body type, skin tone, fit) interpolated at generation time
3. **No version control** — prompts evolve, need diffing and rollback. Supabase row versioning or git migration files handle this
4. **Latency** — fetching prompts from Shopify API on every generation adds 200-500ms vs. server-side cache hit

**What you CAN store in Shopify metafields** (optional, for admin convenience):
- `stiri_template_id` → mirrors the `templates.id` for debugging in Shopify Admin
- `stiri_style_tags` → `["formal", "ethnic", "wedding"]` viewable from Shopify product page

---

## Integration Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       FRONTEND (Vite SPA)                        │
│                                                                  │
│  Home.tsx                                                        │
│  ├── TrendingCarousel ── each card has TWO buttons:              │
│  │     [Try On] → TemplateExecution    [Product Details] → Modal │
│  ├── StackGrid (AI templates)                                    │
│  └── Search (templates + products unified)                       │
│                                                                  │
│  TemplateExecution.tsx                                           │
│  ├── [Transform your soul] → Gemini AI generation                │
│  └── [Product Details] → ProductDetailModal (always present)     │
│                                                                  │
│  ProductDetailModal.tsx                                          │
│  ├── Image gallery (Shopify images)                              │
│  ├── Variant selector (size, color)                              │
│  ├── [Buy Now] → Shopify checkoutUrl                             │
│  ├── [Add to Cart] → Shopify Cart API                            │
│  ├── [Add to Wishlist] → Supabase user_wishlist                  │
│  └── [Try On] → navigate to linked template                     │
│                                                                  │
│  CartDrawer.tsx ── Slide-out cart panel                           │
│                                                                  │
│  shopifyService.ts ── All Shopify API calls (DRY)                │
│  ┌───────────────────────────────────────┐                       │
│  │ getProducts() / getProduct()          │                       │
│  │ createCart() / addToCart()             │                       │
│  │ updateCartLine() / removeCartLine()   │                       │
│  │ getCart()                              │                       │
│  └───────────────────────────────────────┘                       │
└───────────────────────┬──────────────────────────────────────────┘
                        │ fetch() with credentials
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                EXPRESS SERVER (Proxy + Cache)                     │
│                                                                  │
│  lib/shopify.js ── Single Shopify GraphQL client (DRY)           │
│  ┌───────────────────────────────────────┐                       │
│  │ shopifyFetch(query, variables)        │ ← ONE function        │
│  │ Product queries (cached 5 min)        │   for all GraphQL     │
│  │ Cart mutations (never cached)         │                       │
│  └───────────────────────────────────────┘                       │
│                                                                  │
│  routes/shopify.js ── REST endpoints                             │
│  ┌───────────────────────────────────────┐                       │
│  │ GET  /api/shopify/products            │                       │
│  │ GET  /api/shopify/product/:handle     │                       │
│  │ POST /api/shopify/cart                │                       │
│  │ POST /api/shopify/cart/lines          │                       │
│  │ PUT  /api/shopify/cart/lines          │                       │
│  │ DELETE /api/shopify/cart/lines        │                       │
│  │ GET  /api/shopify/cart/:id            │                       │
│  └───────────────────────────────────────┘                       │
│                                                                  │
│  Cache: createTtlCache(300000) for products                      │
│  Cache: createTtlCache(600000) for templates (Phase 2)           │
│  Auth: getUserFromRequest() for cart user mapping                │
└───────────────────────┬──────────────────────────────────────────┘
                        │ HTTPS + Storefront Token (private)
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│               SHOPIFY STOREFRONT API                             │
│  https://stiri-in.myshopify.com/api/2026-01/graphql              │
│                                                                  │
│  Products ← queried via GraphQL                                  │
│  Cart ← created/mutated via GraphQL                              │
│  Checkout ← redirect to checkoutUrl (Shopify-hosted)             │
└──────────────────────────────────────────────────────────────────┘
```

### The 1:1 Product ↔ Template Relationship

Every clothes template IS a Shopify product. The reference image in the template is the actual product photo. This is not optional linking — it's a **mandatory 1:1 relationship**.

```
Template: flex_template_1 ("Bugatti Coastal Drive")
  ├── prompt: { ... complex Gemini generation config ... }
  ├── imageUrl: /images/flex_template_1.webp  ← same garment
  └── shopifyHandle: "bugatti-coastal-drive"  ← Shopify product
        ├── title: "Bugatti Coastal Drive"
        ├── images: [product photos from Shopify CDN]
        ├── variants: [{size: S, price: ₹3999}, {size: M, price: ₹3999}, ...]
        └── availableForSale: true
```

The `shopifyHandle` field on each template (in `constants.ts` now, `templates` table later) is the bridge. No metafield lookup needed at runtime — the handle is stored alongside the prompt.

---

## DRY Implementation Plan — Files to Create

### Backend (3 files)

| File | Purpose |
|------|---------|
| `server/src/lib/shopify.js` | **Single GraphQL client** — `shopifyFetch()`, query builders, product/cart helpers. ALL Shopify logic lives here. |
| `server/src/routes/shopify.js` | **REST route handlers** — thin wrappers that call `lib/shopify.js` + add caching/auth |
| Registration in `app.js` | Mount routes |

### Frontend (3 files)

| File | Purpose |
|------|---------|
| `web/features/shop/shopifyService.ts` | **Single service** — all fetch calls to `/api/shopify/*`. DRY client matching backend DRY server. |
| `web/features/shop/ProductDetailModal.tsx` | **Product details** modal/drawer — shows images, variants, size picker, Add to Cart / Buy Now |
| `web/features/shop/CartDrawer.tsx` | **Cart overlay** — slide-out panel showing cart lines, quantities, total, Checkout button |

### Modified Files

| File | Change |
|------|--------|
| `web/features/templates/TemplateExecution.tsx` | Add **"Product Details"** button alongside generate button (always present) → opens `ProductDetailModal` for the linked Shopify product |
| `web/features/templates/TrendingCarousel.tsx` | Rename "Step into" → **"Try On"**. Add **"Product Details"** button next to it. Each trending card gets dual buttons. |
| `web/features/pages/Home.tsx` | Trending templates fetched with Shopify product data. Stack grid cards also get dual actions. |
| `web/types/index.ts` | Add `ShopifyProduct`, `ShopifyCart`, `CartLine` types. Add `shopifyHandle` to `Template` interface. |
| `web/data/constants.ts` | Add `shopifyHandle: string` to each template object (Phase 1). |
| `web/App.tsx` | Add cart state (cartId in localStorage, cart count in header badge) |

---

## Caching Strategy

| Resource | Cache Location | TTL | Invalidation |
|----------|---------------|-----|-------------|
| Product list (trending) | Server in-memory (`createTtlCache`) | 5 min | TTL expiry |
| Single product detail | Server in-memory | 5 min | TTL expiry |
| Templates by stack | Server in-memory (Phase 2) | 10 min | TTL expiry or manual bust on template edit |
| Single template prompt | Server in-memory (Phase 2) | 10 min | TTL expiry |
| Cart | **Never cached** — always fresh from Shopify | N/A | Mutations return updated cart |
| Cart ID | Client `localStorage` | Permanent | Cleared on logout |
| Cart item count | React state | Session | Updated on every cart mutation response |
| Product images | Shopify CDN (auto) | Long (CDN headers) | Automatic |

---

## Checkout Flow

**Use Shopify-hosted checkout** (not custom). Industry standard for headless:

1. User adds items to cart → Shopify Cart API returns `checkoutUrl`
2. User clicks "Checkout" → `window.location.href = checkoutUrl`
3. Shopify handles payment (Shopify Payments, UPI, COD, etc.)
4. After payment → Shopify redirects back to your site OR sends order webhook
5. Order webhook (`orders/create`) → server updates user events for personalization

This gives PCI compliance, payment method flexibility, and abandoned cart recovery **for free**.

---

## The User Journey — Dual Path

```
┌─────────────────────────────────────────────────────────────────┐
│  HOME PAGE (TrendingCarousel)                                   │
│  ┌─────────────────────────────────┐                            │
│  │  [Template Card]                │                            │
│  │  "Bugatti Coastal Drive"        │                            │
│  │                                 │                            │
│  │  [Try On]    [Product Details]  │                            │
│  └──────┬──────────────┬───────────┘                            │
│         │              │                                        │
│         ▼              ▼                                        │
│   TemplateExecution   ProductDetailModal                        │
│   ┌────────────────┐  ┌──────────────────────┐                  │
│   │ Upload selfie  │  │ Shopify images       │                  │
│   │ [Generate]     │  │ Size: S M L XL       │                  │
│   │ [Product  ◄────┼──┤ ₹3,999               │                  │
│   │  Details]      │  │ [Buy Now]            │                  │
│   │                │  │ [Add to Cart]        │                  │
│   │ AI result ─────┼──► [Add to Wishlist]    │                  │
│   │ shows the same │  │ [Try On] ────────────┼──► back to left  │
│   │ garment on YOU │  └──────────────────────┘                  │
│   └────────────────┘                                            │
│                         ▼                                       │
│                    CartDrawer → Shopify Checkout                 │
└─────────────────────────────────────────────────────────────────┘
```

The key insight: **the user can enter from either side** and cross over at any point. The AI generation and commerce are parallel paths on the same product, not a funnel.

---

## Environment Variables

```env
# Already in server/.env
SHOPIFY_STORE_DOMAIN=stiri-in.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=your_storefront_access_token
```

## API Endpoint

```
POST https://stiri-in.myshopify.com/api/2026-01/graphql.json

Headers:
  Content-Type: application/json
  X-Shopify-Storefront-Access-Token: {SHOPIFY_STOREFRONT_TOKEN}
```

---

## Storefront API Authentication

- **Private access token** (server-side): Used by Express proxy. Never exposed to client. Higher complexity limits.
- **Public access token** (client-side): Not needed — all requests go through Express proxy.
- **Tokenless**: Available for products/cart but has 1,000 complexity limit. Not recommended for production.

**Stiri uses private token via server proxy** — most secure, no token exposure to client.

---

## Rate Limits

- Storefront API has **no request rate limits** (designed for storefront traffic)
- **Query complexity limit**: 1,000 (tokenless) or higher (with token)
- Use pagination (`first: 20` max recommended) to stay under complexity limits
- Cache product queries server-side to reduce redundant API calls

---

## Core GraphQL Operations

### Fetch Products (Trending)

```graphql
query getTrendingProducts($first: Int!) {
  products(first: $first, sortKey: CREATED_AT, reverse: true) {
    edges {
      node {
        id
        title
        handle
        description
        vendor
        productType
        tags
        priceRange {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
        compareAtPriceRange {
          minVariantPrice { amount currencyCode }
        }
        featuredImage { url altText width height }
        images(first: 5) {
          edges { node { url altText } }
        }
        variants(first: 10) {
          edges {
            node {
              id title sku availableForSale quantityAvailable
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
              selectedOptions { name value }
              image { url altText }
            }
          }
        }
        availableForSale
      }
    }
  }
}
```

### Fetch Single Product

```graphql
query getProduct($handle: String!) {
  productByHandle(handle: $handle) {
    id title handle description
    priceRange { minVariantPrice { amount currencyCode } }
    featuredImage { url altText }
    images(first: 10) { edges { node { url altText } } }
    variants(first: 20) {
      edges {
        node {
          id title
          price { amount currencyCode }
          availableForSale
          selectedOptions { name value }
        }
      }
    }
  }
}
```

### Search Products

```graphql
query searchProducts($query: String!, $first: Int!) {
  products(first: $first, query: $query) {
    edges {
      node {
        id title handle
        priceRange { minVariantPrice { amount currencyCode } }
        featuredImage { url altText }
      }
    }
  }
}
```

Example filters: `tag:Indian Festive`, `product_type:Ethnic Wear`, `vendor:Stiri`, `available_for_sale:true`

### Cart Create

```graphql
mutation cartCreate($input: CartInput!) {
  cartCreate(input: $input) {
    cart {
      id checkoutUrl totalQuantity
      cost {
        totalAmount { amount currencyCode }
        subtotalAmount { amount currencyCode }
      }
      lines(first: 50) {
        edges {
          node {
            id quantity
            merchandise {
              ... on ProductVariant {
                id title
                product { title featuredImage { url } }
                price { amount currencyCode }
              }
            }
            cost { totalAmount { amount currencyCode } }
          }
        }
      }
    }
    userErrors { field message }
  }
}
```

### Cart Add Lines

```graphql
mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart {
      id totalQuantity
      cost { totalAmount { amount currencyCode } }
      lines(first: 50) {
        edges {
          node {
            id quantity
            merchandise {
              ... on ProductVariant {
                id title
                product { title }
                price { amount currencyCode }
              }
            }
          }
        }
      }
    }
    userErrors { field message }
  }
}
```

### Cart Update Lines

```graphql
mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
  cartLinesUpdate(cartId: $cartId, lines: $lines) {
    cart { id totalQuantity cost { totalAmount { amount } } }
    userErrors { field message }
  }
}
```

### Cart Remove Lines

```graphql
mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
    cart { id totalQuantity }
    userErrors { field message }
  }
}
```
