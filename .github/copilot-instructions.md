# Copilot Instructions: NoPromt App

AI virtual try-on app (React 19 + TypeScript + Vite) on Vercel. Supabase handles auth + credits; Razorpay (INR) handles payments; Gemini runs server-side only.

## Architecture
- **Client SPA**: React Router v7 routes `/`, `/stack/:stackId`, `/template/:templateId` in `App.tsx`. Props drill-down only — no Redux/Zustand.
- **Content source of truth**: `constants.ts` exports `STACKS`, `TEMPLATES`, `TEMPLATES_BY_ID` (Map for O(1) lookups), `PRICING_PLANS`, `TRENDING_TEMPLATE_IDS`. Never move to DB.
- **Config split**: Client uses `config.ts` (`CONFIG.UPLOAD`, `CONFIG.SUPABASE`, `CONFIG.GEMINI`). Server uses `api/_lib/serverConfig.ts` with parallel definitions. Keep both in sync.
- **API routes**: Vercel serverless in `api/` (30s timeout). Shared utilities in `api/_lib/` (`logger.ts`, `ratelimit.ts`, `serverConfig.ts`).

## Generation Flow
1. Client: `services/geminiService.ts` converts File → data URL → `POST /api/generate` with Bearer token
2. Server: `api/generate.ts` verifies JWT via service-role Supabase → rate-limits → checks `profiles.credits` → deducts via RPC `deduct_credits` → calls `@google/genai` (`gemini-2.5-flash-image`) → returns `images[]` data URLs
3. Validation: Server enforces MIME whitelist (`jpeg|png|webp|gif`) + size ≤10MB. Prompts truncated to 100K chars.

## Auth Pattern
- Always use `services/authService.ts` wrapper (delegates to `supabaseAuthService`). Never import Supabase client directly in components.
- `App.tsx` subscribes to `onAuthStateChange` and passes `user` prop downstream.
- `TemplateExecution.tsx` gates actions via `onLoginRequired` callback. `fitit` stack requires selfie + wearable; all others need only selfie.

## Payments (Razorpay INR)
- Plans mirrored: `constants.ts` (client) ↔ `api/_lib/serverConfig.ts` (server). Keep IDs/amounts in sync.
- Flow: `POST /api/create-order` → Razorpay checkout modal → `POST /api/verify-payment` (HMAC verify, atomic credit add via `add_user_credits`)
- Payment endpoints use **fail-closed** rate limiting (deny if Redis unavailable).

## Rate Limiting
- Upstash Redis sliding windows. Generate: 20 req/60s. Orders: 10 req/60s per user.
- Generate endpoint: fail-open (allow if Redis down). Payment endpoints: fail-closed (deny if Redis down).
- Pattern: `const limiter = getGenerateRateLimiter(); await checkRateLimit(limiter, userId);`

## Key Patterns
```typescript
// O(1) template lookup (not array.find)
const template = TEMPLATES_BY_ID.get(templateId);

// Structured logging in API routes
const log = createLogger(generateRequestId(), userId);
log.info('Action', { key: value });

// JWT verification - never trust userId from request body
const { data: { user } } = await supabase.auth.getUser(token);
```

## Styling
- Tailwind 4 with custom palette in `index.css`: bg `#0a0a0a`, text `#f5f5f5`, accent `#c9a962`.
- Mobile-first with safe-area insets. Camera permissions enabled via `vercel.json` headers.

## Commands
```bash
npm install && npm run dev  # localhost:5173
npm run build               # production for Vercel
```

## Guardrails
- ❌ Never import `@google/genai` client-side — always use `/api/generate`
- ❌ Never trust `userId` from request body — derive from verified JWT only
- ❌ Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
- ✅ Enforce upload limits (MIME + ≤10MB) on both client and server
- ✅ Use `TEMPLATES_BY_ID.get()` for O(1) lookups, not array scans
