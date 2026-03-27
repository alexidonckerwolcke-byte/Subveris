import axios from 'axios';

const USER_ID = '3c2085b7-de19-456a-8055-ffb22dd9cbb2';
const GROUP_ID = '0823a403-8892-4569-bf1b-c6b266ae413f';

// Generate token
const payload = JSON.stringify({ sub: USER_ID });
const b64 = Buffer.from(payload).toString('base64');
const token = `a.${b64}.b`;

const api = axios.create({
  baseURL: 'http://127.0.0.1:5000',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

async function testEndpoints() {
  console.log('🧪 Testing Family Sharing Endpoints\n');

  try {
    console.log('1️⃣ GET /api/family-groups');
    const groups = await api.get('/api/family-groups');
    console.log('✅ Response:', JSON.stringify(groups.data, null, 2));
    console.log();

    console.log(`2️⃣ GET /api/family-groups/${GROUP_ID}/shared-subscriptions`);
    const sharedSubs = await api.get(`/api/family-groups/${GROUP_ID}/shared-subscriptions`);
    console.log('✅ Response:', JSON.stringify(sharedSubs.data, null, 2));
    console.log();

    console.log(`3️⃣ GET /api/family-groups/${GROUP_ID}/members`);
    const members = await api.get(`/api/family-groups/${GROUP_ID}/members`);
    console.log('✅ Response:', JSON.stringify(members.data, null, 2));
    console.log();

    console.log(`4️⃣ GET /api/family-groups/${GROUP_ID}/settings`);
    const settings = await api.get(`/api/family-groups/${GROUP_ID}/settings`);
    console.log('✅ Response:', JSON.stringify(settings.data, null, 2));
    console.log();

    console.log(`5️⃣ GET /api/family-groups/${GROUP_ID}/family-data`);
    const familyData = await api.get(`/api/family-groups/${GROUP_ID}/family-data`);
    console.log('✅ Response:', JSON.stringify(familyData.data, null, 2));
    console.log();

    console.log('🎉 All endpoints working!');
  } catch (err) {
    const error = err as any;
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testEndpoints();
