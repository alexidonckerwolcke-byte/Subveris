# Quick Reference: Renewal System

## ✅ What Works Now

### Calendar Display
- ✅ Renewal dates show as events on calendar
- ✅ Click to edit renewal dates
- ✅ Dates are synced from database

### Automatic Advancement
- ✅ Past renewal dates auto-advance to next cycle
- ✅ Happens when you fetch subscriptions
- ✅ Happens every 6 hours via background job
- ✅ Logs all changes to server console

### Email Reminders
- ✅ Automatic emails 3-7 days before renewal
- ✅ Sent every 6 hours
- ✅ Can be manually triggered
- ✅ Lists all upcoming renewals

---

## Quick Test

### 1. View Calendar
```
1. Open app
2. Go to Calendar page
3. Should see renewal dates as events
4. Open browser console (F12)
5. Look for "[calendar] Creating renewal events..." logs
```

### 2. Test Auto-Advance
```
1. Create subscription with today as renewal date
2. Refresh page
3. Check browser console
4. Look for "[calendar] auto-advancing..." log
5. Renewal date should have moved to next month
```

### 3. Test Email Reminders
```
1. Manually trigger: POST /api/admin/renewal-checks
2. Check server logs for "[Renewal] Sent reminder..."
3. Check email inbox
4. Should have received renewal reminder
```

---

## File Locations

| File | Purpose |
|------|---------|
| [server/renewal-manager.ts](server/renewal-manager.ts) | Core renewal logic |
| [server/index.ts](server/index.ts) | Background job scheduling |
| [server/routes.ts](server/routes.ts) | API endpoints |
| [client/src/pages/calendar.tsx](client/src/pages/calendar.tsx) | Calendar page with auto-advance |
| [RENEWAL_SYSTEM.md](RENEWAL_SYSTEM.md) | Detailed documentation |
| [RENEWAL_IMPLEMENTATION_COMPLETE.md](RENEWAL_IMPLEMENTATION_COMPLETE.md) | Full implementation guide |

---

## Environment Variables Needed

```env
RESEND_API_KEY=sk_test_...  # For sending emails (should be set)
ADMIN_API_KEY=secret-key    # Optional, for manual renewal trigger
```

---

## Server Logs to Watch

Good signs (watch in terminal):
```
[Renewal] Sent reminder email to user@example.com for 3 subscriptions
[Renewal] Advanced Netflix from 2026-02-15 to 2026-03-15
[Renewal] Running renewal checks...
```

Problems to watch for:
```
[Renewal] Error fetching subscriptions:
[Renewal] Error sending email to user@example.com:
[Renewal] Could not find email for user...
```

---

## Browser Console Logs

Good signs (open DevTools F12):
```
[calendar] Creating renewal events from subscriptions: {totalSubscriptions: 5, subscriptionsWithDates: 5}
[calendar] Renewal events generated: [{...}]
[calendar] Final merged calendar events: [{...}]
[calendar] auto-advancing subscription-id 2026-03-15 -> 2026-04-15
```

Problems to watch for:
```
[calendar] Creating renewal events from subscriptions: {totalSubscriptions: 5, subscriptionsWithDates: 0}
// ^ Means subscriptions don't have nextBillingDate
```

---

## API Endpoints

### Get Subscriptions (Auto-Advances Dates)
```bash
GET /api/subscriptions
Authorization: Bearer <token>

# Returns subscriptions with nextBillingDate auto-advanced if past
```

### Manually Trigger Renewal Checks
```bash
POST /api/admin/renewal-checks
X-API-Key: your-secret-key

# Sends emails immediately for upcoming renewals
```

---

## How Often Things Happen

| Event | Frequency | Where |
|-------|-----------|-------|
| Date auto-advance | Every API call + Every 6 hours | `autoAdvanceRenewalDates()` |
| Email reminders | Every 6 hours + On startup (30s) | Background job in `index.ts` |
| Calendar refresh | When user opens page | React Query caching |
| Manual check | On demand | `POST /api/admin/renewal-checks` |

---

## Database Table

All renewal data stored in existing `subscriptions` table:
- Column: `next_billing_at` (stores date string, e.g. "2026-03-15")
- Type: `TEXT`
- When set: Created with subscription, auto-updated by system
- Format: ISO 8601 date (YYYY-MM-DD)

---

## Configuration

### To Change Email Interval

Edit [server/index.ts](server/index.ts):
```typescript
// Current: 6 hours
setInterval(..., 6 * 60 * 60 * 1000);

// Change to:
// 3 hours:  3 * 60 * 60 * 1000
// 1 hour:   1 * 60 * 60 * 1000
// 24 hours: 24 * 60 * 60 * 1000
```

### To Disable Email Reminders

Comment out in [server/index.ts](server/index.ts):
```typescript
// setInterval(async () => {
//   await sendRenewalReminders();
// }, 6 * 60 * 60 * 1000);
```

---

## Debugging

### See all database renewal dates
```bash
# Get first subscription with full details
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/subscriptions | jq '.[0]'

# Should show nextBillingDate field
```

### Manually set a date to today (for testing)
1. Open app
2. Go to subscriptions
3. Click Edit on a subscription's renewal date
4. Set to today's date
5. Calendar should auto-advance it to next month

### Force Database Update
Run migration script:
```bash
npx ts-node script/set-default-renewal-dates.ts
```

---

## What Users See

### In Calendar
- Green badge showing "Netflix Renewal"
- Date it will renew
- Click to edit date
- Automatic updates when dates advance

### In Email
```
Subject: Upcoming Subscription Renewals

Hi there,

Your subscriptions are renewing soon:

- Netflix: $15.99 USD (monthly) - Renews: 2026-03-01
- Spotify: $11.99 USD (monthly) - Renews: 2026-03-05

Please make sure you have sufficient funds.

Best regards,
The Subveris Team
```

---

**Everything is ready to go! 🚀**
