import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*');

  console.log('All subscriptions:');
  subs?.forEach(s => {
    console.log(`- ID: ${s.id.substring(0, 8)}... | Name: ${s.name} | Status: ${s.status} | Category: ${s.category}`);
  });
}

main();
