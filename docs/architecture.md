# Stiri — Architecture Reference

> Single source of truth for system architecture. Updated as the codebase evolves.

---

## 1. System Overview

Stiri is an AI-powered fashion try-on and template marketplace. Users upload selfies, pick templates (clothing/scenes), and receive AI-generated composite images. Products are sold through a headless Shopify integration.

```
┌──────────────────────────────────────────────────────────┐
│                     CLIENT (SPA)                         │
│  React 18 + TypeScript + Vite + Tailwind CSS             │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐  │
│  │   Auth    │ │ Templates │ │  Shopify  │ │  Profile  │  │
│  │  Modal    │ │ Execution │ │Cart/Shop  │ │Onboarding │  │
│  └────┬─────┘ └─────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       └──────────────┼───────────┼──────────────┘        │
│                      ▼           ▼                       │
│              Services Layer (fetch + credentials)        │
└─────────────────────┬────────────┬───────────────────────┘
                      │  HTTPS     │
┌─────────────────────▼────────────▼───────────────────────┐
│                  EXPRESS SERVER (Node 20)                 │
│  Single-origin: serves API + static SPA from /public     │
│  ┌─────────┐ ┌──────────┐ ┌───────┐ ┌────────────────┐  │
│  │  Auth   │ │ Generate │ │Shopify│ │   Templates    │  │
│  │ Routes  │ │  Route   │ │Proxy  │ │  + Realtime    │  │
│  └────┬────┘ └────┬─────┘ └───┬───┘ └───────┬────────┘  │
│       │           │           │              │           │
│  ┌────▼───────────▼───────────▼──────────────▼────────┐  │
│  │            Shared Libraries                        │  │
│  │  auth.js · cache.js · shopify.js · logger.js       │  │
│  │  cors.js · cookies.js · ratelimit.js               │  │
│  └────────────────────┬───────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
  ┌──────────┐   ┌───────────┐   ┌──────────┐
  │ Supabase │   │  Shopify  │   │  Gemini  │
  │ Postgres │   │ Storefront│   │   API    │
  │ + Auth   │   │    API    │   │(AI Gen)  │
  │ + Storage│   │           │   │          │
  └──────────┘   └───────────┘   └──────────┘
```

---

## 2. Monorepo Structure

```
stiriapp/                     # npm workspaces root
├── package.json              # workspaces: [web, server]
├── .claude/                  # AI agent skills + plugins
│   ├── skills/               # 5 skills (TDD, PRD, architecture, etc.)
│   └── plugins/              # 3 plugins (code-review, frontend-design, security)
├── docs/                     # Project documentation
├── server/                   # Express backend (ESM, Node 20)
│   ├── src/
│   │   ├── app.js            # Express app factory + all route registration
│   │   ├── server.js         # HTTP listener (port binding)
│   │   ├── lib/              # Shared utilities (auth, cache, shopify, etc.)
│   │   └── routes/           # One file per feature domain
│   ├── public/               # Built SPA assets (copied from web/dist)
│   ├── scripts/              # Build utilities
│   └── supabase/
│       └── migrations/
│           └── 000_schema.sql  # Single idempotent migration
└── web/                      # React SPA (TypeScript + Vite)
    ├── App.tsx               # Root component: routing, auth, global state
    ├── config.ts             # All runtime configuration constants
    ├── types/index.ts        # Centralized TypeScript interfaces
    ├── data/constants.ts     # Static data (PRICING_PLANS, STACKS)
    ├── features/             # Feature modules
    │   ├── auth/             # AuthModal, authService
    │   ├── camera/           # SmartSelfieModal, UploadZone
    │   ├── layout/           # Header, navigation
    │   ├── pages/            # Home, route-level pages
    │   ├── payments/         # Razorpay integration
    │   ├── profile/          # Profile, onboarding
    │   ├── shop/             # CartDrawer, ProductDetailModal, shopifyService, wishlistService
    │   └── templates/        # TrendingCarousel, TemplateGrid, TemplateExecution
    ├── shared/
    │   ├── hooks/            # useWishlist, useImagePaste, etc.
    │   ├── ui/               # Icons, Spinner, shared components
    │   └── utils/            # Utility functions
    └── public/               # Static assets (images, icons, robots.txt)
```

---

## 3. Database Schema (Supabase Postgres)

