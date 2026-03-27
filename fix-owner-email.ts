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

async function fixOwnerEmail() {
  try {
    const ownerUserId = '3c2085b7-de19-456a-8055-ffb22dd9cbb2'; // The owner
    const expectedEmail = 'alexi.donckerwolcke@gmail.com'; // The user's email

    console.log(`Updating owner ${ownerUserId} with email ${expectedEmail}`);

    // Update the owner's email in the family_group_members table
    const { error } = await supabase
      .from('family_group_members')
      .update({ email: expectedEmail })
      .eq('user_id', ownerUserId)
      .eq('role', 'owner');

    if (error) {
      console.error('Error updating owner email:', error);
      return;
    }

    console.log('Owner email updated successfully!');

  } catch (err) {
    console.error('Error:', err);
  }
}

fixOwnerEmail();