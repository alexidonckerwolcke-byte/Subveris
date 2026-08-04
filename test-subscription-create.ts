import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://your-project.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

const userId = process.env.TEST_USER_ID || "";

async function testSubscriptionCreation() {
  try {
    const token = process.env.TEST_SUPABASE_TOKEN || "";

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
