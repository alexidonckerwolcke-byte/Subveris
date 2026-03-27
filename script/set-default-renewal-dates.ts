import { getSupabaseClient } from "../server/supabase";

async function setDefaultRenewalDates() {
  const supabase = getSupabaseClient();
  
  console.log("[Script] Setting default renewal dates for subscriptions...");
  
  // Get all subscriptions with null next_billing_at
  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("id, created_at, frequency, name")
    .is("next_billing_at", null);
  
  if (error) {
    console.error("[Script] Error fetching subscriptions:", error);
    return;
  }
  
  if (!subs || subs.length === 0) {
    console.log("[Script] ✅ All subscriptions have renewal dates!");
    return;
  }
  
  console.log(`[Script] Found ${subs.length} subscriptions without renewal dates`);
  console.log("[Script] Subscriptions to update:", subs.map(s => ({ id: s.id, name: s.name })));
  
  let updated = 0;
  let failed = 0;
  
  // Update each with a default date based on frequency
  for (const sub of subs) {
    try {
      const createdDate = new Date(sub.created_at);
      let nextDate = new Date(createdDate);
      
      // Add interval based on frequency - calculate from creation date
      if (sub.frequency === "monthly") {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (sub.frequency === "yearly") {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else if (sub.frequency === "quarterly") {
        nextDate.setMonth(nextDate.getMonth() + 3);
      } else if (sub.frequency === "weekly") {
        nextDate.setDate(nextDate.getDate() + 7);
      } else {
        // Default to monthly if frequency is unknown
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      
      const dateStr = nextDate.toISOString().split("T")[0];
      
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ next_billing_at: dateStr })
        .eq("id", sub.id);
      
      if (updateError) {
        console.error(`[Script] ❌ Error updating ${sub.name} (${sub.id}):`, updateError);
        failed++;
      } else {
        console.log(`[Script] ✅ Updated ${sub.name}: ${dateStr}`);
        updated++;
      }
    } catch (err) {
      console.error(`[Script] ❌ Exception updating ${sub.name}:`, err);
      failed++;
    }
  }
  
  console.log(`[Script] Complete! Updated: ${updated}, Failed: ${failed}`);
}

setDefaultRenewalDates().catch(err => {
  console.error("[Script] Fatal error:", err);
  process.exit(1);
});
