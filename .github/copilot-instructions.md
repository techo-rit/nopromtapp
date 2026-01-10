# Copilot Instructions: NoPromt App

AI virtual try-on app (React 19 + TypeScript + Vite) deployed on Vercel. Supabase handles auth + credits; Razorpay handles INR payments; Gemini runs server-side only.

## Architecture
- Client-side SPA in [App.tsx](App.tsx) with React Router (home, stack, template). Templates resolve through maps in [constants.ts](constants.ts); props drill down (no state libs). Navigation state cached in localStorage.
- Content source of truth is [constants.ts](constants.ts) (templates, stacks, pricing, trending IDs). Keep edits there; no DB tables for template content.
- Always call [authService.ts](services/authService.ts) (wrapper over supabaseAuthService) for login/logout/session listeners; components receive `user` via props.
- Never import @google/genai in client code. Gemini calls happen only in [api/generate.ts](api/generate.ts) using server env vars.

## Generation Flow
- Client: [geminiService.ts](services/geminiService.ts) reads `File` → data URL, fetches `/api/generate` with Supabase session bearer. Throws on non-OK with server error text.
- Server: [api/generate.ts](api/generate.ts) verifies Authorization bearer via Supabase service role, checks rate limit, fetches profile credits, deducts via RPC before generation. Validates MIME (jpeg/png/webp/gif) and 10MB cap, sanitizes prompt, calls Gemini model `gemini-2.5-flash-image`, returns image data URLs. Errors are sanitized (safety/rate/invalid/general).

## Upload UX Patterns
- [TemplateExecution.tsx](components/TemplateExecution.tsx): Fitit stack requires selfie + wearable; hover refs pick paste target; global paste is blocked during generation; auth guard via `onLoginRequired`; remix button disabled until required files exist; download helper for results.
- [UploadZone.tsx](components/UploadZone.tsx): Validates `CONFIG.UPLOAD` types and max size; supports drag/drop/paste; previews uploaded file; opens [SmartSelfieModal.tsx](components/SmartSelfieModal.tsx) for front camera or [StandardCameraModal.tsx](components/StandardCameraModal.tsx) for back camera (wearables).

## Auth & Payments
- Auth UI in [AuthModal.tsx](components/AuthModal.tsx); user state set from `authService` listener in [App.tsx](App.tsx). Guard all protected actions with `onLoginRequired` before uploads/generation.
- Upgrade flow via [PaymentModal.tsx](components/PaymentModal.tsx); server routes [api/create-order.ts](api/create-order.ts) and [api/verify-payment.ts](api/verify-payment.ts) enforce Razorpay HMAC verification and use service role keys.

## Rate Limiting & Logging
- Upstash Redis sliding windows live in [lib/ratelimit.ts](lib/ratelimit.ts); missing Redis creds fails open but logs a warning. Use `checkRateLimit(getGenerateRateLimiter(), userId)` / `getOrderRateLimiter()` before protected routes.
- Structured logging helper in [lib/logger.ts](lib/logger.ts); pass requestId and userId where possible.

## Styling & Layout
- Tailwind 4 with palette in [index.css](index.css): background `#0a0a0a`, text `#f5f5f5`, accent `#c9a962`. Mobile-first with safe-area insets; app shell uses fixed full-viewport container in [App.tsx](App.tsx).

## Commands
```
npm install
npm run dev   # localhost:5173
npm run build # Vercel prod
```

## Environment
- Client: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
- Server: GEMINI_API_KEY (or GOOGLE_API_KEY), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.
- Redis: KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_*).

## Don't
- Import @google/genai client-side or bypass server route for AI.
- Add Redux/Zustand or move constants to DB.
- Expose SUPABASE_SERVICE_ROLE_KEY or trust `userId` from request body (derive from verified token).
- Skip auth checks before generation/payments or bypass image validation (MIME whitelist + 10MB cap).
- Remove credit deduction before generation or Razorpay signature verification.
