import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xuilgccacufwinvkocfl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk3Njg5NiwiZXhwIjoyMDgxNTUyODk2fQ.34j0sSX9lWR5ujGFfXusv_zMt1VnFbzR59JZSdg1gKA'
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
