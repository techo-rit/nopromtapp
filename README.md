# nopromtapp (single-origin on Vercel)

## Structure
- `web/` Vite + React SPA
- `server/` Express API + static host (server/public)

## Vercel single-origin deploy

This setup builds the web app and copies it to `server/public`, then routes all requests to the serverless Express handler.

### Build locally
```
pnpm build
```

### Deploy on Vercel
1. Push repo to GitHub
2. Import repo in Vercel
3. Root directory: repo root
4. Build command: `pnpm build`
5. Output directory: `server/public`
6. Add env vars (same as server/.env)

## Server env vars (required)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Optional:
- `BACKEND_URL`
- `FRONTEND_URL`
- `CORS_ORIGINS`
