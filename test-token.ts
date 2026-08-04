import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xuilgccacufwinvkocfl.supabase.co',
  'REDACTED_SUPABASE_SERVICE_ROLE_KEY'
);

async function main() {
  // Test with the token they provided
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJpYXQiOjE3NjU5NzY4OTYsImV4cCI6MjA4MTU1Mjg5Nn0.UjPCZvX-1dLQqzV-LQdMKU6EhM4pPGWL2bgHnEZ2PnQ';
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  console.log('User from token:', user?.id);
  
  if (user?.id) {
    const { data: userSub } = await supabase.from('user_subscriptions').select('*').eq('user_id', user.id).single();
    console.log('User Subscription:', JSON.stringify(userSub, null, 2));
  }
}

main();
