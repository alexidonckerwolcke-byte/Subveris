import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xuilgccacufwinvkocfl.supabase.co',
  'REDACTED_SUPABASE_SERVICE_ROLE_KEY'
);

// Check what users have subscriptions
const { data: subs, error } = await supabase
  .from('subscriptions')
  .select('user_id, id, name, status')
  .order('created_at', { ascending: false })
  .limit(10);

console.log('Error:', error?.message);
console.log('Recent subscriptions:');
subs?.forEach(sub => {
  console.log(`  User: ${sub.user_id} - ${sub.name} (${sub.status})`);
});

// Count subscriptions per user
const { data: allSubs } = await supabase
  .from('subscriptions')
  .select('user_id', { count: 'exact' });

const userCounts = {};
allSubs?.forEach(sub => {
  userCounts[sub.user_id] = (userCounts[sub.user_id] || 0) + 1;
});

console.log('\nSubscription counts by user:');
Object.entries(userCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .forEach(([userId, count]) => {
    console.log(`  ${userId}: ${count} subscriptions`);
  });
