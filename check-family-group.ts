import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkFamilyGroup() {
  try {
    const groupId = '1bcaaab5-d9b0-4c8f-a71e-21327eb1b8f4';

    console.log(`Checking family group: ${groupId}`);

    // Check the family_groups table
    const { data: group, error: groupError } = await supabase
      .from('family_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError) {
      console.error('Error fetching group:', groupError);
      return;
    }

    console.log('Family Group:');
    console.log(`  ID: ${group.id}`);
    console.log(`  Name: ${group.name}`);
    console.log(`  Owner ID: ${group.owner_id}`);
    console.log(`  Created: ${group.created_at}`);

    // Check members
    const { data: members, error: membersError } = await supabase
      .from('family_group_members')
      .select('*')
      .eq('family_group_id', groupId);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return;
    }

    console.log('\nMembers:');
    members?.forEach(member => {
      console.log(`  User ID: ${member.user_id}`);
      console.log(`  Role: ${member.role}`);
      console.log(`  Email: ${member.email || 'null'}`);
      console.log(`  Is Owner: ${member.user_id === group.owner_id ? 'YES' : 'NO'}`);
      console.log('');
    });

  } catch (err) {
    console.error('Error:', err);
  }
}

checkFamilyGroup();