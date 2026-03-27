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

    // Create a premium subscription in Stripe (we'll use test mode)
    // For now, just update the user's metadata to indicate premium
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          tier: 'premium',
        },
      }
    );

    if (updateError) {
      console.error('Error updating user:', updateError);
      process.exit(1);
    }

    console.log('✓ User upgraded to premium!');
    console.log('User metadata:', updatedUser?.user_metadata);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
