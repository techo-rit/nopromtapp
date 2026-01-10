# Copilot Instructions: NoPromp App

## Quickstart Guide for AI Coding Agents

### Core Architecture
- **Server-side AI only**: Image generation runs in [api/generate.ts](api/generate.ts) using `process.env.GEMINI_API_KEY` and `@google/genai`. Do not import the Gemini SDK in client code.
- **Client → Server flow**: [services/geminiService.ts](services/geminiService.ts) converts uploads to data URLs and POSTs to `/api/generate`. The API returns a URL for the generated image.
- **Constants-based data**: Templates, stacks, pricing live in [constants.ts](constants.ts). No DB for templates; modify constants for content changes.
- **Routing & state**: React Router with `/`, `/stack/:stackId`, `/template/:templateId` from [App.tsx](App.tsx). No global state libraries; pass `user` via props.

### Auth & Credits
- **Supabase auth**: Config in [lib/supabase.ts](lib/supabase.ts) with `persistSession` and `autoRefreshToken`. OAuth + email/password in [services/supabaseAuthService.ts](services/supabaseAuthService.ts).
- **Session recovery**: Check `authService.getCurrentUser()` before render in [App.tsx](App.tsx). User type in [types.ts](types.ts).
- **Credit deduction**: After successful `/api/generate`, deduct 1 credit via Supabase RPC (see functions in [supabase/migrations/001_payment_schema.sql](supabase/migrations/001_payment_schema.sql) and [supabase/migrations/002_deduct_credits.sql](supabase/migrations/002_deduct_credits.sql)). Client guards generation if `!user` or insufficient credits.

### Payments (Razorpay)
- **Flow**: Client selects plan in [components/PaymentModal.tsx](components/PaymentModal.tsx) → `/api/create-order` → Razorpay checkout via [services/paymentService.ts](services/paymentService.ts) → `/api/verify-payment` → credits added; webhook in [api/webhook.ts](api/webhook.ts).
- **Security**: Verify signatures server-side, use idempotency keys, and rate limit order creation.

### UI & Interaction Patterns
- **Dual uploads for Fitit**: When `stack.id === "fitit"`, show selfie + garment upload in [components/TemplateExecution.tsx](components/TemplateExecution.tsx).
- **Paste-to-upload**: Global paste handler reads `e.clipboardData.items` and respects auth/loading state in [components/TemplateExecution.tsx](components/TemplateExecution.tsx).
- **Camera & guidance**: Use [components/StandardCameraModal.tsx](components/StandardCameraModal.tsx) for capture and [components/SmartSelfieModal.tsx](components/SmartSelfieModal.tsx) for MediaPipe-based alignment guidance.
- **Refs in effects**: Store latest values in refs for stable event listeners (see pattern in [components/TemplateExecution.tsx](components/TemplateExecution.tsx)).
- **Search**: Dual-index keyword search in [utils/searchLogic.ts](utils/searchLogic.ts) for names and `keywords[]`.

### Styling & UX
- **Tailwind-first**: Custom palette and responsive typography in [src/index.css](src/index.css). Hide scrollbars via `scrollbar-hide`.
- **Mobile-first**: Touch-optimized interactions; prevent default scroll in modals.

