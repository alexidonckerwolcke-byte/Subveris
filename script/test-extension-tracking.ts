import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTracking() {
  const targetUserId = '3c2085b7-de19-456a-8055-ffb22dd9cbb2';
  const testDomain = 'netflix.com';
  
  console.log(`--- Testing Extension Tracking for user: ${targetUserId} ---`);

  // 1. Ensure a subscription exists with the correct domain
  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('website_domain', testDomain)
    .single();

  if (subError || !sub) {
    console.log(`No subscription found for ${testDomain}. Creating one for testing...`);
    const { data: newSub, error: createError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: targetUserId,
        name: 'Netflix Test',
        category: 'entertainment',
        amount: 15.99,
        currency: 'USD',
        frequency: 'monthly',
        website_domain: testDomain,
        status: 'active',
        usage_count: 5,
        monthly_usage_count: 2,
        usage_month: new Date().toISOString().slice(0, 7),
        next_billing_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Failed to create test subscription:', createError.message);
      return;
    }
    console.log('Created test subscription:', newSub.id);
  } else {
    console.log(`Found existing subscription for ${testDomain}: ${sub.id}`);
  }

  // 2. Fetch the latest state before update
  const { data: beforeUpdate } = await supabase.from('subscriptions').select('*').eq('user_id', targetUserId).eq('website_domain', testDomain).single();
  
  console.log('\nSimulating extension tracking logic...');
  const newUsageCount = (beforeUpdate.usage_count || 0) + 1;
  const month = new Date().toISOString().slice(0, 7);
  let newMonthlyUsage = (beforeUpdate.monthly_usage_count || 0) + 1;
  if (beforeUpdate.usage_month !== month) {
    newMonthlyUsage = 1;
  }

  const { data: updated, error: updateError } = await supabase
    .from('subscriptions')
    .update({ 
      usage_count: newUsageCount,
      monthly_usage_count: newMonthlyUsage,
      usage_month: month,
      last_used_at: new Date().toISOString().split('T')[0]
    })
    .eq('id', beforeUpdate.id)
    .select()
    .single();

  if (updateError) {
    console.error('Update failed:', updateError.message);
  } else {
    console.log('Update successful!');
    console.log(`Initial usage: ${beforeUpdate.usage_count} -> New usage: ${updated.usage_count}`);
    console.log(`Initial monthly: ${beforeUpdate.monthly_usage_count} -> New monthly: ${updated.monthly_usage_count}`);
    
    // 3. Verify Cost-Per-Use Calculation
    const monthlyAmount = updated.amount;
    const costPerUse = updated.usage_count > 0 ? monthlyAmount / updated.usage_count : monthlyAmount;
    console.log(`Calculated Cost-Per-Use: ${updated.currency} ${costPerUse.toFixed(2)}`);
  }

  console.log('\n--- Test Complete ---');
}

testTracking();
