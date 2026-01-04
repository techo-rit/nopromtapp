# Copilot Instructions: NoPromp App

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
- [constants.ts](constants.ts) - All templates/stacks (5800+ lines)
- [api/generate.ts](api/generate.ts) - Serverless function for AI generation
- [services/geminiService.ts](services/geminiService.ts) - Client wrapper for API calls
- [types.ts](types.ts) - Core TypeScript interfaces
- [components/TemplateExecution.tsx](components/TemplateExecution.tsx) - Main execution view with upload + generation logic

## Common Pitfalls

1. **Don't create state management libraries** - this app intentionally uses simple prop drilling
2. **Don't move templates to database** - constants.ts is the source of truth
3. **Don't call Gemini from client** - always go through `/api/generate` endpoint
4. **Don't forget auth checks** - block generation/uploads if `!user`
5. **Mobile testing required** - paste, camera, and touch interactions behave differently on mobile
