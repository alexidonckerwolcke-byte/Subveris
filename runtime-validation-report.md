# Runtime Validation Report

**Generated**: 2026-10-30T00:09:20+01:00
**Target**: `/Users/alexidonckerwolcke/Subveris`

## Summary

| Step | Status | Exit Code | Details |
|---|---|---:|---|
| Production build | PASS | 0 | `npm run build`; Vite build and prerender audit passed for 30 routes. |
| TypeScript check | PASS | 0 | `npx tsc --noEmit`; all project diagnostics are resolved. |
| Affiliate/auth regression tests | PASS | 0 | 4 test files, 33 passed. |
| Full Vitest suite | PASS | 0 | 37 files: 223 passed, none skipped; local Supabase-backed tests were enabled with disposable local credentials. |
| Previously skipped security-header tests | PASS | 0 | All 4 header assertions passed against the same helper used by the Node server. |
| Account deletion integration | PASS | 0 | 4 tests passed against the local API Edge Function, including deletion, data removal, and rejection of the deleted user's subsequent write. |
| Family-sharing API E2E | PASS | 0 | Multi-step local Supabase flow passed: invitation/acceptance, family visibility, explicit sharing, cost split, unsharing, and privacy boundaries. |
| Production admin browser check | PASS | 0 | Signed-in page loaded at `/affiliate/admin`; application, payout, and webhook sections rendered without a sign-in prompt. Read-only check. |
| Stripe Test dispute/refund flow | PASS | 0 | Out-of-order dispute was reconciled automatically; won dispute restored commission to `pending_review`; refund event reversed it; subscription was canceled. |
| Docker runtime | PASS | 0 | Installed Docker CLI, Compose, and Colima; engine responds to `docker info`, and `docker run --rm hello-world` succeeded. |
| Affiliate risk-event PostgreSQL integration | PASS | 0 | `npm run test:affiliate-risk:integration` starts disposable PostgreSQL 17 in Docker, applies the risk-event migration, and verifies queued disputes, winning resolution, duplicate-event idempotency, refunds, and event-time ordering. |
| Full local Supabase stack | PASS | 0 | `supabase start` applied all 36 migrations; database, Auth, and REST are healthy. `supabase db lint --local` reported no schema errors. |
| Clean local migration replay | PASS | 0 | With approval, `supabase db reset --local --yes` replayed all 36 migrations from an empty local database; 31 public tables were created and schema lint passed. |
| AI-styled icon cleanup | PASS | 0 | Replaced sparkles/robot visuals across the product UI with neutral icons or removed redundant decoration; local homepage rendered successfully. |
| Renewal date forwarding | PASS | 0 | Focused tests cover missed monthly and quarterly cycles, including preserving end-of-month renewal dates. The calendar advances billable `to-cancel` subscriptions, updates only owner records, and serializes automatic writes to avoid duplicate concurrent updates. |
| Stripe plan price selection | PASS | 0 | Checkout now sends a plan key; the API selects its configured price ID server-side, preventing stale frontend price IDs from being rejected. |
| Supabase API Edge Function type-check | PASS | 0 | `npx deno check --config supabase/functions/api/deno.json --no-lock supabase/functions/api/index.ts` passed after fixing affiliate click-result inference. |
| Local API function serving | PASS | 0 | Supabase CLI 2.122.0 served the API function locally; `/stripe/config` returned the expected 500 because local Stripe price IDs are not configured. No hosted deployment was performed. |
| Family recurring price configuration | PASS | 0 | Created an active €14.99/month recurring Test price for the configured Family product and set `STRIPE_FAMILY_PRICE_ID` in the linked Supabase project. Hosted `/stripe/config` returns the new price. No checkout session or payment was created. |
| Live frontend rollout | BLOCKED | n/a | `gh-pages` publish completed, but `subveris.com` is served by Render and continues serving the old checkout bundle. Render has not rolled out the plan-key frontend. |
| Render container startup fix | PASS | 0 | Added the missing `/app/server` copy to the runtime Docker stage. Docker image built successfully; the helper imported in the final image and the container started with `/api/health` returning HTTP 200. |

