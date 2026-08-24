# Subveris GDPR Data Inventory

Last reviewed: 2026-08-25

This inventory records what is evidenced by the current Subveris source code and applied Supabase migrations. It is an implementation inventory, not legal advice.

## Application Data

| Data category | Evidence / location | Purpose in the application | Storage | Retention status |
| --- | --- | --- | --- | --- |
| Account identity and email | Supabase Auth; `users` table; account endpoints in `supabase/functions/api/index.ts` | Authentication, account support, account export/deletion | Supabase Auth and public `users` table | Account deletion removes the public user row and Auth user. Provider retention is not controlled here. |
| User currency preference | `users.currency`; `/user/currency` route | Display amounts in the user's selected currency | Supabase `users` table | Removed with the public user row. |
| Subscription details | `subscriptions` table and subscription routes | Track recurring services, calculate spend, recommendations | Supabase `subscriptions` table | Removed by the account-deletion endpoint. |
| Transactions | `transactions` table | Store subscription-related transaction data and analytics | Supabase `transactions` table | Included in export and removed by account deletion. |
| Insights | `insights` table and `/insights` route | Store user-specific insight records | Supabase `insights` table | Included in export and removed by account deletion. |
| Billing plan metadata | `user_subscriptions` table; Stripe routes/webhook | Link user to Stripe customer/subscription, plan, status, and billing period | Supabase `user_subscriptions`; Stripe separately | Supabase row is exported and removed by account deletion. Stripe retention is provider-controlled. |
| Notification preferences | `notification_preferences` table | Store email, push, and digest preferences | Supabase table | Included in export and removed by account deletion. |
| Push subscription data | `push_subscriptions` table | Deliver web push notifications | Supabase table | Removed by account deletion. |
| Family memberships and settings | `family_groups`, `family_group_members`, `family_group_settings`, `family_group_plan_backups` | Family sharing and plan restoration | Supabase tables | User-owned rows are included where exported and deletion removes the user's related rows/settings. Provider backups are not controlled here. |
| Shared subscription and cost data | `shared_subscriptions`, `cost_splits` | Share subscriptions and calculate family cost allocation | Supabase tables | Some related rows are removed through foreign-key cascades; deletion coverage should be tested with real family data. |
| Calendar events | `subscription_calendar_events` | Renewal and subscription calendar features | Supabase table | Included in export and removed by account deletion. |
| Gmail OAuth data | `gmail_access_token`, `gmail_refresh_token`, `gmail_token_expiry` on `users`; extension `gmailAuthToken` | Read authorized Gmail data for receipt detection | Supabase `users` row and extension storage | Token deletion on disconnect must be tested in the deployed flow. Google retention is provider-controlled. |
| Extracted Gmail receipt data | Extension Gmail scanner extracts service names and amounts into detected subscription records | Detect subscriptions from receipts | Extension storage and Supabase subscription records | Full email content is not intentionally stored by the current scanner. Extracted records follow subscription-data handling. |
| CSV subscription data | Extension download monitoring and CSV parsing | Detect subscription names, amounts, and billing frequency | Extension storage and synchronized subscription records | Follow extension/subscription deletion process; local browser file retention is controlled by the user/browser. |
| Extension website usage | `content.js` measures time spent; `background.js` sends usage sync | Usage-based insights and cost-per-use analysis | Extension storage plus Supabase subscription usage fields | Account deletion removes application records. Local extension storage remains until browser data is cleared or extension cleanup is implemented. |
| Extension session data | Popup/background authentication; `authToken`, user ID, plan state, expiry | Authenticate extension requests and enforce Premium/Family access | Browser extension storage | Short-lived session is intended; expiry/clearance behavior should be tested in each supported browser. |

## Technical and Log Data

| Data category | Evidence / location | Status |
| --- | --- | --- |
| IP address | `server.js` reads `x-forwarded-for` or socket remote address for request handling/logging | Application-side collection is evidenced. Hosting/provider log retention is not verified. |
| Request and error logs | `console.log`/`console.error` in the Node server and Edge Functions | Application logs are evidenced. Supabase/hosting retention is provider-controlled. |
| Local cron logs | `logs/cron-status-updates.log`, `logs/cron-weekly-digest.log` | A cleanup script prunes entries older than 30 days before new cron entries are written. |
| Local A/B event log | `ab-events.log` written by `/api/ab-event` | Server prunes JSON entries older than 30 days at startup and before appending. |
| Cookies and browser storage | Supabase session storage, extension storage, and cookie scanning permission | The extension can inspect authentication cookies for supported services. A complete production cookie inventory still requires browser/provider inspection. |

## Recipients and Processors Evidenced in Code

- Supabase: authentication, Postgres database, and Edge Functions.
- Stripe: checkout, customer, subscription, and billing processing.
- Google: Gmail API access after OAuth authorization.
- The Subveris operator: access needed to operate and support the service must be confirmed by the controller.

The code does not establish a complete processor list, data-processing agreements, subprocessors, data-center locations, or international-transfer mechanisms. Those require provider-account review.

## User Controls Evidenced in Code

- Account export: `/api/account/export`.
- Account deletion: `DELETE /api/account`.
- Password update: `/api/account/password`.
- Email update: `/api/account/email`.
- Gmail disconnect/status behavior should be verified in the deployed settings flow.
- Privacy requests can be sent to `help.subveris@gmail.com`.

## Confirm Before Publishing a GDPR Claim

1. Replace the Privacy Policy controller address with the official registered business address.
2. Confirm that the deletion endpoint succeeds for every table listed above, especially family-sharing and calendar data.
3. Test that Gmail tokens are deleted when Gmail is disconnected.
4. Confirm local extension storage cleanup after logout, account deletion, and session expiry.
5. Confirm hosting and Supabase log retention; the repository only enforces 30 days for its own local logs.
6. Confirm Supabase, Stripe, and Google transfer safeguards and processor terms.
7. Confirm the actual people or contractors who can access production data.
8. Maintain a process for access, correction, deletion, restriction, portability, objection, and consent-withdrawal requests.
