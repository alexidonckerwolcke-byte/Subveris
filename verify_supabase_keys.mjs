import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
console.log('SUPABASE_URL=', url);
console.log('serviceKey present=', !!serviceKey);
console.log('anonKey present=', !!anonKey);
const serviceClient = createClient(url, serviceKey);
const anonClient = createClient(url, anonKey);
const [serviceSubs, anonSubs] = await Promise.all([
  serviceClient.from('subscriptions').select('id,user_id,name,status').limit(1),
  anonClient.from('subscriptions').select('id,user_id,name,status').limit(1)
]);
console.log('serviceResult=', { error: serviceSubs.error, data: serviceSubs.data });
console.log('anonResult=', { error: anonSubs.error, data: anonSubs.data });
