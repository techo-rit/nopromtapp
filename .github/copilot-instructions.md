# Copilot Instructions: NoPromt App

AI virtual try-on app (React 19 + TypeScript + Vite) deployed on Vercel serverless. Supabase handles auth + credits; Razorpay handles INR payments; Gemini runs server-side only.

## Architecture
- Client SPA in [App.tsx](App.tsx) with React Router v7 (home `/`, stack `/stack/:stackId`, template `/template/:templateId`). Props drill down—no Redux/Zustand.
- Content source of truth is [constants.ts](constants.ts) (~5800 lines): `STACKS`, `TEMPLATES`, `TEMPLATES_BY_ID` (Map for O(1) lookup), `PRICING_PLANS`, `TRENDING_TEMPLATE_IDS`. Edit here; no DB tables for template content.
- Config values in [config.ts](config.ts): `CONFIG.UPLOAD` (max size, MIME types), `CONFIG.SUPABASE`, `CONFIG.APP.CREATOR_STACKS`.
- Types live in [types.ts](types.ts): `Template`, `Stack`, `User`, `PricingPlan`, `Subscription`.

## Server Functions (Vercel)
- All API routes in [api/](api/) run as serverless functions with 30s timeout (see [vercel.json](vercel.json)).
- Shared helpers in [api/_lib/](api/_lib/): `ratelimit.ts` (Upstash sliding window), `logger.ts` (structured logs with requestId).
- Never import `@google/genai` client-side. Gemini calls happen only in [api/generate.ts](api/generate.ts).

## Generation Flow
```
Client: geminiService.ts → File → dataURL → POST /api/generate (Bearer token)
Server: verify JWT → rate limit → check credits → deduct via RPC → Gemini → return images[]
```
- MIME whitelist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Max 10MB.
- Model: `gemini-2.5-flash-image`. Prompts sanitized to 10K chars max.

## Auth Pattern
- Wrap Supabase in [authService.ts](services/authService.ts) (calls [supabaseAuthService.ts](services/supabaseAuthService.ts)). Always use this wrapper.
- [App.tsx](App.tsx) subscribes via `authService.onAuthStateChange`, passes `user` prop down.
- Guard uploads/generation with `onLoginRequired` callback before proceeding.

## Payment Flow
- Plans defined in both [constants.ts](constants.ts) and duplicated in [api/create-order.ts](api/create-order.ts) (keep in sync).
- Order: `POST /api/create-order` → Razorpay order → client opens Razorpay checkout → `POST /api/verify-payment` with HMAC signature.
- Webhook: [api/webhook.ts](api/webhook.ts) handles async Razorpay events; verify signature before processing.

## Upload UX
- [TemplateExecution.tsx](components/TemplateExecution.tsx): `fitit` stack needs selfie + wearable; others just selfie. Hover sets paste target via refs; global paste blocked during loading/after results.
- [UploadZone.tsx](components/UploadZone.tsx): validates via `CONFIG.UPLOAD`; opens [SmartSelfieModal.tsx](components/SmartSelfieModal.tsx) (front cam) or [StandardCameraModal.tsx](components/StandardCameraModal.tsx) (back cam for wearables).

## Rate Limiting
- Upstash Redis sliding windows. Fails open with warning if Redis not configured.
- Generate: 20 req/60s per user. Orders: 10 req/60s per user.
- Pattern: `checkRateLimit(getGenerateRateLimiter(), userId)` returns `{ success, remaining }`.

## Styling
- Tailwind 4 with palette in [index.css](index.css): bg `#0a0a0a`, text `#f5f5f5`, accent `#c9a962`.
- Mobile-first with safe-area insets. Full-viewport fixed container in App shell.

## Commands
```bash
npm install
npm run dev     # localhost:5173
npm run build   # Vercel prod
npm run preview # Preview build locally
```

## Environment Variables
| Scope  | Variables |
|--------|-----------|
| Client | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Server | `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| Redis  | `KV_REST_API_URL`, `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`) |

## Don't
- Import `@google/genai` client-side or bypass `/api/generate`.
- Add Redux/Zustand or move constants to DB.
- Trust `userId` from request body—always derive from verified JWT.
- Skip credit deduction before generation or Razorpay signature verification.
- Expose `SUPABASE_SERVICE_ROLE_KEY` in client code.
- Bypass image validation (MIME whitelist + 10MB cap).
