
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Force set environment variables for current process
import fs from 'fs';
const envFile = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

import { getSupabaseClient } from '../server/supabase.js';
import { generateAIRecommendations } from '../server/family-sharing.js';

async function verify() {
  const supabase = getSupabaseClient();
  
  // Find the "my family" group
  const { data: group } = await supabase
    .from('family_groups')
    .select('id, owner_id')
    .eq('name', 'my family')
    .single();

  if (!group) {
    console.error('Group "my family" not found');
    return;
  }

  console.log(`Found group: ${group.id}`);

  // Get all members
  const { data: members } = await supabase
    .from('family_group_members')
    .select('user_id')
    .eq('family_group_id', group.id);

  const memberIds = members?.map(m => m.user_id) || [];
  console.log(`Members: ${memberIds.join(', ')}`);

  // Get all subscriptions for these members
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*')
    .in('user_id', memberIds);

  console.log(`Total subscriptions for family: ${subs?.length || 0}`);

  // Test the recommendation generation
  const recs = generateAIRecommendations(subs || []);
  console.log(`Generated ${recs.length} recommendations for the family.`);
  
  recs.forEach(r => {
    console.log(`- [${r.type}] ${r.title}: ${r.description} (Savings: ${r.savings})`);
  });

  if (recs.length > 0) {
    console.log('✅ AI Recommendations logic is working for family data.');
  } else {
    console.log('⚠️ No recommendations generated. Check if subscriptions meet the criteria (unused, to-cancel, or >$15).');
  }
}

verify().catch(console.error);
