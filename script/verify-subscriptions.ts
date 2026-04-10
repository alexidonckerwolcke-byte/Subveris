import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

async function verify() {
  console.log('--- Verifying Subscriptions for Current User ---');
  
  // 1. Get current user
  const { data: authUsers } = await serviceClient.auth.admin.listUsers();
  const currentUser = authUsers.users.sort((a, b) => {
    const dateA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
    const dateB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
    return dateB - dateA;
  })[0];

  if (!currentUser) {
    console.error('No users found in Auth');
    return;
  }

  const userId = currentUser.id;
  console.log(`Checking data for user: ${currentUser.email} (${userId})`);

  // 2. Check with Service Role (should see everything)
  const { data: serviceData, error: serviceError } = await serviceClient
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (serviceError) console.error('Service Role Error:', serviceError.message);
  else console.log(`Service Role found ${serviceData?.length || 0} subscriptions for this user.`);

  // 3. Check with Anon Key + User Token (simulating frontend/RLS)
  // Note: We can't easily get a user JWT here without a password, 
  // but we can check if RLS is enabled on the table.
  const { data: rlsCheck, error: rlsError } = await serviceClient.rpc('get_policies', { table_name: 'subscriptions' });
  // Since we might not have the RPC, let's just try to query with anon key (should return 0 or error if RLS is on)
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: anonData, error: anonError } = await anonClient
    .from('subscriptions')
    .select('*');
  
  console.log(`Anon Key query returned ${anonData?.length || 0} records (should be 0 if RLS is working).`);
  if (anonError) console.log('Anon query error (expected if RLS is strict):', anonError.message);

  // 4. Detailed look at the subscriptions found
  if (serviceData && serviceData.length > 0) {
    console.log('Subscription IDs:', serviceData.map(s => s.id));
    console.log('Sample Statuses:', serviceData.map(s => s.status));
  } else {
    // Check if there are ANY subscriptions at all
    const { data: allSubs } = await serviceClient.from('subscriptions').select('user_id, count');
    console.log('All subscriptions in DB grouped by user_id:', allSubs);
  }
}

verify();
