import { supabase } from "./server/supabase";

async function debugMetrics() {
  try {
    // Get the test user from the environment or database
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError || !users || users.length === 0) {
      console.log("No users found");
      return;
    }
    
    const testUser = users[0];
    console.log(`\nDebug Metrics for user: ${testUser.email}`);
    console.log(`User ID: ${testUser.id}\n`);
    
    // Get subscriptions directly from Supabase
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', testUser.id);
    
    if (subsError) {
      console.error("Error fetching subscriptions:", subsError);
      return;
    }
    
    console.log(`Found ${subs?.length || 0} subscriptions:`);
    subs?.forEach((sub: any) => {
      console.log(`  - ${sub.name}: $${sub.amount}/${sub.frequency} (status: ${sub.status})`);
    });
    
    // Calculate metrics manually
    if (subs && subs.length > 0) {
      function calculateMonthlyCost(amount: number, frequency: string): number {
        if (!amount || isNaN(amount)) return 0;
        switch (frequency) {
          case "monthly":
            return amount;
          case "yearly":
            return amount / 12;
          case "weekly":
            return amount * 52 / 12;
          case "daily":
            return amount * 365 / 12;
          default:
            return amount;
        }
      }
      
      const totalMonthlySpend = subs.reduce((sum: number, sub: any) => {
        const monthly = calculateMonthlyCost(sub.amount, sub.frequency);
        console.log(`  ${sub.name}: $${sub.amount}/${sub.frequency} = $${monthly.toFixed(2)}/month`);
        return sum + monthly;
      }, 0);
      
      const activeCount = subs.filter((s: any) => s.status === "active").length;
      const unusedCount = subs.filter((s: any) => s.status === "unused").length;
      const toCancelCount = subs.filter((s: any) => s.status === "to-cancel").length;
      
      const potentialSavings = subs
        .filter((s: any) => s.status === "unused" || s.status === "to-cancel")
        .reduce((sum: number, sub: any) => sum + calculateMonthlyCost(sub.amount, sub.frequency), 0);
      
      console.log(`\n=== CALCULATED METRICS ===`);
      console.log(`Total Monthly Spend: $${totalMonthlySpend.toFixed(2)}`);
      console.log(`Active Subscriptions: ${activeCount}`);
      console.log(`Unused Subscriptions: ${unusedCount}`);
      console.log(`To Cancel: ${toCancelCount}`);
      console.log(`Potential Savings: $${potentialSavings.toFixed(2)}`);
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

debugMetrics();
