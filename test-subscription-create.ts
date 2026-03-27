import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xuilgccacufwinvkocfl.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDkwMjExODgsImV4cCI6MjAyNDU5NzE4OH0.L_Sj8EW9dYMVH3-55U9Vqgb9SzI-vJGLqn1K-bpmqb4";

const userId = "3c2085b7-de19-456a-8055-ffb22dd9cbb2";

async function testSubscriptionCreation() {
  try {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzQwMTM4MjY2LCJpYXQiOjE3NDAxMzQ2NjYsImlzcyI6Imh0dHBzOi8veHVpbGdjY2FjdWZ3aW52a29jZmwuc3VwYWJhc2UuY28vYXV0aCAiLCJzdWIiOiIzYzIwODViNy1kZTE5LTQ1NmEtODA1NS1mZmIyMmRkOWNiYjIiLCJlbWFpbCI6ImFsZXhpZG9uY2tlcndsb2Nra2VAdGVzdC5jb20iLCJlbWFpbF9jb25maXJtZWQiOmZhbHNlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwyIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc0MDEzNDY2Nn1dLCJzZXNzaW9uX2lkIjoiZTU4ZjdjNzctNTExNy00NWY5LTlkNDUtMDI0YWZlM2FhNWY5In0.kLvBzJPqNHZ8iFhz0bwT-82K17ZhN6Rq-eqZ1_x2lzI";

    const response = await fetch("http://localhost:5000/api/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: "Netflix",
        category: "streaming",
        amount: 15.99,
        frequency: "monthly",
        nextBillingDate: "2026-03-21",
      }),
    });

    const data = await response.json();
    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

testSubscriptionCreation();
