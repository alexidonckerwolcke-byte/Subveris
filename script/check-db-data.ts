import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
  console.log('--- Checking Supabase Data ---');
  
  const tables = [
    'users',
    'subscriptions',
    'shared_subscriptions',
    'insights',
    'family_groups',
    'family_group_members',
    'user_subscriptions',
    'notification_preferences'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`Error checking table '${table}':`, error.message);
      } else {
        console.log(`Table '${table}': ${count} records`);
      }
    } catch (e) {
      console.error(`Exception checking table '${table}':`, e);
    }
  }

  console.log('\n--- Sample Subscriptions ---');
  const { data: sampleSubs, error: subError } = await supabase.from('subscriptions').select('*').limit(5);
  if (subError) console.error('Error fetching sample subscriptions:', subError.message);
  else console.log(JSON.stringify(sampleSubs, null, 2));

  console.log('\n--- Sample Users ---');
  const { data: sampleUsers, error: userError } = await supabase.from('users').select('*').limit(5);
  if (userError) console.error('Error fetching sample users:', userError.message);
  else console.log(JSON.stringify(sampleUsers, null, 2));
}

checkData();
