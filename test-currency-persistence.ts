import { createClient } from '@supabase/supabase-js';

// simple helper used by many of the existing test scripts to create a bogus
// bearer token containing the desired user ID in the payload.  Our server
// code will extract the `sub` value without ever validating the token, which
// makes it convenient for fast tests.
async function generateToken(userId: string): Promise<string> {
  const token = Buffer.from(JSON.stringify({ sub: userId })).toString('base64');
  return `a.${token}`;
}

async function main() {
  console.log('\n🧪 Testing currency persistence behaviour\n');

  const userId = 'currency-test-' + Date.now();
  const token = await generateToken(userId);
  const BASE_URL = 'http://localhost:5000';

  console.log('Using fake user ID', userId);

  // call premium-status before anything has been set
  const beforeRes = await fetch(`${BASE_URL}/api/user/premium-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const beforeData = await beforeRes.json();
  console.log('Initial currency (should default to USD):', beforeData.currency);

  // update currency to EUR
  const patchRes = await fetch(`${BASE_URL}/api/user/currency`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currency: 'EUR' }),
  });
  const patchData = await patchRes.json();
  console.log('PATCH response currency:', patchData.currency);

  // fetch again to confirm persistence
  const afterRes = await fetch(`${BASE_URL}/api/user/premium-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const afterData = await afterRes.json();
  console.log('Currency after update:', afterData.currency);

  if (afterData.currency === 'EUR') {
    console.log('\n✅ Currency persistence test passed');
    process.exit(0);
  } else {
    console.error('\n❌ Currency did not persist as expected');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error running test:', err);
  process.exit(1);
});
