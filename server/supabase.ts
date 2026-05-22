import * as legacy from '../server-legacy/supabase.ts';

export const getSupabaseClient = legacy.getSupabaseClient;
export const supabase = legacy.supabase;

export default legacy;