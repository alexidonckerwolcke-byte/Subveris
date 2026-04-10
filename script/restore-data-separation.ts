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

async function restore() {
  console.log('--- Restoring Original Data Separation ---');

  // Map of original subscription IDs to their original user IDs (from previous logs)
  const originalAssignments = [
    { id: '4684f0de-a5a8-4773-b781-e17bfbaf979a', user_id: 'e069db05-fee9-4176-be92-67d0fae84382' },
    { id: '89691ba1-2731-4090-9a83-f8f1a367da14', user_id: '3c2085b7-de19-456a-8055-ffb22dd9cbb2' },
    { id: '4fbffb9d-d40a-44ab-8ee1-388c1a8b17ed', user_id: '3c2085b7-de19-456a-8055-ffb22dd9cbb2' },
    { id: 'da876d39-ace5-4378-81fa-e57781bd68e6', user_id: '3c2085b7-de19-456a-8055-ffb22dd9cbb2' },
    { id: '86394755-f489-4d70-9908-c1526beec643', user_id: '00000000-0000-0000-0000-000000000001' },
    { id: '3d408797-fdfb-4bb9-bbf6-15080f840a25', user_id: 'e069db05-fee9-4176-be92-67d0fae84382' }
  ];

  for (const assignment of originalAssignments) {
    const { error } = await supabase
      .from('subscriptions')
      .update({ user_id: assignment.user_id })
      .eq('id', assignment.id);
    
    if (error) {
      console.error(`Error restoring subscription ${assignment.id}:`, error.message);
    } else {
      console.log(`Restored subscription ${assignment.id} to user ${assignment.user_id}`);
    }
  }

  console.log('--- Restoration Complete ---');
}

restore();
