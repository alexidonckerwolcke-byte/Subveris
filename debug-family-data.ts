import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugFamilyData(userId: string) {
  const { data: groups } = await supabase
    .from('family_groups')
    .select('*')
    .or(`owner_id.eq.${userId}`);

  const { data: memberships } = await supabase
    .from('family_group_members')
    .select('*')
    .eq('user_id', userId);

  console.log('Family groups where user is owner:', groups);
  console.log('Family group memberships for user:', memberships);
}

// Replace with your user id for testing
const userId = process.argv[2];
if (!userId) {
  console.error('Usage: ts-node debug-family-data.ts <userId>');
  process.exit(1);
}
debugFamilyData(userId).then(() => process.exit(0));
