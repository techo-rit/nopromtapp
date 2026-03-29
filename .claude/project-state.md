# Stiri Project State (Cross-Session Memory)

> Updated after significant changes. Read at start of every session that references `.claude/claude.md`.

---

## Current State (2026-03-29)

### Completed Features
- Shopify headless integration (Storefront API, cart CRUD, Shopify-hosted checkout)
- Templates migrated from hardcoded constants to Supabase DB
- Real-time template updates via SSE (Supabase Realtime → server → frontend)
- Wishlist feature: server API (GET/POST/DELETE /api/wishlist), frontend service + useWishlist hook, optimistic toggle
- Cart redesign: professional card layout with Cart/Wishlist tab switcher in CartDrawer
- Heart icon on all product surfaces: TrendingCarousel, TemplateExecution, ProductDetailModal
- Schema cleanup: removed shopify_handle, negative_prompt, style_preset columns
- Infinite cart loop fix: separated handleCartUpdate from triggerCartRefresh
- Shopify product cache TTL reduced from 5min to 30s

### Architecture Docs Created
- `docs/ARCHITECTURE.md` — Full system architecture reference
- `docs/CODING_CONVENTIONS.md` — Patterns, anti-patterns, naming
- `docs/DATABASE_REFERENCE.md` — Complete schema with RLS, triggers, indexes
- `docs/API_CONTRACTS.md` — All endpoint request/response contracts
- `docs/KNOWN_PITFALLS.md` — Historical bugs and lessons learned
- `.claude/claude.md` — Master AI instruction file referencing all docs + skills + plugins

### Critical Anti-Patterns (DO NOT REPEAT)
- constants.ts must stay ~70 lines (PRICING_PLANS + STACKS only)
- template.id IS the Shopify handle — no shopify_handle column
- Never increment refreshTrigger inside handleCartUpdate
- Schema uses single idempotent migration file: 000_schema.sql

### Build Status
- `npx vite build` passes cleanly as of 2026-03-29
- All TypeScript compiles without errors

---

## In-Progress / Planned
- Personalization model (docs/PERSONALIZATION_MODEL.md exists as design doc, not implemented)
- Event tracking for behavioral signals (user_events table not yet created)
