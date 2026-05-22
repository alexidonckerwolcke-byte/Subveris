#!/usr/bin/env node

const BASE_URL = "https://xuilgccacufwinvkocfl.supabase.co/functions/v1/api";
const USER_ID = "84dee753-d42e-40cd-b3fe-25bb1f141fe7";
const JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsImtpZCI6InVSdEFWeGxMbUhOQkxpdEMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3h1aWxnY2NhY3Vmd2ludmtvY2ZsLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4NGRlZTc1My1kNDJlLTQwY2QtYjNmZS0yNWJiMWYxNDFmZTciLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc2NzE4MzQ4LCJpYXQiOjE3NzY3MTQ3NDgsImVtYWlsIjoidGVzdC11c2VyQGV4YW1wbGUuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NzY3MTQ3NDh9XSwic2Vzc2lvbl9pZCI6ImM1NDgxNDQxLTg3NTktNDY5Yi1hMjI4LTU3ZmU1ZjBkYTBmYiIsImlzX2Fub255bW91cyI6ZmFsc2V9.F6j84PuYbY2xtd8CnVmTudHa5gcMTNlbnx-qPz09Hwo";

async function test() {
  console.log("Testing API with real JWT token...");
  console.log(`User ID: ${USER_ID}\n`);

  // Test 1: Fetch subscriptions (should be empty for new user)
  console.log("1️⃣  Fetching subscriptions...");
  const response = await fetch(`${BASE_URL}/subscriptions`, {
    headers: {
      "Authorization": `Bearer ${JWT_TOKEN}`,
    },
  });

  console.log(`Status: ${response.status}`);
  const data = await response.json();
  console.log(`Subscriptions returned: ${Array.isArray(data) ? data.length : 'error'}`);
  console.log(`Data:`, data);

  // Test 2: Create a subscription
  console.log("\n2️⃣  Testing CREATE subscription...");
  const createResponse = await fetch(`${BASE_URL}/subscriptions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${JWT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Netflix",
      category: "entertainment",
      amount: 15.99,
      frequency: "monthly",
      currency: "USD",
    }),
  });

  console.log(`Status: ${createResponse.status}`);
  const createData = await createResponse.json();
  console.log(`Response:`, createData);

  if (createResponse.ok) {
    // Test 3: Fetch subscriptions again
    console.log("\n3️⃣  Fetching subscriptions again...");
    const response2 = await fetch(`${BASE_URL}/subscriptions`, {
      headers: {
        "Authorization": `Bearer ${JWT_TOKEN}`,
      },
    });

    console.log(`Status: ${response2.status}`);
    const data2 = await response2.json();
    console.log(`Subscriptions now: ${Array.isArray(data2) ? data2.length : 'error'}`);
  }
}

test().catch(err => console.error('Error:', err));
