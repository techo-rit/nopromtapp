# Copilot Instructions: NoPromp App

AI image generation app (React + TypeScript + Vite) for virtual try-on using Google Gemini 2.5 Flash. Deploys on Vercel with Supabase auth and Razorpay payments.

## Architecture (Critical)

- **Server-side AI only**: Never import `@google/genai` in client code. All Gemini calls go through [api/generate.ts](api/generate.ts) using `process.env.GEMINI_API_KEY`
- **Constants = source of truth**: Templates, stacks, pricing live in [constants.ts](constants.ts). No database for content—edit constants directly
- **No state libraries**: Props flow from [App.tsx](App.tsx) via prop drilling. Auth state via `user` prop, navigation via React Router params

## Data Flow

```
Client upload -> services/geminiService.ts (base64 encode) -> POST /api/generate -> Gemini API -> base64 image response
```

Credit deduction happens in `/api/generate` via Supabase RPC `deduct_credits` before generation.

## Key Patterns

| Pattern | Implementation |
|---------|----------------|
| Dual upload (Fitit stack) | Check `stack.id === "fitit"` -> show selfie + garment zones |
| Paste-to-upload | Global paste handler in [components/TemplateExecution.tsx](components/TemplateExecution.tsx) |
| Refs for event listeners | Store state in refs for stable callbacks (see `selfieImageRef` pattern) |
| Smart selfie | MediaPipe face detection in [components/SmartSelfieModal.tsx](components/SmartSelfieModal.tsx) |

## Commands

```bash
npm install && npm run dev  # Vite dev server at localhost:5173
npm run build               # Production build (Vercel auto-deploys)
```

## Environment Variables

**Client** (`.env.local`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Server** (`api/*`): `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`

## Styling

Tailwind with custom palette in [index.css](index.css): `--color-bg: #0a0a0a`, `--color-text-primary: #f5f5f5`, `--color-border: #2a2a2a`. Mobile-first with safe area insets and `overscroll-behavior: none`.

## API Routes (Vercel Serverless)

- `POST /api/generate` — AI generation (requires Bearer token, deducts 1 credit)
- `POST /api/create-order` — Razorpay order creation
- `POST /api/verify-payment` — HMAC signature verification + credit update
- `POST /api/webhook` — Razorpay async events (idempotency protected)

## Don't

- Import `@google/genai` client-side
- Add Redux/Zustand/state libraries
- Move templates to database
- Expose `SUPABASE_SERVICE_ROLE_KEY` to client
- Skip auth checks before generation (`!user` guard required)
- Call Razorpay without signature verification
