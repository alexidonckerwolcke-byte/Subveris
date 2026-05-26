import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function check() {
  // Get all subscriptions (no filter)
  const { data: allSubs, error: allError } = await supabase
    .from('subscriptions')
    .select('id, user_id, name, status, created_at, next_billing_at');
  
  if (allError) {
    console.error('Error fetching all subs:', allError);
  } else {
    console.log('All subscriptions in DB:', allSubs?.length, 'rows');
    if (allSubs && allSubs.length > 0) {
      console.log(JSON.stringify(allSubs.slice(0, 3), null, 2));
    }
  }
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('\nCurrent auth user:', user?.id, user?.email);
  if (authError) console.log('Auth error:', authError);
  
  if (user?.id) {
    // Get subs for this user
    const { data: userSubs, error: userError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id);
    
    if (userError) {
      console.error('Error fetching user subs:', userError);
    } else {
      console.log('\nSubscriptions for user:', userSubs?.length, 'rows');
      if (userSubs && userSubs.length > 0) {
        console.log(JSON.stringify(userSubs.slice(0, 2), null, 2));
      }
    }
  }
}

check().catch(console.error);
