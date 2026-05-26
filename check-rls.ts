import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function check() {
  // Try to fetch with service role (bypasses RLS)
  const { data: allSubs, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, name, status, created_at')
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Subscriptions found:', allSubs?.length);
    if (allSubs) {
      allSubs.forEach(sub => {
        console.log(`- ${sub.id}: ${sub.name} (user: ${sub.user_id})`);
      });
    }
  }
}

check().catch(console.error);
