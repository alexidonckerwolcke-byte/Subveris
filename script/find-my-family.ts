
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envFile = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    const keyTrimmed = key.trim();
    if (keyTrimmed) {
      env[keyTrimmed] = valueParts.join('=').trim();
    }
  }
});

async function find() {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: group } = await supabase
    .from('family_groups')
    .select('*')
    .eq('name', 'my family')
    .single();

  console.log('Group "my family":');
  console.log(group);

  if (group) {
    const { data: members } = await supabase
      .from('family_group_members')
      .select('*')
      .eq('family_group_id', group.id);
    
    console.log('Members:');
    console.log(members);

    const memberIds = members?.map(m => m.user_id) || [];
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*')
      .in('user_id', memberIds);

    console.log('Subscriptions for these members:');
    console.log(subs);
  }
}

find();
