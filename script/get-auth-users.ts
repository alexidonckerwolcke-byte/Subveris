import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function getAuthUsers() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error fetching auth users:', error);
    return null;
  }
  console.log('Auth users:', data.users.length);
  if (data.users.length > 0) {
    console.log('First user:', data.users[0]);
  }
  return data.users;
}

getAuthUsers();