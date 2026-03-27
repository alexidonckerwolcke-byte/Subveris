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
    // Get user by email
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError || !users) {
      console.error('Error fetching users:', usersError);
      process.exit(1);
    }

    const user = users.users.find(u => u.email === 'alexi.donckerwolcke@gmail.com');
    
    if (!user) {
      console.error('User not found');
      process.exit(1);
    }

    const userId = user.id;
    console.log('Found user:', user.email, 'ID:', userId);

    // First check if subscription already exists
    const { data: existingSubscription, error: checkError } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSubscription) {
      console.log('Subscription already exists, updating to family plan...');
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          plan_type: 'family',
          status: 'active',
          cancel_at_period_end: false,
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        process.exit(1);
      }
    } else {
      console.log('Creating new family subscription...');
      // Create new subscription
      const { error: insertError } = await supabase
        .from('user_subscriptions')
        .insert([{
          id: randomUUID(),
          user_id: userId,
          plan_type: 'family',
          status: 'active',
          cancel_at_period_end: false,
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          stripe_customer_id: 'cus_family_' + userId.substring(0, 8),
          stripe_subscription_id: 'sub_family_' + userId.substring(0, 8),
        }]);

      if (insertError) {
        console.error('Error creating subscription:', insertError);
        process.exit(1);
      }
    }

    console.log('✓ Family subscription created/updated successfully!');
    console.log('User is now on Family plan');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
