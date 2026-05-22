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
    // Use the known user ID from the curl command
    const userId = '3c2085b7-de19-456a-8055-ffb22dd9cbb2';
    console.log('Adding sample insights for user:', userId);

    // Get user's subscriptions to base insights on them
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      process.exit(1);
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions`);

    // Calculate total monthly cost
    const totalMonthly = subscriptions?.reduce((sum, sub) => {
      if (sub.status === 'active') {
        return sum + (sub.amount || 0);
      }
      return sum;
    }, 0) || 0;

    // Add spending overview insight
    const { error: insight1Error } = await supabase
      .from('insights')
      .insert([
        {
          id: randomUUID(),
          user_id: userId,
          type: 'spending_overview',
          title: 'Monthly Subscription Spending',
          description: `You're spending $${totalMonthly.toFixed(2)} per month on ${(subscriptions?.filter(s => s.status === 'active').length || 0)} active subscriptions.`,
          priority: 1,
          created_at: new Date().toISOString(),
        },
      ]);

    if (insight1Error) {
      console.error('Error adding spending insight:', insight1Error);
    } else {
      console.log('✓ Added spending overview insight');
    }

    // Add savings opportunity insight
    const unusedSubs = subscriptions?.filter(s => s.status === 'unused' || s.status === 'to-cancel') || [];
    if (unusedSubs.length > 0) {
      const savings = unusedSubs.reduce((sum, sub) => sum + (sub.amount || 0), 0);

      const { error: insight2Error } = await supabase
        .from('insights')
        .insert([
          {
            id: randomUUID(),
            user_id: userId,
            type: 'savings_opportunity',
            title: 'Potential Monthly Savings',
            description: `You could save $${savings.toFixed(2)} per month by canceling ${unusedSubs.length} unused subscription${unusedSubs.length > 1 ? 's' : ''}.`,
            potential_savings: savings,
            priority: 2,
            created_at: new Date().toISOString(),
          },
        ]);

      if (insight2Error) {
        console.error('Error adding savings insight:', insight2Error);
      } else {
        console.log('✓ Added savings opportunity insight');
      }
    }

    // Add category breakdown insight
    const categoryCount = {};
    subscriptions?.forEach(sub => {
      if (sub.status === 'active') {
        categoryCount[sub.category] = (categoryCount[sub.category] || 0) + 1;
      }
    });

    const topCategory = Object.entries(categoryCount).sort(([,a], [,b]) => b - a)[0];
    if (topCategory) {
      const { error: insight3Error } = await supabase
        .from('insights')
        .insert([
          {
            id: randomUUID(),
            user_id: userId,
            type: 'category_analysis',
            title: 'Top Subscription Category',
            description: `Your largest category is ${topCategory[0]} with ${topCategory[1]} active subscription${topCategory[1] > 1 ? 's' : ''}.`,
            priority: 3,
            created_at: new Date().toISOString(),
          },
        ]);

      if (insight3Error) {
        console.error('Error adding category insight:', insight3Error);
      } else {
        console.log('✓ Added category analysis insight');
      }
    }

    // Add usage tracking reminder
    const { error: insight4Error } = await supabase
      .from('insights')
      .insert([
        {
          id: randomUUID(),
          user_id: userId,
          type: 'usage_tracking',
          title: 'Track Your Usage',
          description: 'Enable usage tracking to get personalized recommendations based on how often you actually use each subscription.',
          priority: 4,
          created_at: new Date().toISOString(),
        },
      ]);

    if (insight4Error) {
      console.error('Error adding usage insight:', insight4Error);
    } else {
      console.log('✓ Added usage tracking insight');
    }

    console.log('\nSample insights added successfully!');
    console.log('The dashboard and insights pages should now show data.');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();