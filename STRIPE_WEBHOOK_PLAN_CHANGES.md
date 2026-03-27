# Stripe Webhook Plan Downgrade Support - Implementation Summary

## Problem
Previously, when a user downgraded from **family plan** to **premium plan**, the Stripe webhook handler would:
1. Preserve the old `plan_type` instead of detecting the change
2. Not update the user's plan type in the database  
3. Continue showing the downgraded user as "family" even after they switched to premium pricing

This meant:
- ❌ User paid premium price but saw family features
- ❌ Family plan features remained enabled even after downgrade
- ❌ No audit trail of plan changes in logs

## Solution Implemented

### 1. **Price ID to Plan Type Mapping** (`PRICE_ID_TO_PLAN_TYPE`)
Added a mapping system to identify plan types from Stripe price IDs:
```typescript
const PRICE_ID_TO_PLAN_TYPE: Record<string, 'free' | 'premium' | 'family'> = {
  'price_xxx_premium': 'premium',
  'price_xxx_family': 'family',
};
```

**How to configure:**
1. Find your Stripe price IDs in [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Update the mapping in `server/stripe.ts`
3. (Optional) Add metadata to Stripe prices with `plan_type` field as fallback

### 2. **Plan Detection Function** (`getPlanTypeFromSubscription()`)
New helper function that:
1. ✅ Extracts price ID from Stripe subscription
2. ✅ Looks up plan type from the mapping
3. ✅ Falls back to price metadata if mapping not found
4. ✅ Defaults to 'premium' as last resort

```typescript
function getPlanTypeFromSubscription(subscription: any): 'free' | 'premium' | 'family' {
  // Checks price ID mapping → price metadata → default
}
```

### 3. **Updated Webhook Handlers**

#### `handleSubscriptionUpdated()`
**Before:**
```typescript
plan_type: existing?.plan_type || 'premium'  // Always preserved old plan
```

**After:**
```typescript
const newPlanType = getPlanTypeFromSubscription(subscription);
// Logs plan changes
if (newPlanType !== oldPlanType) {
  console.log(`[Stripe] Plan change detected: ${oldPlanType} → ${newPlanType}`);
}
plan_type: newPlanType  // Uses detected plan from Stripe
```

#### `handlePaymentSucceeded()`
Same logic: Now detects and applies plan changes when invoices succeed, ensuring billing and plan type stay in sync.

#### `handlePaymentFailed()`
Preserved existing behavior (marks as past_due).

### 4. **What Gets Updated**
When a plan change is detected, the webhook updates:
- `plan_type` - NEW (family → premium)
- `stripe_price_id` - NEW price from subscription
- `status` - Payment status (active, past_due, etc)
- `current_period_start/end` - Billing cycle dates
- `cancel_at_period_end` - Cancellation flag
- `updated_at` - Timestamp of update

## Downgrade Flow: Family → Premium

### User Action
1. User clicks "Downgrade" in Stripe billing portal OR through Stripe API
2. New subscription with premium price ID is created

### Webhook Processing
3. Stripe sends `customer.subscription.updated` event
4. Handler retrieves subscription details from Stripe API
5. Detects new price_id (premium price)
6. Looks up plan_type from mapping: **premium**
7. Updates DB: `plan_type = 'premium'`
8. Next payment uses premium price

### App Behavior (After Refresh)
9. User calls `GET /api/user/premium-status`
10. Server returns `planType: "premium"` (not family)
11. UI removes family features, shows premium features
12. Client cache is invalidated

## Server Logs Example

```
[Stripe] Subscription updated - ID: sub_test_xxx, Status: active
[Stripe] Plan change detected for subscription sub_test_xxx: family → premium
[Stripe] Subscription updated in DB with plan_type: premium
[Stripe] Updated subscription status to active with plan_type: premium
```

## Configuration Needed

**Before this works, you must:**

1. Find your Stripe price IDs:
   - Log into Stripe Dashboard → Products
   - Copy price IDs for premium and family plans

2. Update `server/stripe.ts`:
   ```typescript
   const PRICE_ID_TO_PLAN_TYPE = {
     'price_1Abc123XyZ': 'premium',
     'price_2Def456QwE': 'family',
   };
   ```

3. Restart server: `npm run dev`

## Testing the Downgrade

### Option 1: Stripe Test Mode
1. Go to [Stripe Dashboard > Test Data](https://dashboard.stripe.com/test/settings/data)
2. Create a test subscription with family plan price
3. Go to [Webhooks Testing](https://dashboard.stripe.com/webhooks)
4. Send test `customer.subscription.updated` event with new premium price_id
5. Check server logs for plan change detection

### Option 2: Manual Web Hook Curl
```bash
# Simulate subscription update webhook
curl -X POST http://localhost:5000/stripe/webhooks \
  -H "Content-Type: application/json" \
  -d '{"type":"customer.subscription.updated","data":{"object":{"id":"sub_xxx","status":"active","items":{"data":[{"price":{"id":"price_premium_xxx"}}]}}}}'
```

## Verification

After implementing, verify these work:

1. **Status endpoint shows correct plan**:
   ```bash
   curl http://localhost:5000/api/user/premium-status
   # Should return: {"planType":"premium",...}
   ```

2. **Server logs show plan change**:
   ```
   [Stripe] Plan change detected: family → premium
   ```

3. **User sees premium features** (not family features)

4. **Billing reflects new price** in Stripe Dashboard

## Files Modified

- `server/stripe.ts` - Added plan detection, updated all handlers
- `STRIPE_PLAN_MAPPING.md` - Configuration guide (created)
- `STRIPE_WEBHOOK_PLAN_CHANGES.md` - This file

## Future Enhancements

- [ ] Client-side cache invalidation when plan changes
- [ ] Email notification on downgrade: "Your plan changed to premium"
- [ ] Audit log table to track all plan changes
- [ ] Auto-downgrade after free trial
- [ ] Support for more granular plan tiers (pro, enterprise, etc)

## Rollback (if needed)

If you need to revert to old behavior (preserving plan_type):

```typescript
// In handleSubscriptionUpdated, change back to:
plan_type: existing?.plan_type || 'premium'
```

Then restart the server.
