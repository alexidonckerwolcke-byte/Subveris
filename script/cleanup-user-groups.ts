import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanup() {
  const targetUserId = '3c2085b7-de19-456a-8055-ffb22dd9cbb2';
  const keepGroupName = 'my family';
  const keepGroupId = '696b1121-c921-4064-b9f6-0aabef32d0c3';

  console.log(`--- Cleaning up groups for user: ${targetUserId} ---`);

  // 1. Delete all memberships for this user EXCEPT for the "my family" group
  const { error: memberError } = await supabase
    .from('family_group_members')
    .delete()
    .eq('user_id', targetUserId)
    .neq('family_group_id', keepGroupId);

  if (memberError) {
    console.error('Error deleting memberships:', memberError.message);
  } else {
    console.log('Successfully removed user from extra memberships.');
  }

  // 2. Reassign ownership of the "e2e-group" groups to a placeholder ID
  // to remove them from the user's "owned" list.
  const placeholderId = '00000000-0000-0000-0000-000000000001';
  const { error: groupError } = await supabase
    .from('family_groups')
    .update({ owner_id: placeholderId })
    .eq('owner_id', targetUserId)
    .neq('id', keepGroupId);

  if (groupError) {
    console.error('Error reassigning groups:', groupError.message);
  } else {
    console.log('Successfully reassigned ownership of extra groups.');
  }

  console.log('--- Cleanup Complete ---');
}

cleanup();
