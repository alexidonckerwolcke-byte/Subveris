import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const databaseUrl = process.env.DATABASE_URL!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsage() {
  try {
    // Get the user
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById('3c2085b7-de19-456a-8055-ffb22dd9cbb2');
    
    if (userError) {
      console.log('Error getting user:', userError);
      return;
    }

    const userId = userData.user?.id;
    console.log('User ID:', userId);

    // Get subscriptions - try to select websiteDomain
    const { data: subs, error: subError } = await supabase
      .from('subscriptions')
      .select('id, name, status, usage_count, website_domain')
      .eq('user_id', userId);

    if (subError) {
      console.log('Error getting subscriptions:', subError);
      // Try without monthly columns
      const { data: subs2, error: subError2 } = await supabase
        .from('subscriptions')
        .select('id, name, status, usage_count')
        .eq('user_id', userId);
      
      if (subError2) {
        console.log('Error getting basic subscriptions:', subError2);
        return;
      }
      
      console.log('Subscriptions (basic):');
      subs2?.forEach((sub: any) => {
        console.log(`- ${sub.name}: status=${sub.status}, usage_count=${sub.usage_count}`);
      });
      return;
    }

    console.log('Subscriptions:');
    subs?.forEach((sub: any) => {
      console.log(`- ${sub.name}: status=${sub.status}, usage_count=${sub.usage_count}, website_domain=${sub.website_domain}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

async function backfillMonthlyUsage() {
  try {
    console.log('Backfilling monthly usage data...');
    
    // Update all subscriptions to set monthly_usage_count = 0 and usage_month = null
    // This ensures fresh start for monthly tracking
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ 
        monthly_usage_count: 0,
        usage_month: null 
      })
      .neq('id', ''); // Update all rows

    if (error) {
      console.log('Error backfilling:', error);
      return;
    }

    console.log('Backfill completed successfully');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function applyMigration() {
  const client = new Client({ connectionString: databaseUrl });
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    
    console.log('Applying monthly usage migration...');
    
    // Run the migration SQL
    await client.query(`
      ALTER TABLE subscriptions 
      ADD COLUMN IF NOT EXISTS monthly_usage_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS usage_month TEXT;
    `);

    console.log('Migration applied successfully');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkUsage();
// applyMigration();

async function updateWebsiteDomains() {
  try {
    console.log('Updating website domains for subscriptions...');
    
    // Get the user
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById('3c2085b7-de19-456a-8055-ffb22dd9cbb2');
    
    if (userError) {
      console.log('Error getting user:', userError);
      return;
    }

    const userId = userData.user?.id;
    
    // Update Netflix subscription
    const { error: netflixError } = await supabase
      .from('subscriptions')
      .update({ website_domain: 'netflix.com' })
      .eq('name', 'Netflix')
      .eq('user_id', userId);

    if (netflixError) {
      console.log('Error updating Netflix:', netflixError);
    } else {
      console.log('Updated Netflix website domain');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// updateWebsiteDomains();

async function testCostPerUseAPI() {
  try {
    console.log('Testing cost per use API...');
    
    // Get auth token from localStorage format
    const tokenData = '{"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzY4OTYsImV4cCI6MjA4MTU1Mjg5Nn0.f0xa0hY6VDht7Qeqfbc0UaKpZLzCB43CXwOlfxDJ93M","refresh_token":""}';
    const parsed = JSON.parse(tokenData);
    const token = parsed.access_token;

    const response = await fetch('http://localhost:5000/api/analysis/cost-per-use', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('API Error:', response.status, response.statusText);
      const text = await response.text();
      console.log('Response:', text);
      return;
    }

    const data = await response.json();
    console.log('Cost per use data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCostPerUseAPI();

async function reactivateSubscription() {
  try {
    console.log('Reactivating Netflix subscription...');
    
    // Get the user
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById('3c2085b7-de19-456a-8055-ffb22dd9cbb2');
    
    if (userError) {
      console.log('Error getting user:', userError);
      return;
    }

    const userId = userData.user?.id;
    
    // Update Netflix subscription to active
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('name', 'Netflix')
      .eq('user_id', userId);

    if (updateError) {
      console.log('Error updating Netflix:', updateError);
    } else {
      console.log('Reactivated Netflix subscription');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

reactivateSubscription();
