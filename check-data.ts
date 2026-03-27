import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xuilgccacufwinvkocfl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk3Njg5NiwiZXhwIjoyMDgxNTUyODk2fQ.34j0sSX9lWR5ujGFfXusv_zMt1VnFbzR59JZSdg1gKA'
);

async function main() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users.find(u => u.email === 'alexi.donckerwolcke@gmail.com');
  
  if (!user) {
    console.log('User not found');
    return;
  }
  
  console.log('User ID:', user.id);
  
  // Check subscriptions
  const { data: subs } = await supabase.from('subscriptions').select('*').eq('user_id', user.id);
  console.log('Subscriptions count:', subs?.length || 0);
  if (subs?.length) {
    subs.forEach(s => console.log(`  - ${s.name}`));
  }
  
  // Check insights
  const { data: insights } = await supabase.from('insights').select('*').eq('user_id', user.id);
  console.log('Insights count:', insights?.length || 0);
  
  // Check bank connections
  const { data: banks } = await supabase.from('bank_connections').select('*').eq('user_id', user.id);
  console.log('Bank connections count:', banks?.length || 0);
}

main();
