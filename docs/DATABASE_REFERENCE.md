# Stiri — Database Reference

> Complete schema reference with table details, RLS policies, triggers, and cron jobs.

---

## Tables

### profiles
User profile, preferences, and subscription state. Created automatically on signup via `handle_new_user()` trigger.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid (PK) | — | FK → auth.users(id), CASCADE |
| `full_name` | text | — | |
| `phone` | text | — | |
| `age_range` | text | — | gen_z, millennial, gen_x, boomer |
| `colors` | text[] | {} | Preferred colors |
| `styles` | text[] | {} | Preferred styles |
| `fit` | text | — | |
| `bust` | numeric | — | Inches |
| `waist` | numeric | — | Inches |
| `hip` | numeric | — | Inches |
| `measurement_unit` | text | 'in' | CHECK: 'in' or 'cm' |
| `body_type` | text | — | |
| `skin_tone` | text | — | CHECK: fair, medium, dark |
| `is_onboarding_complete` | boolean | false | Auto-computed by trigger |
| `account_type` | text | 'free' | free, essentials, ultimate |
| `monthly_quota` | integer | 3 | |
| `monthly_used` | integer | 0 | |
| `extra_credits` | integer | 5 | |
| `shopify_cart_id` | text | — | Persistent Shopify cart reference |
| `created_at` | timestamptz | now() | |
| `updated_at` | timestamptz | now() | Auto-updated by trigger |

### templates
Product templates. `id` is the Shopify product handle (1:1 mapping).

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | text (PK) | — | = Shopify handle |
| `stack_id` | text | — | Category identifier |
| `title` | text | — | |
| `description` | text | — | |
| `image` | text | — | Image URL |
| `prompt` | text | — | AI generation prompt |
| `aspect_ratio` | text | '1:1' | |
| `tags` | text[] | {} | |
| `trending` | boolean | false | |
| `trending_order` | integer | — | Sort order for trending |
| `is_active` | boolean | true | |
| `created_at` | timestamptz | now() | |
| `updated_at` | timestamptz | now() | |

### user_wishlist

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | gen_random_uuid() |
| `user_id` | uuid | FK → auth.users, CASCADE |
| `template_id` | text | FK → templates, CASCADE |
| `created_at` | timestamptz | |

UNIQUE constraint on (user_id, template_id).

### subscriptions

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `user_id` | uuid | FK → auth.users, CASCADE |
| `plan_id` | text | |
| `plan_name` | text | |
| `creations_purchased` | integer | |
| `amount` | integer | In paise (INR) |
| `currency` | text | Default 'INR' |
| `razorpay_order_id` | text | UNIQUE |
| `razorpay_payment_id` | text | UNIQUE |
| `razorpay_signature` | text | |
| `status` | text | created, paid, failed, refunded |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated by trigger |
| `paid_at` | timestamptz | |

### generated_images

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `user_id` | uuid | FK → auth.users, CASCADE |
| `storage_path` | text | Path in Supabase storage bucket |
| `image_url` | text | Full public URL |
| `template_id` | text | |
| `template_name` | text | |
| `stack_id` | text | |
| `mode` | text | CHECK: remix, tryon |
| `aspect_ratio` | text | |
| `created_at` | timestamptz | |

### user_addresses, payment_logs, idempotency_keys
See `server/supabase/migrations/000_schema.sql` for full definitions.

---

## RLS Policies

All tables have RLS enabled. Pattern: users can only access their own rows.

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | Own row | Own row | Own row | — |
| user_addresses | Own rows | Own rows | Own rows | Own rows |
| subscriptions | Own rows | Own rows | Service role | — |
| payment_logs | Own rows | Service role | — | — |
| idempotency_keys | Own rows | Own rows | — | — |
| generated_images | Own rows (auth) | Service role | — | — |
| templates | Active only (`is_active=true`) | Service role | Service role | Service role |
| user_wishlist | Own rows | Own rows | — | Own rows |

---

## Functions & Triggers

| Function | Type | Purpose |
|----------|------|---------|
| `compute_onboarding_steps(user_id)` | SECURITY DEFINER | Returns 0–5 based on profile completeness |
| `update_onboarding_status()` | TRIGGER (BEFORE UPDATE on profiles) | Auto-sets `is_onboarding_complete` |
| `handle_new_user()` | TRIGGER (AFTER INSERT on auth.users) | Auto-creates profile row on signup |
| `update_updated_at_column()` | TRIGGER | Generic `updated_at` stamper |
| `reset_monthly_quotas()` | pg_cron (monthly) | Resets `monthly_used` to 0 |
| `cleanup_expired_idempotency_keys()` | pg_cron (daily) | Removes expired idempotency records |

---

## Indexes

```sql
idx_user_addresses_user_id           ON user_addresses(user_id)
idx_subscriptions_user_id            ON subscriptions(user_id)
idx_subscriptions_razorpay_order_id  ON subscriptions(razorpay_order_id)
idx_subscriptions_status             ON subscriptions(status)
idx_payment_logs_user_id             ON payment_logs(user_id)
idx_payment_logs_razorpay_order_id   ON payment_logs(razorpay_order_id)
idx_payment_logs_event_type          ON payment_logs(event_type)
idx_payment_logs_created_at          ON payment_logs(created_at)
idx_idempotency_keys_key             ON idempotency_keys(key)
idx_idempotency_keys_expires_at      ON idempotency_keys(expires_at)
idx_generated_images_user_created    ON generated_images(user_id, created_at DESC)
idx_templates_stack_id               ON templates(stack_id)
idx_templates_trending               ON templates(trending) WHERE trending = true
idx_templates_is_active              ON templates(is_active) WHERE is_active = true
idx_user_wishlist_user_id            ON user_wishlist(user_id)
```
