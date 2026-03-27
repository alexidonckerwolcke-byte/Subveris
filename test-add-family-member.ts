import * as familySharing from './server/family-sharing';

async function test() {
  try {
    const groupId = 'b784e5ec-88ad-41a2-8d3b-f0fad5ba4e3e';  // Test Family Group
    const ownerId = '00000000-0000-0000-0000-000000000001';  // dev@example.com
    const memberId = 'e069db05-fee9-4176-be92-67d0fae84382'; // copilot-test@local.test
    
    console.log('\n=== Testing addFamilyMember Function ===\n');
    console.log('GroupId:', groupId);
    console.log('OwnerId:', ownerId);
    console.log('MemberId:', memberId);
    console.log('\nCalling addFamilyMember...(check logs for [addFamilyMember] messages)\n');
    
    const result = await familySharing.addFamilyMember(groupId, ownerId, memberId);
    console.log('\n✅ SUCCESS!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ FAILED!');
    console.error('Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

test();
