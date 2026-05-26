import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xuilgccacufwinvkocfl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk3Njg5NiwiZXhwIjoyMDgxNTUyODk2fQ.34j0sSX9lWR5ujGFfXusv_zMt1VnFbzR59JZSdg1gKA'
);

async function main() {
  // Create a test user
  const email = 'test@example.com';
  const password = 'TestPassword123!';
  
  try {
    // First check if user exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users?.find(u => u.email === email);
    
    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      console.log('Email:', existingUser.email);
    } else {
      // Create new user
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      
      if (error) {
        console.error('Error creating user:', error);
      } else {
        console.log('User created successfully!');
        console.log('ID:', data.user?.id);
        console.log('Email:', data.user?.email);
        console.log('Password:', password);
        
        // Add subscriptions for this user
        const { v4: uuidv4 } = await import('uuid');
        
        const subscriptions = [
          { name: 'Netflix', category: 'streaming', amount: 15.99, frequency: 'monthly' },
          { name: 'Spotify', category: 'streaming', amount: 10.99, frequency: 'monthly' },
          { name: 'Disney+', category: 'streaming', amount: 7.99, frequency: 'monthly' },
          { name: 'Adobe Creative Cloud', category: 'software', amount: 54.99, frequency: 'monthly' },
          { name: 'GitHub Pro', category: 'software', amount: 4, frequency: 'monthly' },
          { name: 'AWS', category: 'cloud-storage', amount: 25.00, frequency: 'monthly' },
        ];

        console.log('\nAdding subscriptions...');
        for (const sub of subscriptions) {
          const { error: insertError } = await supabase.from('subscriptions').insert({
            id: uuidv4(),
            user_id: data.user?.id,
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
          if (insertError) {
            console.error(`Error adding ${sub.name}:`, insertError);
          } else {
            console.log(`✓ Added ${sub.name}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
