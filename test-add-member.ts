const USER_ID = '3c2085b7-de19-456a-8055-ffb22dd9cbb2';

// Generate token
const payload = JSON.stringify({ sub: USER_ID });
const b64 = Buffer.from(payload).toString('base64');
const token = `a.${b64}.b`;

const BASE_URL = 'http://127.0.0.1:5000';

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
  console.log('👨‍👩‍👧 Testing add family member\n');

  try {
    // Step 1: Create a family group
    console.log('1️⃣ Creating family group...');
    const createRes = await makeRequest('POST', '/api/family-groups', {
      name: 'Test Family Group ' + Date.now()
    });
    
    if (createRes.status !== 201) {
      console.error('❌ Failed to create group:', createRes.data);
      return;
    }
    
    const groupId = createRes.data.id;
    console.log(`✅ Created group: ${groupId}\n`);

    // Step 2: Try to add a member
    console.log('2️⃣ Adding member to family group...');
    const addRes = await makeRequest('POST', `/api/family-groups/${groupId}/members`, {
      memberEmail: 'testmember@example.com'
    });
    
    console.log(`Status: ${addRes.status}`);
    console.log('Response:', JSON.stringify(addRes.data, null, 2));
    
    if (addRes.status === 201) {
      console.log('\n🎉 SUCCESS! Member added to family group!');
    } else {
      console.log('\n❌ Failed to add member');
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

main().catch(console.error);
