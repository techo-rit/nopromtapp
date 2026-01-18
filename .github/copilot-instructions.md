# Copilot Instructions: NoPromt App

AI virtual try-on app (React 19 + TypeScript + Vite) deployed on Vercel. Supabase handles auth + credits; Razorpay (INR) handles payments; Gemini AI runs server-side only.

## Architecture

**Routing**: React Router v7 with three client routes:
- `/` → [routes/Home.tsx](routes/Home.tsx) — stacks grid or trending carousel
- `/stack/:stackId` → [routes/StackView.tsx](routes/StackView.tsx) — templates for a stack
- `/template/:templateId` → `TemplateRoute` in [App.tsx](App.tsx) → [components/TemplateExecution.tsx](components/TemplateExecution.tsx)

**Data Model**: [constants.ts](constants.ts) is the single source of truth (5800+ lines):
- `STACKS`, `TEMPLATES` arrays + pre-indexed `TEMPLATES_BY_ID`, `TEMPLATES_BY_STACK` Maps
- `PRICING_PLANS`, `TRENDING_TEMPLATE_IDS`
- Templates/stacks are versioned with code—never move to DB

**Config Split**:
- Client: [config.ts](config.ts) → `CONFIG.UPLOAD`, `CONFIG.SUPABASE`, `CONFIG.FACE_DETECTION`
- Server: [api/_lib/serverConfig.ts](api/_lib/serverConfig.ts) → `UPLOAD_CONFIG`, `GEMINI_CONFIG`, `RATE_LIMIT_CONFIG`, `PRICING_PLANS`
- Keep limits/plan IDs in sync between both files

## Generation Flow

1. [TemplateExecution.tsx](components/TemplateExecution.tsx) → `UploadZone` collects `File` objects (selfie required, wearable for `fitit` stack)
2. [geminiService.ts](services/geminiService.ts) converts `File` → base64 data URL, calls `POST /api/generate`
3. Request body: `{ imageData, wearableData, templateId, templateOptions }` + `Authorization: Bearer <jwt>`
4. [api/generate.ts](api/generate.ts):
   - Verify JWT via Supabase service role → extract `user.id`
   - Rate limit check (fail-open if Redis unavailable)
   - Atomic credit deduction via RPC `deduct_credits` **before** AI call
   - Validate MIME (jpeg/png/webp/gif) + size (≤10MB)
   - Call `@google/genai` (`gemini-2.5-flash-image`) with dynamic prompt (try-on vs. remix)
   - Return `{ images: string[] }` (base64 data URLs)

## Auth & State

**Auth wrapper**: Always use [services/authService.ts](services/authService.ts) (delegates to `supabaseAuthService.ts`). Never import Supabase directly in components.

**State flow**: No Redux. `App.tsx` manages `user` state via `onAuthStateChange()` → props drill down to routes/components.

**Ref pattern** in `TemplateExecution`: Syncs state to refs for clipboard paste handlers (avoids closure staleness):
```typescript
const selfieImageRef = useRef(selfieImage);
useEffect(() => { selfieImageRef.current = selfieImage; }, [selfieImage]);
```

## Payments (Razorpay INR)

1. `POST /api/create-order` → Razorpay `orderId`
2. Razorpay checkout → `POST /api/verify-payment` with signature
3. HMAC SHA256 verification → atomic RPC `add_user_credits`

Plan IDs (`essentials`, `ultimate`) must match in both [constants.ts](constants.ts) and [api/_lib/serverConfig.ts](api/_lib/serverConfig.ts).

## Rate Limiting

[api/_lib/ratelimit.ts](api/_lib/ratelimit.ts) uses Upstash Redis sliding windows:
- **Generate**: 20 req/60s (fail-open)
- **Payment**: 10 req/60s (fail-closed)

## Key Patterns

```typescript
// O(1) template lookup — never use .find() on TEMPLATES array
const template = TEMPLATES_BY_ID.get(templateId);
const stackTemplates = TEMPLATES_BY_STACK.get(stackId) ?? [];

// JWT verification — never trust userId from request body
const { data: { user } } = await supabase.auth.getUser(token);

// Structured logging with correlation
const log = createLogger(requestId, userId);
log.info('Generation started', { templateId });
log.error('Failed', sanitizeError(error)); // no stack traces in prod
```

## Environment Variables

**Client** (prefixed `VITE_`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Server**: `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`

## Commands

```bash
npm install && npm run dev     # Vite dev server at localhost:5173
npm run build                  # TypeScript check + production build
```

## Guardrails

❌ **Never**:
- Import `@google/genai` client-side
- Trust `userId` from request body
- Move templates/stacks to database
- Forget to sync plan IDs between client and server config

✅ **Always**:
- Use `TEMPLATES_BY_ID.get()` for O(1) lookups
- Deduct credits atomically before AI call
- Validate uploads on both client and server
- Use structured logging with `request_id` correlation
