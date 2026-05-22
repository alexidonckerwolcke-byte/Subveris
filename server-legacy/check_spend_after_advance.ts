import 'dotenv/config';
import { getSupabaseClient } from './supabase';

function parseDateLocal(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    dt.setHours(0,0,0,0);
    return dt;
  }
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0,0,0,0);
  return parsed;
}

function calculateMonthlyCost(amount: number, frequency: string) {
  if (!amount || isNaN(amount)) return 0;
  switch ((frequency || 'monthly').toLowerCase()) {
    case 'yearly': return amount / 12;
    case 'quarterly': return amount / 3;
    case 'weekly': return amount * 4;
    default: return amount;
  }
}

function formatDateLocalStr(d?: string | null) {
  if (!d) return 'null';
  return d;
}

(async function main(){
  const userId = process.env.TEST_USER_ID || '3c2085b7-de19-456a-8055-ffb22dd9cbb2';
  console.log('[check_spend] user:', userId);
  const supabase = getSupabaseClient();
  const { data: subs, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId);
  if (error) {
    console.error('Supabase error:', error);
    process.exit(1);
  }
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let naive = 0;
  let billingAware = 0;

  for (const s of subs || []) {
    const monthly = calculateMonthlyCost(Number(s.amount) || 0, s.frequency);
    naive += monthly;
    const billingMonth = s.billing_month || s.billingMonth || null;
    const nextBilling = s.next_billing_at || s.nextBillingDate || s.next_billing_date || null;
    const nextBillingDate = parseDateLocal(nextBilling);
    const billedInMonth = (() => {
      // billing-aware logic mirroring routes.ts
      const target = `${monthStart.getFullYear()}-${String(monthStart.getMonth()+1).padStart(2,'0')}`;
      if (billingMonth === target) {
        if (!nextBillingDate) return false;
        if (nextBillingDate <= now) return true;
        if (`${nextBillingDate.getFullYear()}-${String(nextBillingDate.getMonth()+1).padStart(2,'0')}` !== target) return true;
        return false;
      }
      if (!nextBillingDate) return false;
      if (`${nextBillingDate.getFullYear()}-${String(nextBillingDate.getMonth()+1).padStart(2,'0')}` !== target) return false;
      return nextBillingDate <= now;
    })();
    if (billedInMonth) billingAware += monthly;

    console.log(`- ${s.name} id=${s.id} status=${s.status} amount=${s.amount} freq=${s.frequency} nextBilling=${formatDateLocalStr(nextBilling)} billing_month=${billingMonth} billedInMonth=${billedInMonth}`);
  }

  console.log('Naive total:', naive);
  console.log('Billing-aware total:', billingAware);
})();
