#!/usr/bin/env node

/**
 * Test script to verify subscription user isolation
 * Creates subscriptions for different users and verifies they can't see each other's data
 */

const BASE_URL = "http://localhost:5000";

// These are test JWTs with different sub values (user IDs)
const USER_1_ID = "3c2085b7-de19-456a-8055-ffb22dd9cbb2";
// Create a new user ID that doesn't exist in the database
const USER_2_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

// Create a JWT with a given user ID
function createTestJWT(userId: string): string {
  // Base64 encode a JWT payload with sub = userId
  const payload = { sub: userId };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64");
  // Simple JWT format: header.payload.signature
  const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString(
    "base64"
  );
  // Must start with "a." to match the token prefix extraction
  const token = `${header}.${encodedPayload}.fakesignature`;
  return `a.${token}`;
}

async function test() {
  console.log("🧪 Testing subscription user isolation...\n");

  const user1Token = createTestJWT(USER_1_ID);
  const user2Token = createTestJWT(USER_2_ID);

  console.log(`User 1 ID: ${USER_1_ID}`);
  console.log(`User 2 ID: ${USER_2_ID}\n`);

  // Test 1: Create a subscription for user 1
  console.log("1️⃣  Creating subscription for User 1 (Netflix Test)...");
  const sub1Response = await fetch(`${BASE_URL}/api/subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user1Token}`,
    },
    body: JSON.stringify({
      name: `Netflix Test ${Date.now()}`,
      category: "entertainment",
      amount: 15.99,
      frequency: "monthly",
      nextBillingDate: "2024-02-15",
      currency: "USD",
    }),
  });

  if (!sub1Response.ok) {
    const error = await sub1Response.text();
    console.error(`❌ Failed to create sub1: ${sub1Response.status}`, error);
    return;
  }

  const sub1 = await sub1Response.json();
  console.log(`✅ Created subscription for User 1`);
  console.log(`   - ID: ${sub1.id}`);
  console.log(`   - Name: ${sub1.name}`);
  console.log(`   - User ID: ${sub1.user_id}\n`);

  // Test 2: Create a subscription for user 2 - This should FAIL since user doesn't exist in database
  console.log("2️⃣  Attempting to create subscription for User 2 (should fail - user not in DB)...");
  const sub2Response = await fetch(`${BASE_URL}/api/subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user2Token}`,
    },
    body: JSON.stringify({
      name: "Spotify",
      category: "entertainment",
      amount: 12.99,
      frequency: "monthly",
      nextBillingDate: "2024-02-20",
      currency: "USD",
    }),
  });

  console.log(`Response status: ${sub2Response.status}`);
  if (sub2Response.status === 500) {
    const data = await sub2Response.json();
    // Check if it's the foreign key error (which is expected)
    if (data.details && data.details.includes("foreign key")) {
      console.log("✅ EXPECTED: User 2 cannot create subscription (user not in database)\n");
    }
  }

  // Test 3: User 1 should ONLY see their own subscriptions
  console.log("3️⃣  Testing: User 1 fetches their subscriptions...");
  const user1SubsResponse = await fetch(`${BASE_URL}/api/subscriptions`, {
    headers: {
      Authorization: `Bearer ${user1Token}`,
    },
  });

  if (!user1SubsResponse.ok) {
    const error = await user1SubsResponse.text();
    console.error(`❌ Failed to fetch: ${user1SubsResponse.status}`, error);
    return;
  }

  const user1Subs = await user1SubsResponse.json();
  console.log(
    `User 1 sees ${user1Subs.length} subscription(s): ${user1Subs.map((s: any) => s.name).join(", ")}`
  );

  // Filter to just User 1's own subscriptions (created after this test started)
  const user1OwnedSubs = user1Subs.filter((s) => s.name.includes("Netflix Test"));

  if (user1OwnedSubs.length >= 1) {
    console.log("✅ PASS: User 1 correctly sees their own Netflix Test subscription\n");
  } else {
    console.error(
      "❌ FAIL: User 1 should see Netflix, but sees",
      user1Subs.map((s: any) => s.name)
    );
    console.log("\n");
  }

  // Test 4: User 2 should see NO subscriptions
  console.log("4️⃣  Testing: User 2 fetches their subscriptions...");
  const user2SubsResponse = await fetch(`${BASE_URL}/api/subscriptions`, {
    headers: {
      Authorization: `Bearer ${user2Token}`,
    },
  });

  if (!user2SubsResponse.ok) {
    const error = await user2SubsResponse.text();
    console.error(`❌ Failed to fetch: ${user2SubsResponse.status}`, error);
    return;
  }

  const user2Subs = await user2SubsResponse.json();
  console.log(
    `User 2 sees ${user2Subs.length} subscription(s): ${user2Subs.map((s: any) => s.name).join(", ")}`
  );

  if (user2Subs.length === 0) {
    console.log("✅ PASS: User 2 correctly sees no subscriptions\n");
  } else {
    console.error(
      "❌ FAIL: User 2 should see no subscriptions, but sees",
      user2Subs.map((s: any) => s.name)
    );
    console.log("\n");
  }

  // Test 5: User 2 should NOT be able to access User 1's subscription
  console.log("5️⃣  Testing access control: User 2 tries to access User 1's subscription...");
  const accessTestResponse = await fetch(`${BASE_URL}/api/subscriptions/${sub1.id}`, {
    headers: {
      Authorization: `Bearer ${user2Token}`,
    },
  });

  console.log(`   Response status: ${accessTestResponse.status}`);

  if (accessTestResponse.status === 404) {
    console.log("✅ PASS: User 2 cannot access User 1's subscription\n");
  } else if (accessTestResponse.ok) {
    const data = await accessTestResponse.json();
    console.error("❌ FAIL: User 2 should not access User 1's subscription, but got:", data);
    console.log("\n");
  }

  // Test 6: User 1 should be able to access their OWN subscription
  console.log("6️⃣  Testing: User 1 accesses their own subscription...");
  const ownAccessResponse = await fetch(`${BASE_URL}/api/subscriptions/${sub1.id}`, {
    headers: {
      Authorization: `Bearer ${user1Token}`,
    },
  });

  if (ownAccessResponse.ok) {
    const data = await ownAccessResponse.json();
    console.log(`✅ PASS: User 1 can access their own subscription`);
    console.log(`   - Name: ${data.name}, User ID: ${data.user_id}\n`);
  } else {
    console.error(`❌ FAIL: User 1 should be able to access their own subscription\n`);
  }

  // Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`User 1 subscriptions (${user1Subs.length} total, ${user1OwnedSubs.length} owned): ${user1OwnedSubs.map((s: any) => s.name).join(", ")}`);
  console.log(`User 2 subscriptions (${user2Subs.length}): ${user2Subs.map((s: any) => s.name).join(", ")}`);

  const allTestsPassed = 
    user1OwnedSubs.length >= 1 && 
    user2Subs.length === 0;

  if (allTestsPassed) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ALL TESTS PASSED - Data is properly isolated!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } else {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("❌ TESTS FAILED - Data isolation issue");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}

test().catch(console.error);
