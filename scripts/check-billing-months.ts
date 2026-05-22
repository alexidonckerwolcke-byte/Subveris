import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function checkBillingMonths() {
  console.log("[Check] Checking billing_month values");

  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, name, next_billing_at, billing_month")
      .neq("status", "deleted")
      .limit(10);

    if (error) {
      console.error("[Check] Error:", error);
      return;
    }

    console.log("[Check] Sample subscriptions:");
    for (const sub of data || []) {
      const renewalMonth = sub.next_billing_at ? new Date(sub.next_billing_at).toISOString().slice(0, 7) : null;
      console.log(`  ${sub.name}: billing_month=${sub.billing_month}, renewal_month=${renewalMonth}, next_billing_at=${sub.next_billing_at}`);
    }

  } catch (err) {
    console.error("[Check] Exception:", err);
  }
}

checkBillingMonths();