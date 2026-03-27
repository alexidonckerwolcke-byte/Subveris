# Renewal Management System

## Overview

The application now includes automatic renewal date management and email notifications. This system handles:

1. **Auto-advance renewal dates** - Updates subscription renewal dates to the next cycle when the previous renewal date has passed
2. **Email reminders** - Sends email notifications to users 3-7 days before their subscriptions renew
3. **Client-side enforcement** - Calendar page validates and advances dates client-side as backup

## Features

### Auto-Advance Renewal Dates

**When it triggers:**
- Every time the user fetches their subscriptions (`GET /api/subscriptions`)
- Every 6 hours via background job
- When calendar page loads

**How it works:**
1. Checks if `next_billing_at` is in the past
2. If yes, advances to next cycle based on frequency:
   - **Monthly**: +1 month
   - **Quarterly**: +3 months
   - **Yearly**: +1 year
   - **Weekly**: +7 days

**Example:**
```
Subscription: Netflix (monthly)
Current next_billing_at: 2026-02-15
Today: 2026-02-22

Result: next_billing_at updated to 2026-03-15
```

### Email Reminders

**When it triggers:**
- Every 6 hours (configurable)
- Once on server startup (after 30 seconds)
- Can be manually triggered via API

**What it sends:**
Email to users 3-7 days before their subscriptions renew, listing:
- Subscription names
- Amounts and currencies
- Billing frequencies
- Exact renewal dates

**Sample reminder email:**
```
Subject: Upcoming Subscription Renewals

Your subscriptions are renewing soon:

- Netflix: $15.99 USD (monthly) - Renews: 2026-02-28
- Spotify: $11.99 USD (monthly) - Renews: 2026-03-01

Please make sure you have sufficient funds to cover these charges.
```

## Configuration

### Environment Variables (Backend)

```bash
# Optional: Admin API key for manual renewal triggers
ADMIN_API_KEY=your-secret-key-here

# Email service (should already be configured)
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
```

### Renewal Check Intervals

Edit [server/index.ts](server/index.ts) to change intervals:

```typescript
// Currently runs every 6 hours
setInterval(async () => {
  await sendRenewalReminders();
}, 6 * 60 * 60 * 1000); // Change this value
```

## APIs

### Manual Renewal Trigger (Admin)

Manually trigger renewal checks and emails:

```bash
curl -X POST http://localhost:5000/api/admin/renewal-checks \
  -H "X-API-Key: your-secret-key-here"
```

**Response:**
```json
{
  "success": true,
  "message": "Renewal checks completed"
}
```

### Get Subscriptions (Triggers Auto-Advance)

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/subscriptions
```

This endpoint automatically advances expired renewal dates before returning data.

## Code Files

### Backend

- **[server/renewal-manager.ts](server/renewal-manager.ts)** - Core renewal logic
  - `autoAdvanceRenewalDates(userId)` - Advances past renewal dates
  - `sendRenewalReminders(userId?)` - Sends email reminders
  - `runRenewalChecks()` - Combines both above functions

- **[server/routes.ts](server/routes.ts)** - API endpoints
  - `GET /api/subscriptions` - Calls `autoAdvanceRenewalDates()` before returning
  - `POST /api/admin/renewal-checks` - Manual trigger for renewal checks

- **[server/index.ts](server/index.ts)** - Server initialization
  - Sets up interval timer: every 6 hours
  - Runs initial check: 30 seconds after server start

### Frontend

- **[client/src/pages/calendar.tsx](client/src/pages/calendar.tsx)** - Calendar page
  - Client-side validation in `useEffect` hook
  - Auto-advances dates in UI
  - Sends PATCH to update server if date changed
  - Logs all advance operations

- **[client/src/components/subscription-calendar.tsx](client/src/components/subscription-calendar.tsx)** - Calendar component
  - Displays renewal events
  - Edit functionality for changing renewal dates
  - Real-time calendar UI

## Testing

### Test Email Sending

1. Manually trigger renewal checks:
```bash
curl -X POST http://localhost:5000/api/admin/renewal-checks \
  -H "X-API-Key: test-key" \
  -H "Content-Type: application/json"
```

2. Check server logs for:
```
[Renewal] Sent reminder email to user@example.com for X subscriptions
```

### Test Auto-Advance

1. Go to Calendar page
2. Check browser console for:
```
[calendar] auto-advancing <subscription-id> <old-date> -> <new-date>
```

3. Or check subscriptions API response - `nextBillingDate` should be in future

### View Logs

Watch server logs while renewal checks run:
```bash
tail -f /path/to/server/logs.txt | grep "\[Renewal\]"
```

## Troubleshooting

### Emails not being sent

1. Check that email service is configured (SMTP settings in env)
2. Verify `ADMIN_API_KEY` is set if using manual trigger
3. Look for errors in server logs: `[Renewal] Error`
4. Manually test email with: `POST /api/admin/renewal-checks`

### Dates not advancing

1. Check server logs when fetching subscriptions
2. Look for: `[mapSubscriptionFromDb] Generated default date for`
3. Verify subscription frequencies are correct (monthly, yearly, etc.)
4. Check calendar page console: `[calendar] Creating renewal events`

### Renewal events not showing in calendar

1. Verify subscriptions have `nextBillingDate`
2. Check calendar page console logs
3. Ensure subscription status is `active` or `unused`
4. Refresh page to reload data

## Future Enhancements

- [ ] User preferences for email reminders (enable/disable, days before)
- [ ] Database table to track reminder sent status
- [ ] Webhook integration for external services
- [ ] SMS reminders as alternative to email
- [ ] Batch database updates for scaling
- [ ] Cron job monitoring and alerting
