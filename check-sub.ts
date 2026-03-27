import { getSupabaseClient } from "./server/supabase.ts";

async function run() {
  const supabase = getSupabaseClient();
  const id = "b56f4d02-082f-48fe-875f-4c71adf96827";
  console.log("querying subscription", id);
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .single();
  console.log("result", { data, error });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});