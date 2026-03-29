## Stiri — Copilot Workspace Instructions

**At the start of every chat session**, read and follow the master instruction file:

📄 **`.claude/claude.md`** — Contains all project rules, architecture references, coding conventions, known pitfalls, and development workflows.

📄 **`.claude/project-state.md`** — Contains persisted project state from prior sessions. Read this for continuity.

### Mandatory Steps

1. Read `.claude/claude.md` before making any code changes
2. Read `.claude/project-state.md` for current project context
3. Check `docs/KNOWN_PITFALLS.md` before modifying critical paths (cart, Shopify, auth, templates)
4. After significant changes, update `.claude/project-state.md` with what was changed
5. Run `cd web && npx vite build` to verify before completing any task

### Critical Rules (from claude.md)
- Single-origin deployment: Express serves API + SPA
- No external state management (Redux, Zustand, etc.)
- `template.id` IS the Shopify handle — no separate column
- `constants.ts` must stay ~70 lines (PRICING_PLANS + STACKS only)
- Never re-add removed columns: `shopify_handle`, `negative_prompt`, `style_preset`
- All auth endpoints use `getUserFromRequest(req, res)` pattern
- Schema changes go in `server/supabase/migrations/000_schema.sql` (single idempotent file)

### Skills & Plugins
Skills in `.claude/skills/` and plugins in `.claude/plugins/` provide specialized workflows for TDD, PRD creation, architecture review, code review, frontend design, and security guidance. See `.claude/claude.md` Section 5 for trigger words.
