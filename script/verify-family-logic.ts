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

async function verify() {
  const targetUserId = '3c2085b7-de19-456a-8055-ffb22dd9cbb2';
  console.log(`--- Verifying Family Logic for user: ${targetUserId} ---`);

  // 1. Check family groups
  const { data: groups, error: groupError } = await supabase
    .from('family_groups')
    .select('*')
    .or(`owner_id.eq.${targetUserId}`);

  // Also check memberships
  const { data: memberships } = await supabase
    .from('family_group_members')
    .select('family_group_id')
    .eq('user_id', targetUserId);
  
  const memberGroupIds = memberships?.map(m => m.family_group_id) || [];
  
  const allGroupIds = Array.from(new Set([...(groups?.map(g => g.id) || []), ...memberGroupIds]));
  
  console.log(`Found ${allGroupIds.length} associated family groups.`);

  for (const groupId of allGroupIds) {
    const { data: group } = await supabase.from('family_groups').select('name').eq('id', groupId).single();
    console.log(`\nGroup: ${group?.name} (${groupId})`);

    // 2. Check settings
    const { data: settings } = await supabase
      .from('family_group_settings')
      .select('*')
      .eq('family_group_id', groupId)
      .single();
    
    console.log(`- Show Family Data: ${settings?.show_family_data ? 'YES' : 'NO'}`);

    // 3. Check members
    const { data: members } = await supabase
      .from('family_group_members')
      .select('user_id, role')
      .eq('family_group_id', groupId);
    
    console.log(`- Member Count: ${members?.length || 0}`);
    
    // 4. Check shared subscriptions
    const { data: shared } = await supabase
      .from('shared_subscriptions')
      .select('*')
      .eq('family_group_id', groupId);
    
    console.log(`- Shared Subscriptions: ${shared?.length || 0}`);
  }

  console.log('\n--- Verification Complete ---');
}

verify();