**Overall**: PASS for the local bootstrap and formerly skipped test coverage. Hosted Stripe Checkout card entry and browser-based local UI journeys remain unverified.

## Fixes Applied

- Updated the cost-per-use and family-sharing Supabase test doubles to implement the `maybeSingle()` query used by the production handlers.
- Added a Web Locks API shim to the jsdom test setup so Supabase auth initialization behaves in tests without browser-provided `navigator.locks`.
- Corrected current-month billing checks so a deleted subscription with a precise renewal timestamp later today is not treated as already billed.
- Added a chronological base-schema migration so a clean local database can replay the checked-in migrations without relying on an undocumented pre-existing schema.
- Added the Supabase table/sequence grants and default privileges needed by the local API integration tests and later migrations.
- Extracted the Node server's security-header setup into a shared helper and enabled the four previously skipped header tests.
- Reworked the account-deletion and family-sharing E2E tests to exercise the actual local Supabase API Edge Function using temporary users, with cleanup.
- Reject authenticated API requests when their decoded user no longer exists, preventing deleted accounts from reaching data writes and failing with a database error.
- Fixed the client TypeScript errors: typed the paginated subscription prefetch, annotated Supabase update results, preserved the lowercase HTML `fetchpriority` attribute, and wrapped Gmail connection callbacks.
- Extended the billing-month helper to accept an explicit renewal date and timezone, matching its API-side counterpart and supporting family spend calculations.
- Replaced AI-styled sparkle icons and the onboarding robot emoji across the UI with neutral product icons or removed redundant decoration; retained ordinary functional icons.
- Fixed overdue renewal advancement to calculate from the original billing date, preserving end-of-month cycles; included billable `to-cancel` subscriptions; limited automatic writes to the authenticated owner; and serialized updates.
- Changed checkout callers to submit the requested plan instead of a client-cached Stripe price ID; the API now resolves the current configured price with the same environment precedence as `/stripe/config`.
- Explicitly typed the eligible affiliate-click result to preserve its `record` property through the shared selector's generic inference and pass the Edge Function type-check.
- Replaced the Family plan's configured one-time USD $15 price with an active €14.99/month recurring Stripe Test price; updated the linked Supabase function secret and verified the hosted config endpoint returns it.

## Test Evidence

