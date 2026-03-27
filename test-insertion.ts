import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testInsertSubscription() {
  try {
    const memberUserId = 'b7d045ad-8c1f-4005-b5ff-bbc4386e1e07';
    const subId = uuidv4();
    
    console.log('Attempting to insert subscription:');
    console.log('- ID:', subId);
    console.log('- User ID:', memberUserId);
    console.log('- Plan Type: family');
    console.log('- Status: active');
    
    // Test 1: Insert with minimal fields
    console.log('\n=== TEST 1: Minimal Insert ===');
    const { data: test1Data, error: test1Error } = await supabase
      .from('user_subscriptions')
      .insert({
        id: uuidv4(),
        user_id: memberUserId,
        plan_type: 'family',
        status: 'active',
      })
      .select();
    
    console.log('Error:', test1Error);
    console.log('Data rows inserted:', test1Data?.length ?? 'null');
    if (test1Error) {
      console.log('Detailed error:', JSON.stringify(test1Error, null, 2));
    }

    // Test 2: Insert with ALL fields
    console.log('\n=== TEST 2: Full Insert ===');
    const { data: test2Data, error: test2Error } = await supabase
      .from('user_subscriptions')
      .insert({
        id: uuidv4(),
        user_id: memberUserId,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: null,
        cancel_at_period_end: false,
        plan_type: 'family',
      })
      .select();
    
    console.log('Error:', test2Error);
    console.log('Data rows inserted:', test2Data?.length ?? 'null');
    if (test2Error) {
      console.log('Detailed error:', JSON.stringify(test2Error, null, 2));
    }

    // Test 3: Check RLS policy
    console.log('\n=== TEST 3: Check Current Records ===');
    const { data: checkData, error: checkError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', memberUserId);
    
    console.log('Query Error:', checkError);
    console.log('Total records found:', checkData?.length ?? 0);
    if (checkData && checkData.length > 0) {
      console.log('Most recent record:', checkData[checkData.length - 1]);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testInsertSubscription();
