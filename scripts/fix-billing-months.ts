import { createClient } from "@supabase/supabase-js";
import { getZonedMonthKey, getZonedMonthKeyForDate, isValidTimeZone } from "../shared/month-boundary";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function fixBillingMonths() {
  console.log("[Fix Billing Months] Starting to fix billing_month values based on renewal dates");

  try {
    // Get all subscriptions
    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select("id, user_id, name, next_billing_at, billing_month")
      .neq("status", "deleted");

    if (error) {
      console.error("[Fix Billing Months] Error fetching subscriptions:", error);
      return;
    }

    console.log(`[Fix Billing Months] Found ${subscriptions?.length || 0} subscriptions to update`);

    const now = new Date();
    const timeZones = new Map<string, string>();
    let updated = 0;

    for (const sub of subscriptions || []) {
      const userId = String(sub.user_id || "");
      let timeZone = timeZones.get(userId);
      if (!timeZone && userId) {
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
        const configuredTimeZone = authData?.user?.user_metadata?.timezone;
        timeZone = !authError && isValidTimeZone(configuredTimeZone) ? configuredTimeZone : "UTC";
        timeZones.set(userId, timeZone);
      }
      timeZone ||= "UTC";

      const currentMonth = getZonedMonthKey(now, timeZone);
      const renewalDate = String(sub.next_billing_at || "");
      const renewalMonth = getZonedMonthKeyForDate(renewalDate, timeZone);
      const newBillingMonth = renewalMonth && renewalMonth > currentMonth
        ? renewalMonth
        : currentMonth;

      if (newBillingMonth !== sub.billing_month) {
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({ billing_month: newBillingMonth })
          .eq("id", sub.id);

        if (updateError) {
          console.error(`[Fix Billing Months] Error updating ${sub.name}:`, updateError);
        } else {
          console.log(`[Fix Billing Months] Updated ${sub.name}: ${sub.billing_month} -> ${newBillingMonth}`);
          updated++;
        }
      }
    }

    console.log(`[Fix Billing Months] Successfully updated ${updated} subscriptions`);
  } catch (err) {
    console.error("[Fix Billing Months] Exception:", err);
  }
}

fixBillingMonths();