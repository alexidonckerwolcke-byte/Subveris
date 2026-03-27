import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function generateToken(userId: string): Promise<string> {
  // This is simplified - in reality you'd need to generate a proper JWT
  // For testing, we'll use the extractUserIdFromToken logic backward
  const token = Buffer.from(JSON.stringify({ sub: userId })).toString('base64');
  return `a.${token}`;
}

async function testFamilyMemberIsolation() {
  console.log('\n🧪 Testing Family Member Data Isolation...\n');

  // Create test users
  const ownerId = 'owner-' + Date.now();
  const memberId = 'member-' + Date.now();
  const otherMemberId = 'other-member-' + Date.now();

  console.log('📝 Creating test users:');
  console.log(`  Owner ID: ${ownerId}`);
  console.log(`  Member 1 ID: ${memberId}`);
  console.log(`  Member 2 ID: ${otherMemberId}`);

  // Create test family group
  const { data: groupData, error: groupError } = await supabase
    .from('family_groups')
    .insert({
      owner_id: ownerId,
      name: 'Test Family Group',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (groupError || !groupData) {
    console.error('❌ Failed to create family group:', groupError);
    return;
  }

  const groupId = groupData.id;
  console.log(`✅ Created family group: ${groupId}\n`);

  // Add members to group
  await supabase.from('family_group_members').insert([
    {
      family_group_id: groupId,
      user_id: memberId,
      role: 'member',
      email: `member@test.com`,
      joined_at: new Date().toISOString(),
    },
    {
      family_group_id: groupId,
      user_id: otherMemberId,
      role: 'member',
      email: `other@test.com`,
      joined_at: new Date().toISOString(),
    },
  ]);

  // Enable family data sharing
  await supabase.from('family_group_settings').insert({
    family_group_id: groupId,
    show_family_data: true,
  });

  console.log('📝 Creating test subscriptions:\n');

  // Create owner's personal subscription
  const { data: ownerSubData } = await supabase
    .from('subscriptions')
    .insert({
      user_id: ownerId,
      name: 'Owner Netflix',
      amount: 15.99,
      frequency: 'monthly',
      category: 'entertainment',
      currency: 'USD',
      status: 'active',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  const ownerSubId = ownerSubData?.id;
  console.log(`  ✅ Owner subscription created (Netflix ${ownerSubData?.amount})`);

  // Create member's personal subscription
  const { data: memberSubData } = await supabase
    .from('subscriptions')
    .insert({
      user_id: memberId,
      name: 'Member Spotify',
      amount: 9.99,
      frequency: 'monthly',
      category: 'entertainment',
      currency: 'USD',
      status: 'active',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  const memberSubId = memberSubData?.id;
  console.log(`  ✅ Member subscription created (Spotify ${memberSubData?.amount})`);

  // Create shared subscription
  if (ownerSubId) {
    const { data: sharedSubData } = await supabase
      .from('shared_subscriptions')
      .insert({
        family_group_id: groupId,
        subscription_id: ownerSubId,
        shared_by_user_id: ownerId,
        shared_at: new Date().toISOString(),
      })
      .select()
      .single();

    console.log(`  ✅ Owner shared Netflix with family\n`);
  }

  console.log('🧪 Testing API Responses:\n');

  // Test 1: Make API call as owner to /api/family-groups/:id/family-data
  console.log('1️⃣ Owner calling /api/family-groups/:id/family-data');
  const ownerToken = `Bearer ${Buffer.from(JSON.stringify({ sub: ownerId })).toString('base64')}`;
  try {
    const response = await fetch(`http://localhost:5000/api/family-groups/${groupId}/family-data`, {
      headers: { Authorization: ownerToken },
    });
    const ownerData = await response.json();
    
    const ownerSubCount = ownerData.subscriptions?.filter((s: any) => s.user_id === ownerId).length || 0;
    const memberSubCount = ownerData.subscriptions?.filter((s: any) => s.user_id === memberId).length || 0;
    const otherMemberSubCount = ownerData.subscriptions?.filter((s: any) => s.user_id === otherMemberId).length || 0;
    
    console.log(`   - Owner subscriptions: ${ownerSubCount} (Netflix) ✅`);
    console.log(`   - Member 1 subscriptions: ${memberSubCount} (Spotify) ✅`);
    console.log(`   - Member 2 subscriptions: ${otherMemberSubCount} ✅`);
    
    if (ownerSubCount > 0 && memberSubCount > 0) {
      console.log('   ✅ Owner can see all members\' subscriptions\n');
    }
  } catch (error) {
    console.error('   ❌ Failed:', error);
  }

  // Test 2: Make API call as member to /api/family-groups/:id/family-data
  console.log('2️⃣ Member 1 calling /api/family-groups/:id/family-data');
  const memberToken = `Bearer ${Buffer.from(JSON.stringify({ sub: memberId })).toString('base64')}`;
  try {
    const response = await fetch(`http://localhost:5000/api/family-groups/${groupId}/family-data`, {
      headers: { Authorization: memberToken },
    });
    const memberData = await response.json();
    
    const memberOwnSubCount = memberData.subscriptions?.filter((s: any) => s.user_id === memberId).length || 0;
    const memberOwnerSubCount = memberData.subscriptions?.filter((s: any) => s.user_id === ownerId).length || 0;
    const memberOtherSubCount = memberData.subscriptions?.filter((s: any) => s.user_id === otherMemberId).length || 0;
    
    console.log(`   - Own subscriptions: ${memberOwnSubCount} (Spotify) ✅`);
    console.log(`   - Owner subscriptions (should include shared Netflix): ${memberOwnerSubCount}`);
    console.log(`   - Other member subscriptions: ${memberOtherSubCount}`);
    
    if (memberOwnerSubCount > 0 && memberOwnSubCount > 0) {
      console.log('   ✅ Member can see both own and shared subscriptions');
    } else {
      console.log('   ❌ FAILURE: Member missing shared subscription or own one');
    }
  } catch (error) {
    console.error('   ❌ Failed:', error);
  }

  // Test 3: Test individual dashboard endpoints
  console.log('3️⃣ Member calling /api/metrics (personal dashboard)');
  try {
    const response = await fetch('http://localhost:5000/api/metrics', {
      headers: { Authorization: memberToken },
    });
    const metrics = await response.json();
    
    console.log(`   - Active subscriptions: ${metrics.activeSubscriptions}`);
    console.log(`   - Monthly spend: $${metrics.totalMonthlySpend}`);
    
    if (metrics.activeSubscriptions === 1 && metrics.totalMonthlySpend === 9.99) {
      console.log('   ✅ Personal metrics only show member\'s own subscription\n');
    } else {
      console.log(`   ❌ Unexpected metrics: ${JSON.stringify(metrics)}\n`);
    }
  } catch (error) {
    console.error('   ❌ Failed:', error);
  }

  // Test 4: cost-per-use with familyGroupId should aggregate shared subscriptions
  console.log('4️⃣ Owner requesting cost-per-use with familyGroupId');
  try {
    const resp = await fetch(
      `http://localhost:5000/api/analysis/cost-per-use?familyGroupId=${groupId}`,
      { headers: { Authorization: ownerToken } },
    );
    const data = await resp.json();
    console.log(`   - cost-per-use response: ${JSON.stringify(data)}`);
    if (Array.isArray(data) && data.length > 0) {
      console.log('   ✅ Received cost-per-use data for family');
    } else {
      console.log('   ❌ Unexpected family cost-per-use result');
    }
  } catch (err) {
    console.error('   ❌ Failed family cost-per-use call:', err);
  }

  // Test 4: family cost-per-use analysis
  console.log('4️⃣ Fetching family cost-per-use analysis as owner');
  try {
    const response = await fetch(`http://localhost:5000/api/analysis/cost-per-use?familyGroupId=${groupId}`, {
      headers: { Authorization: ownerToken },
    });
    const analysis = await response.json();
    console.log('   Analysis result:', analysis);
    if (Array.isArray(analysis) && analysis.length >= 2) {
      console.log('   ✅ Owner receives cost-per-use for all family subscriptions');
    } else {
      console.log('   ❌ Unexpected analysis output', analysis);
    }

    // now log usage on the member's subscription and verify it updates
    console.log('   -> Logging usage for member subscription');
    await fetch(`http://localhost:5000/api/subscriptions/${memberSubId}/log-usage`, {
      method: 'POST',
      headers: { Authorization: memberToken },
    });
    const afterRes = await fetch(`http://localhost:5000/api/analysis/cost-per-use?familyGroupId=${groupId}`, {
      headers: { Authorization: ownerToken },
    });
    const afterAnalysis = await afterRes.json();
    console.log('   Analysis after logging usage:', afterAnalysis);
    // simple sanity: usageCount should be 1 for the member's subscription entry
    const memberEntry = afterAnalysis.find((a: any) => a.subscriptionId === memberSubId);
    if (memberEntry && memberEntry.usageCount === 1) {
      console.log('   ✅ Usage count incremented in family analysis');
    } else {
      console.log('   ❌ Usage count did not update in family analysis', memberEntry);
    }
  } catch (error) {
    console.error('   ❌ Cost-per-use test failed:', error);
  }

  // New check: monthly-savings should only reflect the caller's own cancel values
  console.log('4️⃣ Owner calling /api/analytics/monthly-savings (should be 0)');
  try {
    const response = await fetch('http://localhost:5000/api/analytics/monthly-savings', {
      headers: { Authorization: ownerToken },
    });
    const data = await response.json();
    console.log(`   - Owner monthly savings: ${data.monthlySavings}`);
    if (data.monthlySavings === 0) {
      console.log('   ✅ Owner sees only their own savings');
    } else {
      console.log('   ❌ Unexpected owner savings:', data.monthlySavings);
    }
  } catch (err) {
    console.error('   ❌ Failed:', err);
  }

  console.log('5️⃣ Member calling /api/analytics/monthly-savings (should be 0)');
  try {
    const response = await fetch('http://localhost:5000/api/analytics/monthly-savings', {
      headers: { Authorization: memberToken },
    });
    const data = await response.json();
    console.log(`   - Member monthly savings: ${data.monthlySavings}`);
    if (data.monthlySavings === 0) {
      console.log('   ✅ Member sees only their own savings');
    } else {
      console.log('   ❌ Unexpected member savings:', data.monthlySavings);
    }
  } catch (err) {
    console.error('   ❌ Failed:', err);
  }

  // Test 6: update member subscription to "to-cancel" and verify savings remains zero
  console.log('6️⃣ Member marks their subscription to-cancel');
  await fetch(`http://localhost:5000/api/subscriptions/${memberSubId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: memberToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'to-cancel' }),
  });

  // extra verification: deleting the owner's subscription should remove it from family-data
  console.log('7️⃣ Owner deletes their Netflix subscription');
  await fetch(`http://localhost:5000/api/subscriptions/${ownerSubId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: ownerToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'deleted' }),
  });

  // fetch family-data again as owner
  const respAfterDel = await fetch(`http://localhost:5000/api/family-groups/${groupId}/family-data`, {
    headers: { Authorization: ownerToken },
  });
  const dataAfterDel = await respAfterDel.json();
  const totalAfter = dataAfterDel.subscriptions?.length || 0;
  console.log(`   - Subscriptions after deletion (should not include Netflix): ${totalAfter}`);
  if (totalAfter !== 1) {
    console.log('   ❌ Unexpected subscription count after delete:', totalAfter);
  } else {
    console.log('   ✅ Deletion correctly removed subscription from family-data');
  }

  // ensure the server also returned a metrics object and that it matches
  if (dataAfterDel.metrics) {
    console.log('   - metrics from family-data:', dataAfterDel.metrics);
    if (dataAfterDel.metrics.totalSubscriptions !== totalAfter) {
      console.log('   ❌ Metrics mismatch after delete:', dataAfterDel.metrics.totalSubscriptions);
    } else {
      console.log('   ✅ Metrics object reflects deletion');
    }
  } else {
    console.log('   ⚠️ No metrics returned by family-data endpoint');
  }

  console.log('   - verifying member monthly-savings stays 0 since to-cancel is potential only');
  try {
    const response = await fetch('http://localhost:5000/api/analytics/monthly-savings', {
      headers: { Authorization: memberToken },
    });
    const data = await response.json();
    console.log(`   - Member monthly savings after to-cancel: ${data.monthlySavings}`);
    if (data.monthlySavings === 0) {
      console.log('   ✅ to-cancel does not count as actual savings');
    } else {
      console.log('   ❌ Unexpected member savings after cancel:', data.monthlySavings);
    }
  } catch (err) {
    console.error('   ❌ Failed:', err);
  }

  // Test 7: change status to deleted and ensure savings reflects the amount
  console.log('7️⃣ Member marks their subscription as deleted');
  await fetch(`http://localhost:5000/api/subscriptions/${memberSubId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: memberToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'deleted' }),
  });

  console.log('   - verifying member monthly-savings now equals 9.99');
  try {
    const response = await fetch('http://localhost:5000/api/analytics/monthly-savings', {
      headers: { Authorization: memberToken },
    });
    const data = await response.json();
    console.log(`   - Member monthly savings after deleted: ${data.monthlySavings}`);
    if (Math.abs(data.monthlySavings - 9.99) < 0.001) {
      console.log('   ✅ Member sees their deleted subscription as savings');
    } else {
      console.log('   ❌ Unexpected member savings after deletion:', data.monthlySavings);
    }
  } catch (err) {
    console.error('   ❌ Failed:', err);
  }

  console.log('7️⃣ Owner calling /api/analytics/monthly-savings?family=true');
  try {
    const response = await fetch('http://localhost:5000/api/analytics/monthly-savings?family=true', {
      headers: { Authorization: ownerToken },
    });
    const data = await response.json();
    console.log(`   - Family monthly savings: ${data.monthlySavings}`);
    if (Math.abs(data.monthlySavings - 9.99) < 0.001) {
      console.log('   ✅ Owner family total includes member savings');
    } else {
      console.log('   ❌ Unexpected family savings:', data.monthlySavings);
    }
  } catch (err) {
    console.error('   ❌ Failed:', err);
  }

  console.log('✅ Test complete!\n');

  // Cleanup
  console.log('🧹 Cleaning up test data...');
  await supabase
    .from('family_groups')
    .delete()
    .eq('id', groupId);
  console.log('✅ Cleanup complete\n');
}

testFamilyMemberIsolation();