- Focused run: `npx vitest run tests/affiliateApi.test.ts tests/affiliatePolicy.test.ts tests/affiliateWebhook.test.ts tests/authRedirect.test.ts` — exit code 0; 33 passed.
- Focused run: four previously failing files — exit code 0; 25 passed, 4 skipped.
- Prior full run: `npx vitest run` — exit code 0; 214 passed, 9 skipped.
- Build: `npm run build` — exit code 0.
- Formatting: `git diff --check` — exit code 0.
- Docker: `docker info`, `docker compose version`, and `docker run --rm hello-world` succeeded using Colima.
- Docker-backed PostgreSQL: `npm run test:affiliate-risk:integration` — exit code 0; the actual `20261028_000001_queue_unmatched_affiliate_risk_events.sql` was applied and the database assertions passed.
- Full local Supabase: `supabase start` — exit code 0; all 36 migrations applied, with 31 public application tables present. Local Auth health and REST root returned HTTP 200.
- Clean local database replay: `supabase db reset --local --yes` — exit code 0; all 36 migrations applied from an empty database. `supabase db lint --local` passed with no schema errors; Auth and REST returned HTTP 200.
- Local schema lint: `supabase db lint --local` — exit code 0; no schema errors found.
- Local migration history: 36 migration rows present after startup.
- Full Vitest run with local Supabase, Edge Functions, the local Node server, and temporary local credentials: exit code 0; 223 passed, 0 skipped across 37 files.
- Account-deletion integration: 4 passed against the local Edge Function. It confirmed the old token is rejected after the account has been deleted.
- Family-sharing API E2E: 1 passed against local Supabase; it verifies member privacy before and after explicit sharing, an outsider's personal-only view, cost allocation, and unsharing.
- Security header tests: 4 passed; they exercise the shared helper wired into `server.js`.
- Production build rerun after the bootstrap migration: `npm run build` — exit code 0; Vite build and prerender completed.
- Focused billing-month tests: `npx vitest run tests/billingMonth.test.ts` — exit code 0; 13 passed, including explicit timezone and renewal-date coverage.
- Local TypeScript project check after fixes: `npx tsc --noEmit` — exit code 0; no diagnostics.
- Production build after TypeScript fixes: `npm run build` — exit code 0; Vite build and prerender completed.
- Icon cleanup verification: `npx tsc --noEmit` and `npm run build` — exit code 0; local homepage returned HTTP 200 and rendered with the neutral chart icon.
- Renewal forwarding: `npx vitest run tests/billingMonth.test.ts tests/familyData.test.ts` — exit code 0; 24 passed. `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed after the forwarding fix.
- Stripe checkout configuration: `npx vitest run tests/stripeCheckoutPricing.test.ts` — exit code 0; 4 passed, including a stale-client-price regression case. The deployed public config endpoint returned HTTP 200; no live checkout was created.
- Edge Function deploy preparation: configured Deno check passed; local Supabase CLI 2.122.0 served the API function. Four focused affiliate and checkout test files passed (35 tests), and the project TypeScript check passed. The local `/stripe/config` call returned HTTP 500 because local Stripe price IDs are not configured.
- The user's initial hosted deploy attempt with Supabase CLI 2.108.0 failed with a generic `Effect.tryPromise` error. No change was made during that attempt; a later approved Test-price and Supabase configuration update is recorded below.
- The hosted API function was subsequently updated (active API function version 331 at the time checked), and the Family Stripe Test price setting was changed. A complete authenticated browser checkout has not been retried, and no Stripe Checkout session was created.
- The repository's `npm run deploy` published `dist/public` to the GitHub `gh-pages` branch, but this is not the production site: `subveris.com` responds from Render and still serves `/assets/index-YxTrU6fS.js` with the old `{ priceId }` request. The source fix is on `main` commit `91f7b293`; Render deployment must complete before checkout can be verified.
- The Render startup failure was caused by the runtime Docker stage copying `server.js` but omitting its imported `server/security-headers.js` helper. The runtime stage now copies `/app/server`; the image builds, the module imports successfully in the final image, and `/api/health` returned HTTP 200 from the container.
- `git diff --check` — exit code 0.
- Supabase `stripe-webhook` is active at version 105.
- The winning `charge.dispute.closed` event was recorded against the test commission and restored it from `held` to `pending_review` without manual replay.
- The later `charge.refunded` event was recorded against the same commission and set its status to `reversed`. The associated Stripe Test subscription is canceled.

## Environment and Gaps

- Docker Desktop’s Homebrew cask installation required `sudo`, which is not available in this terminal. Installed the Docker CLI, Compose plugin, and Colima instead; the Docker engine is running in Colima.
- The focused PostgreSQL integration test uses a minimal affiliate-schema fixture and passes against the actual risk-event migration. It validates that migration and its database behavior, not all application tables or services.
- The new bootstrap migration is a reconstructed local starting schema, based on the checked-in migrations and a read-only schema reference. It does not import production data or apply schema changes to the hosted project.
- Account-deletion and family-sharing integration tests require `TEST_SUPABASE_URL`, `TEST_SUPABASE_SERVICE_ROLE_KEY`, and `TEST_SUPABASE_ANON_KEY`; the full run supplied temporary credentials from the local Supabase stack and removed all generated users afterward.
- Supabase startup emits a non-fatal warning because `supabase/seed.sql` is not present; startup and all migrations still complete successfully.
- Hosted Stripe Checkout card-entry UI was not verified in a browser during this validation; the payment/dispute/refund lifecycle was validated with Stripe Test API activity and webhook records.
- Stripe Test checkout configuration is corrected on the linked Supabase project. The live Render frontend still needs deployment; after that, an authenticated browser checkout retry is needed to verify the end-to-end redirect. No payment or checkout session was initiated.
- The new family-sharing and account-deletion flows are API-level E2E tests, not browser-based UI journeys. The previous signed-in production admin browser check remains separate evidence.
- Node.js: available (v24.18.0).
- Playwright: Chromium installation check succeeded. The production admin UI was checked in the integrated browser.
- `npx vitest run` is the available suite command; `package.json` has no `test` script.
