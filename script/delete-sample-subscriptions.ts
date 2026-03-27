import { supabase } from '../server/supabase';

async function run() {
  try {
    console.log('Searching for sample subscriptions...');
    // Find matching subscriptions
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, name')
      .or("name.ilike.%test%", { head: true });

    if (error) {
      console.error('Error querying subscriptions:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('No sample subscriptions found matching %test%');
      return;
    }

    console.log(`Found ${data.length} subscription(s):`, data.map(d => d.name));

    const ids = data.map(d => d.id).filter(Boolean);
    if (ids.length === 0) {
      console.log('No valid ids to delete');
      return;
    }

    const { error: delErr } = await supabase
      .from('subscriptions')
      .delete()
      .in('id', ids);

    if (delErr) {
      console.error('Failed to delete sample subscriptions:', delErr);
      process.exit(1);
    }

    console.log('Deleted sample subscriptions:', ids);
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  }
}

run();
