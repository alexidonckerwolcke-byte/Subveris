import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Create admin client for auth operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function backfillOwners() {
  try {
    console.log('Fetching family groups without owner members...');

    // Get all family groups
    const { data: groups, error: groupsError } = await supabase
      .from('family_groups')
      .select('*');

    if (groupsError) {
      console.error('Error fetching groups:', groupsError);
      return;
    }

    if (!groups || groups.length === 0) {
      console.log('No family groups found.');
      return;
    }

    console.log(`Found ${groups.length} family groups. Checking for missing owner members...`);

    for (const group of groups) {
      console.log(`Checking group: ${group.name} (owner: ${group.owner_id})`);

      // Get all members for this group
      const { data: allMembers, error: allMembersError } = await supabase
        .from('family_group_members')
        .select('*')
        .eq('family_group_id', group.id);

      if (allMembersError) {
        console.error(`Error fetching members for group ${group.id}:`, allMembersError);
        continue;
      }

      console.log(`Group ${group.name} has ${allMembers?.length || 0} members:`);
      allMembers?.forEach(member => {
        console.log(`  - ${member.user_id} (${member.role}) - ${member.email || 'no email'}`);
      });

      // Check if owner is already in members table with any role
      const ownerMember = allMembers?.find(m => m.user_id === group.owner_id);

      if (ownerMember) {
        console.log(`Owner ${group.owner_id} already exists with role: ${ownerMember.role}`);
        if (ownerMember.role !== 'owner') {
          console.log(`Updating owner role to 'owner'...`);
          const { error: updateError } = await supabase
            .from('family_group_members')
            .update({ role: 'owner' })
            .eq('id', ownerMember.id);

          if (updateError) {
            console.error(`Failed to update owner role:`, updateError);
          } else {
            console.log(`Successfully updated owner role to 'owner'`);
          }
        }
        continue;
      }

      console.log(`Adding owner member for group: ${group.name} (${group.owner_id})`);

      // Get owner email
      let ownerEmail: string | null = null;
      try {
        // Try admin API first
        if (supabaseAdmin.auth && supabaseAdmin.auth.admin) {
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUser(group.owner_id);
          if (!userError && userData.user) {
            ownerEmail = userData.user.email;
          }
        }

        // Fallback to HTTP API
        if (!ownerEmail) {
          const supabaseUrl = process.env.SUPABASE_URL!;
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

          const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${group.owner_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${serviceKey}`,
              'apikey': serviceKey,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            ownerEmail = userData.email;
          }
        }
      } catch (err) {
        console.error(`Error fetching email for owner ${group.owner_id}:`, err);
      }

      // Add owner to members table
      const { error: insertError } = await supabase
        .from('family_group_members')
        .insert({
          family_group_id: group.id,
          user_id: group.owner_id,
          role: 'owner',
          email: ownerEmail,
        });

      if (insertError) {
        console.error(`Failed to add owner to group ${group.name}:`, insertError);
      } else {
        console.log(`Successfully added owner to group: ${group.name}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('Backfill complete!');

  } catch (err) {
    console.error('Error:', err);
  }
}

backfillOwners();