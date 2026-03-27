import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xuilgccacufwinvkocfl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk3Njg5NiwiZXhwIjoyMDgxNTUyODk2fQ.34j0sSX9lWR5ujGFfXusv_zMt1VnFbzR59JZSdg1gKA'
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
