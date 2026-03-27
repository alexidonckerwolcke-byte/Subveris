# Stripe Plan Mapping Configuration

## Overview
The Stripe webhook handler can now detect and apply plan downgrades/upgrades by mapping Stripe price IDs to plan types (free, premium, family).

## Configuration

### Step 1: Find Your Stripe Price IDs

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. For each plan, note its price ID:
   - **Premium Plan**: Look for price ID like `price_1A2B3C4D5E6F...`
   - **Family Plan**: Look for price ID like `price_2X3Y4Z5A6B7C...`

### Step 2: Update the Price Mapping

Edit `server/stripe.ts` and update the `PRICE_ID_TO_PLAN_TYPE` object:

```typescript
const PRICE_ID_TO_PLAN_TYPE: Record<string, 'free' | 'premium' | 'family'> = {
  'price_1A2B3C4D5E6F': 'premium',      // Your premium plan price ID
  'price_2X3Y4Z5A6B7C': 'family',        // Your family plan price ID
};
```

### Step 3: Verify Metadata (Optional but Recommended)

When creating Stripe price objects, you can add metadata:

```bash
curl https://api.stripe.com/v1/prices/{PRICE_ID} \
  -u sk_test_... \
  -d "metadata[plan_type]=premium"
```

The webhook will fall back to this metadata if the price ID mapping isn't configured.

## How It Works

### Downgrade Scenario: Family → Premium
1. User initiates plan change in Stripe Dashboard or via Stripe API
2. Stripe sends `customer.subscription.updated` webhook
3. Handler detects new price_id
4. Maps price_id to new plan_type (premium)
5. Updates `user_subscriptions.plan_type` to `premium`
6. User sees premium features in app (after refresh)

### Payment Flow
- Stripe billing uses the new price immediately
- `handlePaymentSucceeded` also validates and confirms plan type matches the invoice

## Testing Downgrades

### Local Testing with Test Clock

```bash
# Create a test clock
curl https://api.stripe.com/v1/test_helpers/test_clocks \
  -u sk_test_... \
  -d "frozen_time=$(date +%s)"

# Use test subscription ID in webhook simulation
# Update pricing in Stripe test dashboard
# Trigger update webhook in webhook tester
```

### Manual Webhook Simulation

1. Go to [Stripe Webhook Testing](https://dashboard.stripe.com/webhooks)
2. Click "Send test event"
3. Select `customer.subscription.updated`
4. Modify the test payload to include your new price_id
5. Check server logs: `[Stripe] Plan change detected`

## Verification

After a downgrade, verify:
- ✅ `GET /api/user/premium-status` returns correct `planType` (also includes `currency` field indicating the user's preferred display currency)
- ✅ User sees premium-only features (not family features)
- ✅ Billing reflects the new plan price
- ✅ Server logs show: `[Stripe] Plan change detected: family → premium`

## Troubleshooting

**Plan not updating after downgrade?**
- Check that price IDs are correct in `PRICE_ID_TO_PLAN_TYPE`
- Verify webhook is being received (check Stripe Dashboard > Webhooks > Logs)
- Look for errors in server logs: `[Stripe] Error inferring plan type`

**Wrong plan type being applied?**
- Confirm Stripe subscription has correct `items.data[0].price.id`
- Add price metadata: `metadata[plan_type]=premium`
- Check the test clock is on the correct date

## Future Enhancements

- [ ] Add automatic cache invalidation in client when plan changes
- [ ] Send email notification when plan downgrades
- [ ] Create audit log of plan changes
- [ ] Support automatic downgrade after free trial ends