### Environment & Commands
- **Env (client)**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `.env.local`.
- **Env (server)**: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` used in `api/*`.
- **Run dev**: `npm install` then `npm run dev` (Vite at localhost:5173).
- **Build**: `npm run build` (deploys via Vercel; see [vercel.json](vercel.json)).

### Critical Do/Don’t
- **Do**: Keep AI calls in `api/*`. Update templates in [constants.ts](constants.ts). Use Supabase RPC for credits.
- **Don’t**: Import `@google/genai` client-side or expose secrets. Add state libraries or move templates to DB.
- **Check**: Payment verification, idempotency, and session persistence before shipping.


## Project Overview
React + TypeScript AI image generation app for virtual try-on and scene transformations using Google's Gemini 2.5 Flash Image model. Users upload selfies, select templates, and generate AI-transformed images with preserved facial identity.

## Architecture Pattern: Server-Side AI Generation

**CRITICAL**: AI generation happens **server-side only** via Vercel serverless function.
- Client: `services/geminiService.ts` → converts File to base64 data URLs
- Server: `api/generate.ts` → receives data URLs, calls Gemini API, returns generated images
- **Never** import `@google/genai` in client components - it's server-only
- **Never** expose `GEMINI_API_KEY` to client - use `process.env` in API routes only

## Data Model: Constants-Based Architecture

**No database for templates/stacks** - everything lives in [constants.ts](constants.ts):
- `STACKS`: Categories (Fitit, Flex, Aesthetics, etc.) with cover images
- `TEMPLATES`: Individual AI templates with detailed prompts, aspect ratios, keywords
- `TRENDING_TEMPLATE_IDS`: Curated list for homepage carousel

**Pattern**: Templates embed complex multi-paragraph prompts with explicit instructions for Gemini (see "fitit" virtual try-on templates for examples of prompt engineering).

## State Management: URL-Based Navigation

Uses React Router with these routes:
- `/` - Home (trending + stacks grid)
- `/stack/:stackId` - Templates within a stack
- `/template/:templateId` - Template execution view

**No global state library** - state flows via:
- URL params (`useParams`) for navigation
- Local component state (`useState`)
- Prop drilling for cross-component communication
- Auth context via `user` prop passed from App.tsx

## Authentication Flow (Supabase)

**Session persistence critical** - see [AUTH_FIXES_SUMMARY.md](AUTH_FIXES_SUMMARY.md) for lessons learned:
- Config in [lib/supabase.ts](lib/supabase.ts): `persistSession: true`, `autoRefreshToken: true`
- Service layer: [services/supabaseAuthService.ts](services/supabaseAuthService.ts) handles Google OAuth + email/password
- Google OAuth requires `access_type: 'offline'` for multi-device support
- Session recovery on mount in [App.tsx](App.tsx) - check `authService.getCurrentUser()` before rendering

**User object shape** (types.ts):
```typescript
{ id, email, name, credits, createdAt, lastLogin }
```

## Component Patterns

### React Hooks Usage
**Refs for event listeners**: When using `useEffect` to attach global event listeners (paste, keyboard), store state in refs to access latest values inside stable callbacks. See [components/TemplateExecution.tsx](components/TemplateExecution.tsx):
```typescript
const selfieImageRef = useRef(selfieImage);
useEffect(() => { selfieImageRef.current = selfieImage; }, [selfieImage]);
// Now event handler can read selfieImageRef.current for latest value
```

### Mobile-First Interaction
**Touch-optimized UI**: Components use `touch-action` CSS, prevent default scroll behaviors, and implement mobile-specific camera features.
- [components/StandardCameraModal.tsx](components/StandardCameraModal.tsx) - webcam capture with flash effect
- [components/SmartSelfieModal.tsx](components/SmartSelfieModal.tsx) - MediaPipe face detection for selfie guidance

### Paste-to-Upload Pattern
Users can paste images (Ctrl/Cmd+V) into upload zones - see `handlePaste` in TemplateExecution.tsx. Requires:
- Auth check before processing
- Loading/generation state check to prevent double-paste
- Reading from `e.clipboardData.items` for image files

## Search Implementation

**Dual-index keyword search** in [utils/searchLogic.ts](utils/searchLogic.ts):
- Searches both template names AND `keywords[]` array in template objects
- Case-insensitive, whitespace-normalized matching
- Used in Header.tsx search bar, updates `searchQuery` state in App.tsx

## Styling Conventions

**Tailwind-first with custom palette**:
- Background: `bg-[#0a0a0a]` (near-black)
- Text primary: `text-[#f5f5f5]` (off-white)
- Borders/dividers: `border-[#2a2a2a]` (subtle gray)
- Accent interactions: `text-[#6b6b6b]` (medium gray for secondary text)

**Responsive typography**: Use `text-[28px] md:text-[40px] lg:text-[48px]` pattern for headings with dynamic tracking/leading.

**Scrollbar hiding**: Add `scrollbar-hide` utility class for cleaner scroll containers.

## Fitit Stack Special Case

Virtual try-on templates require **two images**:
- Selfie (main image)
- Wearable/garment (overlay image from product photo)

Template execution checks `stack.id === "fitit"` to show dual upload zones. Prompts contain detailed instructions for face preservation and garment compositing.

## Development Workflow

**Local dev**:
```bash
npm install
npm run dev  # Vite dev server on localhost:5173
```

**Environment variables** (create `.env.local`):
```
GEMINI_API_KEY=your_key_here
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Build**: `npm run build` → outputs to `dist/` (Vercel auto-deploys from main branch)

## Key Files Reference

- [App.tsx](App.tsx) - Root component, routing, auth state
- [constants.ts](constants.ts) - All templates/stacks/pricing (5800+ lines)
- [api/generate.ts](api/generate.ts) - Serverless function for AI generation
- [api/create-order.ts](api/create-order.ts) - Razorpay order creation
- [api/verify-payment.ts](api/verify-payment.ts) - Payment verification & credit update
- [api/webhook.ts](api/webhook.ts) - Razorpay webhook handler
- [services/geminiService.ts](services/geminiService.ts) - Client wrapper for API calls
- [services/paymentService.ts](services/paymentService.ts) - Payment flow orchestration
- [types.ts](types.ts) - Core TypeScript interfaces
- [components/TemplateExecution.tsx](components/TemplateExecution.tsx) - Main execution view with upload + generation logic
- [lib/supabase.ts](lib/supabase.ts) - Supabase client configuration

## API Endpoints Structure

All API routes are Vercel serverless functions in `api/` directory:

**`/api/generate` (POST)**:
- Input: `{ imageData, wearableData?, templateId, templateOptions }`
- Converts data URLs → base64 inline data for Gemini API
- Returns: `{ success, imageUrl }` or `{ error }`
- Model: `gemini-2.5-flash-image`

**`/api/create-order` (POST)**:
- Input: `{ planId, userId, userEmail, userName? }`
- Validates plan, checks rate limits, creates Razorpay order
- Returns: `{ orderId, amount, currency, keyId, prefill }`

**`/api/verify-payment` (POST)**:
- Input: `{ razorpayOrderId, razorpayPaymentId, razorpaySignature, userId }`
- Verifies signature, updates credits in Supabase
- Returns: `{ success, creditsAdded, subscriptionId }`

**`/api/webhook` (POST)**:
- Razorpay webhook for async payment events
- Validates signature, handles `payment.captured` events
- Idempotency protected via `idempotency_keys` table

**`/api/user-subscription` (GET)**:
- Query param: `userId`
- Returns user subscription history and current credits

## Credit System

**Credit Deduction Flow**:
1. Check user credits before generation (client-side guard in TemplateExecution)
2. Call `/api/generate` (no credit deduction on server - handled separately)
3. After successful generation, deduct 1 credit via Supabase RPC
4. Update local user state to reflect new balance

**Database Functions** (in migration `001_payment_schema.sql`):
- `add_credits(user_id, amount)` - Adds credits to profile
- `deduct_credits(user_id, amount)` - Removes credits (with balance check)
- RLS policies ensure users can only modify their own credits

**Pricing Plans** (constants.ts):
```typescript
essentials: { price: 12900, credits: 20 }  // ₹129
ultimate: { price: 74900, credits: 135 }   // ₹749
```

## Error Handling Patterns

**API Routes**:
- Always return JSON with `{ success: boolean, error?: string }`
- Use try-catch and log errors to console
- Return appropriate HTTP status codes (400, 401, 405, 500)

**Client Components**:
- Toast notifications for user-facing errors (not implemented - use alerts)
- Loading states prevent double-submissions
- Auth checks before expensive operations

**Payment-Specific**:
- Idempotency keys prevent duplicate charges
- Webhook signature verification prevents spoofing
- Rate limiting prevents abuse

## Payment System (Razorpay Integration)

**Architecture**: Client initiates → Server creates order → Razorpay checkout → Webhook verification → Credit update

**Payment Flow**:
1. User selects plan from [components/PaymentModal.tsx](components/PaymentModal.tsx) → `PRICING_PLANS` from constants
2. Client calls `/api/create-order` → Creates Razorpay order with idempotency check
3. Razorpay checkout modal (loaded via [services/paymentService.ts](services/paymentService.ts))
4. After payment → `/api/verify-payment` verifies signature & updates credits
5. Webhook `/api/webhook` handles async payment confirmations

**Database Schema** (Supabase):
- `profiles.credits` - User credit balance
- `subscriptions` - Payment records (with Razorpay IDs)
- `payment_logs` - Audit trail
- `idempotency_keys` - Prevents duplicate charges

**Key Implementation Details**:
- Rate limiting: 10 orders/minute per user (in-memory, use Redis for production)
- Signature verification: HMAC-SHA256 with `RAZORPAY_KEY_SECRET`
- Script loading: Preload Razorpay SDK when modal opens (`loadRazorpayScript()`)
- Environment: Test mode (`rzp_test_*`) vs Live mode (`rzp_live_*`)

See [PAYMENT_SETUP_GUIDE.md](PAYMENT_SETUP_GUIDE.md) for complete setup instructions.

## MediaPipe Face Detection

**Smart Selfie Feature** in [components/SmartSelfieModal.tsx](components/SmartSelfieModal.tsx):
- Real-time face alignment guidance using MediaPipe BlazeFace model
- Validates: face size (15-65% of frame), centering, yaw/pitch/roll angles
- Status states: `NO_FACE`, `TOO_CLOSE`, `TOO_FAR`, `TILTED`, `TURN_LEFT`, `TURN_RIGHT`, `HOLD_STILL`
- Auto-capture after 900ms of perfect alignment (`HOLD_DURATION_MS`)
- GPU-accelerated detection via WebAssembly (loads from CDN)

**Configuration constants** (tuning thresholds):
- `FACE_WIDTH_MIN/MAX`: Size bounds (0.15-0.65)
- `TILT_TOLERANCE_DEG`: Roll angle limit (15°)
- `PITCH_TOLERANCE`: Vertical head tilt limit (0.08 ≈ 7-8°)
- `YAW_TOLERANCE`: Horizontal turn limit (0.25)

## Deployment & Environment

**Vercel Configuration** ([vercel.json](vercel.json)):
- API routes: `/api/*` → Serverless functions in `api/` directory
- SPA fallback: All other routes → `index.html` (React Router handles client-side routing)
- Automatically deploys from `main` branch

**Required Environment Variables**:
```bash
# Client-side (VITE_ prefix)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Server-side (API routes only)
GEMINI_API_KEY=AIzaSy...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # Bypasses RLS
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxx
```

**Build Process**:
- `npm run dev` → Vite dev server on `localhost:5173` with HMR
- `npm run build` → Production build to `dist/` (Vercel auto-builds)
- `npm run preview` → Preview production build locally

## Common Pitfalls

1. **Don't create state management libraries** - this app intentionally uses simple prop drilling
2. **Don't move templates to database** - constants.ts is the source of truth
3. **Don't call Gemini from client** - always go through `/api/generate` endpoint
4. **Don't forget auth checks** - block generation/uploads if `!user`
5. **Mobile testing required** - paste, camera, and touch interactions behave differently on mobile
6. **Don't expose service role key** - only use in API routes, never in client components
7. **Razorpay signature verification** - always verify payment signatures server-side before crediting
8. **MediaPipe initialization** - detector must be ready (`isDetectorReady`) before processing frames
