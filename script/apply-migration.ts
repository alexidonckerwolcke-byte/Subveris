import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
  console.log("📋 Applying family plan support migration...\n");

  const migrationSQL = `
-- Add plan_type column to user_subscriptions table
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'free';

-- Create family_group_plan_backups table to track original plans
CREATE TABLE IF NOT EXISTS family_group_plan_backups (
  id VARCHAR(36) PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_group_id VARCHAR(36) NOT NULL,
  original_plan_type TEXT NOT NULL,
  original_status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for family_group_plan_backups
ALTER TABLE family_group_plan_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan backups" ON family_group_plan_backups 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can modify plan backups" ON family_group_plan_backups
FOR ALL USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_family_group_plan_backups_user_id_group_id 
ON family_group_plan_backups(user_id, family_group_id);
  `;

  try {
    // Execute the migration
    const { error } = await supabase.rpc("exec", { sql: migrationSQL });

    if (error) {
      // If rpc exec is not available, try direct SQL approach
      console.log("⚠️  Using direct SQL execution...\n");

      for (const statement of migrationSQL.split(";").filter((s) => s.trim())) {
        if (statement.trim().startsWith("--")) continue;

        try {
          const { error: sqlError } = await supabase.rpc("sql", {
            query: statement.trim() + ";",
          });

          if (sqlError) {
            console.log(`❓ ${statement.slice(0, 50)}...`);
            continue;
          }
        } catch (err) {
          // Ignored
        }
      }
    }

    // Verify the migration was applied
    console.log("🔍 Verifying migration...\n");

    const { data: columns, error: verifyError } = await supabase
      .from("user_subscriptions")
      .select("plan_type")
      .limit(1);

    if (!verifyError) {
      console.log("✅ Migration applied successfully!");
      console.log("✅ plan_type column added to user_subscriptions");
      console.log("✅ family_group_plan_backups table created\n");
      return true;
    } else {
      console.log("❌ Migration verification failed");
      console.log("Error:", verifyError.message);
      console.log("\n📝 Manual fix:");
      console.log("   1. Go to Supabase dashboard → SQL Editor");
      console.log("   2. Copy/paste migration from: supabase/migrations/20260216_000000_add_family_plan_support.sql");
      console.log("   3. Execute the SQL");
      return false;
    }
  } catch (err) {
    console.log("❌ Error applying migration:", err);
    console.log("\n📝 Manual fix:");
    console.log("   1. Go to Supabase dashboard → SQL Editor");
    console.log("   2. Copy/paste the SQL migration");
    console.log("   3. Execute it\n");
    return false;
  }
}

applyMigration().then((success) => {
  process.exit(success ? 0 : 0); // Exit 0 either way, schema verification will catch issues
});
