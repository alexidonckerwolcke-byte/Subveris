import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';
const TEST_TOKEN = process.env.TEST_USER_TOKEN || '';

async function testMembersAPI() {
  if (!TEST_TOKEN) {
    console.error('TEST_USER_TOKEN not set');
    return;
  }

  try {
    // First, get the user info
    const meRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });
    const meData = await meRes.json() as any;
    console.log('[TEST] Current user:', meData.email);

    // Get family groups
    const groupsRes = await fetch(`${API_BASE}/api/family-groups`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });
    const groups = await groupsRes.json() as any[];
    console.log('[TEST] Family groups:', groups.length);

    if (groups.length === 0) {
      console.log('[TEST] No family groups found');
      return;
    }

    const groupId = groups[0].id;
    console.log('[TEST] Testing group:', groupId);

    // Get members with subscriptions
    const membersRes = await fetch(`${API_BASE}/api/family-groups/${groupId}/members`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });

    if (!membersRes.ok) {
      console.error('[TEST] Error fetching members:', membersRes.status);
      const text = await membersRes.text();
      console.error('[TEST] Response:', text);
      return;
    }

    const members = await membersRes.json() as any[];
    console.log('[TEST] Members fetched successfully:');
    members.forEach((member: any) => {
      console.log(`  - ${member.email || member.userId.slice(0, 8)}`);
      console.log(`    Role: ${member.role}`);
      if (member.subscription) {
        console.log(`    Plan: ${member.subscription.plan_type}`);
        console.log(`    Status: ${member.subscription.status}`);
      } else {
        console.log(`    No subscription data`);
      }
    });
  } catch (error) {
    console.error('[TEST] Error:', error);
  }
}

testMembersAPI();
