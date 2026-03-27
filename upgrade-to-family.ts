import "dotenv/config";
import { createClient } from '@supabase/supabase-js';

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

    console.log('Found user:', user.email, 'ID:', user.id);

    // Try direct Postgres update bypassing RLS
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('id, plan_type')
      .eq('user_id', user.id)
      .limit(1);

    if (error) {
      console.error('Error querying subscriptions:', error);
      process.exit(1);
    }

    if (data && data.length > 0) {
      // Update existing
      console.log('Existing subscription found:', data[0].id);
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({ plan_type: 'family', status: 'active' })
        .eq('id', data[0].id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        process.exit(1);
      }
      console.log('✓ Updated subscription to family plan');
    } else {
      // Create new
      const { error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_type: 'family',
          status: 'active',
        });

      if (insertError) {
        console.error('Error creating subscription:', insertError);
        process.exit(1);
      }
      console.log('✓ Created new subscription with family plan');
    }

    console.log('✓ User upgraded to family plan!');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
