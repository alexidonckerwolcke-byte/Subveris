import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  try {
    // Get subscriptions for the test user
    const { data: subs, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', '3c2085b7-de19-456a-8055-ffb22dd9cbb2');

    if (subError) {
      console.log('Error:', subError);
      return;
    }

    console.log('=== Subscriptions for user ===');
    if (subs && subs.length > 0) {
      subs.forEach((sub: any) => {
        console.log(`\nName: ${sub.name}`);
        console.log(`Status: ${sub.status}`);
        console.log(`Usage Count: ${sub.usage_count}`);
      });
    } else {
      console.log('No subscriptions found');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

debug();
