import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://your-project.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDirectInsert() {
  try {
    console.log("Testing direct insert...");
    
    // Try a raw insert
    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        id: "test-id-" + Date.now(),
        user_id: "3c2085b7-de19-456a-8055-ffb22dd9cbb2",
        name: "Test Netflix",
        category: "streaming",
        amount: 15.99,
        currency: "USD",
        frequency: "monthly",
        next_billing_date: "2026-03-21",
        status: "active",
        usage_count: 0,
        is_detected: false,
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error:", error.message, error.code);
      return;
    }
    
    console.log("Success! Created subscription:", data);
  } catch (error) {
    console.error("Exception:", error);
  }
}

testDirectInsert();
