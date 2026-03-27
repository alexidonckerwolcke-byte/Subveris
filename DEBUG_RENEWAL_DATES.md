# Debug Guide: Renewal Dates Not Showing

## Quick Diagnostic Steps

### 1. Check Browser Console (F12 in Chrome/Firefox)
Open the app and navigate to the **Subscriptions** page, then check the console for this log:
```
[Subscriptions] Subscriptions loaded: {
  count: X,
  subscriptions: [
    { id: "...", name: "Netflix", nextBillingDate: "2025-03-15", status: "active" },
    ...
  ]
}
```

**✅ If you see `nextBillingDate` values:** The API is returning dates correctly
**❌ If `nextBillingDate` is null/undefined:** The database doesn't have dates for old subscriptions

---

### 2. Check Calendar Page Console
Navigate to the **Calendar** page and check for:
```
[calendar] Creating renewal events from subscriptions: {
  totalSubscriptions: X,
  subscriptionsWithDates: Y,
  subscriptions: [...]
}

[calendar] Renewal events generated: [...]

[calendar] Final merged calendar events: [...]
```

**✅ If `subscriptionsWithDates` > 0:** Renewal events should be generating
**❌ If `subscriptionsWithDates` = 0:** Subscriptions don't have dates

---

### 3. Check Subscription Card Display
Look at any subscription card on the Subscriptions page. You should see:
```
Next billing: [Date]
```

**✅ If displayed:** Data is coming from the API
**❌ If missing:** nextBillingDate is not being sent by the server

---

## What to Do Based on Results

### Scenario A: nextBillingDate is null for old subscriptions
**Root Cause:** Subscriptions created before the `nextBillingDate` field was added don't have values.

**Solution:** Run this migration to set default dates for old subscriptions:
```bash
npx ts-node script/set-default-renewal-dates.ts
```

---

### Scenario B: nextBillingDate shows in Subscriptions but not Calendar
**Root Cause:** Calendar filter is removing subscriptions without dates

**Check:** Are all your subscriptions showing on the Subscriptions page with dates?
- If YES: The calendar should auto-generate renewal events. Refresh the page.
- If NO: Some subscriptions are missing dates (see Scenario A)

---

### Scenario C: Calendar shows events but not renewal dates
**Root Cause:** Event rendering issue in the calendar component

**Check:** Look for errors in the browser console related to calendar rendering.

---

## Create Missing Renewal Dates Script

If you have subscriptions without `nextBillingDate`, create this file:

`script/set-default-renewal-dates.ts`:
```typescript
import { getSupabaseClient } from "../server/supabase";

async function setDefaultRenewalDates() {
  const supabase = getSupabaseClient();
  
  // Get all subscriptions with null next_billing_at
  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("id, created_at, frequency")
    .is("next_billing_at", null);
  
  if (error) {
    console.error("Error fetching subscriptions:", error);
    return;
  }
  
  console.log(`Found ${subs?.length || 0} subscriptions without renewal dates`);
  
  // Update each with a default date based on frequency
  for (const sub of subs || []) {
    const createdDate = new Date(sub.created_at);
    let nextDate = new Date(createdDate);
    
    // Add interval based on frequency
    if (sub.frequency === "monthly") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (sub.frequency === "yearly") {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else if (sub.frequency === "quarterly") {
      nextDate.setMonth(nextDate.getMonth() + 3);
    } else if (sub.frequency === "weekly") {
      nextDate.setDate(nextDate.getDate() + 7);
    }
    
    const dateStr = nextDate.toISOString().split("T")[0];
    
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ next_billing_at: dateStr })
      .eq("id", sub.id);
    
    if (updateError) {
      console.error(`Error updating ${sub.id}:`, updateError);
    } else {
      console.log(`✅ Updated ${sub.id}: ${dateStr}`);
    }
  }
  
  console.log("✅ Done!");
}

setDefaultRenewalDates().catch(console.error);
```

Then run:
```bash
npx ts-node script/set-default-renewal-dates.ts
```

---

## What Changed

- **Subscriptions Page**: Now logs all subscriptions with their `nextBillingDate` values
- **Calendar Page**: Now logs what renewal events are being generated
- **Calendar Events Endpoint**: Now generates default renewal dates (today) for subscriptions without dates
- **Operator Precedence Fix**: Fixed filter logic in calendar.tsx

---

## Expected Behavior

1. ✅ When you create a subscription, it should have `nextBillingDate` set to today's date
2. ✅ All subscriptions should show "Next billing: [Date]" on subscription cards
3. ✅ Calendar page should show renewal events for all active/unused subscriptions
4. ✅ You should be able to click a renewal date to edit it
