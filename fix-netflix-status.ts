import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStatus() {
  try {
    // Update Netflix subscription to active since it has 4 uses
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('user_id', '3c2085b7-de19-456a-8055-ffb22dd9cbb2')
      .eq('name', 'Netflix')
      .select();

    if (error) {
      console.log('Error:', error);
      return;
    }

    console.log('✓ Netflix subscription status updated to active');
    if (data && data.length > 0) {
      console.log(`  Name: ${data[0].name}`);
      console.log(`  Status: ${data[0].status}`);
      console.log(`  Usage Count: ${data[0].usage_count}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

fixStatus();
