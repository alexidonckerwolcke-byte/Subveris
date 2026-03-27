# Stripe Integration Setup Guide

This guide walks you through setting up Stripe webhooks and payment integration for SubscriptionSense.

## Prerequisites

1. A Stripe account (https://stripe.com)
2. Stripe API keys (Secret and Publishable)
3. Node.js server running (for webhook handling)

## Step 1: Get Your Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API keys**
3. Copy your:
   - **Secret Key** (starts with `sk_live_` or `sk_test_`)
   - **Publishable Key** (starts with `pk_live_` or `pk_test_`)

## Step 2: Create a Premium Price

1. In Stripe Dashboard, go to **Products**
2. Create a new product:
   - **Name:** Premium Subscription
   - **Type:** Service
3. Add a price:
   - **Amount:** $9.99 (or your desired amount)
   - **Billing period:** Monthly
   - **Price ID:** Copy this (format: `price_xxxxx`)

## Step 3: Configure Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
VITE_STRIPE_PREMIUM_PRICE_ID=price_xxxxx
```

## Step 4: Set Up Webhooks

### Option A: Using ngrok (for local development)

1. Install ngrok: `brew install ngrok`
2. Run: `ngrok http 5000`
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### Option B: Using Supabase Edge Function (production)

1. Deploy via Supabase CLI:
   ```bash
   supabase functions deploy stripe-webhook
   ```
2. Get the function URL from Supabase dashboard

### Configure in Stripe

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL:** 
   - Local: `https://your-ngrok-url.ngrok.io/api/stripe/webhook`
   - Production: `https://your-supabase-url.supabase.co/functions/v1/stripe-webhook`
4. **Events to send:** Select these events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to `.env` as `STRIPE_WEBHOOK_SECRET`

## Step 5: Restart the Server

```bash
pkill -f "npm run dev"
npm run dev
```

## Step 6: Test the Integration

### Test Subscription Purchase

1. Open http://localhost:5173
2. Go to **Pricing** page
3. Click **Upgrade to Premium**
4. Use Stripe test card: `4242 4242 4242 4242` with any future expiry and CVC
5. You should be redirected to success page

### Test Webhook Delivery

1. In Stripe Dashboard → **Webhooks** → Your endpoint
2. Scroll to **Recent deliveries**
3. Click the latest event to see payload and response
4. Check server logs for webhook processing

## Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create subscription in database |
| `invoice.payment_succeeded` | Update subscription status to active |
| `invoice.payment_failed` | Mark subscription as past_due |
| `customer.subscription.updated` | Update subscription details |
| `customer.subscription.deleted` | Mark subscription as canceled |

## Database Schema

Subscriptions are stored in `user_subscriptions` table:

```sql
CREATE TABLE user_subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT, -- active, inactive, past_due, canceled
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stripe/subscription-status` | GET | Get user's subscription status |
| `/api/stripe/create-checkout-session` | POST | Create checkout session |
| `/api/stripe/cancel-subscription` | POST | Cancel subscription at period end |
| `/api/stripe/reactivate-subscription` | POST | Reactivate canceled subscription |
| `/api/stripe/webhook` | POST | Webhook receiver (raw body required) |

## Testing Checklist

- [ ] Environment variables set in `.env`
- [ ] Stripe API keys are valid
- [ ] Webhook endpoint configured in Stripe
- [ ] Can create checkout session
- [ ] Webhook delivers events
- [ ] Subscription status updates in database
- [ ] Frontend displays correct tier
- [ ] Premium features unlock after purchase

## Troubleshooting

### Webhook not delivering

1. Check ngrok is running and URL is correct
2. Verify webhook signing secret matches `STRIPE_WEBHOOK_SECRET`
3. Check server logs for errors: `npm run dev 2>&1 | grep -i webhook`
4. Test with Stripe CLI: `stripe listen --forward-to localhost:5000/api/stripe/webhook`

### Subscription not created

1. Verify checkout session has correct metadata
2. Check `user_subscriptions` table has entry
3. Look for Supabase errors in server logs

### Frontend not showing premium status

1. Verify `/api/stripe/subscription-status` returns correct tier
2. Check `useSubscription` hook is properly initialized
3. Clear browser cache and localStorage

## Test Credentials

```
Card: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
```

## Production Deployment

1. Switch Stripe keys to **Live** (remove `_test_`)
2. Deploy server to production
3. Configure production webhook in Stripe
4. Test with real payment method
5. Monitor webhook deliveries in dashboard
