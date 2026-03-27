import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

async function testExport() {
  try {
    console.log("[Test] Starting export data test...\n");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the current user
    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError || !userData.user) {
      console.error("[Test] ❌ Not authenticated");
      console.error("[Test] Error:", authError);
      return;
    }

    const userId = userData.user.id;
    const email = userData.user.email;
    console.log(`[Test] ✅ Using test user: ${email} (ID: ${userId})\n`);

    // Test the export endpoint
    console.log("[Test] Testing export endpoint...");

    const response = await fetch("http://localhost:5000/api/account/export", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`[Test] ❌ Export failed with status ${response.status}`);
      console.error("[Test] Response:", await response.text());
      return;
    }

    const contentType = response.headers.get("content-type");
    console.log(`[Test] ℹ️  Content-Type: ${contentType}`);
    console.log(`[Test] ℹ️  Content-Disposition: ${response.headers.get("content-disposition")}`);

    const data = await response.json();

    console.log("\n[Test] ✅ Export data retrieved successfully");
    console.log("[Test] Export structure:");
    console.log(`  - exportDate: ${data.exportDate}`);
    console.log(`  - subscriptions: ${Array.isArray(data.subscriptions) ? `${data.subscriptions.length} items` : "missing"}`);
    console.log(`  - transactions: ${Array.isArray(data.transactions) ? `${data.transactions.length} items` : "missing"}`);
    console.log(`  - insights: ${Array.isArray(data.insights) ? `${data.insights.length} items` : "missing"}`);

    if (data.subscriptions && data.subscriptions.length > 0) {
      console.log("\n[Test] Sample subscription:");
      console.log(JSON.stringify(data.subscriptions[0], null, 2));
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[Test] ✅ EXPORT TEST COMPLETED SUCCESSFULLY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("[Test] ❌ Error:", error);
  }
}

testExport();
