---
description: >
  Guard file for constants.ts. This file MUST stay small (~70 lines).
  Only PRICING_PLANS and STACKS belong here.
applyTo: "web/data/constants.ts"
---

# constants.ts Guard

**This file MUST stay under ~70 lines.**

Only two things belong in this file:
1. `PRICING_PLANS` — Subscription tier definitions
2. `STACKS` — Template stack/category definitions

**Everything else comes from the database (Supabase):**
- Template data → `templates` table
- Product data → Shopify Storefront API
- User preferences → `profiles` table

If you're tempted to add template arrays, product lists, or any hardcoded data here — put it in the database instead.
