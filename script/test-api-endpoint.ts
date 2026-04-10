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

async function test() {
  console.log('--- Testing /api/subscriptions Endpoint Logic ---');
  
  // 1. Get the target user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const currentUser = authUsers.users.sort((a, b) => {
    const dateA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
    const dateB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
    return dateB - dateA;
  })[0];

  if (!currentUser) {
    console.error('No user found');
    return;
  }

  const userId = currentUser.id;
  console.log(`Testing for user: ${currentUser.email} (${userId})`);

  // 2. Query exactly as the backend does
  const { data, error, count } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Query Error:', error.message);
    return;
  }

  console.log(`Query results: ${data?.length || 0} rows found.`);
  console.log(`Exact count: ${count}`);

  if (data && data.length > 0) {
    console.log('Sample Data (Raw):', JSON.stringify(data[0], null, 2));
    
    // Test the mapping function logic
    const mapped = data.map(sub => ({
      id: sub.id,
      userId: sub.user_id,
      name: sub.name,
      status: sub.status,
      nextBillingDate: sub.next_billing_at,
    }));
    console.log('Mapped Data Sample:', JSON.stringify(mapped[0], null, 2));
  } else {
    // Check if subscriptions exist at all for ANY user
    const { data: allSubs } = await supabase.from('subscriptions').select('user_id');
    console.log('All user_ids in subscriptions table:', [...new Set(allSubs?.map(s => s.user_id))]);
  }
}

test();
