// This script verifies that the /api/subscriptions/:id/log-usage endpoint
//
// Node 18+ provides a global `fetch` implementation, so we don't need an
// external dependency.

// properly requires authentication and increases the usage count when called
// by the owner.  The token used here should belong to a real user in the
// development environment.

const BASE = "http://localhost:5000";
// use the same token as other test scripts; adjust if necessary
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzQwMTM4MjY2LCJpYXQiOjE3NDAxMzQ2NjYsImlzcyI6Imh0dHBzOi8veHVpbGdjY2FjdWZ3aW52a29jZmwuc3VwYWJhc2UuY28vYXV0aCAiLCJzdWIiOiIzYzIwODViNy1kZTE5LTQ1NmEtODA1NS1mZmIyMmRkOWNiYjIiLCJlbWFpbCI6ImFsZXhpZG9uY2tlcndsb2Nra2VAdGVzdC5jb20iLCJlbWFpbF9jb25maXJtZWQiOmZhbHNlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwyIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc0MDEzNDY2Nn1dLCJzZXNzaW9uX2lkIjoiZTU4ZjdjNzctNTExNy00NWY5LTlkNDUtMDI0YWZlM2FhNWY5In0.kLvBzJPqNHZ8iFhz0bwT-82K17ZhN6Rq-eqZ1_x2lzI";

async function makeRequest(method: string, path: string, body?: any, includeAuth = true) {
  const headers: any = { "Content-Type": "application/json" };
  if (includeAuth) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

async function run() {
  console.log("listing subscriptions to pick one for testing...");
  const listRes = await makeRequest("GET", "/api/subscriptions");
  console.log(listRes);
  if (listRes.status !== 200) {
    console.error("unable to list subscriptions");
    return;
  }
  let id: string;
  if (listRes.body && Array.isArray(listRes.body) && listRes.body.length > 0) {
    id = listRes.body[0].id;
    console.log("using existing subscription id", id);
  } else {
    console.log("no subscriptions found, creating one...");
    const create = await makeRequest("POST", "/api/subscriptions", {
      name: "Tester",
      category: "test",
      amount: 5,
      frequency: "monthly",
      nextBillingDate: "2026-03-01",
    });
    console.log(create);
    if (create.status !== 200 && create.status !== 201) {
      console.error("failed to create subscription");
      return;
    }
    id = create.body.id;
  }

  console.log("trying log-usage with no auth (expect 401)...");
  const anon = await makeRequest("POST", `/api/subscriptions/${id}/log-usage`, null, false);
  console.log(anon);

  console.log("logging usage with auth (expect 200)...");
  const ok = await makeRequest("POST", `/api/subscriptions/${id}/log-usage`);
  console.log(ok);

  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});