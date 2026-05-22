import { createClient } from "@supabase/supabase-js";

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
      .select("id, name, next_billing_at, billing_month")
      .neq("status", "deleted");

    if (error) {
      console.error("[Fix Billing Months] Error fetching subscriptions:", error);
      return;
    }

    console.log(`[Fix Billing Months] Found ${subscriptions?.length || 0} subscriptions to update`);

    const now = new Date();
    let updated = 0;

    for (const sub of subscriptions || []) {
      let newBillingMonth: string;

      if (!sub.next_billing_at) {
        // No renewal date, set to current month
        newBillingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      } else {
        const renewalDate = new Date(sub.next_billing_at);
        if (renewalDate <= now) {
          // Renewal date is in the past or today, bill for current month
          newBillingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        } else {
          // Future renewal date, bill for that month
          newBillingMonth = `${renewalDate.getFullYear()}-${String(renewalDate.getMonth() + 1).padStart(2, "0")}`;
        }
      }

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