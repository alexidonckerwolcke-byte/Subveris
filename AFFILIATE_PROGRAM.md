# Subveris Affiliate Program

## Program policy

- Only manually approved, active creators receive a referral code and private dashboard.
- Referral attribution is first-party and opt-in. A creator link records a click only after the visitor allows referral tracking. Subveris stores a random visitor token in browser storage for the configured attribution window (30 days by default); the server stores only its SHA-256 hash, not an IP address, user-agent string, or device fingerprint.
- The latest eligible click from an approved code is locked to the customer when the authenticated account claims it. A later click cannot overwrite a locked attribution. Existing free users may qualify if they have no earlier paid Stripe invoice; an account with a paid Premium or Family invoice before the click is excluded. Self-referrals by the same account or matching account email are rejected.
- A referral is not a commission. The first successfully collected paid subscription invoice must be Premium and fall within the click-time window. A free registration, failed or zero-value invoice, Family payment, later renewal, or organic visit does not earn commission. If Family is the customer's first paid plan, later Premium payments are not eligible.
- The default commission is 20% of Stripe `invoice.amount_paid`, rounded half-up in that currency's smallest unit. This basis is after discounts and includes tax; Stripe processing fees are not deducted. Currency amounts remain separate and are never added across currencies.
- Commission rates, attribution windows, and minimum payout minor units are configurable by an allowlisted administrator. The rate is snapshotted on each commission. The initial minimum payout is zero.
- Program settings are defaults. An administrator may override the commission rate, attribution window, and minimum payout independently for each creator; clearing creator overrides returns that creator to the current defaults. Attribution-window changes affect future referral clicks, and commission-rate changes affect future eligible payments. Payout minimums are enforced separately for each creator.
- Any refund, including a partial refund, reverses an unpaid commission in full. A dispute holds an unpaid commission until Stripe resolves it; a won dispute restores its prior status and a lost dispute reverses it. If a refund occurs after a manual payout, the commission is marked reversed for reporting, but this system does not claw back money automatically; the historical payout remains recorded for manual accounting reconciliation.
- Payouts are manual. A commission becomes paid only when an administrator records a completed transfer with its date and transaction reference. Scheduling or intending a transfer is not sufficient.

## Privacy and retention

The click table records the affiliate/code, timestamp, expiry, and opaque visitor hash. The hash is cleared after attribution or by retention cleanup after expiry. Click events and expired attributions without a commission are removed after 24 months when an affiliate API request runs cleanup. Rejected/inactive application details without financial records are redacted after 24 months. The creator sees aggregate statistics and shortened referral IDs only; no email, password, payment method, Stripe invoice identifier, or subscription details are exposed.

Deleting a Subveris account deactivates its affiliate code, redacts its application profile, and detaches account IDs from preserved financial records. Commission, refund/dispute, payout, audit, and Stripe event records currently have no automated expiry and are retained indefinitely in v1. This is a known retention limitation: establish a jurisdiction-specific financial-record schedule and implement/approve its purge process before enabling real payouts. Referral storage permission can be withdrawn from the Cookie Policy page; this stops future browser capture. Contact Subveris for correction or deletion requests affecting an already locked attribution, subject to legally required financial retention.

Before making payouts, administrators must determine the identity, tax, invoicing, and payout-method information required for the affiliate's jurisdiction. Do not put bank details, tax identifiers, or identity documents in commission notes or transaction references. Collect any required information through an appropriately secured and legally reviewed process outside this application; no automatic transfers are implemented.

## Deployment

1. Link the Supabase project, then apply the migration:

   ```sh
   supabase link --project-ref <project-ref>
   supabase db push
   ```

2. Configure the server-only administrator allowlist in Supabase Edge Function secrets. Use Supabase Auth UUIDs, comma-separated; do not use emails or expose this value through any `VITE_` variable:

   ```sh
   supabase secrets set AFFILIATE_ADMIN_USER_IDS="<admin-user-uuid>,<second-admin-user-uuid>" --project-ref <project-ref>
   ```

3. Deploy the existing API and webhook functions without changing their current gateway behavior. The API function is intentionally reachable without a user JWT for public routes; affiliate user/admin routes verify Supabase access tokens themselves. The Stripe webhook must remain reachable without a user JWT and must verify Stripe signatures in its handler.

   ```sh
   supabase functions deploy api --no-verify-jwt
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```

