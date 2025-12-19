# NoPrompt AI - Replit Configuration

## Overview

NoPrompt AI is a mobile-first web application that enables users to generate AI-edited images using pre-designed templates without needing prompt engineering skills. Users select from curated template "stacks" (categories like Clothes, Flex, Monuments), upload their photos, and the app uses Google's Gemini AI to generate professional-quality remixed images.

The application is designed to be wrapped as a native mobile app using Capacitor, with a luxury-focused UI featuring dark themes, muted gold accents, and premium aesthetics.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Smart Selfie Feature (December 18, 2025)
- Added SmartSelfieModal.tsx: Full-screen camera modal with auto-capture
- Uses react-webcam for camera feed with mirrored selfie view (facingMode: user)
- Integrates MediaPipe FaceDetector for real-time face detection
- Auto-capture logic: Face must be inside guide box AND looking straight at camera
- Straight-facing detection: Checks nose landmark is equidistant between eyes (<5% deviation)
- 3-frame stability check prevents jitter captures
- Mobile-compatible: Uses 100dvh, video has playsInline
- Take Selfie button added to UploadZone as alternative to file upload
- Status feedback: "Align your face" → "Hold still..." → auto-capture

### Desktop Header Layout (December 18, 2025)
- Centered the second navigation bar elements (Manifesting, search, 12 days pill) as a single cluster
- Applied max-w-720px, mx-auto, flex items-center justify-center gap-5

### Phase 3 - Mobile Navigation (December 17, 2025)
- Created BottomNav.tsx: Mobile-only fixed bottom navigation with Creators, Try on, Profile/Sign In tabs
- Updated Header.tsx: Added mobile-only top bar with "Manifesting" text, search bar, and "12 days" streak badge
- Desktop header remains unchanged with logo, nav buttons, and sign in
- Bottom nav: 60px height, safe-area aware, gold accent for active tab, tap feedback (scale animation)
- Profile tab shows popup menu for logged-in users with name, email, and logout option
- Added pb-[80px] md:pb-0 to main content to prevent overlap with bottom nav on mobile

### Phase 2 - Shared Components (December 17, 2025)
- Updated Header.tsx: Dark nav buttons, dark Sign In button, user dropdown dark styling
- Updated TrendingCarousel.tsx: Dark section background, dark card overlays, serif heading
- Updated AuthModal.tsx: Dark modal (#141414), dark inputs, dark submit button, gold tab indicator
- Updated UploadZone.tsx: Dark borders (#2a2a2a), dark backgrounds, gold accent on drag states
- Updated TemplateExecution.tsx: Dark remix button, loading states, error states, result cards
- Updated Spinner.tsx: Gold accent (#c9a962) instead of purple
- Updated StackGrid.tsx & TemplateGrid.tsx: Dark borders, gold focus rings
- Eliminated all white/light backgrounds from UI - all buttons use dark (#1a1a1a) with borders
- All touch targets meet minimum 44px requirement

### Phase 1 - Mobile Foundation (December 17, 2025)
- Added mobile viewport meta tags with safe-area support (viewport-fit=cover)
- Added apple-mobile-web-app-capable and status bar meta tags for Capacitor wrapping
- Created global CSS variables for dark luxury theme:
  - Background: #0a0a0a (near-black)
  - Text: #f5f5f5 (soft white)
  - Accent: #c9a962 (muted gold)
  - Surface: #141414 (card backgrounds)
- Added Playfair Display serif font for headings
- Implemented safe-area padding utilities for notched devices
- Updated App.tsx wrapper to dark theme
- Fixed text colors in App.tsx content sections for dark theme readability

## System Architecture

### Frontend Architecture
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6 for development and bundling
- **Styling**: Tailwind CSS via CDN with custom CSS variables for theming
- **Design System**: Mobile-first responsive design with safe-area support for native app wrapping
- **State Management**: React useState with localStorage persistence for navigation state
- **Routing**: Custom in-app page state management (home/stack/template pages)

### Component Structure
- Single-page application with modal-based authentication
- Core components: Header, StackGrid, TemplateGrid, TemplateExecution, UploadZone
- Template execution flow: Upload selfie → Optional wearable image → AI generation

### Backend Architecture
- **API Route**: `/api/generate.ts` - Serverless function handling AI image generation
- **AI Integration**: Google Gemini 2.5 Flash Image model for image transformation
- **Image Processing**: Base64 data URL conversion for API transmission

### Authentication System
- **Provider**: Supabase Authentication
- **Methods**: Email/password signup and login, Google OAuth
- **Session Handling**: Persistent sessions with automatic token refresh
- **User Data**: Profiles stored in Supabase with credits system

### Data Layer
- **Templates/Stacks**: Static configuration in `constants.ts`
- **User State**: Supabase for authentication, localStorage for UI preferences
- **No Database ORM**: Currently uses Supabase client directly without Drizzle

### Mobile Optimization
- Safe area insets for notched devices
- Touch-friendly button sizing
- WebView-compatible modal and overlay handling
- Disabled horizontal scrolling and zoom

## External Dependencies

### Third-Party Services
- **Google Gemini API**: AI image generation (requires `GEMINI_API_KEY` environment variable)
- **Supabase**: Authentication and user management (requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)

### NPM Packages
- `@google/genai`: Google Gemini AI SDK
- `@supabase/supabase-js`: Supabase client for authentication
- `@mediapipe/tasks-vision`: MediaPipe face detection for Smart Selfie feature
- `react-webcam`: Webcam access for Smart Selfie feature
- `react` / `react-dom`: UI framework
- `vite` with `@vitejs/plugin-react`: Build tooling

### External Assets
- Google Fonts: Playfair Display for serif headings
- Static images served from `/images/` and `/ico/` directories
- Unsplash images for some template covers

### Environment Variables Required
- `GEMINI_API_KEY`: Google Gemini API key for image generation
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key for client-side auth