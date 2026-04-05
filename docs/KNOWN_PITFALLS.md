# Stiri — Known Pitfalls & Historical Bugs

> Lessons learned from production incidents and recurring development mistakes. Read before modifying critical paths.

---

## Cart Infinite Loop (CRITICAL)

**Symptom**: CartDrawer fetches cart endlessly, infinite network requests.

**Root Cause**: `handleCartUpdate` was incrementing `refreshTrigger` state on every call. CartDrawer's `useEffect` depended on `refreshTrigger`, causing a re-fetch which called `handleCartUpdate` again → infinite loop.

**Fix**: Split into two functions:
- `handleCartUpdate(totalQuantity)` — updates cart count only, no state that triggers re-fetch
- `triggerCartRefresh()` — increments refreshTrigger, called ONLY from explicit user actions (e.g., ProductDetailModal add-to-cart)

**Rule**: Never increment a re-fetch trigger inside a callback that runs as a result of that fetch.

---

## constants.ts Bloat

**Symptom**: `web/data/constants.ts` balloons to 4000+ lines with hardcoded template arrays.

**Root Cause**: Templates were originally hardcoded, then migrated to Supabase. Automated formatters and AI assistants sometimes restore the old arrays.

**Fix**: `constants.ts` should contain ONLY `PRICING_PLANS` and `STACKS` (~70 lines). All template data comes from the database via `/api/templates`.

**Rule**: If `constants.ts` exceeds 200 lines, something is wrong.

---

## shopify_handle Column Ghost

**Symptom**: Code references `template.shopifyHandle` — always returns `undefined`.

**Root Cause**: The `shopify_handle` column was removed. The template `id` IS the Shopify product handle. There is no separate mapping column.

**Fix**: Use `template.id` everywhere you need a Shopify handle. Do not add `shopify_handle` back.

---

## Removed Schema Columns

These columns were intentionally removed. Do not re-add them:
- `templates.shopify_handle` — `id` is the handle
- `templates.negative_prompt` — not used by Gemini
- `templates.style_preset` — not used by Gemini

---

## Shopify Price Staleness

**Symptom**: Product prices in the app don't match Shopify admin after updates.

**Root Cause**: Server-side product cache was initially 5 minutes.

**Fix**: Reduced to 30-second TTL. For real-time accuracy, the client can force-refresh via ProductDetailModal which always fetches fresh.

---

## Template Realtime Propagation

**Flow**: Supabase Realtime on `templates` table → server broadcasts SSE via `/api/templates/stream` → frontend `useTemplates` re-fetches.

**Gotcha**: Template list cache (10-min TTL) is invalidated by Realtime events. If Realtime subscription drops, templates may be stale for up to 10 minutes.

---

## Auth Cookie Timing

**Symptom**: `auth/me` returns 401 immediately after login.

**Root Cause**: Cookie `Set-Cookie` from OTP verify response may not be stored before the next request fires.

**Mitigation**: Small delay or retry after OTP verification before calling authenticated endpoints.
