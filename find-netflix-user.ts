import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('user_id, name, status')
    .eq('name', 'Netflix');

  if (subs && subs.length > 0) {
    console.log('Netflix subscription user:', subs[0].user_id);
    
    // Get all subs for that user
    const { data: userSubs } = await supabase
      .from('subscriptions')
      .select('name, status, category, amount')
      .eq('user_id', subs[0].user_id);
    
    console.log('\nAll subscriptions for that user:');
    userSubs?.forEach(s => {
      console.log(`- ${s.name} (status: ${s.status}, category: ${s.category}, amount: $${s.amount})`);
    });
  }
}

main();
