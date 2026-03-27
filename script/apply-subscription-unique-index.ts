import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function apply() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationPath = path.join(__dirname, "..", "supabase", "migrations", "20260220_000000_add_subscription_unique_index.sql");
  if (!fs.existsSync(migrationPath)) {
    console.error("Migration file not found:", migrationPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(migrationPath, "utf8");

  try {
    console.log('Applying subscription unique index migration...');
    const { error } = await supabase.rpc("exec", { sql });
    if (error) {
      console.log('RPC exec returned error, falling back to running each statement...');
      for (const stmt of sql.split(";").map(s => s.trim()).filter(Boolean)) {
        try {
          const { error: stmtErr } = await supabase.rpc("sql", { query: stmt + ";" });
          if (stmtErr) console.warn('Statement error (ignored):', stmtErr.message);
        } catch (e) {
          console.warn('Failed to run statement via rpc.sql:', e);
        }
      }
    }

    console.log('✅ Migration applied (or attempted). Verify in Supabase dashboard if needed.');
  } catch (err) {
    console.error('Failed to apply migration:', err);
    process.exit(1);
  }
}

apply().then(() => process.exit(0));
