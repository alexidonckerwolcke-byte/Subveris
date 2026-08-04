import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  // Test with the token they provided
  const token = process.env.TEST_SUPABASE_TOKEN || '';
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  console.log('User from token:', user?.id);
  
  if (user?.id) {
    const { data: userSub } = await supabase.from('user_subscriptions').select('*').eq('user_id', user.id).single();
    console.log('User Subscription:', JSON.stringify(userSub, null, 2));
  }
}

main();
