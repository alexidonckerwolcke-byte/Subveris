import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifySchema() {
  console.log("🔍 Verifying database schema...\n");

  try {
    // Check if plan_type column exists in user_subscriptions
    const { data: columns, error } = await supabase.rpc("get_columns", {
      table_name: "user_subscriptions",
    });

    if (error) {
      // Fallback: try direct query
      const { data: result, error: queryError } = await supabase
        .from("user_subscriptions")
        .select("plan_type")
        .limit(1);

      if (queryError?.message?.includes("column")) {
        console.log("❌ MISSING: plan_type column in user_subscriptions table");
        console.log("\n📝 To fix this, run the migration:");
        console.log("   1. Open Supabase dashboard → SQL Editor");
        console.log("   2. Execute the migration from supabase/migrations/20260216_000000_add_family_plan_support.sql");
        return false;
      }

      console.log("✅ plan_type column exists");
    } else {
      console.log("✅ plan_type column exists");
    }

    // Check if subscriptions table exists
    const { data: subs, error: subsError } = await supabase
      .from("subscriptions")
      .select("id")
      .limit(1);

    if (subsError?.message?.includes("does not exist")) {
      console.log("❌ MISSING: subscriptions table");
      return false;
    }

    console.log("✅ subscriptions table exists");

    // Check if user_subscriptions table exists
    const { data: userSubs, error: userSubsError } = await supabase
      .from("user_subscriptions")
      .select("id")
      .limit(1);

    if (userSubsError?.message?.includes("does not exist")) {
      console.log("❌ MISSING: user_subscriptions table");
      return false;
    }

    console.log("✅ user_subscriptions table exists");

    // Check if push_subscriptions table exists
    const { data: pushSubs, error: pushError } = await supabase
      .from("push_subscriptions")
      .select("id")
      .limit(1);

    if (pushError && !pushError.message?.includes("does not exist")) {
      // Table might not exist, but that's OK for non-critical features
      console.log("⚠️  push_subscriptions table might be missing (optional for basic features)");
    } else {
      console.log("✅ push_subscriptions table exists");
    }

    console.log("\n✅ Schema verification complete! Database is ready.");
    return true;
  } catch (err) {
    console.error("❌ Error verifying schema:", err);
    return false;
  }
}

verifySchema().then((success) => {
  process.exit(success ? 0 : 1);
});
