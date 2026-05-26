import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Users:', users?.users.length);
    users?.users.forEach(u => {
      console.log(`- ${u.id}: ${u.email}`);
    });
  }
}

main();
