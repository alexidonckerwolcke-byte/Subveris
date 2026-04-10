import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyze() {
  console.log('--- Analyzing Full Data Distribution ---');

  const tables = ['family_groups', 'user_subscriptions', 'family_group_members'];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
      continue;
    }

    const idField = table === 'family_groups' ? 'owner_id' : 'user_id';
    const distribution = data.reduce((acc: any, row: any) => {
      const id = row[idField];
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});

    console.log(`\nTable '${table}' Distribution (by ${idField}):`);
    console.log(JSON.stringify(distribution, null, 2));
    
    if (data.length > 0) {
      console.log(`Sample ${table} record:`, JSON.stringify(data[0], null, 2));
    }
  }
}

analyze();
