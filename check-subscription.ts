import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xuilgccacufwinvkocfl.supabase.co',
  'REDACTED_SUPABASE_SERVICE_ROLE_KEY'
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
