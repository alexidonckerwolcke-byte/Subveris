import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDatabase() {
  console.log('Seeding Supabase database...');

  // Check if subscriptions table already has data
  const { data: existingSubscriptions } = await supabase
    .from('subscriptions')
    .select('id')
    .limit(1);

  if (existingSubscriptions && existingSubscriptions.length > 0) {
    console.log('Database already has data, skipping seed.');
    return;
  }

  // Seed subscriptions
  const subscriptions = [
    {
      id: randomUUID(),
      name: "Netflix",
      category: "streaming",
      amount: 15.99,
      currency: "USD",
      frequency: "monthly",
      next_billing_date: "2024-02-15",
      status: "active",
      usage_count: 12,
      last_used_at: "2024-01-28",
      logo_url: null,
      description: "Streaming service",
      is_detected: true,
    },
    {
      id: randomUUID(),
      name: "Spotify Premium",
      category: "streaming",
      amount: 10.99,
      currency: "USD",
      frequency: "monthly",
      next_billing_date: "2024-02-10",
      status: "active",
      usage_count: 25,
      last_used_at: "2024-01-29",
      logo_url: null,
      description: "Music streaming",
      is_detected: true,
    },
    {
      id: randomUUID(),
      name: "Adobe Creative Cloud",
      category: "software",
      amount: 54.99,
      currency: "USD",
      frequency: "monthly",
      next_billing_date: "2024-02-05",
      status: "active",
      usage_count: 3,
      last_used_at: "2024-01-15",
      logo_url: null,
      description: "Design software suite",
      is_detected: true,
    },
    {
      id: randomUUID(),
      name: "Planet Fitness",
      category: "fitness",
      amount: 24.99,
      currency: "USD",
      frequency: "monthly",
      next_billing_date: "2024-02-01",
      status: "unused",
      usage_count: 1,
      last_used_at: "2024-01-02",
      logo_url: null,
      description: "Gym membership",
      is_detected: true,
    },
    {
      id: randomUUID(),
      name: "Dropbox Plus",
      category: "cloud-storage",
      amount: 11.99,
      currency: "USD",
      frequency: "monthly",
      next_billing_date: "2024-02-20",
      status: "active",
      usage_count: 8,
      last_used_at: "2024-01-27",
      logo_url: null,
      description: "Cloud storage",
      is_detected: true,
    },
    {
      id: randomUUID(),
      name: "New York Times",
      category: "news",
      amount: 17.00,
      currency: "USD",
      frequency: "monthly",
      next_billing_date: "2024-02-08",
      status: "unused",
      usage_count: 2,
      last_used_at: "2024-01-10",
      logo_url: null,
      description: "News subscription",
      is_detected: true,
    },
    {
      id: randomUUID(),
      name: "Xbox Game Pass",
      category: "gaming",
      amount: 14.99,
      currency: "USD",
      frequency: "monthly",
      next_billing_date: "2024-02-12",
      status: "active",
      usage_count: 15,
      last_used_at: "2024-01-29",
      logo_url: null,
      description: "Gaming subscription",
      is_detected: true,
    },
    {
      id: randomUUID(),
      name: "LinkedIn Premium",
      category: "productivity",
      amount: 29.99,
      currency: "USD",
      frequency: "monthly",
      next_billing_date: "2024-02-18",
      status: "to-cancel",
      usage_count: 0,
      last_used_at: null,
      logo_url: null,
      description: "Professional networking",
      is_detected: true,
    },
  ];

  const { error: subError } = await supabase
    .from('subscriptions')
    .insert(subscriptions);

  if (subError) {
    console.error('Error seeding subscriptions:', subError.message);
  } else {
    console.log('Subscriptions seeded successfully');
  }

  // Seed bank connection
  const bankConnection = {
    id: randomUUID(),
    bank_name: "Chase Bank",
    account_type: "checking",
    last_sync: new Date().toISOString(),
    is_connected: true,
    account_mask: "4521",
  };

  const { error: bankError } = await supabase
    .from('bank_connections')
    .insert(bankConnection);

  if (bankError) {
    console.error('Error seeding bank connection:', bankError.message);
  } else {
    console.log('Bank connection seeded successfully');
  }

  // Seed insights
  const insights = [
    {
      id: randomUUID(),
      type: "savings",
      title: "Cancel unused gym membership",
      description: "You've only used Planet Fitness once this month. Consider cancelling to save $24.99/mo.",
      potential_savings: 24.99,
      subscription_id: null,
      priority: 1,
      is_read: false,
      created_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      type: "alternative",
      title: "Switch to Affinity Photo",
      description: "Affinity Photo offers similar features to Adobe Photoshop for a one-time payment of $69.99.",
      potential_savings: 54.99,
      subscription_id: null,
      priority: 2,
      is_read: false,
      created_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      type: "tip",
      title: "Bundle your streaming services",
      description: "Consider Disney+ Bundle to get Hulu and ESPN+ included, potentially saving on separate subscriptions.",
      potential_savings: 10.00,
      subscription_id: null,
      priority: 3,
      is_read: false,
      created_at: new Date().toISOString(),
    },
  ];

  const { error: insightError } = await supabase
    .from('insights')
    .insert(insights);

  if (insightError) {
    console.error('Error seeding insights:', insightError.message);
  } else {
    console.log('Insights seeded successfully');
  }

  console.log('Database seeding complete!');
}

seedDatabase().catch(console.error);
