#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    // Get the first user
    const { data: users, error: usersError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.error('Error getting subscriptions:', usersError);
      process.exit(1);
    }

    const userId = users[0].user_id;
    console.log('Using user:', userId);

    // First, let's get all current subscriptions for this user
    const { data: subs, error: getError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (getError) {
      console.error('Error fetching subscriptions:', getError);
      process.exit(1);
    }

    console.log('Current subscriptions:');
    subs?.forEach(s => {
      console.log(`- ${s.name} (status: ${s.status})`);
    });

    // Change Netflix status from "to-cancel" to "unused"
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ status: 'unused' })
      .eq('user_id', userId)
      .eq('name', 'Netflix');

    if (updateError) {
      console.error('Error updating Netflix subscription:', updateError);
    } else {
      console.log('✓ Updated Netflix subscription to "unused" status');
    }

    // Add Disney+ subscription
    const { error: disneyError } = await supabase
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
          next_billing_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          is_detected: false,
        },
      ]);

    if (disneyError) {
      console.error('Error adding Disney+ subscription:', disneyError);
    } else {
      console.log('✓ Added Disney+ subscription');
    }

    // Add Hulu subscription
    const { error: huluError } = await supabase
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
          next_billing_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          is_detected: false,
        },
      ]);

    if (huluError) {
      console.error('Error adding Hulu subscription:', huluError);
    } else {
      console.log('✓ Added Hulu subscription');
    }

    console.log('\nTest subscriptions added/updated successfully!');
    console.log('AI recommendations should now be generated for:');
    console.log('1. Cancel unused Netflix subscription');
    console.log('2. Rotate streaming services (Netflix $9.99 + Disney+ $13.99 + Hulu $9.99 = $33.97)');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
