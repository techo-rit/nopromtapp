# Stiri — Master AI Development Instructions

> This file is the single entry point for all AI-assisted development on the Stiri codebase.
> Reference this file at the start of any new chat session to bootstrap full project context.

---

## 1. Project Identity

**Stiri** is an AI-powered fashion try-on and template marketplace. Users upload selfies, pick templates (clothing/scenes), and receive AI-generated composite images. Products are sold through a headless Shopify integration with Razorpay payments.

**Tech stack**: React 18 + TypeScript + Vite + Tailwind (frontend), Express + Node 20 ESM (backend), Supabase (Postgres + Auth + Storage + Realtime), Shopify Storefront API, Google Gemini AI, MediaPipe face detection, Razorpay payments.

**Monorepo**: npm workspaces — `web/` (SPA) and `server/` (API + static hosting).

---

## 2. Required Reading

Before making ANY code changes, read the relevant documentation:

| Document | Path | When to Read |
|----------|------|-------------|
| **Architecture** | [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) | Always — system overview, component hierarchy, integrations |
| **Coding Conventions** | [`docs/CODING_CONVENTIONS.md`](../docs/CODING_CONVENTIONS.md) | Always — patterns, anti-patterns, naming |
| **Database Reference** | [`docs/DATABASE_REFERENCE.md`](../docs/DATABASE_REFERENCE.md) | Any DB/schema work |
| **API Contracts** | [`docs/API_CONTRACTS.md`](../docs/API_CONTRACTS.md) | Any API route work |
| **Known Pitfalls** | [`docs/KNOWN_PITFALLS.md`](../docs/KNOWN_PITFALLS.md) | Always — critical bugs to avoid repeating |
| **Shopify Integration** | [`docs/SHOPIFY_INTEGRATION.md`](../docs/SHOPIFY_INTEGRATION.md) | Any Shopify/cart/product work |
| **Personalization Model** | [`docs/PERSONALIZATION_MODEL.md`](../docs/PERSONALIZATION_MODEL.md) | Any recommendation/personalization work |

---

## 3. Critical Rules (Non-Negotiable)

### Architecture
- **Single-origin deployment**: Express serves both API and SPA. No separate frontend hosting.
- **No external state management**: No Redux, Zustand, Jotai, etc. State flows from `App.tsx` via props.
- **No ORMs**: Use Supabase JS client only. `createAdminClient()` for server writes.
- **Template ID = Shopify handle**: `template.id` IS the Shopify product handle. No separate `shopify_handle` column.

### Code Hygiene
- **`constants.ts` must stay small** (~70 lines): Only `PRICING_PLANS` and `STACKS`. All template data comes from Supabase.
- **Never re-add removed columns**: `shopify_handle`, `negative_prompt`, `style_preset` are gone permanently.
- **Cart loop prevention**: Never increment `refreshTrigger` inside `handleCartUpdate`. See `docs/KNOWN_PITFALLS.md`.

### Security
- All authenticated endpoints use `getUserFromRequest(req, res)` pattern.
- RLS is enabled on all tables. Server uses `createAdminClient()` to bypass RLS when needed.
- Razorpay signature verification is mandatory. Never skip it.
- Input validation at system boundaries (file types, sizes, base64 lengths).

### Schema Changes
- All schema changes go in `server/supabase/migrations/000_schema.sql` (idempotent, single file).
- Update `docs/DATABASE_REFERENCE.md` when modifying schema.
- Update `web/types/index.ts` when adding/removing fields.

---

## 4. Development Workflow

### Adding a New Feature
1. Read `docs/ARCHITECTURE.md` to understand where it fits
2. Check `docs/KNOWN_PITFALLS.md` to avoid past mistakes
3. Server: Create route handler in `server/src/routes/`, register in `app.js`
4. Frontend: Create service in `features/<domain>/`, hook in `shared/hooks/`, wire in `App.tsx`
5. Update `docs/API_CONTRACTS.md` for new endpoints
6. Build verify: `cd web && npx vite build`

### Adding a New DB Table
1. Add to `server/supabase/migrations/000_schema.sql`
2. Add RLS policies
3. Add indexes
4. Update `docs/DATABASE_REFERENCE.md`
5. Add TypeScript types in `web/types/index.ts`

### Modifying Shopify Integration
1. Read `docs/SHOPIFY_INTEGRATION.md` first
2. Products are proxied through `server/src/routes/shopify.js` + `server/src/lib/shopify.js`
3. Cache TTL: Products 30s, Cart never cached
4. Test with real Shopify Storefront API (not mocked)

