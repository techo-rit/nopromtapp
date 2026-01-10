# Copilot Instructions: NoPromt App

AI image generation app (React 19 + TypeScript + Vite) for virtual try-on using Google Gemini. Deploys on Vercel with Supabase auth and Razorpay payments (INR).

## Architecture (Critical)

- **Server-side AI only**: Never import `@google/genai` in client code. All Gemini calls go through [api/generate.ts](api/generate.ts) using `process.env.GEMINI_API_KEY`
- **Constants = source of truth**: Templates, stacks, pricing live in [constants.ts](constants.ts) (~5800 lines). No database for content—edit constants directly
- **No state libraries**: Props flow from [App.tsx](App.tsx) via prop drilling. Auth state via `user` prop, navigation via React Router params
- **Service layer abstraction**: [services/authService.ts](services/authService.ts) wraps [services/supabaseAuthService.ts](services/supabaseAuthService.ts)—always use `authService` in components

## Data Flow

```
Client upload → geminiService.ts (FileReader→base64) → POST /api/generate (Bearer token)
  → verifyAuthAndCredits() → deduct_credits RPC → Gemini API → base64 images[]
```

Credit deduction happens **before** generation via Supabase RPC `deduct_credits` to prevent abuse.

## Key Patterns

| Pattern | Implementation |
|---------|----------------|
| Dual upload (Fitit stack) | Check `stack.id === "fitit"` → show selfie + garment zones in [TemplateExecution.tsx](components/TemplateExecution.tsx) |
| Paste-to-upload | Global paste handler + `usePaste` hook. Uses refs pattern for stable callbacks (`selfieImageRef`, `isLoadingRef`) |
| Smart selfie | MediaPipe face detection in [SmartSelfieModal.tsx](components/SmartSelfieModal.tsx) |
| Auth guard | Always check `if (!user) { onLoginRequired?.(); return; }` before protected actions |
| Image validation | Client: [config.ts](config.ts) `CONFIG.UPLOAD`. Server: MIME whitelist + size check in [api/generate.ts](api/generate.ts) |
| Lazy rate limiters | `getOrderRateLimiter()` / `getGenerateRateLimiter()` create instances on first call |

## Commands

```bash
npm install && npm run dev  # Vite dev server at localhost:5173
npm run build               # Production build (Vercel auto-deploys)
```

## Environment Variables

**Client** (`.env.local`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Server** (`api/*`): `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`

**Redis** (Vercel Upstash integration): `KV_REST_API_URL`, `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`)

## Rate Limiting

Redis-backed via Upstash sliding window (persists across serverless cold starts). See [lib/ratelimit.ts](lib/ratelimit.ts):
- `/api/create-order`: 10 requests/60s per user
- `/api/generate`: 20 requests/60s per user

## Styling

Tailwind 4 with custom palette in [index.css](index.css): `--color-bg: #0a0a0a`, `--color-text-primary: #f5f5f5`, `--color-accent: #c9a962`. Mobile-first with safe area insets.

## API Routes (Vercel Serverless)

All routes verify JWT via `supabase.auth.getUser(token)` with service role key:
- `POST /api/generate` — AI generation (deducts 1 credit atomically)
- `POST /api/create-order` — Razorpay order creation
- `POST /api/verify-payment` — HMAC SHA256 signature verification + credit update
- `POST /api/webhook` — Razorpay async events (signature verified separately)

## Adding Templates

1. Add entry to `TEMPLATES` array in [constants.ts](constants.ts) with `id`, `name`, `stackId`, `imageUrl`, `prompt`, `aspectRatio`, `keywords`
2. For trending: add ID to `TRENDING_TEMPLATE_IDS` array
3. Place cover image in `public/images/`

## Don't

- Import `@google/genai` client-side
- Add Redux/Zustand/other state libraries
- Move templates to database
- Expose `SUPABASE_SERVICE_ROLE_KEY` to client
- Skip auth checks before generation (`!user` guard required)
- Call Razorpay without HMAC signature verification
- Trust `userId` from request body—always extract from verified JWT
