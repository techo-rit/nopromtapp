# Copilot Instructions: NoPromt App

AI virtual try-on app (React 19 + TypeScript + Vite) on Vercel. Supabase auth/credits, Razorpay (INR) payments, Gemini AI server-side only.

## Architecture

**Routes** (React Router v7):
- `/` → `routes/Home.tsx` — stacks grid + trending carousel
- `/stack/:stackId` → `routes/StackView.tsx` — templates for a stack  
- `/template/:templateId` → `TemplateRoute` (App.tsx) → `components/TemplateExecution.tsx`

**Data Model**: `constants.ts` is the single source of truth (~5800 lines):
```typescript
// O(1) lookups — NEVER use .find() on TEMPLATES array
const template = TEMPLATES_BY_ID.get(templateId);
const stackTemplates = TEMPLATES_BY_STACK.get(stackId) ?? [];
```
Templates/stacks are versioned in code—never move to DB.

**Config Split** (keep in sync!):
- Client: `config.ts` → `CONFIG.UPLOAD`, `CONFIG.SUPABASE`, `CONFIG.FACE_DETECTION`
- Server: `api/_lib/serverConfig.ts` → `UPLOAD_CONFIG`, `GEMINI_CONFIG`, `PRICING_PLANS`
- Plan IDs (`essentials`, `ultimate`) must match in both `constants.ts` and `serverConfig.ts`

## Generation Flow

1. `TemplateExecution.tsx` → `UploadZone` collects `File` objects (selfie required, wearable for `fitit` stack)
2. `services/geminiService.ts` converts `File` → base64, calls `POST /api/generate` with `Authorization: Bearer <jwt>`
3. `api/generate.ts` pipeline:
   - Verify JWT via Supabase service role → extract `user.id` (never trust body)
   - Rate limit (fail-open if Redis unavailable)
   - **Atomic credit deduction via RPC `deduct_credits` BEFORE AI call**
   - Validate MIME (jpeg/png/webp/gif) + size (≤10MB)
   - Call Gemini (`gemini-2.5-flash-image`) → return `{ images: string[] }`

## Auth Pattern

Always use `services/authService.ts` (wraps `supabaseAuthService.ts`). Never import Supabase directly in components.

```typescript
// App.tsx manages user state via listener — props drill to children
const subscription = authService.onAuthStateChange((user) => setUser(user));
```

**Ref sync pattern** for paste handlers (avoids closure staleness):
```typescript
const selfieImageRef = useRef(selfieImage);
useEffect(() => { selfieImageRef.current = selfieImage; }, [selfieImage]);
```

## Payments (Razorpay INR)

1. `POST /api/create-order` → Razorpay `orderId`
2. Checkout callback → `POST /api/verify-payment` with HMAC signature
3. Verified → atomic RPC `add_user_credits`

## API Patterns

```typescript
// JWT verification — NEVER trust userId from request body
const { data: { user } } = await supabase.auth.getUser(token);

// Structured logging with correlation ID
const log = createLogger(requestId, userId);
log.info('Generation started', { templateId });
log.error('Failed', sanitizeError(error)); // no stack traces in prod
```

Rate limits (`api/_lib/ratelimit.ts`): Generate 20/60s (fail-open), Payment 10/60s (fail-closed).

## Environment Variables

| Scope | Variables |
|-------|-----------|
| Client (`VITE_`) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Server | `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` |

## Commands

```bash
npm install && npm run dev   # Vite dev server at localhost:5173
npm run build                # TypeScript + production build
```

## Guardrails

❌ **Never**: Import `@google/genai` client-side | Trust `userId` from request body | Use `.find()` on TEMPLATES | Move templates to DB

✅ **Always**: Use `TEMPLATES_BY_ID.get()` | Deduct credits before AI call | Validate uploads client + server | Sync plan IDs across configs
