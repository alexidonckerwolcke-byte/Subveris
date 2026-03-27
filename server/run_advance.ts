import { autoAdvanceRenewalDates } from './renewal-manager';

(async function main(){
  const userId = process.env.TEST_USER_ID || '3c2085b7-de19-456a-8055-ffb22dd9cbb2';
  console.log('[run_advance] Running autoAdvanceRenewalDates for user:', userId);
  try{
    await autoAdvanceRenewalDates(userId);
    console.log('[run_advance] Completed');
    process.exit(0);
  }catch(err){
    console.error('[run_advance] Error:', err);
    process.exit(1);
  }
})();
