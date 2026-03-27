import { createClient } from '@supabase/supabase-js';

const USER_ID = '3c2085b7-de19-456a-8055-ffb22dd9cbb2';
const TEST_MEMBER_EMAIL = `testmember-${Date.now()}@example.com`;

// Generate token for authenticated requests
const payload = JSON.stringify({ sub: USER_ID });
const b64 = Buffer.from(payload).toString('base64');
const token = `a.${b64}.b`;

const BASE_URL = 'http://127.0.0.1:5000';

// Supabase admin client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function makeRequest(method: string, endpoint: string, body?: any) {
  const url = `${BASE_URL}${endpoint}`;
  const options: any = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();
  return { status: response.status, data };
}

async function main() {
  console.log('👨‍👩‍👧 Testing add family member with real user\n');

  try {
    // Step 1: Create a test user in Supabase
    console.log(`1️⃣ Creating test user with email: ${TEST_MEMBER_EMAIL}`);
    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email: TEST_MEMBER_EMAIL,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (createError) {
      console.error('❌ Failed to create user:', createError);
      return;
    }

    const testUserId = authUser.user.id;
    console.log(`✅ Created user: ${testUserId}\n`);

    // Step 2: Create a family group
    console.log('2️⃣ Creating family group...');
    const createRes = await makeRequest('POST', '/api/family-groups', {
      name: 'Test Family Group ' + Date.now()
    });
    
    if (createRes.status !== 201) {
      console.error('❌ Failed to create group:', createRes.data);
      return;
    }
    
    const groupId = createRes.data.id;
    console.log(`✅ Created group: ${groupId}\n`);

    // Step 3: Add the member to the family group
    console.log(`3️⃣ Adding member (${TEST_MEMBER_EMAIL}) to family group...`);
    const addRes = await makeRequest('POST', `/api/family-groups/${groupId}/members`, {
      memberEmail: TEST_MEMBER_EMAIL
    });
    
    console.log(`Status: ${addRes.status}`);
    if (addRes.status === 201) {
      console.log('Response:', JSON.stringify(addRes.data, null, 2));
      console.log('\n🎉 SUCCESS! Member added to family group!');
    } else {
      console.log('Response:', JSON.stringify(addRes.data, null, 2));
      console.log('\n❌ Failed to add member');
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

main().catch(console.error);
