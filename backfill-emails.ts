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

async function backfillEmails() {
  try {
    console.log('Fetching family members without emails...');

    // Get all family members where email is null
    const { data: members, error } = await supabase
      .from('family_group_members')
      .select('*')
      .is('email', null);

    if (error) {
      console.error('Error fetching members:', error);
      return;
    }

    if (!members || members.length === 0) {
      console.log('No members found without emails.');
      return;
    }

    console.log(`Found ${members.length} members without emails. Backfilling...`);

    for (const member of members) {
      try {
        console.log(`Processing member: ${member.user_id}`);

        let memberEmail: string | null = null;

        // Try admin API first
        try {
          if (supabaseAdmin.auth && supabaseAdmin.auth.admin) {
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUser(member.user_id);
            if (!userError && userData.user) {
              memberEmail = userData.user.email;
            }
          }
        } catch (err) {
          console.log(`Admin API failed for ${member.user_id}, trying HTTP API...`);
        }

        // Fallback to HTTP API
        if (!memberEmail) {
          const supabaseUrl = process.env.SUPABASE_URL!;
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

          const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${member.user_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${serviceKey}`,
              'apikey': serviceKey,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            memberEmail = userData.email;
          }
        }

        if (memberEmail) {
          // Update the member with the email
          const { error: updateError } = await supabase
            .from('family_group_members')
            .update({ email: memberEmail })
            .eq('id', member.id);

          if (updateError) {
            console.error(`Failed to update member ${member.user_id}:`, updateError);
          } else {
            console.log(`Updated ${member.user_id} with email: ${memberEmail}`);
          }
        } else {
          console.log(`Could not find email for user ${member.user_id}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        console.error(`Error processing member ${member.user_id}:`, err);
      }
    }

    console.log('Backfill complete!');

  } catch (err) {
    console.error('Error:', err);
  }
}

backfillEmails();