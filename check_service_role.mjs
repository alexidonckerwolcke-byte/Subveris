import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log({supabaseUrl, hasServiceKey: !!supabaseKey});
const supabase = createClient(supabaseUrl, supabaseKey);
const subsResult = await supabase.from('subscriptions').select('id,user_id,name,status').limit(3);
const authResult = await supabase.from('auth.users').select('id,email').limit(3);
console.log({ subsErr: subsResult.error, subs: subsResult.data, authErr: authResult.error, auth: authResult.data });
