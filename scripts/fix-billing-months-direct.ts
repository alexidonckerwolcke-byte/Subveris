import { createClient } from "@supabase/supabase-js";

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
      .select("id, name, next_billing_at, billing_month")
      .neq("status", "deleted");

    if (error) {
      console.error("[Fix] Error fetching subscriptions:", error);
      return;
    }

    console.log(`[Fix] Found ${subscriptions?.length || 0} subscriptions to update`);

    let updated = 0;
    for (const sub of subscriptions || []) {
      let correctBillingMonth: string;

      if (!sub.next_billing_at) {
        correctBillingMonth = new Date().toISOString().slice(0, 7);
      } else {
        correctBillingMonth = new Date(sub.next_billing_at).toISOString().slice(0, 7);
      }

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