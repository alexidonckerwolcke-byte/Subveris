import { createClient } from "@supabase/supabase-js";
import { getZonedMonthKey, getZonedMonthKeyForDate, isValidTimeZone } from "../shared/month-boundary";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function resetMonthlyBillingData() {
  const now = new Date();
  console.log("[Monthly Reset] Starting idempotent account-local billing_month reconciliation");

  try {
    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select("id, user_id, name, next_billing_at")
      .neq("status", "deleted");

    if (error) {
      console.error("[Monthly Reset] Error fetching subscriptions:", error);
      return;
    }

    const timeZones = new Map<string, string>();
    const updatesByMonth = new Map<string, string[]>();
    for (const subscription of subscriptions || []) {
      const userId = String(subscription.user_id || "");
      if (!userId) continue;

      let timeZone = timeZones.get(userId);
      if (!timeZone) {
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
        const configuredTimeZone = authData?.user?.user_metadata?.timezone;
        timeZone = !authError && isValidTimeZone(configuredTimeZone) ? configuredTimeZone : "UTC";
        timeZones.set(userId, timeZone);
      }

      const currentMonth = getZonedMonthKey(now, timeZone);
      const renewalDate = String(subscription.next_billing_at || "");
      const renewalMonth = getZonedMonthKeyForDate(renewalDate, timeZone);

      if (renewalMonth !== currentMonth) continue;
      const ids = updatesByMonth.get(currentMonth) || [];
      ids.push(subscription.id);
      updatesByMonth.set(currentMonth, ids);
    }

    let updatedCount = 0;
    for (const [billingMonth, subscriptionIds] of updatesByMonth) {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ billing_month: billingMonth })
        .in("id", subscriptionIds);

      if (updateError) {
        console.error(`[Monthly Reset] Error setting billing_month=${billingMonth}:`, updateError);
        continue;
      }
      updatedCount += subscriptionIds.length;
    }

    console.log(`[Monthly Reset] Reconciled ${updatedCount} subscription(s) using account-local months.`);
  } catch (err) {
    console.error("[Monthly Reset] Exception:", err);
  }
}

resetMonthlyBillingData();
