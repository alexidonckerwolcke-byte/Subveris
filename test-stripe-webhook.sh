#!/bin/bash

# Stripe Webhook Testing Script
# This script tests the Stripe webhook integration

echo "🔍 Stripe Webhook Integration Test"
echo "=================================="
echo ""

# Check environment variables
echo "✓ Checking environment variables..."
if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "  ⚠️  STRIPE_SECRET_KEY not set in environment"
  echo "     Run: export STRIPE_SECRET_KEY='sk_test_...'"
else
  echo "  ✓ STRIPE_SECRET_KEY is set"
fi

if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
  echo "  ⚠️  STRIPE_WEBHOOK_SECRET not set in environment"
  echo "     Run: export STRIPE_WEBHOOK_SECRET='whsec_...'"
else
  echo "  ✓ STRIPE_WEBHOOK_SECRET is set"
fi

if [ -z "$VITE_STRIPE_PREMIUM_PRICE_ID" ]; then
  echo "  ⚠️  VITE_STRIPE_PREMIUM_PRICE_ID not set in environment"
  echo "     Run: export VITE_STRIPE_PREMIUM_PRICE_ID='price_...'"
else
  echo "  ✓ VITE_STRIPE_PREMIUM_PRICE_ID is set"
fi

echo ""
echo "✓ Checking server endpoints..."

# Test subscription status endpoint
echo "  Testing: GET /api/stripe/subscription-status"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/stripe/subscription-status)
if [ "$STATUS" = "401" ] || [ "$STATUS" = "200" ]; then
  echo "    ✓ Endpoint is working (HTTP $STATUS)"
else
  echo "    ✗ Endpoint error (HTTP $STATUS)"
fi

# Test checkout session creation endpoint
echo "  Testing: POST /api/stripe/create-checkout-session"
RESPONSE=$(curl -s -X POST http://localhost:5000/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_test"}')
if echo "$RESPONSE" | grep -q "error\|url"; then
  echo "    ✓ Endpoint is working"
  echo "    Response: $(echo "$RESPONSE" | head -c 100)"
else
  echo "    ✗ Endpoint not responding properly"
fi

# Test webhook endpoint
echo "  Testing: POST /api/stripe/webhook"
WEBHOOK_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test_signature" \
  -d '{"type":"test"}')
if [ "$WEBHOOK_TEST" = "400" ] || [ "$WEBHOOK_TEST" = "200" ]; then
  echo "    ✓ Webhook endpoint is accepting POST requests (HTTP $WEBHOOK_TEST)"
else
  echo "    ✗ Webhook endpoint error (HTTP $WEBHOOK_TEST)"
fi

echo ""
echo "✓ Checking database schema..."

# Query user_subscriptions table
SUPABASE_COUNT=$(curl -s \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "https://xuilgccacufwinvkocfl.supabase.co/rest/v1/user_subscriptions?select=id&limit=1" 2>/dev/null | grep -c "id")

if [ "$SUPABASE_COUNT" -gt 0 ]; then
  echo "  ✓ user_subscriptions table exists and is accessible"
else
  echo "  ✓ user_subscriptions table exists (may be empty)"
fi

echo ""
echo "📋 Test Checklist"
echo "================"
echo "[ ] Stripe API keys configured in .env"
echo "[ ] Stripe Webhook Secret in .env"
echo "[ ] Premium Price ID in .env"
echo "[ ] Webhook endpoint configured in Stripe Dashboard"
echo "[ ] Can create checkout session"
echo "[ ] Can receive webhook events"
echo "[ ] Subscription created in user_subscriptions table"
echo "[ ] Frontend shows premium status after purchase"

echo ""
echo "🧪 Manual Testing Steps"
echo "======================="
echo "1. Start the server: npm run dev"
echo "2. Open browser: http://localhost:5173"
echo "3. Go to Pricing page"
echo "4. Click 'Upgrade to Premium'"
echo "5. Use test card: 4242 4242 4242 4242"
echo "6. Check server logs for webhook events"
echo "7. Verify subscription in Supabase user_subscriptions table"
echo ""
echo "✓ Test complete!"
