#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = 'https://xuilgccacufwinvkocfl.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Get user email from command line or use a default
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Usage: node add-test-subscriptions.mjs <your-email@example.com>');
  process.exit(1);
}

async function addTestSubscriptions() {
  try {
    console.log(`\n📝 Adding test subscriptions for: ${userEmail}\n`);

    // 1. Find the user by email
    console.log('1️⃣  Looking up user...');
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error listing users:', userError);
      process.exit(1);
    }

    const user = users.find(u => u.email === userEmail);
    
    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      console.log('\nAvailable users:');
      users.forEach(u => console.log(`  - ${u.email}`));
      process.exit(1);
    }

    const userId = user.id;
    console.log(`   ✅ Found user: ${userId}\n`);

    // 2. Add test subscriptions
    console.log('2️⃣  Adding test subscriptions...');
    
    const testSubscriptions = [
      {
        id: uuidv4().substring(0, 36),
        user_id: userId,
        name: 'Netflix',
        category: 'Entertainment',
        amount: 15.99,
        currency: 'USD',
        frequency: 'monthly',
        next_billing_date: '2026-06-15',
        status: 'active',
        logo_url: 'https://www.netflix.com/favicon.ico',
        description: 'Streaming service',
      },
      {
        id: uuidv4().substring(0, 36),
        user_id: userId,
        name: 'Spotify',
        category: 'Entertainment',
        amount: 9.99,
        currency: 'USD',
        frequency: 'monthly',
        next_billing_date: '2026-06-10',
        status: 'active',
        logo_url: 'https://open.spotifycdn.com/cdn/images/favicon.ico',
        description: 'Music streaming',
      },
      {
        id: uuidv4().substring(0, 36),
        user_id: userId,
        name: 'Adobe Creative Cloud',
        category: 'Software',
        amount: 54.99,
        currency: 'USD',
        frequency: 'monthly',
        next_billing_date: '2026-06-20',
        status: 'active',
        logo_url: 'https://www.adobe.com/favicon.ico',
        description: 'Design software',
      },
      {
        id: uuidv4().substring(0, 36),
        user_id: userId,
        name: 'GitHub Pro',
        category: 'Software',
        amount: 4.00,
        currency: 'USD',
        frequency: 'monthly',
        next_billing_date: '2026-06-05',
        status: 'active',
        logo_url: 'https://github.githubassets.com/favicon.ico',
        description: 'Developer tools',
      },
    ];

    const { data, error } = await supabase
      .from('subscriptions')
      .insert(testSubscriptions);

    if (error) {
      console.error('❌ Error inserting subscriptions:', error.message);
      process.exit(1);
    }

    console.log(`   ✅ Added ${testSubscriptions.length} subscriptions\n`);

    // 3. Summary
    console.log('📊 Summary:');
    console.log(`   Total cost: $${testSubscriptions.reduce((sum, s) => sum + s.amount, 0).toFixed(2)}/month`);
    console.log(`   Subscriptions: ${testSubscriptions.map(s => s.name).join(', ')}`);
    console.log('\n✅ Test data added! Refresh your app to see the subscriptions.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addTestSubscriptions();
