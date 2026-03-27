import pg from "pg";
import fs from "fs";
import path from "path";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL environment variable not set");
  process.exit(1);
}

async function executeMigration() {
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    console.log("📋 Connecting to PostgreSQL database...");
    const client = await pool.connect();
    console.log("✅ Connected successfully");

    // Read the migration SQL
    console.log("📖 Reading migration SQL...");
    const migrationPath = path.join(
      process.cwd(),
      "supabase/migrations/20260216_000000_add_family_plan_support.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf-8");

    // Split by semicolon and execute each statement
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--"));

    console.log(`\n📝 Found ${statements.length} statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`▶️  Executing statement ${i + 1}/${statements.length}...`);
        await client.query(statement);
        console.log(`✅ Statement ${i + 1} executed successfully\n`);
      } catch (error: any) {
        if (
          error.code === "42701" ||
          error.message.includes("already exists")
        ) {
          console.log(
            `⚠️  Statement ${i + 1} skipped (already exists)\n`
          );
        } else {
          throw error;
        }
      }
    }

    // Verify the migration worked
    console.log("🔍 Verifying migration...");
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'user_subscriptions' AND column_name = 'plan_type'
    `);

    if (result.rows.length > 0) {
      console.log("✅ Migration successful! plan_type column exists");
      console.log("\n📊 Column details:");
      console.log(result.rows);
    } else {
      console.log(
        "❌ Migration verification failed: plan_type column not found"
      );
      process.exit(1);
    }

    client.release();
  } catch (error) {
    console.error("❌ Error executing migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

executeMigration();
