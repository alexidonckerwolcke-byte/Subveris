import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkMembers() {
  try {
    const groupId = '1bcaaab5-d9b0-4c8f-a71e-21327eb1b8f4';

    console.log(`Checking members for group: ${groupId}`);

    const { data, error } = await supabase
      .from('family_group_members')
      .select('*')
      .eq('family_group_id', groupId);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`Found ${data?.length || 0} members:`);
    data?.forEach(member => {
      console.log(`  - ID: ${member.id}`);
      console.log(`    User ID: ${member.user_id}`);
      console.log(`    Role: ${member.role}`);
      console.log(`    Email: ${member.email || 'null'}`);
      console.log(`    Joined: ${member.joined_at}`);
      console.log('');
    });

  } catch (err) {
    console.error('Error:', err);
  }
}

checkMembers();