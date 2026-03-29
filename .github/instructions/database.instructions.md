---
description: >
  Database schema conventions. Applied when editing migration files or database-related code.
applyTo: "server/supabase/**"
---

# Database Schema Conventions

When editing the database schema:

- **Single migration file**: All schema changes go in `server/supabase/migrations/000_schema.sql`. This file is idempotent — use `CREATE TABLE IF NOT EXISTS`, `DO $$ BEGIN ... END $$` for safe re-runs.
- **RLS required**: Every new table MUST have Row Level Security enabled with appropriate policies.
- **Indexes**: Add indexes for frequently queried columns, especially foreign keys and filter columns.
- **Update docs**: After any schema change, update `docs/DATABASE_REFERENCE.md` and `web/types/index.ts`.
- **Removed columns**: Never re-add `shopify_handle`, `negative_prompt`, or `style_preset` — they were removed intentionally.
- **Supabase client only**: Use `createAdminClient()` from `server/src/lib/auth.js` for server writes. No ORMs.
