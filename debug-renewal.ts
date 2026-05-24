import { getSupabaseClient } from './server/supabase.js';

async function debugRenewal() {
  const supabase = getSupabaseClient();

  // Helper to format a Date as YYYY-MM-DD using its local year/month/day (avoid toISOString timezone shifts)
  function formatDateLocal(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Parse a date string as a local date (YYYY-MM-DD or ISO). This avoids
  // timezone shifts when creating Date objects from date-only strings.
  function parseDateLocal(dateStr?: string | null): Date | null {
    if (!dateStr) return null;
    console.log(`[DEBUG] parseDateLocal called with: "${dateStr}" (type: ${typeof dateStr})`);
    const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      const dt = new Date(y, mo, d);
      dt.setHours(0, 0, 0, 0);
      console.log(`[DEBUG]   Parsed as: ${formatDateLocal(dt)} (Date object: ${dt.toString()})`);
      return dt;
    }
    // Fallback: try standard Date parsing then clamp to local midnight
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) {
      console.log(`[DEBUG]   Failed to parse`);
      return null;
    }
    parsed.setHours(0, 0, 0, 0);
    console.log(`[DEBUG]   Fallback parsed as: ${formatDateLocal(parsed)}`);
    return parsed;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log(`\n[DEBUG] Today is: ${formatDateLocal(today)}`);

  // Get subscriptions for a specific user - you'll need to replace this with your user ID
  const userId = process.argv[2];
  if (!userId) {
    console.error('Please provide user ID as argument: npx ts-node debug-renewal.ts <user-id>');
    process.exit(1);
  }

  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select("id, name, next_billing_at, frequency, status")
    .eq("user_id", userId)
    .in("status", ["active", "unused"]);

  if (error) {
    console.error("[DEBUG] Error fetching subscriptions:", error);
    process.exit(1);
  }

  console.log(`\n[DEBUG] Found ${subscriptions?.length || 0} subscriptions:\n`);

  if (subscriptions) {
    subscriptions.forEach((sub: any) => {
      console.log(`  Name: ${sub.name}`);
      console.log(`  Status: ${sub.status}`);
      console.log(`  Frequency: ${sub.frequency}`);
      console.log(`  Raw next_billing_at: ${sub.next_billing_at} (type: ${typeof sub.next_billing_at})`);
      const parsed = parseDateLocal(sub.next_billing_at);
      if (parsed) {
        const isPast = parsed < today;
        const daysOld = Math.floor((today.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`  Parsed: ${formatDateLocal(parsed)} - ${isPast ? `PAST (${daysOld} days old)` : 'FUTURE'}`);
      } else {
        console.log(`  Parsed: FAILED`);
      }
      console.log();
    });
  }

  process.exit(0);
}

debugRenewal().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