4. Keep the existing Supabase URL, anon key, service-role key, Stripe secret, webhook secret, and Premium/Family price IDs configured in their current environments. Do not add service-role or Stripe secrets to frontend variables.

5. Keep the existing Live-mode webhook endpoint and its signing secret unchanged. In Stripe Test mode, add a separate endpoint to the same `stripe-webhook` URL and subscribe it to `invoice.payment_succeeded`, `charge.refunded`, `charge.dispute.created`, and `charge.dispute.closed`. By default, the handler expects Test credentials in separate `STRIPE_TEST_*` secrets, processes only affiliate events from Test mode, and ignores Test events that could change Live subscription entitlements.

   Store the Test endpoint's signing secret as `STRIPE_TEST_WEBHOOK_SECRET` and its `sk_test_...` key as `STRIPE_TEST_SECRET_KEY` in Supabase function secrets. Do not replace `STRIPE_WEBHOOK_SECRET` or `STRIPE_SECRET_KEY`; those remain the Live credentials. Configure the Test Premium and Family price IDs as `STRIPE_TEST_PREMIUM_PRICE_ID` and `STRIPE_TEST_FAMILY_PRICE_ID`.

   For a temporary Test-only deployment where the standard secret names contain Test credentials, set `STRIPE_MODE=test`. In this mode the function uses `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_PRICE_ID`, and `STRIPE_FAMILY_PRICE_ID` as Test credentials/prices, processes only verified Test affiliate events, and rejects Live events. Before resuming Live processing, restore the Live values under those standard names and set `STRIPE_MODE=live` (or remove it). Never leave `STRIPE_MODE=test` enabled for Live traffic.

6. Run the site build and deploy the frontend using the existing Render/static-site process. The build emits a noindex SPA shell at `/affiliate/admin/index.html` so static hosts serve direct requests to the administrator route. Confirm the affiliate application route loads, an unapproved user receives no dashboard data, an allowlisted administrator can review records, and direct API calls from a non-admin receive `403`.

7. In Stripe Test mode, create a test Premium customer through the normal Subveris Checkout flow after opting into a referral link. Verify one pending commission appears only after the paid invoice event. Resend the same event to verify idempotency; then test a refund and dispute. Never use live customer payments for validation.

## Database integration test

The out-of-order refund/dispute reconciliation migration has a Docker-backed PostgreSQL integration test. It starts a disposable PostgreSQL 17 container, applies the migration to a minimal affiliate schema fixture, and verifies event reconciliation, dispute resolution, refund reversal, idempotency, and Stripe event-time ordering:

```sh
npm run test:affiliate-risk:integration
```

The test removes its own container on exit and does not connect to or change the hosted Supabase project. This focused test does not replace the full local Supabase stack, which requires the application's base database schema.

## Files and operational notes

The schema is introduced in `supabase/migrations/20261019_000000_create_affiliate_program.sql`. The Supabase API owns referral capture, customer attribution, admin authorization, dashboards, and exports in `supabase/functions/api/affiliate.ts`; it is routed from the existing API function. The existing `stripe-webhook` function creates and adjusts commissions. The UI is at `/affiliate` and `/affiliate/admin`.

`AFFILIATE_ADMIN_USER_IDS` configures the affiliate administrators. Test-mode webhook support uses separate `STRIPE_TEST_WEBHOOK_SECRET`, `STRIPE_TEST_SECRET_KEY`, and Test price-ID variables; it does not replace the Live Stripe credentials. Creator-specific commission terms are stored as nullable overrides on each affiliate; changes and resets are audited. The admin route is hidden from ordinary navigation and independently enforced on every server operation; hiding a link is not its authorization boundary. No separate affiliate provider or automatic payout integration is used.

Stripe invoice payment references are read from the invoice's paid `payments` entries, with support for legacy top-level fields. When Stripe omits payment details from the invoice event, the webhook retrieves paid Invoice Payments and expands their PaymentIntent/charge references. These references let later refund and dispute events find the correct commission. Refund or dispute events that arrive before the first-payment commission are retained as unmatched webhook events and reconciled, in Stripe event-time order, when the commission is inserted.

The program uses a global commission basis of actual Stripe amount paid after discounts, including tax. That choice is configurable in policy only after a migration change; the initial implementation intentionally fixes it for audit consistency. Review tax treatment, affiliate disclosures, cookies/consent, and record-retention periods with counsel/accounting for each operating jurisdiction before production payouts.