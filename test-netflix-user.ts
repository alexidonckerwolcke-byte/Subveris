import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function calculateMonthlyCost(amount: number, frequency: string): number {
  switch (frequency) {
    case "yearly":
      return amount / 12;
    case "quarterly":
      return amount / 3;
    case "weekly":
      return amount * 4;
    default:
      return amount;
  }
}

async function main() {
  const userId = 'd0e64211-7432-40ff-8db6-845e24982bdb';
  
  // Fetch all subscriptions for this user
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('Subscriptions for user:', userId);
  subscriptions?.forEach(s => {
    console.log(`- ${s.name} (status: ${s.status}, category: ${s.category}, amount: $${s.amount})`);
  });

  // Simulate recommendation logic
  const recommendations: any[] = [];

  const adobeSub = subscriptions?.find(s => s.name.toLowerCase().includes("adobe"));
  if (adobeSub) {
    console.log('\n✓ Found Adobe subscription - adding alternative recommendation');
    recommendations.push({
      type: "alternative",
      title: "Switch from Adobe to Affinity",
    });
  } else {
    console.log('\n✗ No Adobe subscription found');
  }

  const unusedSubs = subscriptions?.filter(s => s.status === "unused") || [];
  if (unusedSubs.length > 0) {
    console.log(`✓ Found ${unusedSubs.length} unused subscription(s) - adding cancel recommendations`);
    unusedSubs.forEach(sub => {
      recommendations.push({
        type: "cancel",
        title: `Cancel ${sub.name}`,
      });
    });
  } else {
    console.log('✗ No unused subscriptions found');
  }

  const streamingSubs = subscriptions?.filter(s => s.category === "streaming" && s.status === "active") || [];
  const totalStreaming = streamingSubs.reduce((sum, s) => sum + calculateMonthlyCost(s.amount, s.frequency), 0);
  console.log(`\nStreaming subscriptions: ${streamingSubs.length} (total: $${totalStreaming.toFixed(2)})`);
  
  if (streamingSubs.length > 1) {
    if (totalStreaming > 25) {
      console.log('✓ Multiple streaming subs over $25/month - adding rotate recommendation');
      recommendations.push({
        type: "negotiate",
        title: "Rotate streaming services",
      });
    } else {
      console.log('✗ Streaming total is under $25/month');
    }
  } else {
    console.log('✗ Less than 2 streaming subscriptions');
  }

  console.log(`\nTotal recommendations that would be generated: ${recommendations.length}`);
  console.log('Recommendations:');
  recommendations.forEach(r => console.log(`- ${r.title}`));
}

main();
