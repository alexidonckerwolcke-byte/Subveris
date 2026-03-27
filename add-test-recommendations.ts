import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    // Get the first user (from the logs we know it's 3c2085b7-de19-456a-8055-ffb22dd9cbb2)
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.error('Error getting users:', usersError);
      process.exit(1);
    }

    const userId = users[0].id;
    console.log('Adding recommendations test data for user:', userId);

    // Add an "unused" subscription to trigger cancel recommendation
    const { data: unusedSub, error: unusedError } = await supabase
      .from('subscriptions')
      .insert([
        {
          id: randomUUID(),
          name: 'Adobe Creative Cloud',
          category: 'software',
          amount: 54.99,
          frequency: 'monthly',
          currency: 'USD',
          user_id: userId,
          status: 'unused',
          usage_count: 0,
          description: 'Adobe subscription for design - not being used',
          next_billing_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          last_used_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ])
      .select();

    if (unusedError) {
      console.error('Error adding unused subscription:', unusedError);
    } else {
      console.log('✓ Added unused Adobe subscription');
    }

    // Add another streaming subscription to trigger rotate recommendation
    const { data: streamingSub, error: streamingError } = await supabase
      .from('subscriptions')
      .insert([
        {
          id: randomUUID(),
          name: 'Disney+',
          category: 'streaming',
          amount: 13.99,
          frequency: 'monthly',
          currency: 'USD',
          user_id: userId,
          status: 'active',
          usage_count: 8,
          description: 'Disney streaming service',
          next_billing_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          last_used_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ])
      .select();

    if (streamingError) {
      console.error('Error adding streaming subscription:', streamingError);
    } else {
      console.log('✓ Added Disney+ streaming subscription');
    }

    // Add another streaming subscription to trigger rotate recommendation
    const { data: hulu, error: huluError } = await supabase
      .from('subscriptions')
      .insert([
        {
          id: randomUUID(),
          name: 'Hulu',
          category: 'streaming',
          amount: 9.99,
          frequency: 'monthly',
          currency: 'USD',
          user_id: userId,
          status: 'active',
          usage_count: 5,
          description: 'Hulu streaming service',
          next_billing_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          last_used_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ])
      .select();

    if (huluError) {
      console.error('Error adding Hulu subscription:', huluError);
    } else {
      console.log('✓ Added Hulu streaming subscription');
    }

    console.log('\nTest subscriptions added successfully!');
    console.log('This should trigger AI recommendations:');
    console.log('1. Cancel recommendation for unused Adobe subscription');
    console.log('2. Rotate streaming services recommendation (Netflix $9.99 + Disney+ $13.99 + Hulu $9.99 = $33.97 > $25)');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
