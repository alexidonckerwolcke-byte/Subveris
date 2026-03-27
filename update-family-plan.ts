import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateToFamilyPlan() {
  try {
    // Get all users with their subscriptions
    const { data: users, error: usersError } = await supabase
      .from("user_subscriptions")
      .select("user_id, plan_type")
      .order("created_at", { ascending: false })
      .limit(1);

    if (usersError) {
      console.error("❌ Error fetching user:", usersError);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.error("❌ No users found");
      process.exit(1);
    }

    const userId = users[0].user_id;
    const currentPlan = users[0].plan_type;

    console.log(`📝 Current plan: ${currentPlan}`);
    console.log(`🔄 Updating to family plan...`);

    // Update to family plan
    const { data, error } = await supabase
      .from("user_subscriptions")
      .update({
        plan_type: "family",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select();

    if (error) {
      console.error("❌ Error updating plan:", error);
      process.exit(1);
    }

    console.log("✅ Account successfully updated to Family plan!");
    console.log("📋 Updated record:", data?.[0]);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

updateToFamilyPlan();
