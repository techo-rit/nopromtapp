# Copilot Instructions: NoPromt App

AI virtual try-on app (React 19 + TypeScript + Vite) on Vercel. Supabase handles auth + credits; Razorpay (INR) handles payments; Gemini runs server-side only.

## Architecture

**Client SPA**: React Router v7 with three routes:
- `/` (Home): Shows stacks or trending templates. Routes via `Home.tsx` or `StackView.tsx`.
- `/stack/:stackId` (StackView): Templates filtered by stack. Uses `TEMPLATES_BY_STACK` Map.
- `/template/:templateId` (TemplateRoute): Image generation UI. Wrapped by `TemplateExecution.tsx`.

**Data Model**: `constants.ts` is the single source of truth — exports:
- `STACKS`, `TEMPLATES`, `TEMPLATES_BY_ID` (Map for O(1) lookups), `TEMPLATES_BY_STACK` (Map)
- `PRICING_PLANS` (must mirror `api/_lib/serverConfig.ts`), `TRENDING_TEMPLATE_IDS`
- Never move template/stack data to DB; they're versioned with code.

**Config Split**: 
- Client: `config.ts` defines `CONFIG.UPLOAD`, `CONFIG.SUPABASE`, `CONFIG.GEMINI`, `CONFIG.MEDIAPIPE`, `CONFIG.FACE_DETECTION`
- Server: `api/_lib/serverConfig.ts` has `UPLOAD_CONFIG`, `GEMINI_CONFIG`, `RATE_LIMIT_CONFIG`, `PAYMENT_CONFIG`
- Keep both in sync when changing limits/models.

## Generation Flow

1. **Client**: `TemplateExecution.tsx` → `UploadZone` collects selfie (required) + wearable (fitit only) → `generateImage()` in `geminiService.ts` converts File → base64 data URL
2. **Request**: `POST /api/generate` with `Authorization: Bearer <jwt>`, body: `{ selfieDataUrl, wearableDataUrl, prompt }`
3. **Server** (`api/generate.ts`):
   - Verify JWT via Supabase service role → extract `user.id`
   - Rate limit check (fail-open: allow if Redis down)
   - Deduct 1 credit via RPC `deduct_credits` (atomic, transactional)
   - Validate images: MIME whitelist (jpeg|png|webp|gif) + ≤10MB each
   - Call `@google/genai` (`gemini-2.5-flash-image`) with images + prompt (truncated to 100K chars)
   - Return array of base64-encoded generated image data URLs
4. **Client**: Display results in carousel; user can download or regenerate.

## Auth Pattern

**Wrapper**: Always use `services/authService.ts` (delegates to `supabaseAuthService.ts`). Never import Supabase client directly in components.

**Flow**: `App.tsx` subscribes to `onAuthStateChange()` → sets `user` state → passes downstream as prop. All auth-gated UI checks `user` existence.

**Stack-specific rules**: 
- `fitit` stack requires **both** selfie + wearable images in `TemplateExecution.tsx`
- All other stacks require only selfie; wearable optional
- `onLoginRequired` callback redirects to auth modal if user not logged in

## Payments (Razorpay INR)

**Setup**: Plans defined in `PRICING_PLANS` (e.g., "Essentials" ₹129, 20 credits). IDs & amounts must match `api/_lib/serverConfig.ts`.

**Flow**:
1. User clicks plan → `PaymentModal.tsx` → `POST /api/create-order` → Razorpay returns `orderId`
2. Razorpay checkout modal → user enters card details
3. On success → `POST /api/verify-payment` with `orderId`, `paymentId`, `razorpaySignature`
4. Server: HMAC verify signature (SHA256) using `RAZORPAY_KEY_SECRET` → atomic credit add via RPC `add_user_credits`
5. Subscription record created in DB with status `paid`

**Rate Limiting**: Payment endpoints use **fail-closed** (deny if Redis unavailable).

## Rate Limiting

Upstash Redis sliding windows via `@upstash/ratelimit` + `@upstash/redis`:
- **Generate**: 20 req/60s per user (fail-open: allow if Redis down)
- **Order/Verify**: 10 req/60s per user (fail-closed: deny if Redis down)

Pattern in `api/generate.ts`:
```typescript
const limiter = getGenerateRateLimiter();
const rateLimitResult = await checkRateLimit(limiter, user.id);
if (!rateLimitResult.success) {
  return { error: 'Rate limit exceeded', status: 429 };
}
```

## Component Patterns

**UploadZone**: Handles file selection (click, drag-drop, paste). Validates MIME + size. Triggers camera modal on button click.

**SmartSelfieModal** vs **StandardCameraModal**: Smart uses MediaPipe face detection + pose guidance; Standard is basic webcam capture. Selected in `UploadZone` based on device support.

**TemplateExecution**: Core generation UI. Manages state via refs to handle clipboard events in passive listeners. Stores `selfieImage` + `wearableImage` (File objects), then converts to base64 on submit.

**Props drill-down**: No Redux/Zustand. State lives in `App.tsx`, props pass down. Routes are passed `user`, `onLoginRequired`, `onBack` callbacks.

## State & Refs in TemplateExecution

Uses React refs to sync with state in paste handlers:
```typescript
const selfieImageRef = useRef(selfieImage);
useEffect(() => { selfieImageRef.current = selfieImage; }, [selfieImage]);
```
This avoids closure issues in clipboard event listeners (passive, not in event handler).

## Key Patterns

```typescript
// O(1) template lookup in routes
const template = TEMPLATES_BY_ID.get(templateId);
const stackTemplates = TEMPLATES_BY_STACK.get(stackId) ?? [];

// Structured JSON logging with request correlation
const log = createLogger(requestId, userId);
log.info('Generation started', { templateId, stackId });
log.error('Credit check failed', { credits: profile.credits });

// JWT verification - never trust userId from body
const { data: { user }, error } = await supabase.auth.getUser(token);
if (!user) return { error: 'Unauthorized', status: 401 };

// Sanitized error logging (no stack traces in production)
import { sanitizeError } from './_lib/logger';
log.error('API failed', sanitizeError(error));
```

## Styling & Mobile

**Tailwind 4** with custom palette in `index.css`:
- Background: `#0a0a0a` (near-black)
- Text: `#f5f5f5` (off-white)
- Accent: `#c9a962` (gold)

**Mobile-first design**: Safe-area insets in `vercel.json` headers. Camera permissions enabled via manifest in `vercel.json`. `BottomNav` sticky on mobile; desktop hides nav.

## Commands

```bash
npm install && npm run dev     # Vite dev server, localhost:5173
npm run build                   # Type-check + Vite build → dist/
```

**Debugging**: API logs appear in Vercel dashboard or local terminal. Use `request_id` to correlate logs across calls.

## Guardrails

❌ **Never**:
- Import `@google/genai` client-side — always POST to `/api/generate`
- Trust `userId` from request body — derive from verified JWT only
- Expose `SUPABASE_SERVICE_ROLE_KEY` to client (only server-side env)
- Move `STACKS` or `TEMPLATES` to DB (versioned with code)
- Forget to mirror plan IDs between `constants.ts` and `serverConfig.ts`

✅ **Always**:
- Use `TEMPLATES_BY_ID.get()` for O(1) lookups, not array scans
- Verify JWT before trusting user identity in API routes
- Deduct credits atomically (before calling AI, not after)
- Validate uploads on both client (UX) and server (security)
- Use structured logging for observability in production
