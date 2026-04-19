# Subveris

A SaaS web app for managing recurring payments and subscriptions with Supabase Auth, Supabase Database, and Stripe integration.

## Setup

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_signing_secret
VITE_STRIPE_PREMIUM_PRICE_ID=price_1T3jhIJpTYwzr88x8pGboTSU
VITE_STRIPE_FAMILY_PRICE_ID=price_1T3jikJpTYwzr88xIxkKHkKu
STRIPE_CHECKOUT_SUCCESS_URL=https://your-domain.com/pricing?checkout=success
STRIPE_CHECKOUT_CANCEL_URL=https://your-domain.com/pricing?checkout=cancel
NODE_ENV=development  # or production
```

Use `.env.example` as the template and do not commit `.env` to source control.

### Installation

```bash
npm install
```

### Running the Server

```bash
npm run dev
```

## Stripe setup

### Required Stripe configuration
- Create Stripe products/prices for your plans
- Use these plan IDs in the app:
  - Premium: `price_1T3jhIJpTYwzr88x8pGboTSU`
  - Family: `price_1T3jikJpTYwzr88xIxkKHkKu`
- Add the Stripe secret keys and webhook signing secret to your `.env` file

### Webhook endpoint
- Configure Stripe to send webhooks to:
  - `https://<your-domain>/api/stripe/webhook`
- Subscribe to these event types:
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

### Notes
- `STRIPE_CHECKOUT_SUCCESS_URL` and `STRIPE_CHECKOUT_CANCEL_URL` are optional
- Your app can use the default fallback URLs if these are not set

## API Endpoints

All endpoints require authentication via Bearer token in the Authorization header.

### Subscribe to a Plan

Creates a Stripe customer and subscription using the deployed Supabase Edge Function.

**POST** `/api/subscribe`

**Headers:**
```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "paymentMethodId": "pm_1234567890",
  "priceId": "price_1234567890"
}
```

**Example curl:**
```bash
curl -X POST http://localhost:5000/api/subscribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethodId": "pm_1234567890", "priceId": "price_1234567890"}'
```

### Get Subscription Status

Retrieves the current user's subscription information.

**GET** `/api/subscription`

**Headers:**
```
Authorization: Bearer <supabase_jwt_token>
```

**Example curl:**
```bash
curl -X GET http://localhost:5000/api/subscription \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Cancel Subscription

Cancels the current user's subscription.

**POST** `/api/subscription/cancel`

**Headers:**
```
Authorization: Bearer <supabase_jwt_token>
```

**Example curl:**
```bash
curl -X POST http://localhost:5000/api/subscription/cancel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Family-sharing endpoints