All tables live in `public` schema. RLS is enabled on every table.

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profile + preferences + subscription state | `id` (FK auth.users), `account_type`, `monthly_quota/used`, `extra_credits`, `shopify_cart_id` |
| `user_addresses` | Saved delivery addresses | `user_id`, `address_line`, `lat/lng`, `is_default` |
| `subscriptions` | Payment records (Razorpay) | `user_id`, `plan_id`, `razorpay_order_id`, `status` |
| `payment_logs` | Audit trail for all payment events | `event_type`, `razorpay_order_id`, `metadata` (JSONB) |
| `idempotency_keys` | Prevents duplicate payment processing | `key` (UNIQUE), `response` (JSONB), `expires_at` |
| `generated_images` | User's AI generation gallery | `user_id`, `storage_path`, `template_id`, `mode` |
| `templates` | Product templates (= Shopify products) | `id` = Shopify handle, `stack_id`, `prompt`, `trending`, `is_active` |
| `user_wishlist` | Saved favorite templates | `user_id`, `template_id`, UNIQUE constraint |

**Key relationships:**
- `template.id` IS the Shopify product handle (no separate `shopify_handle` column)
- `profiles.id` → `auth.users.id` (1:1)
- Database functions: `compute_onboarding_steps()`, `handle_new_user()` (trigger), `reset_monthly_quotas()` (cron)

---

## 4. API Routes

All routes are registered in `server/src/app.js`.

### Auth (`/auth/`)
| Method | Path | Handler | Auth |
|--------|------|---------|------|
| POST | `/auth/logout` | `logoutHandler` | Yes |
| GET | `/auth/me` | `meHandler` | Yes |
| POST | `/auth/switch` | `switchAccountHandler` | Yes |
| POST | `/auth/otp/send` | `sendOtpHandler` | No |
| POST | `/auth/otp/verify` | `verifyOtpHandler` | No |
| GET/POST | `/auth/webhook/whatsapp` | WhatsApp webhook | No |

### Core API (`/api/`)
| Method | Path | Handler | Auth |
|--------|------|---------|------|
| POST | `/api/generate` | `generateHandler` | Yes |
| POST | `/api/create-order` | `createOrderHandler` | Yes |
| POST | `/api/verify-payment` | `verifyPaymentHandler` | Yes |
| GET | `/api/user-subscription` | `userSubscriptionHandler` | Yes |
| POST | `/api/webhook` | `webhookHandler` (Razorpay) | No |
| GET | `/api/health` | `healthHandler` | No |

### Profile (`/api/profile/`)
| Method | Path | Auth |
|--------|------|------|
| GET/PUT | `/api/profile` | Yes |
| GET/POST | `/api/profile/addresses` | Yes |
| PUT/DELETE | `/api/profile/addresses/:id` | Yes |
| PUT | `/api/profile/addresses/:id/default` | Yes |
| GET | `/api/profile/generations` | Yes |
| DELETE | `/api/profile/generations/:id` | Yes |
| DELETE | `/api/profile/generations` | Yes |

### Shopify (`/api/shopify/`)
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/shopify/products` | No |
| GET | `/api/shopify/product/:handle` | No |
| POST | `/api/shopify/products/batch` | No |
| POST | `/api/shopify/cart` | No |
| GET | `/api/shopify/cart/:id` | No |
| POST/PUT/DELETE | `/api/shopify/cart/lines` | No |

### Templates (`/api/templates/`)
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/templates` | No |
| GET | `/api/templates/trending` | No |
| GET | `/api/templates/:id` | No |
| GET | `/api/templates/stream` | No (SSE) |

### Wishlist (`/api/wishlist/`)
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/wishlist` | Yes |
| POST | `/api/wishlist` | Yes |
| DELETE | `/api/wishlist/:templateId` | Yes |

### Geocoding (`/api/`)
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/geocode` | No |
| GET | `/api/places/autocomplete` | No |
| GET | `/api/places/details` | No |

---

## 5. Frontend Architecture

### Component Hierarchy

```
App.tsx (global state, routing, modals)
├── Header (nav, cart badge, auth triggers)
├── Routes
│   ├── Home
│   │   ├── TrendingCarousel (hero templates with heart icons)
│   │   └── StackGrid (category cards)
│   ├── StackPage → TemplateGrid
│   └── TemplatePage → TemplateExecution
│       ├── UploadZone (selfie + wearable)
│       └── SmartSelfieModal (MediaPipe face detection)
├── Modals
│   ├── AuthModal (WhatsApp OTP login)
│   ├── CartDrawer (Cart/Wishlist tabs, Shopify checkout)
│   ├── ProductDetailModal (full product view + heart icon)
│   ├── OnboardingModal (5-step profile setup)
│   └── PricingModal (Razorpay payment flow)
└── ProfileDrawer (user settings, generation gallery)
```

