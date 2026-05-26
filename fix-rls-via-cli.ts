import { execSync } from 'child_process';

const sql = `
DROP POLICY IF EXISTS "Users can view family group members" ON family_group_members;
DROP POLICY IF EXISTS "Owners can add family members" ON family_group_members;
DROP POLICY IF EXISTS "Members can leave group" ON family_group_members;
DROP POLICY IF EXISTS "Owners can remove members" ON family_group_members;

ALTER TABLE family_group_members DISABLE ROW LEVEL SECURITY;
`;

try {
  console.log('Disabling RLS on family_group_members...');
  
  const command = `PGPASSWORD="${process.env.DB_PASSWORD || 'your_password'}" psql -h db.xuilgccacufwinvkocfl.supabase.co -U postgres -d postgres -c "${sql.replace(/\n/g, ' ')}"`;
  
  const result = execSync(command, { encoding: 'utf-8' });
  console.log('✅ RLS disabled:', result);
} catch (error: any) {
  if (error.message.includes('command not found: psql')) {
    console.log('psql not available. Skipping RLS fix via SQL.');
    console.log('Use Supabase dashboard SQL editor to run:');
    console.log(sql);
  } else {
    console.error('Error:', error);
  }
}
