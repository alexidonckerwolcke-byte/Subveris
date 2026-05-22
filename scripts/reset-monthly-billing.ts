import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function resetMonthlyBillingData() {
  const now = new Date();
  const dayOfMonth = now.getDate();

  // Only run on the first day of the month
  if (dayOfMonth !== 1) {
    console.log(`[Monthly Reset] Not the first day of month (day=${dayOfMonth}), skipping`);
    return;
  }

  console.log("[Monthly Reset] Starting monthly billing_month reset on first day of month");

async function resetMonthlyBillingData() {
  const now = new Date();
  const dayOfMonth = now.getDate();

  // Only run on the first day of the month
  if (dayOfMonth !== 1) {
    console.log(`[Monthly Reset] Not the first day of month (day=${dayOfMonth}), skipping`);
    return;
  }

  console.log("[Monthly Reset] Starting monthly billing_month reset on first day of month");

  try {
    // Get current month in YYYY-MM format
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    console.log(`[Monthly Reset] Setting billing_month=${currentMonth} for subscriptions renewing in current month`);

    // Update subscriptions that have renewal dates in the current month
    // This includes subscriptions that renewed in the current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const { data, error } = await supabase
      .from("subscriptions")
      .update({ billing_month: currentMonth })
      .neq("status", "deleted")
      .gte("next_billing_at", monthStart.toISOString())
      .lte("next_billing_at", monthEnd.toISOString())
      .select("id, name, next_billing_at");

    if (error) {
      console.error("[Monthly Reset] Error updating subscriptions:", error);
      return;
    }

    console.log(`[Monthly Reset] Successfully updated ${data?.length || 0} subscriptions to billing_month=${currentMonth}`);
    if (data && data.length > 0) {
      console.log("[Monthly Reset] Updated subscriptions:", data.map(s => `${s.name} (${s.next_billing_at})`));
    }
  } catch (err) {
    console.error("[Monthly Reset] Exception:", err);
  }
}
}

resetMonthlyBillingData();
