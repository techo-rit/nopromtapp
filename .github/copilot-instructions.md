# Copilot Instructions: NoPromt App

AI virtual try-on app (React 19 + TypeScript + Vite) on Vercel. Supabase handles auth + credits; Razorpay (INR) handles payments; Gemini runs server-side only.

## Architecture
- Client SPA in [App.tsx](App.tsx) using React Router v7: `/`, `/stack/:stackId`, `/template/:templateId`. Props drill-down only — no global state libraries.
- Content source of truth: [constants.ts](constants.ts) (`STACKS`, `TEMPLATES`, `TEMPLATES_BY_ID` Map for O(1), `PRICING_PLANS`, `TRENDING_TEMPLATE_IDS`). Do not move to DB.
- Config in [config.ts](config.ts): `CONFIG.UPLOAD`, `CONFIG.SUPABASE`, `CONFIG.GEMINI`, `CONFIG.APP.CREATOR_STACKS`. Types in [types.ts](types.ts).
- Serverless routes in [api/](api/) (30s timeout) with shared libs in [api/_lib/](api/_lib/) (`logger.ts`, `ratelimit.ts`, `serverConfig.ts`). Security headers set via [vercel.json](vercel.json) (Permissions-Policy allows camera).

## Generation
- Client: [services/geminiService.ts](services/geminiService.ts) → file → data URL → POST `/api/generate` with Bearer token.
- Server: [api/generate.ts](api/generate.ts) verifies JWT via service-role Supabase, rate-limits, checks `profiles.credits`, deducts via RPC `deduct_credits`, calls `@google/genai` with `model: gemini-2.5-flash-image`, returns `images[]` data URLs.
- Image validation: server enforces MIME (`jpeg|jpg|png|webp|gif`) + size ≤10MB and base64 sanity. Prompts sanitized to 10K chars.

## Auth & UX
- Always use [services/authService.ts](services/authService.ts) wrapper (delegates to `supabaseAuthService`). `App.tsx` subscribes to `onAuthStateChange` and passes `user` downstream.
- [components/TemplateExecution.tsx](components/TemplateExecution.tsx) gates actions via `onLoginRequired`. `fitit` requires selfie + wearable; others only selfie. Hover sets paste target; paste ignored while loading/after results.
- [components/UploadZone.tsx](components/UploadZone.tsx) validates per `CONFIG.UPLOAD`; opens [SmartSelfieModal.tsx](components/SmartSelfieModal.tsx) (front cam + Mediapipe alignment) or [StandardCameraModal.tsx](components/StandardCameraModal.tsx) (back cam for wearables).

## Payments
- Plans mirrored client/server: client in [constants.ts](constants.ts), server in [api/_lib/serverConfig.ts](api/_lib/serverConfig.ts). Keep IDs and amounts in sync.
- Flow: `POST /api/create-order` (JWT, inline rate limiting, dynamic import of Razorpay) → open checkout → `POST /api/verify-payment` (HMAC signature verify, atomic update, credits via `add_user_credits`) → logs in `payment_logs`. Webhook in [api/webhook.ts](api/webhook.ts) validates signature.

## Rate Limiting
- Upstash Redis sliding windows via [api/_lib/ratelimit.ts](api/_lib/ratelimit.ts) and inline limiter in payments. If Redis unavailable or errors, checks fail closed (deny) for security.
- Defaults: Generate 20 req/60s per user; Orders 10 req/60s per user.
- Pattern: `checkRateLimit(getGenerateRateLimiter(), userId)`; payment endpoints have their own `getOrderRateLimiter()` that fails closed.

## Observability & Debugging
- Use `createLogger(generateRequestId(), userId?)` for structured JSON logs; prefer `log.withDuration()` to measure request latency.
- Health check: [api/health.ts](api/health.ts) reports Redis/Supabase status; returns 200 for healthy/degraded, 503 when unhealthy.

## Styling & Conventions
- Tailwind 4 palette in [index.css](index.css): bg `#0a0a0a`, text `#f5f5f5`, accent `#c9a962`. Mobile-first with safe-area insets.
- Keep `TEMPLATES_BY_ID` lookups O(1); do not scan arrays. Maintain `CREATOR_STACKS` IDs in [config.ts](config.ts).

## Commands
```bash
npm install
npm run dev      # localhost:5173
npm run build    # production build for Vercel
npm run preview  # preview build locally
```

## Guardrails
- Do not import `@google/genai` client-side or bypass `/api/generate`.
- Never trust `userId` from body; derive from verified JWT. Do not expose service-role keys in client.
- Enforce upload limits (MIME + ≤10MB) on both client and server.
- Do not add Redux/Zustand or move template content to DB.
