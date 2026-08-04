import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xuilgccacufwinvkocfl.supabase.co',
  'REDACTED_SUPABASE_SERVICE_ROLE_KEY'
);

async function main() {
  console.log('=== ALL INSIGHTS (any user) ===');
  const { data: allInsights } = await supabase.from('insights').select('*');
  console.log('Total insights:', allInsights?.length || 0);
  allInsights?.forEach(i => {
    console.log(`  - ${i.title} (user: ${i.user_id || 'NULL'})`);
  });
  
  console.log('\n=== ALL SUBSCRIPTIONS (any user) ===');
  const { data: allSubs } = await supabase.from('subscriptions').select('*');
  console.log('Total subscriptions:', allSubs?.length || 0);
  allSubs?.forEach(s => {
    console.log(`  - ${s.name} (user: ${s.user_id || 'NULL'})`);
  });
}

main();
