import { createClient } from '@supabase/supabase-js';

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Change this to the user ID you want to mark as family for testing.
  const userId = process.env.TEST_USER_ID || '3c2085b7-de19-456a-8055-ffb22dd9cbb2';

  const now = new Date();
  const oneYear = new Date(now.getTime());
  oneYear.setFullYear(oneYear.getFullYear() + 1);

  const record = {
    user_id: userId,
    stripe_customer_id: `cus_test_${userId.slice(0,8)}`,
    stripe_subscription_id: `sub_test_${userId.slice(0,8)}`,
    stripe_price_id: 'price_1T3jikJpTYwzr88xIxkKHkKu', // family price id
    plan_type: 'family',
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end: oneYear.toISOString(),
    cancel_at_period_end: false,
    updated_at: new Date().toISOString(),
  };

  console.log('Updating user_subscriptions for user:', userId);

  // Try update first
  const { data: updated, error: updateError } = await supabase
    .from('user_subscriptions')
    .update(record)
    .eq('user_id', userId)
    .select();

  if (updateError) {
    console.error('Supabase update error:', updateError);
    process.exit(1);
  }

  if (updated && updated.length > 0) {
    console.log('Update succeeded:', updated);
    process.exit(0);
  }

  console.log('No existing subscription row found — inserting new row');
  const { data: inserted, error: insertError } = await supabase.from('user_subscriptions').insert(record).select();

  if (insertError) {
    console.error('Supabase insert error:', insertError);
    process.exit(1);
  }

  console.log('Insert succeeded:', inserted);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
