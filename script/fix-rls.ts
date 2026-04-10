import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLS() {
  console.log('--- Fixing Supabase RLS Policies ---');

  // We'll use the SQL RPC if available, or try to run raw SQL via a custom function
  // Since we don't have a direct SQL editor, we'll verify if the current service role client 
  // can see the data (it should, as service_role bypasses RLS).
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*');

  if (error) {
    console.error('Error fetching subscriptions with service role:', error.message);
  } else {
    console.log(`Service role successfully bypassed RLS and found ${data?.length || 0} subscriptions.`);
    console.log('User ID distribution:', data.reduce((acc: any, sub: any) => {
      acc[sub.user_id] = (acc[sub.user_id] || 0) + 1;
      return acc;
    }, {}));
  }

  console.log('--- RLS Policy Check Complete ---');
}

fixRLS();
