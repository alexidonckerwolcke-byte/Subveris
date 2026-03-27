# Quick Start: Stripe Webhook Setup Checklist

## ✅ What's Already Done

- [x] Webhook endpoint (`/api/stripe/webhook`) implemented
- [x] Event handlers for all 5 Stripe events
- [x] Database schema (`user_subscriptions` table)
- [x] Frontend integration (subscription context, feature gating)
- [x] Signature verification
- [x] Error handling and logging
- [x] Raw body capture for security
- [x] TypeScript types
- [x] Supabase integration

## 📋 What You Need to Do

### Step 1: Get Stripe API Keys (5 min)
- [ ] Sign up at https://stripe.com
- [ ] Go to Dashboard → Developers → API keys
- [ ] Copy Secret Key (sk_test_...)
- [ ] Copy Publishable Key (pk_test_...)

### Step 2: Create Premium Product (5 min)
- [ ] Create product "Premium Subscription"
- [ ] Add monthly price ($9.99 recommended)
- [ ] Copy Price ID (price_...)

### Step 3: Update .env File (2 min)
```bash
# Add to .env
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
VITE_STRIPE_PREMIUM_PRICE_ID=price_YOUR_PRICE
```

### Step 4: Set Up Webhook (10 min)

#### For Local Testing:
```bash
# Terminal 1: Start ngrok
brew install ngrok
ngrok http 5000
# Copy HTTPS URL (e.g., https://abc123.ngrok.io)

# Terminal 2: Start server
npm run dev
```

#### In Stripe Dashboard:
- [ ] Go to Developers → Webhooks
- [ ] Click "Add endpoint"
- [ ] URL: `https://your-ngrok-url.ngrok.io/api/stripe/webhook`
- [ ] Select events:
  - [x] checkout.session.completed
  - [x] invoice.payment_succeeded
  - [x] invoice.payment_failed
  - [x] customer.subscription.updated
  - [x] customer.subscription.deleted
- [ ] Create endpoint
- [ ] Copy Signing Secret (whsec_...)
- [ ] Add to .env: `STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET`

### Step 5: Test Purchase Flow (10 min)
- [ ] Open http://localhost:5173
- [ ] Go to Pricing page
- [ ] Click "Upgrade to Premium"
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Expiry: Any future date
- [ ] CVC: Any 3 digits
- [ ] Complete checkout
- [ ] Check server logs for: `[Stripe] Webhook processed successfully`
- [ ] Verify subscription in Supabase (user_subscriptions table)
- [ ] Frontend should show premium features

### Step 6: Verify in Supabase
```sql
-- Check if subscription was created
SELECT * FROM user_subscriptions LIMIT 1;

-- Should show:
-- id, user_id, stripe_customer_id, stripe_subscription_id, 
-- stripe_price_id, status: "active", current_period_end: future date
```

## 🧪 Testing Checklist

### Backend Tests
- [ ] Webhook endpoint responds to POST requests
- [ ] Invalid signatures rejected (HTTP 400)
- [ ] Valid events create database records
- [ ] Status endpoint returns correct tier
- [ ] Server logs show [Stripe] prefixed messages

### Frontend Tests
- [ ] Pricing page displays upgrade button
- [ ] Checkout redirects to Stripe
- [ ] After payment, redirects back to app
- [ ] Premium tier appears in subscription context
- [ ] Premium features unlock (AI, Plaid, insights, etc.)

### Database Tests
- [ ] Records created in `user_subscriptions` table
- [ ] Correct user_id linked
- [ ] Stripe IDs stored properly
- [ ] Status updates on webhook events
- [ ] Created/updated timestamps populated

## 📊 Monitoring

### Watch for these logs:
```bash
npm run dev 2>&1 | grep "\[Stripe\]"
```

Expected output:
```
[Stripe] Processing webhook event: checkout.session.completed
[Stripe] Checkout completed - User: xxx, Subscription: yyy
[Stripe] Subscription created in DB for user xxx
[Stripe] Webhook processed successfully: evt_123
```

### Check Stripe Dashboard:
- Developers → Webhooks → Your Endpoint → Recent Deliveries
- Should see successful (200) or failed (4xx) responses
- Click events to see payload and response

## 🚀 Production Deployment

When ready to go live:

1. **Switch to Live Keys**
   - Get live keys (sk_live_, pk_live_)
   - Update .env with live keys
   - Update STRIPE_WEBHOOK_SECRET with live secret

2. **Update Webhook URL**
   - Stripe Dashboard → Webhooks → Your Endpoint
   - Change URL from ngrok to your production domain
   - e.g., `https://subscriptionsense.com/api/stripe/webhook`

3. **Test with Real Card** (don't charge)
   - Use a real credit card number
   - Stripe won't charge if in test mode during webhook setup
   - Verify logs show successful processing

4. **Monitor First 24 Hours**
   - Watch webhook delivery logs
   - Monitor failed payment attempts
   - Check customer support for issues

## ❌ Troubleshooting

### "Webhook error" response
→ Check STRIPE_WEBHOOK_SECRET in .env matches Dashboard

### No logs showing [Stripe]
→ Webhook not reaching your server
→ Check ngrok URL is correct in Stripe
→ Verify ngrok is still running

### Signature verification failed
→ Invalid signature header
→ ngrok URL doesn't match Stripe config
→ Check request is coming from Stripe (Stripe Dashboard events)

### Subscription not in database
→ Check user_id in checkout session metadata
→ Verify Supabase credentials
→ Check server logs for database errors

### Frontend shows free tier after purchase
→ Clear browser cache
→ Close and reopen browser
→ Check subscription-status endpoint response
→ Verify Supabase has the record

## 📞 Support Resources

- **Stripe Docs**: https://stripe.com/docs/payments/checkout
- **Webhook Docs**: https://stripe.com/docs/webhooks
- **Test Cards**: https://stripe.com/docs/testing
- **Supabase Docs**: https://supabase.com/docs

## ✅ Final Verification

Before declaring success:
- [ ] Can create checkout session
- [ ] Stripe processes payment
- [ ] Webhook endpoint receives event
- [ ] Signature verified successfully
- [ ] Subscription created in user_subscriptions
- [ ] Frontend fetches updated status
- [ ] Premium features unlock
- [ ] Server logs show [Stripe] success messages
- [ ] No errors in browser console
- [ ] No errors in server logs

**All complete? You're live! 🎉**
