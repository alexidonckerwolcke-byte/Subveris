import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function getTestUser() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email')
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  console.log('Test user:', data);
  return data;
}

getTestUser();