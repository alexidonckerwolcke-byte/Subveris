import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xuilgccacufwinvkocfl.supabase.co',
  'REDACTED_SUPABASE_SERVICE_ROLE_KEY'
);

const testUserId = '3c2085b7-de19-456a-8055-ffb22dd9cbb2';

console.log('Checking data for user:', testUserId);

// Check subscriptions
const { data: subs, error: subsError } = await supabase
  .from('subscriptions')
  .select('id, name, amount, status')
  .eq('user_id', testUserId);

console.log('Subscriptions error:', subsError?.message);
console.log('Subscriptions count:', subs?.length);
if (subs && subs.length > 0) {
  console.log('Sample:', subs[0]);
}

// Check user metrics
const { data: metrics, error: metricsError } = await supabase
  .from('user_metrics')
  .select('*')
  .eq('user_id', testUserId)
  .single();

console.log('Metrics error:', metricsError?.message);
console.log('Metrics:', metrics);
