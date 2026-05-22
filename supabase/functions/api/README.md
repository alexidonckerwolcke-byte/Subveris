# Supabase API Function

This function is the first step in migrating backend APIs from the Express server into Supabase Edge Functions.

## Available routes

- `POST /api/stripe/create-checkout-session`
- `GET /api/stripe/subscription-status`
- `POST /api/stripe/cancel-subscription`
- `POST /api/stripe/reactivate-subscription`
- `GET /api/user/premium-status`
- `GET /api/healthz`

## Notes

- This function is deployed at `/functions/v1/api`.
- The frontend must call the function URL, or use a reverse proxy, instead of the legacy `/api/*` Express server path.
- Stripe webhook handling remains in `supabase/functions/stripe-webhook`.
- Additional routes must be migrated one-by-one from `server/routes.ts`.
