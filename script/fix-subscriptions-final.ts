import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixData() {
  console.log('--- Final Data Reassignment ---');
  
  // 1. Get all users from auth.users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError || !authUsers.users || authUsers.users.length === 0) {
    console.error('Could not find any users in Supabase Auth');
    return;
  }

  // Find the user who most recently signed in
  const currentUser = authUsers.users.sort((a, b) => {
    const dateA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
    const dateB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
    return dateB - dateA;
  })[0];

  const targetUserId = currentUser.id;
  console.log(`Target User: ${currentUser.email} (${targetUserId})`);

  // 2. Update ALL subscriptions to this user ID
  const { data: updated, error: updateError, count } = await supabase
    .from('subscriptions')
    .update({ user_id: targetUserId })
    .neq('user_id', targetUserId)
    .select('*', { count: 'exact' });

  if (updateError) {
    console.error('Error updating subscriptions:', updateError.message);
  } else {
    console.log(`Successfully updated ${count || 0} subscriptions to user ${currentUser.email}`);
  }

  // 3. Verify current count for this user
  const { count: finalCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetUserId);

  console.log(`User ${currentUser.email} now has ${finalCount} subscriptions.`);
}

fixData();
