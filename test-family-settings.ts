import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testFamilySettings() {
  try {
    // Get family groups first
    console.log('[TEST] Fetching family groups...');
    const { data: groups } = await supabase
      .from('family_groups')
      .select('*')
      .limit(1);

    if (!groups || groups.length === 0) {
      console.error('[TEST] No family groups found');
      return;
    }

    const groupId = groups[0].id;
    console.log('[TEST] Found group:', groupId);

    // Check if family_group_settings table exists
    console.log('[TEST] Checking family_group_settings table...');
    const { data: settings, error: settingsError } = await supabase
      .from('family_group_settings')
      .select('*')
      .eq('family_group_id', groupId)
      .single();

    if (settingsError) {
      console.error('[TEST] Settings query error:', settingsError);
      
      // Maybe the table doesn't exist, let's try to create it
      if (settingsError.code === 'PGRST116' || settingsError.code === 'INVALID_REQUEST') {
        console.log('[TEST] Might need to create settings table. Trying to insert default settings...');
        const { data: created, error: insertError } = await supabase
          .from('family_group_settings')
          .insert({
            id: groups[0].owner_id + '-' + Date.now(),
            family_group_id: groupId,
            owner_id: groups[0].owner_id,
            show_family_data: false,
          })
          .select()
          .single();

        if (insertError) {
          console.error('[TEST] Failed to create settings:', insertError);
        } else {
          console.log('[TEST] ✅ Created default settings:', created);
        }
      }
    } else {
      console.log('[TEST] ✅ Found settings:', settings);
    }
  } catch (error) {
    console.error('[TEST] Error:', error);
  }
}

testFamilySettings();
