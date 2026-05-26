import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  try {
    // Use the user ID that's currently logged in
    const userId = '3c2085b7-de19-456a-8055-ffb22dd9cbb2';

    console.log('Creating subscriptions for user:', userId);

    const testSubs = [
      { name: 'Netflix', amount: 9.99, category: 'streaming' },
      { name: 'Spotify', amount: 12.99, category: 'music' },
      { name: 'iCloud+', amount: 2.99, category: 'cloud' },
      { name: 'Disney+', amount: 13.99, category: 'streaming' },
      { name: 'GitHub Pro', amount: 4.00, category: 'development' },
      { name: 'ChatGPT Plus', amount: 20.00, category: 'ai' },
      { name: 'Adobe Creative Cloud', amount: 54.99, category: 'design' },
      { name: 'Microsoft 365', amount: 10.00, category: 'productivity' },
    ];

    for (const sub of testSubs) {
      const nextBilling = new Date();
      nextBilling.setDate(nextBilling.getDate() + Math.floor(Math.random() * 30) + 1);

      const { error } = await supabase
        .from('subscriptions')
        .insert([{
          id: randomUUID(),
          user_id: userId,
          name: sub.name,
          category: sub.category,
          amount: sub.amount,
          currency: 'USD',
          frequency: 'monthly',
          next_billing_at: nextBilling.toISOString(),
          status: 'active',
          usage_count: Math.floor(Math.random() * 20),
          is_detected: false,
          description: `${sub.name} subscription`,
        }]);

      if (error) {
        console.error(`Error adding ${sub.name}:`, error);
      } else {
        console.log(`✓ Added ${sub.name}`);
      }
    }

    console.log('\n✓ Test subscriptions created successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
