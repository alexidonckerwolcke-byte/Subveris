import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xuilgccacufwinvkocfl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk3Njg5NiwiZXhwIjoyMDgxNTUyODk2fQ.34j0sSX9lWR5ujGFfXusv_zMt1VnFbzR59JZSdg1gKA'
);

async function main() {
  try {
    console.log('🗑️  Deleting ALL data from ALL tables...\n');

    // Delete all insights from all users
    console.log('Deleting insights...');
    const { data: insights } = await supabase.from('insights').select('id');
    if (insights && insights.length > 0) {
      for (const i of insights) {
        await supabase.from('insights').delete().eq('id', i.id);
      }
      console.log(`✅ Deleted ${insights.length} insights`);
    }

    // Delete all subscriptions from all users
    console.log('Deleting subscriptions...');
    const { data: subs } = await supabase.from('subscriptions').select('id');
    if (subs && subs.length > 0) {
      for (const s of subs) {
        await supabase.from('subscriptions').delete().eq('id', s.id);
      }
      console.log(`✅ Deleted ${subs.length} subscriptions`);
    }

    // Delete all transactions from all users
    console.log('Deleting transactions...');
    const { data: trans } = await supabase.from('transactions').select('id');
    if (trans && trans.length > 0) {
      for (const t of trans) {
        await supabase.from('transactions').delete().eq('id', t.id);
      }
      console.log(`✅ Deleted ${trans.length} transactions`);
    }

    // Delete all bank connections from all users
    console.log('Deleting bank connections...');
    const { data: banks } = await supabase.from('bank_connections').select('id');
    if (banks && banks.length > 0) {
      for (const b of banks) {
        await supabase.from('bank_connections').delete().eq('id', b.id);
      }
      console.log(`✅ Deleted ${banks.length} bank connections`);
    }

    console.log('\n🎉 All data from all users has been removed!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
