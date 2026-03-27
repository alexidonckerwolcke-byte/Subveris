import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration - adjust thresholds to taste
const DAYS_TO_CANCEL = 60; // if unused for this many days, move to 'to-cancel'

function daysSince(dateString?: string | null) {
  if (!dateString) return Infinity;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return Infinity;
  const diff = Date.now() - d.getTime();
  return diff / (1000 * 60 * 60 * 24);
}

async function run() {
  console.log('Starting subscription status reconciliation...');

  // Get current month in YYYY-MM format
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('*');

  if (error) {
    console.error('Failed to fetch subscriptions:', error);
    process.exit(1);
  }

  if (!subs || subs.length === 0) {
    console.log('No subscriptions found. Nothing to do.');
    return;
  }

  let updatedCount = 0;
  let noChange = 0;
  const changes: Array<{id: string, from: string, to: string}> = [];

  for (const s of subs) {
    const currentStatus = s.status as string;
    const monthlyUsageCount = (s.monthly_usage_count ?? 0) as number;
    const usageMonth = s.usage_month as string | null;
    const lastUsed = s.last_used_at as string | null | undefined;

    // Determine desired status
    let desiredStatus = currentStatus;

    if (currentStatus === 'active') {
      // For active subscriptions, check if they have zero monthly usage for current month
      if (usageMonth === currentMonth && monthlyUsageCount === 0) {
        desiredStatus = 'unused';
      }
      // If usageMonth is not current month or usage > 0, keep as active
    } else if (currentStatus === 'unused') {
      // Check if unused subscriptions should move to to-cancel
      const days = daysSince(lastUsed);
      if (days >= DAYS_TO_CANCEL) {
        desiredStatus = 'to-cancel';
      }
    }
    // Other statuses (to-cancel, deleted) remain unchanged by this script

    if (desiredStatus !== currentStatus) {
      const { data: updated, error: upErr } = await supabase
        .from('subscriptions')
        .update({ status: desiredStatus })
        .eq('id', s.id)
        .select()
        .single();

      if (upErr) {
        console.error(`Failed to update subscription ${s.id} (${s.name}):`, upErr);
        continue;
      }

      updatedCount++;
      changes.push({ id: s.id, from: currentStatus, to: desiredStatus });
    } else {
      noChange++;
    }
  }

  console.log(`Reconciliation complete. Updated ${updatedCount} subscription(s). ${noChange} unchanged.`);
  if (changes.length > 0) {
    console.table(changes);
  }
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
