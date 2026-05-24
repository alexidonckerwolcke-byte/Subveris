import { getSupabaseClient } from './server/supabase.js';

async function listUsers() {
  const supabase = getSupabaseClient();

  // Get auth users
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }

  console.log(`Found ${users?.length || 0} users:`);
  users?.forEach((user: any) => {
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
  });

  process.exit(0);
}

listUsers().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
