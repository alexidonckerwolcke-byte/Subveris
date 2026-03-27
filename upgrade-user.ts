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
  console.log('📱 Upgrading user to family plan...');
  console.log(`Token: ${token}\n`);

  try {
    console.log('1️⃣ Calling upgrade endpoint...');
    const upgradeRes = await makeRequest('POST', '/api/user/upgrade-to-family', {});
    console.log('✅ Upgrade Response:', JSON.stringify(upgradeRes.data, null, 2));
    console.log();

    // Small delay before checking status
    await new Promise(r => setTimeout(r, 500));

    console.log('2️⃣ Checking premium status...');
    const statusRes = await makeRequest('GET', '/api/user/premium-status');
    console.log('✅ Premium Status:');
    console.log(JSON.stringify(statusRes.data, null, 2));
    
    if (statusRes.data.planType === 'family' && statusRes.data.isPremium) {
      console.log('\n🎉 SUCCESS! User is now on family plan!');
    } else {
      console.log('\n⚠️ User plan not set correctly');
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

main();
