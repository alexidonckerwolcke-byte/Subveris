import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createFamilyGroupSettingsTable() {
  try {
    console.log('[SETUP] Creating family_group_settings table...');
    
    // Create the table
    const { error: createError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS family_group_settings (
          id VARCHAR(36) PRIMARY KEY,
          family_group_id VARCHAR(36) NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
          owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          show_family_data BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(family_group_id)
        );

        ALTER TABLE family_group_settings ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view their own family group settings" ON family_group_settings;
        CREATE POLICY "Users can view their own family group settings" ON family_group_settings
          FOR SELECT USING (owner_id = auth.uid());

        DROP POLICY IF EXISTS "Owners can update their family group settings" ON family_group_settings;
        CREATE POLICY "Owners can update their family group settings" ON family_group_settings
          FOR UPDATE USING (owner_id = auth.uid());

        DROP POLICY IF EXISTS "Owners can create family group settings" ON family_group_settings;
        CREATE POLICY "Owners can create family group settings" ON family_group_settings
          FOR INSERT WITH CHECK (owner_id = auth.uid());

        CREATE INDEX IF NOT EXISTS idx_family_group_settings_family_group_id ON family_group_settings(family_group_id);
        CREATE INDEX IF NOT EXISTS idx_family_group_settings_owner_id ON family_group_settings(owner_id);
      `
    });

    if (createError) {
      console.error('[SETUP] Error creating table:', createError);
    } else {
      console.log('[SETUP] ✅ Table created successfully');
    }
  } catch (error) {
    console.error('[SETUP] Error:', error);
    
    // If RPC doesn't work, try a different approach
    console.log('[SETUP] Trying alternative method...');
    
    // For now, let's just test if we can query the table
    const { data, error: queryError } = await supabase
      .from('family_group_settings')
      .select('*')
      .limit(1);
    
    if (queryError) {
      console.error('[SETUP] Table does not exist:', queryError.message);
      console.log('[SETUP] Please run the migration manually or contact support');
    } else {
      console.log('[SETUP] ✅ Table exists');
    }
  }
}

createFamilyGroupSettingsTable();