### State Management

No external state library. State flows top-down from `App.tsx`:

| State | Source | Consumers |
|-------|--------|-----------|
| `user` | Supabase Auth | All authenticated features |
| `templates` | `useTemplates()` hook + SSE | Home, TrendingCarousel, routing |
| `wishlist` | `useWishlist()` hook | CartDrawer, TrendingCarousel, TemplateExecution, ProductDetailModal |
| `cartCount` | Shopify cart API | Header badge, CartDrawer |
| `selectedTemplate` | URL routing | TemplateExecution |
| `selectedProductHandle` | Event handlers | ProductDetailModal |

### Service Layer Pattern

All API calls follow the same pattern:
```typescript
const response = await fetch(`${CONFIG.API.BASE_URL}/api/endpoint`, {
  credentials: 'include',  // cookie-based auth
  headers: { 'Content-Type': 'application/json' },
});
```

Services: `authService`, `shopifyService`, `wishlistService`, `geminiService`

---

## 6. Key Integrations

### Supabase
- **Auth**: WhatsApp OTP via custom provider, cookie-based sessions
- **Database**: Postgres with RLS, admin client for server-side writes
- **Storage**: Generated image storage bucket
- **Realtime**: Templates table subscription → SSE broadcast to clients

### Shopify (Headless)
- **Storefront API**: GraphQL for products, cart CRUD
- **Product ↔ Template**: `template.id` = Shopify product handle (1:1 mapping)
- **Cart**: Anonymous carts stored in Shopify, cart ID persisted in user profile
- **Checkout**: Shopify-hosted checkout (redirect to `cart.checkoutUrl`)
- **Caching**: Products cached 30s server-side, templates cached 10min (invalidated by Realtime)

### Razorpay
- **Order flow**: Create order → frontend captures payment → verify signature → update subscription
- **Idempotency**: Duplicate prevention via `idempotency_keys` table
- **Webhooks**: `/api/webhook` for async payment confirmation

### Google Gemini
- **Model**: `gemini-3.1-flash-image-preview`
- **Flow**: Selfie + template prompt → Gemini generates composite image → stored in Supabase Storage

### MediaPipe
- **Face Detection**: Client-side via `blaze_face_short_range` model
- **Smart Selfie**: Guides user to center face with proper tilt/yaw/pitch

---

## 7. Build & Deploy

```bash
# Development
npm --prefix web run dev        # Vite dev server (HMR)
npm --prefix server start       # Express server

# Production build
npm run build                   # web install → web build → copy dist to server/public
npm start                       # Express serves SPA + API from single origin
```

**Single-origin deployment**: Express serves both API routes and the built SPA from `server/public/`. SPA fallback returns `index.html` for all non-API paths.

---

## 8. Environment Variables

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin access |
| `SUPABASE_ANON_KEY` | Client-side public key |
| `SHOPIFY_STORE_DOMAIN` | e.g., `store.myshopify.com` |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Storefront API token |
| `RAZORPAY_KEY_ID` | Payment gateway key |
| `RAZORPAY_KEY_SECRET` | Payment gateway secret |
| `GEMINI_API_KEY` | Google AI API key |
| `WHATSAPP_TOKEN` | WhatsApp Business API token |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp sender ID |
| `GOOGLE_MAPS_API_KEY` | Geocoding + Places API |
| `BODY_LIMIT_MB` | Express body parser limit (default: 35) |
| `PROFILE_REVALIDATION_THROTTLE_MS` | Profile refresh interval (default: 15000) |

---

## 9. Security Model

- **Authentication**: Supabase Auth with cookie-based JWT sessions
- **Authorization**: Row-Level Security on all tables; server uses `getUserFromRequest()` pattern
- **CORS**: Custom middleware in `lib/cors.js`
- **Rate Limiting**: Per-IP limits on generate (20/min) and order (10/min) endpoints
- **Input Validation**: File type/size validation, base64 length limits, sanitized SQL via Supabase client
- **Payment Security**: Razorpay signature verification, idempotency keys, audit logging
- **Cart Isolation**: Anonymous Shopify carts, cart ID stored per-user in profiles
