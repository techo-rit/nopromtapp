# nopromtapp (DigitalOcean single-origin)

## Structure
- `web/` Vite + React SPA
- `server/` Express API + static host (server/public)

## Build & run (single origin)

1. Build web and copy into server/public:
```
npm run build
```

2. Start server:
```
npm run start
```

Server listens on `PORT` (default 80).

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
