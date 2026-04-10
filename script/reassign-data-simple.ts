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

async function reassignData() {
  console.log('--- Reassigning Subscriptions ---');
  
  // 1. Get the most recently logged in user from auth.users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError || !authUsers.users || authUsers.users.length === 0) {
    console.error('Could not find any users in Supabase Auth:', authError?.message || 'No users found');
    return;
  }

  // Sort by last_sign_in_at to find the current active user
  const currentUser = authUsers.users.sort((a, b) => {
    const dateA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
    const dateB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
    return dateB - dateA;
  })[0];

  const currentUserId = currentUser.id;
  console.log(`Current active user identified: ${currentUser.email} (${currentUserId})`);

  // 2. Reassign all subscriptions to this user
  const { data: updatedSubs, error: updateError } = await supabase
    .from('subscriptions')
    .update({ user_id: currentUserId })
    .neq('user_id', currentUserId); // Only update those not already assigned

  if (updateError) {
    console.error('Error reassigning subscriptions:', updateError.message);
  } else {
    console.log(`Successfully reassigned all subscriptions to ${currentUser.email}`);
  }
}

reassignData();
