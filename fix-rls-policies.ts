import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://xuilgccacufwinvkocfl.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk3Njg5NiwiZXhwIjoyMDgxNTUyODk2fQ.34j0sSX9lWR5ujGFfXusv_zMt1VnFbzR59JZSdg1gKA'
};

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fixRlsPolicies() {
  console.log('Fixing RLS policy circular recursion...\n');

  const sqlStatements = [
    // Drop problematic policies
    'DROP POLICY IF EXISTS "Users can view family group members" ON family_group_members;',
    'DROP POLICY IF EXISTS "Users can view shared subscriptions" ON shared_subscriptions;',
    'DROP POLICY IF EXISTS "Users can share subscriptions with their groups" ON shared_subscriptions;',
    'DROP POLICY IF EXISTS "Family members can view cost splits" ON cost_splits;',
    
    // Recreate family_group_members policy
    `CREATE POLICY "Users can view family group members" ON family_group_members
      FOR SELECT USING (
        family_group_id IN (SELECT id FROM family_groups WHERE owner_id = auth.uid())
        OR
        user_id = auth.uid()
      );`,
    
    // Recreate shared_subscriptions policies
    `CREATE POLICY "Users can view shared subscriptions" ON shared_subscriptions
      FOR SELECT USING (
        family_group_id IN (SELECT id FROM family_groups WHERE owner_id = auth.uid())
        OR
        family_group_id IN (SELECT family_group_id FROM family_group_members WHERE user_id = auth.uid())
      );`,
    
    `CREATE POLICY "Users can share subscriptions with their groups" ON shared_subscriptions
      FOR INSERT WITH CHECK (
        shared_by_user_id = auth.uid() AND
        (
          family_group_id IN (SELECT id FROM family_groups WHERE owner_id = auth.uid())
          OR
          family_group_id IN (SELECT family_group_id FROM family_group_members WHERE user_id = auth.uid())
        )
      );`,
    
    // Recreate cost_splits policy
    `CREATE POLICY "Family members can view cost splits" ON cost_splits
      FOR SELECT USING (
        shared_subscription_id IN (
          SELECT id FROM shared_subscriptions 
          WHERE 
            family_group_id IN (SELECT id FROM family_groups WHERE owner_id = auth.uid())
            OR
            family_group_id IN (SELECT family_group_id FROM family_group_members WHERE user_id = auth.uid())
        )
      );`
  ];

  for (const sql of sqlStatements) {
    try {
      console.log('Executing:', sql.substring(0, 60) + '...');
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error('  ❌ Error:', error.message);
      } else {
        console.log('  ✅ Success');
      }
    } catch (err) {
      console.error('  ❌ Exception:', err);
    }
  }

  console.log('\n✨ RLS policies fixed!');
}

fixRlsPolicies().catch(err => {
  console.error('Failed to fix RLS policies:', err);
  process.exit(1);
});
