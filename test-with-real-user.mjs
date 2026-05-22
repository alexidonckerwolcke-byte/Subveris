#!/usr/bin/env node

/**
 * Test API with a user that has actual data
 */

const BASE_URL = "https://xuilgccacufwinvkocfl.supabase.co/functions/v1/api";
const USER_WITH_DATA = "614bee7a-ad38-4127-a52e-2c09aa4d5679";

async function test() {
  console.log("Testing API with real user...");
  console.log(`User ID: ${USER_WITH_DATA}\n`);

  // Test 1: Fetch subscriptions with x-test-user-id header
  console.log("1️⃣  Fetching subscriptions with x-test-user-id header...");
  const response = await fetch(`${BASE_URL}/subscriptions`, {
    headers: {
      "x-test-user-id": USER_WITH_DATA,
      "Authorization": "Bearer dummy",
    },
  });

  console.log(`Status: ${response.status}`);
  const data = await response.json();
  console.log(`Subscriptions: ${data.length}`);
  if (data.length > 0) {
    console.log(`First sub: ${data[0].name}`);
  }

  // Test 2: Try without x-test-user-id but with a dummy JWT
  console.log("\n2️⃣  Fetching subscriptions WITHOUT custom header (should fail)...");
  const response2 = await fetch(`${BASE_URL}/subscriptions`, {
    headers: {
      "Authorization": "Bearer dummy",
    },
  });

  console.log(`Status: ${response2.status}`);
  const data2 = await response2.json();
  console.log(`Result:`, data2);
}

test().catch(err => console.error('Error:', err));
