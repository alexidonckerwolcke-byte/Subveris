import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function debugSpendingData() {
  console.log("[Debug] Checking spending data and renewal dates");

  try {
    // Get all subscriptions
    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select("id, name, next_billing_at, billing_month, status, amount, frequency, currency")
      .neq("status", "deleted");

    if (error) {
      console.error("[Debug] Error fetching subscriptions:", error);
      return;
    }

    console.log(`[Debug] Found ${subscriptions?.length || 0} subscriptions`);

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    console.log(`[Debug] Current month: ${currentMonthStr}`);
    console.log(`[Debug] Month range: ${monthStart.toISOString()} to ${monthEnd.toISOString()}`);

    let includedInSpending = 0;
    let excludedFromSpending = 0;

    for (const sub of subscriptions || []) {
      const renewalDateStr = sub.next_billing_at;
      let renewalDate = null;
      if (renewalDateStr) {
        renewalDate = new Date(renewalDateStr);
      }

      const billingMonth = sub.billing_month;
      const isInCurrentMonth = billingMonth === currentMonthStr;

      let shouldInclude = false;
      if (isInCurrentMonth) {
        shouldInclude = true;
      } else if (!billingMonth && renewalDate && renewalDate <= now) {
        shouldInclude = true;
      }

      if (shouldInclude) {
        includedInSpending++;
        console.log(`[Debug] INCLUDED: ${sub.name}`);
        console.log(`  - Status: ${sub.status}`);
        console.log(`  - Billing month: ${billingMonth}`);
        console.log(`  - Renewal date: ${renewalDateStr}`);
        console.log(`  - Renewal parsed: ${renewalDate?.toISOString()}`);
        console.log(`  - Amount: ${sub.amount} ${sub.currency} (${sub.frequency})`);
        console.log(`  - Is renewal in current month: ${renewalDate && renewalDate >= monthStart && renewalDate <= monthEnd ? 'YES' : 'NO'}`);
        console.log(`  - Is renewal today or earlier: ${renewalDate && renewalDate <= now ? 'YES' : 'NO'}`);
        console.log("");
      } else {
        excludedFromSpending++;
        if (excludedFromSpending <= 5) { // Only show first 5 excluded
          console.log(`[Debug] EXCLUDED: ${sub.name}`);
          console.log(`  - Status: ${sub.status}`);
          console.log(`  - Billing month: ${billingMonth}`);
          console.log(`  - Renewal date: ${renewalDateStr}`);
          console.log(`  - Renewal parsed: ${renewalDate?.toISOString()}`);
          console.log(`  - Is renewal in current month: ${renewalDate && renewalDate >= monthStart && renewalDate <= monthEnd ? 'YES' : 'NO'}`);
          console.log("");
        }
      }
    }

    console.log(`[Debug] Summary:`);
    console.log(`  - Total subscriptions: ${subscriptions?.length || 0}`);
    console.log(`  - Included in spending: ${includedInSpending}`);
    console.log(`  - Excluded from spending: ${excludedFromSpending}`);

  } catch (err) {
    console.error("[Debug] Exception:", err);
  }
}

debugSpendingData();