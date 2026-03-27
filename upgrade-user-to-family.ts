import { getSupabaseClient } from './server/supabase';

const userId = '3c2085b7-de19-456a-8055-ffb22dd9cbb2';

async function main() {
  const supabase = getSupabaseClient();

  // Check current plan
  const { data: sub, error } = await supabase
    .from('user_subscriptions')
    .select('plan_type, status, id')
    .eq('user_id', userId)
    .single();

  console.log('[Check] Current subscription:', sub);
  if (error) console.error('[Check] Error:', error);

  // Update to family
  const { data: updated, error: updateErr } = await supabase
    .from('user_subscriptions')
    .update({ plan_type: 'family', status: 'active' })
    .eq('user_id', userId)
    .select();

  console.log('[Update] Upgraded to family:', updated);
  if (updateErr) console.error('[Update] Error:', updateErr);
}

main().catch(console.error);
