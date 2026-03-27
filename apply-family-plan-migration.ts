import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "❌ Missing environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  try {
    console.log("📋 Reading migration SQL...");
    const sql = fs.readFileSync(
      "./supabase/migrations/20260216_000000_add_family_plan_support.sql",
      "utf-8"
    );

    // Split SQL by semicolon and execute each statement individually
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--"));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n▶️  Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc("exec", { statement });

      if (error) {
        console.error(`Error executing statement:`, error);
        // Continue anyway - some statements might fail if already exist
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }

    // Verify the migration worked
    console.log("\n🔍 Verifying migration...");
    const { data, error: verifyError } = await supabase.rpc("check_column", {
      table_name: "user_subscriptions",
      column_name: "plan_type",
    });

    if (verifyError) {
      // Try alternative verification
      const { data: columns, error: columnsError } = await supabase
        .from("user_subscriptions")
        .select("*")
        .limit(1);

      if (columnsError) {
        throw columnsError;
      }

      if (
        columns &&
        columns.length > 0 &&
        "plan_type" in columns[0]
      ) {
        console.log("✅ Migration successful! plan_type column exists");
      } else {
        console.log(
          "❓ Could not verify column - checking raw query response..."
        );
        console.log(columns);
      }
    }
  } catch (error) {
    console.error("❌ Error applying migration:", error);
    process.exit(1);
  }
}

applyMigration();
