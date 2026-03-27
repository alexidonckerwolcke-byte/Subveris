import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xuilgccacufwinvkocfl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk3Njg5NiwiZXhwIjoyMDgxNTUyODk2fQ.34j0sSX9lWR5ujGFfXusv_zMt1VnFbzR59JZSdg1gKA'
);

async function main() {
  try {
    console.log('🗑️  Deleting all test data...\n');

    // Get all IDs first
    const { data: insights } = await supabase.from('insights').select('id');
    if (insights && insights.length > 0) {
      const ids = insights.map((i: any) => i.id);
      console.log(`Found ${ids.length} insights to delete`);
      
      for (const id of ids) {
        const { error } = await supabase.from('insights').delete().eq('id', id);
        if (error) {
          console.error(`Error deleting insight ${id}:`, error);
        }
      }
      console.log('✅ Deleted all insights');
    }

    // Delete all subscriptions
    const { data: subs } = await supabase.from('subscriptions').select('id');
    if (subs && subs.length > 0) {
      const ids = subs.map((s: any) => s.id);
      console.log(`Found ${ids.length} subscriptions to delete`);
      
      for (const id of ids) {
        const { error } = await supabase.from('subscriptions').delete().eq('id', id);
        if (error) {
          console.error(`Error deleting subscription ${id}:`, error);
        }
      }
      console.log('✅ Deleted all subscriptions');
    }

    // Delete all transactions
    const { data: trans } = await supabase.from('transactions').select('id');
    if (trans && trans.length > 0) {
      const ids = trans.map((t: any) => t.id);
      console.log(`Found ${ids.length} transactions to delete`);
      
      for (const id of ids) {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) {
          console.error(`Error deleting transaction ${id}:`, error);
        }
      }
      console.log('✅ Deleted all transactions');
    }

    // Delete all bank connections
    const { data: banks } = await supabase.from('bank_connections').select('id');
    if (banks && banks.length > 0) {
      const ids = banks.map((b: any) => b.id);
      console.log(`Found ${ids.length} bank connections to delete`);
      
      for (const id of ids) {
        const { error } = await supabase.from('bank_connections').delete().eq('id', id);
        if (error) {
          console.error(`Error deleting bank connection ${id}:`, error);
        }
      }
      console.log('✅ Deleted all bank connections');
    }

    console.log('\n🎉 All test data has been removed!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
