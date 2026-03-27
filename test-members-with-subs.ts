import * as familySharing from './server/family-sharing';

async function test() {
  try {
    const groupId = '1bcaaab5-d9b0-4c8f-a71e-21327eb1b8f4';  // "my family" group
    
    console.log('[TEST] Calling getFamilyMembersWithSubscriptions...');
    const membersWithSubs = await familySharing.getFamilyMembersWithSubscriptions(groupId);
    
    console.log('[TEST] ✅ SUCCESS! Members with subscriptions:');
    membersWithSubs.forEach((member: any) => {
      console.log(`\nMember: ${member.email || member.userId.slice(0, 8)}`);
      console.log(`  Role: ${member.role}`);
      console.log(`  Joined: ${member.joinedAt}`);
      if (member.subscription) {
        console.log(`  Subscription:`);
        console.log(`    - ID: ${member.subscription.id.slice(0, 8)}...`);
        console.log(`    - Plan Type: ${member.subscription.plan_type}`);
        console.log(`    - Status: ${member.subscription.status}`);
      } else {
        console.log(`  Subscription: null`);
      }
    });
    
    console.log('\n[TEST] ✅ COMPLETE!');
    process.exit(0);
  } catch (error) {
    console.error('[TEST] ❌ Error:', error);
    process.exit(1);
  }
}

test();
