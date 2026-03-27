import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testEmailColumn() {
  try {
    console.log('Testing if email column exists by trying to insert a test record...');

    // Try to insert a record with email field
    const testGroupId = '1bcaaab5-d9b0-4c8f-a71e-21327eb1b8f4'; // From the API response
    const testUserId = 'test-user-id';
    const testEmail = 'test@example.com';

    const { data, error } = await supabase
      .from('family_group_members')
      .insert({
        family_group_id: testGroupId,
        user_id: testUserId,
        role: 'member',
        email: testEmail,
      })
      .select()
      .single();

    if (error) {
      console.log('Insert failed, likely because email column does not exist:');
      console.log('Error:', error.message);

      if (error.message.includes('email')) {
        console.log('Email column does not exist. Please apply this SQL in your Supabase dashboard:');
        console.log('ALTER TABLE family_group_members ADD COLUMN email TEXT;');
      }
      return;
    }

    console.log('Insert succeeded! Email column exists.');
    console.log('Inserted record:', data);

    // Clean up the test record
    await supabase
      .from('family_group_members')
      .delete()
      .eq('user_id', testUserId);

    console.log('Test record cleaned up.');

  } catch (err) {
    console.error('Error:', err);
  }
}

testEmailColumn();