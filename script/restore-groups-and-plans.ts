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

async function restore() {
  console.log('--- Restoring Groups and Plans Separation ---');

  // 1. Restore Family Groups
  // We can identify the original owner by looking at the family_group_members table
  // where the role is 'owner'.
  const { data: members, error: memberError } = await supabase
    .from('family_group_members')
    .select('family_group_id, user_id')
    .eq('role', 'owner');

  if (memberError) {
    console.error('Error fetching group owners:', memberError.message);
  } else {
    console.log(`Found ${members?.length || 0} group owners to restore.`);
    for (const member of members || []) {
      const { error } = await supabase
        .from('family_groups')
        .update({ owner_id: member.user_id })
        .eq('id', member.family_group_id);
      
      if (error) {
        console.error(`Error restoring group ${member.family_group_id}:`, error.message);
      }
    }
    console.log('Family groups owner restoration complete.');
  }

  // 2. Restore User Subscriptions (Plans)
  // These are unique per user. Since I previously reassigned them to 3c2085b7...,
  // and we don't have a backup, we have to use the user_id that was likely intended.
  // In your project, the user_subscriptions table has a 1:1 relationship with users.
  // However, since we can't perfectly guess, we will look for any clues.
  // Actually, I can check if any user_subscriptions records are currently assigned to 3c2085b7...
  // that shouldn't be.
  
  // For now, let's at least ensure that the user_subscriptions for OTHER users are not pointing to you.
  // Since I don't have the original mapping for plans, I will check if there's a pattern.
  // Wait, I have a better idea: check the subscriptions table we already restored.
  // The users who have subscriptions likely should have the corresponding plans.
  
  // Let's look at the user_subscriptions table specifically.
  const { data: plans } = await supabase.from('user_subscriptions').select('*');
  console.log(`Current plan count: ${plans?.length || 0}`);
  
  // If all plans were moved to one user, we should distribute them back if possible.
  // But without a clear mapping, I will focus on the family groups first as they are most visible.
  
  console.log('--- Restoration Step Complete ---');
}

restore();
