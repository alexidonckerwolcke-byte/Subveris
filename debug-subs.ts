import { getSupabaseClient } from './server-legacy/supabase.js';

// Test date parsing and comparison logic
function formatDateLocal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateLocal(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

async function debugSubscriptions() {
  const supabase = getSupabaseClient();
  
  // Get first user to test with
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError || !users || users.length === 0) {
    console.log('No users found');
    process.exit(1);
  }

  const userId = users[0].id;
  console.log(`Testing with user: ${userId}\n`);

  // Fetch subscriptions
  const { data: subs, error: subsError } = await supabase
    .from('subscriptions')
    .select('id, name, next_billing_at, next_billing_date, frequency, status')
    .eq('user_id', userId)
    .in('status', ['active', 'unused']);

  if (subsError) {
    console.log('Error:', subsError);
    process.exit(1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(`Today: ${formatDateLocal(today)}\n`);
  console.log(`Subscriptions (${subs?.length || 0}):`);
  
  if (subs && subs.length > 0) {
    subs.forEach((sub: any, idx: number) => {
      const billingStr = sub.next_billing_at || sub.next_billing_date;
      const billingDate = parseDateLocal(billingStr);
      
      console.log(`\n${idx + 1}. ${sub.name}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Frequency: ${sub.frequency}`);
      console.log(`   next_billing_at: ${sub.next_billing_at}`);
      console.log(`   next_billing_date: ${sub.next_billing_date}`);
      console.log(`   Using: ${billingStr}`);
      
      if (billingDate) {
        const isPast = billingDate < today;
        const daysOld = Math.floor((today.getTime() - billingDate.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   Parsed: ${formatDateLocal(billingDate)}`);
        console.log(`   Status: ${isPast ? `PAST (${daysOld} days old)` : 'FUTURE'}`);
      } else {
        console.log(`   Parsed: FAILED`);
      }
    });
  }

  console.log('\n');
  process.exit(0);
}

debugSubscriptions().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
