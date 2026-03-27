import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xuilgccacufwinvkocfl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk3Njg5NiwiZXhwIjoyMDgxNTUyODk2fQ.34j0sSX9lWR5ujGFfXusv_zMt1VnFbzR59JZSdg1gKA'
);

async function main() {
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  if (users) {
    const user = users.users.find(u => u.email === 'alexi.donckerwolcke@gmail.com');
    if (user) {
      console.log('User ID:', user.id);
      const { data: userSub } = await supabase.from('user_subscriptions').select('*').eq('user_id', user.id).single();
      console.log('User Subscription:', JSON.stringify(userSub, null, 2));
    }
  }
}

main();
