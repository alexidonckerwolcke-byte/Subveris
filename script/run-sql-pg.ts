import 'dotenv/config';
import { Client } from 'pg';

const sql = `CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_unique_user_name_amount_nextbilling_idx
ON subscriptions (user_id, lower(name), amount, next_billing_at);`;

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set in environment');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Connected to DB, running SQL...');
    await client.query(sql);
    console.log('✅ Index created (or already exists)');
  } catch (err) {
    console.error('Failed to run SQL:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
