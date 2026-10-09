import { createClient } from "@supabase/supabase-js";
import { getZonedMonthKey, getZonedMonthKeyForDate, isValidTimeZone } from "../shared/month-boundary";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function fixBillingMonthsDirectly() {
  console.log("[Fix] Running billing_month fix directly");

  try {
    // Get all subscriptions
    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select("id, user_id, name, next_billing_at, billing_month")
      .neq("status", "deleted");

    if (error) {
      console.error("[Fix] Error fetching subscriptions:", error);
      return;
    }

    console.log(`[Fix] Found ${subscriptions?.length || 0} subscriptions to update`);

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

      const correctBillingMonth = getZonedMonthKeyForDate(sub.next_billing_at, timeZone)
        || getZonedMonthKey(new Date(), timeZone);

      if (correctBillingMonth !== sub.billing_month) {
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({ billing_month: correctBillingMonth })
          .eq("id", sub.id);

        if (updateError) {
          console.error(`[Fix] Error updating ${sub.name}:`, updateError);
        } else {
          console.log(`[Fix] Updated ${sub.name}: ${sub.billing_month} -> ${correctBillingMonth}`);
          updated++;
        }
      }
    }

    console.log(`[Fix] Successfully updated ${updated} subscriptions`);

  } catch (err) {
    console.error("[Fix] Exception:", err);
  }
}

fixBillingMonthsDirectly();