These routes allow users to create and manage family groups, share
subscriptions, and split costs between family members. Only the group
owner (or the member themselves where noted) may perform certain actions.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/family-groups` | create a new family group (owner becomes current user) |
| GET | `/api/family-groups/me/membership` | check which group the current user belongs to |
| GET | `/api/family-groups/:id/members` | list all members of a group |
| POST | `/api/family-groups/:id/members` | add a user to the group by email |
| DELETE | `/api/family-groups/:id/members/:memberId` | remove a member (owner or self) |
| PUT | `/api/family-groups/:id/settings` | update group settings such as `show_family_data` flag |
| POST | `/api/family-groups/:id/share-subscription` | share one of your subscriptions with the group |
| DELETE | `/api/family-groups/:id/shared-subscriptions/:sharedId` | stop sharing a subscription |
| GET | `/api/family-groups/:id/shared-subscriptions` | list all subscriptions shared in the group |
| POST | `/api/family-groups/:id/shared-subscriptions/:sharedId/cost-splits` | assign a percentage share for a user on a shared subscription |
| GET | `/api/family-groups/:id/shared-subscriptions/:sharedId/cost-splits` | retrieve cost splits for a shared subscription |

Authentication is required for all family-sharing routes; include a
standard `Authorization: Bearer` header with a valid Supabase JWT.

Example: share a subscription via curl
```bash
curl -X POST http://localhost:5000/api/family-groups/$(GROUP_ID)/share-subscription \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subscriptionId":"sub_123"}'
```

Keep these endpoints covered by the E2E tests (`tests/e2e/familyShare.test.ts`) so
that any change in group logic will be caught.

## API Documentation

## Endpoints

- `POST /api/family-groups` — Create a new family group
- `GET /api/family-groups/:id/family-data` — Get group data (role-based)
- `POST /api/family-groups/:id/share-subscription` — Share a subscription
- `DELETE /api/family-groups/:id/shared-subscriptions/:sharedId` — Unshare a subscription
- `GET /api/family-groups/:id/shared-subscriptions` — List shared subscriptions
- `POST /api/family-groups/:id/shared-subscriptions/:sharedId/cost-splits` — Assign cost split
- `GET /api/family-groups/:id/shared-subscriptions/:sharedId/cost-splits` — Get cost splits
- `GET /metrics` — Prometheus metrics
- `GET /healthz` — Liveness probe
- `GET /readyz` — Readiness probe

## Setup

1. `npm install`
2. `docker-compose up` (for local dev)
3. `npm run test` (run all tests)
4. `npm run loadtest` (run load test)

## Onboarding

- See `.env.example` for required environment variables
- All endpoints require authentication (see `README.md` for details)

## Troubleshooting

- For rate limit errors, see `/api/` limiter in `server/index.ts`
- For metrics, visit `/metrics` and add to Prometheus
- For a11y, run `npm test` and check `tests/a11y.test.tsx`

## Stripe Integration

- Customers are automatically created when subscribing via the Edge Function.
- Subscription data is stored in the `user_subscriptions` table.
- Webhooks can be configured for additional event handling (payment_failed, invoice.paid, etc.).

## Automated Status Updates

The application automatically manages subscription statuses based on monthly usage:

- **Active subscriptions** with zero monthly usage are automatically set to "unused" at the end of each month
- **Unused subscriptions** are moved to "to-cancel" status after 60 days of no usage
- Status updates run via a scheduled cron job

### Setting up Cron Job

To set up automatic monthly status updates, add this to your crontab (run `crontab -e`):

```bash
# Run subscription status updates at 11:59 PM on the last day of every month
59 23 L * * /path/to/subveris-2/cron-update-statuses.sh
```

Or run manually:
```bash
npm run update-statuses
```

## Development

- Frontend: React with TypeScript
- Backend: Express.js with TypeScript
- Database: Supabase (PostgreSQL)
- Payments: Stripe
- Auth: Supabase Auth

## Testing & CI/CD

A minimal GitHub Actions workflow lives in `.github/workflows/ci.yml`. It runs on every push and pull request against `main`/`master`:

1. installs dependencies (`npm ci`)
2. type‑checks (`npm run check`)
3. executes the Vitest suite with coverage (`npm run test:coverage`)
4. builds the client and server for sanity

A second workflow (see `.github/workflows/deploy.yml`) builds and pushes Docker images to GitHub Container Registry; you can extend it to deploy to your hosting provider.

To run tests locally:

```bash
npm run test           # quick run
npm run test:coverage  # include coverage report
npm run test:ui        # interactive UI
```

### Docker & local development

The repo now includes Dockerfiles for both server and client plus a
`docker-compose.yml` that brings up the API, frontend dev server, and
Redis. Example:

```bash
docker-compose up --build
```

Environment variables are read from the root `.env` file as usual. In
production you can build images with `docker build .` and push them to a
registry; the deploy workflow handles this automatically to `ghcr.io/…`.

The runtime image uses a multi‑stage build so only production deps and the
compiled `dist` directory are included.

Monitoring is already wired through Sentry (see `server/sentry.ts` and
`client/src/sentry.ts`). The deployment workflow also creates a Sentry
release using the git SHA if you provide a `SENTRY_AUTH_TOKEN` secret and
set `SENTRY_ORG`/`SENTRY_PROJECT` in `.github/workflows/deploy.yml`.

The CI pipeline will lint, test, and build on every commit. Add further
jobs (security audit, vulnerability scanning, container scans) as needed.

# Staging and Blue-Green Deployment

- Staging environment mirrors production for safe testing.
- Blue-green deployment: deploy to staging, run health checks, then cut over traffic to production.
- Use `/healthz` and `/readyz` endpoints for automated checks.

# Slack/Discord Notifications

- CI and deploy workflows notify team on success/failure.
- See `.github/workflows/deploy.yml` for Slack integration example.

# Rollback

- To rollback, redeploy previous Docker image tag from GitHub Container Registry.

# Advanced

- Add canary deployments with traffic splitting (see Kubernetes docs).
- Use Prometheus + Grafana for live monitoring.# Subveris
# Subveris
# Subveris
# Subveris
# Subveris
# Subveris
