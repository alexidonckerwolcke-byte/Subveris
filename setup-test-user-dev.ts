import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  'https://xuilgccacufwinvkocfl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk3Njg5NiwiZXhwIjoyMDgxNTUyODk2fQ.34j0sSX9lWR5ujGFfXusv_zMt1VnFbzR59JZSdg1gKA'
);

async function main() {
  console.log('Getting users...');
  
  // Get all users
  const { data: { users } } = await supabase.auth.admin.listUsers();
  console.log('Available users:');
  users?.forEach(u => console.log(`  - ${u.email} (${u.id})`));
  
  // Use the first user
  const user = users?.[0];
  
  if (!user) {
    console.error('No users found in Supabase');
    return;
  }
  
  const userId = user.id;
  const email = user.email!;
  
  console.log('Using user:', userId, email);

  // Delete existing subscriptions for clean state
  console.log('Cleaning up old subscriptions...');
  await supabase.from('subscriptions').delete().eq('user_id', userId);

  // Create test subscriptions
  console.log('Creating test subscriptions...');
  const subscriptions = [
    { name: 'Netflix', category: 'streaming', amount: 15.99, frequency: 'monthly' },
    { name: 'Spotify', category: 'streaming', amount: 10.99, frequency: 'monthly' },
    { name: 'Disney+', category: 'streaming', amount: 7.99, frequency: 'monthly' },
    { name: 'Adobe Creative Cloud', category: 'software', amount: 54.99, frequency: 'monthly' },
    { name: 'GitHub Pro', category: 'software', amount: 4, frequency: 'monthly' },
    { name: 'AWS', category: 'cloud-storage', amount: 25.00, frequency: 'monthly' },
  ];

  for (const sub of subscriptions) {
    const { error } = await supabase.from('subscriptions').insert({
      id: uuidv4(),
      user_id: userId,
      name: sub.name,
      category: sub.category,
      amount: sub.amount,
      currency: 'USD',
      frequency: sub.frequency,
      status: 'active',
      next_billing_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      usage_count: 10,
      last_used_at: new Date().toISOString(),
      is_detected: true,
    });
    if (error) {
      console.error(`Error creating ${sub.name}:`, error);
    } else {
      console.log(`✓ Created ${sub.name}`);
    }
  }

  console.log('Test data setup complete!');
  console.log('Email:', email);
}

main().catch(console.error);
