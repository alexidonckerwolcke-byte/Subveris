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

async function identify() {
  const targetUserId = '3c2085b7-de19-456a-8055-ffb22dd9cbb2';
  console.log(`--- Identifying groups for user: ${targetUserId} ---`);

  // 1. Check groups owned by the user
  const { data: ownedGroups, error: ownedError } = await supabase
    .from('family_groups')
    .select('*')
    .eq('owner_id', targetUserId);

  if (ownedError) console.error('Error fetching owned groups:', ownedError.message);
  else {
    console.log(`Owned groups (${ownedGroups?.length || 0}):`);
    ownedGroups?.forEach(g => console.log(`- ID: ${g.id}, Name: ${g.name}`));
  }

  // 2. Check group memberships
  const { data: memberships, error: memberError } = await supabase
    .from('family_group_members')
    .select('*, family_groups(*)')
    .eq('user_id', targetUserId);

  if (memberError) console.error('Error fetching memberships:', memberError.message);
  else {
    console.log(`\nMemberships (${memberships?.length || 0}):`);
    memberships?.forEach(m => console.log(`- Group ID: ${m.family_group_id}, Name: ${m.family_groups?.name}, Role: ${m.role}`));
  }
}

identify();
