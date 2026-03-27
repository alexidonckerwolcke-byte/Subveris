#!/usr/bin/env node

/**
 * Test script to verify dashboard data user isolation
 */

const BASE_URL = "http://localhost:5000";

// Create a JWT with a given user ID  
function createTestJWT(userId: string): string {
  const payload = { sub: userId };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64");
  const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64");
  const token = `${header}.${encodedPayload}.fakesignature`;
  return `a.${token}`;
}

async function test() {
  console.log("🧪 Testing dashboard data user isolation...\n");

  const user1ID = "3c2085b7-de19-456a-8055-ffb22dd9cbb2";
  const user2ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  const user1Token = createTestJWT(user1ID);
  const user2Token = createTestJWT(user2ID);

  console.log("Testing endpoints that should be user-isolated:\n");

  // endpoints that should be scoped per-user. monthly-savings now only
  // includes *actual* cancellations; unused subscriptions are omitted.
  const endpoints = [
    "/api/metrics",
    "/api/spending/monthly",
    "/api/spending/category",
    "/api/analysis/cost-per-use",
    "/api/insights/behavioral",
    "/api/analytics/monthly-savings",
  ];

  for (const endpoint of endpoints) {
    console.log(`📊 Testing ${endpoint}...`);
    
    try {
      // Test User 1
      const user1Response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
      });

      if (!user1Response.ok) {
        console.log(
          `   ❌ User 1 request failed: ${user1Response.status}`
        );
        continue;
      }

      const user1Data = await user1Response.json();
      console.log(`   ✅ User 1: Got response (${JSON.stringify(user1Data).length} bytes)`);

      // Test User 2 (no subscriptions, should get empty results or 0 values)
      const user2Response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${user2Token}`,
        },
      });

      if (!user2Response.ok) {
        console.log(
          `   ❌ User 2 request failed: ${user2Response.status}`
        );
        continue;
      }

      const user2Data = await user2Response.json();
      const isEmpty =
        (Array.isArray(user2Data) && user2Data.length === 0) ||
        (typeof user2Data === "object" && 
          (user2Data.monthlySavings === 0 || user2Data.totalMonthlySpend === 0));

      if (isEmpty) {
        console.log(`   ✅ User 2: Got empty/zero response (properly isolated)`);
      } else {
        console.log(`   ⚠️  User 2: Got data - ${JSON.stringify(user2Data).substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }
    console.log();
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Dashboard data isolation test complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

test().catch(console.error);
