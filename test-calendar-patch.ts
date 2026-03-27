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
  console.log('📅 Testing calendar update endpoint\n');

  try {
    // First, get all subscriptions
    console.log('1️⃣ Getting subscriptions...');
    const subsRes = await makeRequest('GET', '/api/subscriptions');
    
    if (subsRes.data.length === 0) {
      console.log('   No subscriptions found, creating one for testing...');
      
      // Create a test subscription
      const createRes = await makeRequest('POST', '/api/subscriptions', {
        name: 'Test Subscription',
        category: 'Streaming',
        amount: 9.99,
        frequency: 'monthly',
        nextBillingDate: '2026-03-15',
        currency: 'USD',
        status: 'active',
      });
      
      if (createRes.status !== 201) {
        console.error('   ❌ Failed to create subscription:', createRes.data);
        return;
      }
      
      console.log(`   ✅ Created subscription: ${createRes.data.id}`);
      subsRes.data = [createRes.data];
    }

    const subscriptionId = subsRes.data[0].id;
    console.log(`   ✅ Found subscription: ${subscriptionId}\n`);

    // Test PATCH endpoint to update nextBillingDate
    console.log('2️⃣ Updating nextBillingDate via PATCH...');
    const newDate = '2026-04-15';
    const updateRes = await makeRequest('PATCH', `/api/subscriptions/${subscriptionId}`, {
      nextBillingDate: newDate
    });

    if (updateRes.status === 200) {
      console.log(`   ✅ Successfully updated nextBillingDate to: ${updateRes.data.nextBillingDate}`);
      console.log('\n🎉 Calendar update endpoint works!');
      console.log('   The "[calendar] update error" should no longer appear in console.');
    } else {
      console.log(`   ❌ Failed to update: Status ${updateRes.status}`);
      console.log(`   Response: ${JSON.stringify(updateRes.data, null, 2)}`);
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

main().catch(console.error);