### Build & Deploy
```bash
npm run build     # web install → web build → copy to server/public
npm start         # Express serves everything
```

---

## 5. Skills & Plugins Reference

This project has specialized AI skills and plugins in `.claude/`. Use them when applicable.

### Skills (`.claude/skills/`)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| **tdd** | "write tests", "TDD", "red-green-refactor" | Test-driven development with vertical slices. Includes test patterns, mocking guidelines, interface design docs. |
| **grill-me** | "grill me", "stress-test this plan" | Interview-style design review. Walks through every decision branch. |
| **write-a-prd** | "write a PRD", "plan this feature" | Creates a Product Requirements Document through user interview + codebase exploration. |
| **prd-to-issues** | "break this into issues", "create tickets" | Converts a PRD into independently-grabbable GitHub issues as vertical slices. |
| **improve-codebase-architecture** | "improve architecture", "find refactoring opportunities" | Explores codebase for module-deepening opportunities. Spawns parallel agents for competing designs. |

### Plugins (`.claude/plugins/`)

| Plugin | Purpose |
|--------|---------|
| **code-review** | Automated PR code review: CLAUDE.md compliance, bug detection, high-signal issue flagging. |
| **frontend-design** | Distinctive, production-grade frontend UI generation. Anti-generic-AI-aesthetic guidelines. |
| **security-guidance** | PreToolUse hook that detects security patterns when editing files. |

---

## 6. Session Memory Protocol

**IMPORTANT**: At the start of every new chat session that references this file:

1. **Check memory**: Read `/memories/repo/` for persisted project context from prior sessions.
2. **Load context**: The architecture, conventions, and pitfalls docs contain the accumulated knowledge.
3. **Update memory**: After significant changes (new features, schema changes, bug fixes), update `/memories/repo/stiri-project-state.md` with:
   - What was changed
   - Any new pitfalls discovered
   - Current state of in-progress features

This ensures continuity across sessions without re-exploring the entire codebase.

### What to Persist in Memory
- New anti-patterns discovered during development
- Schema changes and their rationale
- Feature completion status for multi-session work
- Build/deploy issues and their solutions
- Integration quirks (Shopify, Supabase, Razorpay, Gemini)

---

## 7. File Quick Reference

### Server Entry Points
- `server/src/app.js` — Express app factory, all route registration
- `server/src/server.js` — HTTP listener
- `server/src/lib/auth.js` — `getUserFromRequest()`, `createAdminClient()`
- `server/src/lib/shopify.js` — Shopify Storefront API GraphQL client + cache
- `server/src/lib/cache.js` — In-memory TTL cache

### Frontend Entry Points
- `web/App.tsx` — Root component, routing, global state, all modal/drawer orchestration
- `web/config.ts` — All runtime configuration
- `web/types/index.ts` — All TypeScript interfaces
- `web/data/constants.ts` — PRICING_PLANS + STACKS only

### Key Feature Files
- `web/features/shop/CartDrawer.tsx` — Cart + Wishlist tabbed drawer
- `web/features/shop/ProductDetailModal.tsx` — Full product detail modal
- `web/features/shop/shopifyService.ts` — Cart & product API client
- `web/features/shop/wishlistService.ts` — Wishlist API client
- `web/features/templates/TrendingCarousel.tsx` — Hero trending templates
- `web/features/templates/TemplateExecution.tsx` — AI generation page
- `web/features/auth/AuthModal.tsx` — WhatsApp OTP login
- `web/features/camera/SmartSelfieModal.tsx` — MediaPipe face-guided selfie

### Schema
- `server/supabase/migrations/000_schema.sql` — Single idempotent migration (all tables, RLS, functions, triggers, cron)

---

## 8. Quality Checklist

Before completing any task, verify:

- [ ] `cd web && npx vite build` passes cleanly
- [ ] No TypeScript errors in modified files
- [ ] New API endpoints documented in `docs/API_CONTRACTS.md`
- [ ] Schema changes reflected in `docs/DATABASE_REFERENCE.md` and `web/types/index.ts`
- [ ] No hardcoded template data added to `constants.ts`
- [ ] Auth-required endpoints use `getUserFromRequest()` pattern
- [ ] Shopify-related changes respect cache TTL settings
- [ ] No infinite-loop patterns in state management
