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

async function fix() {
  const targetUserId = '3c2085b7-de19-456a-8055-ffb22dd9cbb2';
  console.log(`--- Reassigning ALL data to active user: ${targetUserId} ---`);

  // 1. Update subscriptions
  const { count: subCount, error: subError } = await supabase
    .from('subscriptions')
    .update({ user_id: targetUserId })
    .neq('user_id', targetUserId)
    .select('*', { count: 'exact' });

  if (subError) console.error('Error updating subscriptions:', subError.message);
  else console.log(`Updated ${subCount || 0} subscriptions.`);

  // 2. Update family groups (to ensure family sharing works for this user)
  const { count: groupCount, error: groupError } = await supabase
    .from('family_groups')
    .update({ owner_id: targetUserId })
    .neq('owner_id', targetUserId)
    .select('*', { count: 'exact' });

  if (groupError) console.error('Error updating family groups:', groupError.message);
  else console.log(`Updated ${groupCount || 0} family groups.`);

  // 3. Update family group members
  const { count: memberCount, error: memberError } = await supabase
    .from('family_group_members')
    .update({ user_id: targetUserId })
    .neq('user_id', targetUserId)
    .select('*', { count: 'exact' });

  if (memberError) console.error('Error updating family group members:', memberError.message);
  else console.log(`Updated ${memberCount || 0} family group members.`);

  console.log('--- Verification ---');
  const { count: finalCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetUserId);
  
  console.log(`User ${targetUserId} now has ${finalCount} subscriptions.`);
}

fix();
