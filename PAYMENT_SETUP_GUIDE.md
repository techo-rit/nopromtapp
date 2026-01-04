# Razorpay Payment Integration - Setup Guide

This guide walks you through setting up the complete Razorpay payment integration for nopromt.ai.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Razorpay Account Setup](#1-razorpay-account-setup)
3. [Supabase Database Setup](#2-supabase-database-setup)
4. [Environment Variables](#3-environment-variables)
5. [Webhook Configuration](#4-webhook-configuration)
6. [Testing in Sandbox Mode](#5-testing-in-sandbox-mode)
7. [Going Live](#6-going-live)
8. [File Structure Overview](#7-file-structure-overview)
9. [Troubleshooting](#8-troubleshooting)

---

## Prerequisites

Before starting, ensure you have:
- ✅ A Razorpay account (Test or Live)
- ✅ Access to your Supabase project dashboard
- ✅ Access to Vercel project settings (for environment variables)

---

## 1. Razorpay Account Setup

### Step 1.1: Create Razorpay Account

1. Go to [https://dashboard.razorpay.com/signup](https://dashboard.razorpay.com/signup)
2. Sign up with your business email
3. Complete the verification process

### Step 1.2: Get Test API Keys

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Make sure you're in **Test Mode** (toggle at top-left)
3. Go to **Settings** → **API Keys**
4. Click **Generate Test Key**
5. You'll see:
   - **Key ID** (starts with `rzp_test_`)
   - **Key Secret** (shown only once - copy it immediately!)

⚠️ **IMPORTANT**: Save the Key Secret immediately! It's shown only once.

### Step 1.3: Get Webhook Secret

1. Go to **Settings** → **Webhooks**
2. Note: You'll configure the webhook URL after deployment (Step 4)
3. When you add a webhook, Razorpay generates a **Webhook Secret** - save this

---

## 2. Supabase Database Setup

### Step 2.1: Run the Migration SQL

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of this file:
   ```
   /supabase/migrations/001_payment_schema.sql
   ```
6. Paste it into the SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)

This creates:
- ✅ `credits` column in `profiles` table
- ✅ `subscriptions` table (stores payment records)
- ✅ `payment_logs` table (audit trail)
- ✅ `idempotency_keys` table (prevents duplicate charges)
- ✅ RLS policies for security
- ✅ Helper functions for credit management

### Step 2.2: Get Supabase Service Role Key

1. Go to **Settings** → **API**
2. Find **Service Role Key** (under "Project API keys")
3. Copy this key - it's needed for server-side operations

⚠️ **SECURITY**: The Service Role Key bypasses RLS. Never expose it client-side!

---

## 3. Environment Variables

### Step 3.1: Local Development (.env.local)

Create or update `/workspaces/nopromtapp/.env.local`:

```env
# Existing Supabase (client-side)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key

# Supabase (server-side only)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...your-service-role-key

# Razorpay (server-side only - NEVER expose secret)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# Razorpay (client-side - safe to expose)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxx

# Existing
GEMINI_API_KEY=your-gemini-key
```

### Step 3.2: Vercel Production Environment

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:

| Name | Value | Environment |
|------|-------|-------------|
| `SUPABASE_URL` | `https://your-project.supabase.co` | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Production |
| `RAZORPAY_KEY_ID` | `rzp_live_xxx` (live) or `rzp_test_xxx` (test) | Production |
| `RAZORPAY_KEY_SECRET` | Your secret key | Production |
| `RAZORPAY_WEBHOOK_SECRET` | Your webhook secret | Production |
| `VITE_RAZORPAY_KEY_ID` | Same as `RAZORPAY_KEY_ID` | Production |

5. Click **Save**

---

## 4. Webhook Configuration

### Step 4.1: Deploy First

1. Push your code to GitHub
2. Vercel will auto-deploy
3. Your webhook endpoint will be: `https://nopromt.ai/api/webhook`

### Step 4.2: Configure in Razorpay

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to **Settings** → **Webhooks**
3. Click **Add New Webhook**
4. Configure:
   - **Webhook URL**: `https://nopromt.ai/api/webhook`
   - **Secret**: Generate a new secret (copy it for env vars)
   - **Active Events**: Select these:
     - ✅ `payment.captured`
     - ✅ `payment.failed`
     - ✅ `order.paid`
5. Click **Create Webhook**

### Step 4.3: Update Webhook Secret

1. Copy the webhook secret from Razorpay
2. Update `RAZORPAY_WEBHOOK_SECRET` in Vercel environment variables
3. Redeploy to apply changes

---

## 5. Testing in Sandbox Mode

### Step 5.1: Use Test Cards

Razorpay provides test cards for sandbox testing:

| Card Number | CVV | Expiry | Result |
|-------------|-----|--------|--------|
| 4111 1111 1111 1111 | Any 3 digits | Any future date | Success |
| 4000 0000 0000 0002 | Any 3 digits | Any future date | Declined |

### Step 5.2: Test the Flow

1. Start local dev server: `npm run dev`
2. Open `http://localhost:5173`
3. Sign in to your account
4. Click the **credits** button in header
5. Select a plan (Essentials or Ultimate)
6. Complete payment with test card
7. Verify:
   - ✅ Payment modal shows success
   - ✅ Credits are updated in header
   - ✅ Check Supabase `subscriptions` table for new record
   - ✅ Check Supabase `payment_logs` for audit trail

### Step 5.3: Test Webhook Locally (Optional)

For local webhook testing, use ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Start tunnel
ngrok http 5173

# Use the ngrok URL as webhook endpoint in Razorpay
# e.g., https://abc123.ngrok.io/api/webhook
```

---

## 6. Going Live

### Step 6.1: Complete KYC

1. In Razorpay Dashboard, complete **KYC verification**
2. Submit required documents (PAN, GST, bank details)
3. Wait for approval (usually 1-3 business days)

### Step 6.2: Switch to Live Keys

1. Toggle to **Live Mode** in Razorpay Dashboard
2. Go to **Settings** → **API Keys**
3. Generate **Live Keys** (start with `rzp_live_`)
4. Update Vercel environment variables:
   - `RAZORPAY_KEY_ID` → Live key ID
   - `RAZORPAY_KEY_SECRET` → Live key secret
   - `VITE_RAZORPAY_KEY_ID` → Live key ID

### Step 6.3: Update Webhook for Live

1. Add new webhook in **Live Mode**
2. URL: `https://nopromt.ai/api/webhook`
3. Update `RAZORPAY_WEBHOOK_SECRET` with new live secret

### Step 6.4: Redeploy

```bash
git push origin main
```

Vercel will auto-deploy with new environment variables.

---

## 7. File Structure Overview

```
/workspaces/nopromtapp/
├── api/
│   ├── create-order.ts      # Creates Razorpay order
│   ├── verify-payment.ts    # Verifies payment signature
│   ├── webhook.ts           # Razorpay webhook handler
│   └── user-subscription.ts # Get user subscription status
│
├── components/
│   └── PaymentModal.tsx     # Complete payment UI
│
├── services/
│   └── paymentService.ts    # Client-side payment API wrapper
│
├── supabase/
│   └── migrations/
│       └── 001_payment_schema.sql  # Database schema
│
├── types.ts                 # Payment type definitions
├── constants.ts             # PRICING_PLANS array
└── App.tsx                  # PaymentModal integration
```

---

## 8. Troubleshooting

### Issue: "Payment service not configured"

**Cause**: Missing Razorpay API keys in environment variables.

**Solution**: 
1. Check Vercel environment variables are set
2. Ensure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are present
3. Redeploy after adding variables

### Issue: "Database service not configured"

**Cause**: Missing Supabase service role key.

**Solution**:
1. Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel
2. Add `SUPABASE_URL` to Vercel
3. Redeploy

### Issue: Webhook not receiving events

**Cause**: Webhook URL incorrect or signature mismatch.

**Solution**:
1. Verify webhook URL is exactly `https://nopromt.ai/api/webhook`
2. Check `RAZORPAY_WEBHOOK_SECRET` matches Razorpay dashboard
3. Ensure webhook is Active in Razorpay dashboard

### Issue: Credits not updating after payment

**Cause**: Database function or RLS policy issue.

**Solution**:
1. Re-run the SQL migration in Supabase
2. Check `payment_logs` table for errors
3. Verify `add_user_credits` function exists

### Issue: "Invalid payment signature"

**Cause**: Signature verification failing.

**Solution**:
1. This usually means a tampering attempt - legitimate
2. Check if `RAZORPAY_KEY_SECRET` is correct
3. Ensure you're not modifying payment response before verification

---

## Security Best Practices Implemented

1. ✅ **Server-side key management** - Secret keys never exposed to client
2. ✅ **Signature verification** - All payments verified with HMAC SHA256
3. ✅ **Webhook signature check** - Prevents fraudulent callbacks
4. ✅ **Idempotency** - Duplicate payments prevented
5. ✅ **Rate limiting** - Max 10 orders per minute per user
6. ✅ **RLS policies** - Users can only view their own data
7. ✅ **Service role for webhooks** - Secure server-to-server communication
8. ✅ **Audit logging** - All payment events logged for debugging

---

## Quick Reference: API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/create-order` | POST | Create Razorpay order |
| `/api/verify-payment` | POST | Verify payment signature |
| `/api/webhook` | POST | Razorpay webhook handler |
| `/api/user-subscription` | GET | Get user subscription status |

---

## Need Help?

- **Razorpay Docs**: [https://razorpay.com/docs/](https://razorpay.com/docs/)
- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Vercel Docs**: [https://vercel.com/docs](https://vercel.com/docs)
