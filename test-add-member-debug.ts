import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testAddMember() {
  try {
    // Get the member user ID
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(
      'donckerwolcke.alexi@gmail.com'
    );

    if (userError || !userData.user) {
      console.log('User not found:', userError);
      return;
    }

    const memberUserId = userData.user.id;
    console.log('Member user ID:', memberUserId);

    // DELETE existing family group member and subscription to reset state
    await supabase
      .from('family_group_members')
      .delete()
      .eq('user_id', memberUserId);

    await supabase
      .from('user_subscriptions')
      .delete()
      .eq('user_id', memberUserId);

    await supabase
      .from('family_group_plan_backups')
      .delete()
      .eq('user_id', memberUserId);

    console.log('Cleaned up previous state\n');

    // Get the owner's family group
    const { data: groups, error: groupsError } = await supabase
      .from('family_groups')
      .select('id, owner_id')
      .limit(1);

    if (groupsError || !groups || groups.length === 0) {
      console.log('No family groups found');
      return;
    }

    const groupId = groups[0].id;
    console.log('Found family group:', groupId);

    // Call the API endpoint to add member (with proper auth header)
    console.log(`Calling API to add member...`);
    
    // Get owner's JWT token (we'll use a test admin function instead)
    // Wait, we can call addFamilyMember directly from the family-sharing module
    // Let's do that and watch the logs
    
    const { familySharing } = await import('./server/family-sharing.ts');
    const owner = groups[0].owner_id;
    
    console.log('\nCalling addFamilyMember function...\n');
    const member = await familySharing.addFamilyMember(groupId, owner, memberUserId);
    console.log('\nSuccess! Member added:', member);

  } catch (error) {
    console.error('Error:', error);
  }
}

testAddMember();
