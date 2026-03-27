import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanup() {
  const memberUserId = 'b7d045ad-8c1f-4005-b5ff-bbc4386e1e07';
  
  console.log('Cleaning up test data for member:', memberUserId);
  
  // Delete family group membership
  await supabase
    .from('family_group_members')
    .delete()
    .eq('user_id', memberUserId);
  console.log('✓ Deleted family_group_members');
  
  // Delete subscriptions
  await supabase
    .from('user_subscriptions')
    .delete()
    .eq('user_id', memberUserId);
  console.log('✓ Deleted user_subscriptions');
  
  // Delete plan backups
  await supabase
    .from('family_group_plan_backups')
    .delete()
    .eq('user_id', memberUserId);
  console.log('✓ Deleted family_group_plan_backups');
  
  console.log('\nCleanup complete. Ready for testing.');
}

cleanup().catch(err => console.error('Error:', err));
