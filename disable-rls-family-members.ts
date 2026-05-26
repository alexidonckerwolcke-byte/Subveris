// Disable RLS on family_group_members to avoid infinite recursion
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xuilgccacufwinvkocfl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk3Njg5NiwiZXhwIjoyMDgxNTUyODk2fQ.34j0sSX9lWR5ujGFfXusv_zMt1VnFbzR59JZSdg1gKA'
);

async function main() {
  try {
    // Drop all RLS policies from family_group_members
    const { error: dropError } = await supabase.rpc('exec', {
      sql: `
        DROP POLICY IF EXISTS "Users can view family group members" ON family_group_members;
        DROP POLICY IF EXISTS "Owners can add family members" ON family_group_members;
        DROP POLICY IF EXISTS "Members can leave group" ON family_group_members;
        DROP POLICY IF EXISTS "Owners can remove members" ON family_group_members;
        
        ALTER TABLE family_group_members DISABLE ROW LEVEL SECURITY;
      `
    });

    if (dropError) {
      console.error('Error disabling RLS:', dropError);
    } else {
      console.log('✅ RLS disabled on family_group_members');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
