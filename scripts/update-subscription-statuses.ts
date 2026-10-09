import { createClient } from '@supabase/supabase-js';
import { getZonedMonthBounds, getZonedMonthKey, isValidTimeZone } from '../shared/month-boundary';

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

async function getAccountTimeZones(userIds: string[]): Promise<Map<string, string>> {
  const timeZones = new Map<string, string>();
  await Promise.all([...new Set(userIds.filter(Boolean))].map(async (userId) => {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      const configuredTimeZone = data?.user?.user_metadata?.timezone;
      timeZones.set(userId, !error && isValidTimeZone(configuredTimeZone) ? configuredTimeZone : 'UTC');
      if (error) console.warn(`Could not load timezone for account ${userId}; using UTC.`, error.message);
    } catch (error) {
      console.warn(`Could not load timezone for account ${userId}; using UTC.`, error);
      timeZones.set(userId, 'UTC');
    }
  }));
  return timeZones;
}

async function run() {
  const now = new Date();
  console.log('Starting subscription status reconciliation...');

  // Keep deleted rows through the month they were deleted so savings and
  // monthly reports can include them. Purge them on the next month boundary.
  const { data: deletableSubscriptions, error: deletedFetchError } = await supabase
    .from('subscriptions')
    .select('id, user_id, name, status, deleted_at')
    .or('status.eq.deleted,deleted_at.not.is.null');

  if (deletedFetchError) {
    console.error('Failed to find expired deleted subscriptions:', deletedFetchError);
    process.exit(1);
  }

  const deletionTimeZones = await getAccountTimeZones(
    (deletableSubscriptions || []).map((subscription) => String(subscription.user_id || '')),
  );

  const expiredDeletedIds = (deletableSubscriptions || [])
    .filter((subscription) => {
      if (subscription.status === 'deleted' && !subscription.deleted_at) return true;
      if (!subscription.deleted_at) return false;
      const deletedAt = new Date(subscription.deleted_at);
      if (Number.isNaN(deletedAt.getTime())) return false;
      const timeZone = deletionTimeZones.get(String(subscription.user_id || '')) || 'UTC';
      const { monthStart } = getZonedMonthBounds(now, timeZone);
      return deletedAt < monthStart;
    })
    .map((subscription) => subscription.id)
    .filter(Boolean);

  if (expiredDeletedIds.length > 0) {
    const { error: purgeError } = await supabase
      .from('subscriptions')
      .delete()
      .in('id', expiredDeletedIds);

    if (purgeError) {
      console.error('Failed to purge expired deleted subscriptions:', purgeError);
      process.exit(1);
    }

    console.log(`Purged ${expiredDeletedIds.length} subscription(s) from prior account-local months.`);
  }

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

  const subscriptionTimeZones = await getAccountTimeZones(
    subs.map((subscription) => String(subscription.user_id || '')),
  );

  let updatedCount = 0;
  let noChange = 0;
  const changes: Array<{id: string, from: string, to: string}> = [];

  for (const s of subs) {
    const currentStatus = s.status as string;
    const monthlyUsageCount = (s.monthly_usage_count ?? 0) as number;
    const usageMonth = s.usage_month as string | null;
    const lastUsed = s.last_used_at as string | null | undefined;
    const timeZone = subscriptionTimeZones.get(String(s.user_id || '')) || 'UTC';
    const currentMonth = getZonedMonthKey(now, timeZone);

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
