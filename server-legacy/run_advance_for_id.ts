import 'dotenv/config';
import { autoAdvanceRenewalDates } from './renewal-manager';

(async function main(){
  const argvId = process.argv[2];
  const userId = argvId || process.env.TEST_USER_ID || '3c2085b7-de19-456a-8055-ffb22dd9cbb2';
  console.log('[run_advance_for_id] Running autoAdvanceRenewalDates for user:', userId);
  try{
    await autoAdvanceRenewalDates(userId);
    console.log('[run_advance_for_id] Completed');
    process.exit(0);
  }catch(err){
    console.error('[run_advance_for_id] Error:', err);
    process.exit(1);
  }
})();
