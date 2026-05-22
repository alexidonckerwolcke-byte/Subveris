import { getSupabaseClient } from './supabase';

(async function main(){
  const argvId = process.argv[2];
  const userId = argvId || process.env.TEST_USER_ID || '3c2085b7-de19-456a-8055-ffb22dd9cbb2';
  console.log('[inspect_subs] Inspecting subscriptions for user:', userId);
  try{
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, name, next_billing_at, frequency, status')
      .eq('user_id', userId)
      .order('id', { ascending: true });

    if (error) {
      console.error('[inspect_subs] Supabase error:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('[inspect_subs] No subscriptions found for user');
      process.exit(0);
    }

    for (const s of data) {
      console.log('[inspect_subs]', s.id, s.name, s.status, s.frequency, 'next_billing_at=', s.next_billing_at);
    }

    process.exit(0);
  }catch(err){
    console.error('[inspect_subs] Error:', err);
    process.exit(1);
  }
})();
