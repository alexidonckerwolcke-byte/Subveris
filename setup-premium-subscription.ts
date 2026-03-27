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
    // Robust paginated user lookup
    let user = null;
    const email = 'alexi.donckerwolcke@gmail.com';
    let page = 1;
    let totalPages = 1;
    do {
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page });
      if (usersError || !users) {
        console.error('Error fetching users:', usersError);
        process.exit(1);
      }
      if (Array.isArray(users.users)) {
        user = users.users.find(u => u.email === email);
      }
      if (page === 1 && typeof users.total_pages === 'number') {
        totalPages = users.total_pages;
      }
      page++;
    } while (!user && page <= totalPages);

    if (!user) {
      // Create user if not found
      console.log('User not found, creating...');
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email,
        password: 'test-password',
        email_confirm: true
      });
      if (createUserError) {
        if (createUserError.code === 'email_exists') {
          // Retry lookup in case of race condition
          console.log('User already exists, retrying lookup...');
          page = 1;
          user = null;
          do {
            const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page });
            if (usersError || !users) {
              console.error('Error fetching users:', usersError);
              process.exit(1);
            }
            if (Array.isArray(users.users)) {
              user = users.users.find(u => u.email === email);
            }
            if (page === 1 && typeof users.total_pages === 'number') {
              totalPages = users.total_pages;
            }
            page++;
          } while (!user && page <= totalPages);
          if (!user) {
            console.error('User exists but could not be found after retry.');
            process.exit(1);
          }
        } else {
          console.error('Error creating user:', createUserError);
          process.exit(1);
        }
      } else if (!newUser) {
        console.error('Error creating user: Unknown error');
        process.exit(1);
      } else {
        user = newUser.user;
        console.log('✓ User created:', user.email);
      }
    }
    const userId = user.id;
    console.log('Found user:', user.email, 'ID:', userId);

    // Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Allow status override via env or CLI arg
    let status = process.env.SUB_STATUS || process.argv[2] || 'active';
    if (!['active', 'to-cancel', 'unused', 'deleted'].includes(status)) status = 'active';

    if (existingSubscription) {
      console.log('Subscription already exists, updating...');
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status,
          cancel_at_period_end: false,
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          stripe_customer_id: 'cus_test_' + userId.substring(0, 8),
          stripe_subscription_id: 'sub_test_' + userId.substring(0, 8),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        process.exit(1);
      }
      console.log(`✓ Subscription updated to ${status}!`);
    } else {
      console.log('No subscription found, creating...');
      const { error: createError } = await supabase
        .from('user_subscriptions')
        .insert([{
          user_id: userId,
          status,
          cancel_at_period_end: false,
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          stripe_customer_id: 'cus_test_' + userId.substring(0, 8),
          stripe_subscription_id: 'sub_test_' + userId.substring(0, 8),
          start_date: new Date().toISOString(),
        }]);

      if (createError) {
        console.error('Error creating subscription:', createError);
        process.exit(1);
      }
      console.log(`✓ Premium subscription created with status ${status}!`);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
