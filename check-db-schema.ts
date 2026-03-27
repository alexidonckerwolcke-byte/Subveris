import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xuilgccacufwinvkocfl.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwOTAyMTE4OCwiZXhwIjoyMDI0NTk3MTg4fQ.E-SvgBH8SU-nqPaLKi7jZROiMDM8Kgzp-JdQIBPKl5E";

async function testSchema() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Try to fetch just one subscription to see the actual columns
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .limit(1);
    
    if (error) {
      console.error("Error fetching subscriptions:", error);
      return;
    }
    
    console.log("Sample subscription:", JSON.stringify(data[0] || {}, null, 2));
    if (data && data[0]) {
      console.log("\nAvailable columns:");
      Object.keys(data[0]).forEach(key => console.log(`  - ${key}`));
    } else {
      console.log("No subscriptions found - can't infer schema");
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

testSchema();
