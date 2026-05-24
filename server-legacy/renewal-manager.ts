import { getSupabaseClient } from "./supabase.js";
import { randomUUID } from "crypto";

// Helper to format a Date as YYYY-MM-DD using its local year/month/day (avoid toISOString timezone shifts)
function formatDateLocal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatBillingMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Parse a date string as a local date (YYYY-MM-DD or ISO). This avoids
// timezone shifts when creating Date objects from date-only strings.
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
  // Fallback: try standard Date parsing then clamp to local midnight
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

// Exchange rates relative to USD (matching email.ts)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.35, AUD: 1.52, JPY: 152.0,
  CHF: 0.88, SEK: 10.85, NOK: 10.75, DKK: 6.95, PLN: 4.05, CZK: 23.5,
  HUF: 365.0, BRL: 5.25, MXN: 18.5, ARS: 950.0, TRY: 34.0, ZAR: 18.5,
  INR: 84.0, CNY: 7.25, KRW: 1350.0, SGD: 1.35, HKD: 7.8, NZD: 1.65,
};

const currencySymbols: Record<string, string> = {
  'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CAD': 'C$', 'AUD': 'A$',
  'CHF': 'CHF', 'CNY': '¥', 'INR': '₹', 'NZD': 'NZ$', 'SEK': 'kr',
  'NOK': 'kr', 'DKK': 'kr', 'PLN': 'zł', 'CZK': 'Kč', 'HUF': 'Ft',
  'BRL': 'R$', 'MXN': '$', 'ARS': '$', 'TRY': '₺', 'ZAR': 'R',
  'KRW': '₩', 'SGD': 'S$', 'HKD': 'HK$',
};

// Helper function for email formatting
function formatForEmail(amount: number, from: string, to: string) {
  const fromRate = EXCHANGE_RATES[from.toUpperCase()] || 1;
  const toRate = EXCHANGE_RATES[to.toUpperCase()] || 1;
  const converted = (amount / fromRate) * toRate;
  const symbol = currencySymbols[to.toUpperCase()] || to;
  return `${symbol}${converted.toFixed(2)}`;
}

// Helper function to advance subscriptions for a specific user
async function advanceSubscriptionsForUser(userId: string, today: Date): Promise<number> {
  const supabase = getSupabaseClient();
  let advancedCount = 0;

  // Try to fetch with next_billing_at first, fall back to next_billing_date
  let subscriptions: any[] | null = null;
  let error: any = null;

  // Try primary column name
  const { data: primaryData, error: primaryError } = await supabase
    .from("subscriptions")
    .select("id, name, next_billing_at, frequency, user_id, status")
    .eq("user_id", userId)
    .in("status", ["active", "unused", "to-cancel"]);

  if (primaryError && primaryError.message?.includes("column")) {
    console.log(`[Renewal] next_billing_at column not found, trying next_billing_date`);
    // Try alternate column name
    const { data: altData, error: altError } = await supabase
      .from("subscriptions")
      .select("id, name, next_billing_date, frequency, user_id, status")
      .eq("user_id", userId)
      .in("status", ["active", "unused", "to-cancel"]);
    
    subscriptions = altData;
    error = altError;
  } else {
    subscriptions = primaryData;
    error = primaryError;
  }

  if (error) {
    console.error(`[Renewal] Error fetching subscriptions for user ${userId}:`, error);
    return 0;
  }

  console.log(`[Renewal] Fetched ${subscriptions?.length || 0} subscriptions for user ${userId}`);
  if (subscriptions) {
    subscriptions.forEach((sub: any) => {
      const billingAt = sub.next_billing_at || sub.next_billing_date;
      console.log(`[Renewal]   - ${sub.name}: billingDate = ${billingAt}, frequency = ${sub.frequency}`);
    });
  }

  // helper to advance a date by a subscription frequency
  function advanceByFrequency(d: Date, freq: string): Date {
    const result = new Date(d);
    if (freq === "monthly") {
      const originalDay = result.getDate();
      result.setMonth(result.getMonth() + 1);
      // Get the last day of the target month
      const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
      // If original day is greater than the last day of target month, use the last day
      if (originalDay > lastDayOfMonth) {
        result.setDate(lastDayOfMonth);
      } else {
        result.setDate(originalDay);
      }
    } else if (freq === "yearly") {
      result.setFullYear(result.getFullYear() + 1);
    } else if (freq === "quarterly") {
      const originalDay = result.getDate();
      result.setMonth(result.getMonth() + 3);
      // Get the last day of the target month
      const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
      // If original day is greater than the last day of target month, use the last day
      if (originalDay > lastDayOfMonth) {
        result.setDate(lastDayOfMonth);
      } else {
        result.setDate(originalDay);
      }
    } else if (freq === "weekly") {
      result.setDate(result.getDate() + 7);
    }
    return result;
  }

  for (const sub of subscriptions || []) {
    // Get the billing date from whichever column exists
    const billingDateStr = sub.next_billing_at || sub.next_billing_date;
    if (!billingDateStr) {
      console.log(`[Renewal] Skipping ${sub.name}: no billing date found`);
      continue;
    }

    const nextBillingDate = parseDateLocal(billingDateStr);
    if (!nextBillingDate) {
      console.log(`[Renewal] Skipping ${sub.name}: failed to parse date "${billingDateStr}"`);
      continue;
    }

    const isPast = nextBillingDate < today;
    const daysDiff = Math.floor((today.getTime() - nextBillingDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`[Renewal] Checking ${sub.name}: date=${formatDateLocal(nextBillingDate)}, today=${formatDateLocal(today)}, ${isPast ? `PAST by ${daysDiff} days` : 'FUTURE'}`);

    // If renewal date is at least 1 day in the past, advance it to the next valid cycle
    if (isPast) {
      console.log(`[Renewal] Advancing ${sub.name} (${daysDiff} days past)...`);
      let newDate = nextBillingDate;
      let lastRenewalDate = nextBillingDate;
      while (newDate < today) {
        lastRenewalDate = newDate;
        newDate = advanceByFrequency(newDate, sub.frequency || "monthly");
      }
      const newDateStr = formatDateLocal(newDate);
      const billingMonthValue = formatBillingMonth(lastRenewalDate);

      console.log(`[Renewal] Will update to: ${newDateStr}, billing_month: ${billingMonthValue}`);

      // Determine which column to update
      const updatePayload: any = { billing_month: billingMonthValue };
      const columnToUpdate = sub.next_billing_at !== undefined ? "next_billing_at" : "next_billing_date";
      updatePayload[columnToUpdate] = newDateStr;

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update(updatePayload)
        .eq("id", sub.id);

      if (!updateError) {
        advancedCount++;
        console.log(
          `[Renewal] ✓ Advanced ${sub.name} from ${billingDateStr} to ${newDateStr}`
        );
      } else {
        console.error(`[Renewal] ✗ Error updating ${sub.name}:`, updateError);
      }
    }
  }

  return advancedCount;
}

// Auto-advance renewal dates that have passed for user and all family group members
export async function autoAdvanceRenewalDates(userId: string) {
  const supabase = getSupabaseClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalAdvancedCount = 0;

  console.log(`[Renewal] autoAdvanceRenewalDates called for user ${userId}, today: ${formatDateLocal(today)}`);

  // Get all user IDs to process: the current user + all members of their family groups
  const userIdsToProcess = new Set<string>([userId]);

  try {
    // 1. Check if user is a MEMBER of any family group
    const { data: familyMemberships, error: membershipError } = await supabase
      .from("family_group_members")
      .select("family_group_id")
      .eq("user_id", userId);

    if (membershipError) {
      console.log(`[Renewal] Warning: Could not fetch family memberships for ${userId}:`, membershipError.message);
    } else if (familyMemberships && familyMemberships.length > 0) {
      for (const membership of familyMemberships) {
        const familyGroupId = membership.family_group_id;
        console.log(`[Renewal] User ${userId} is a MEMBER of family group ${familyGroupId}`);

        // Get the group owner - they own the shared subscriptions
        const { data: groupData, error: groupError } = await supabase
          .from("family_groups")
          .select("owner_id")
          .eq("id", familyGroupId)
          .single();

        if (groupError) {
          console.log(`[Renewal] Warning: Could not fetch group owner for ${familyGroupId}:`, groupError.message);
        } else if (groupData) {
          userIdsToProcess.add(groupData.owner_id);
          console.log(`[Renewal]   Added owner: ${groupData.owner_id}`);
        }
      }
    }

    // 2. Check if user is an OWNER of any family group
    const { data: ownedGroups, error: ownerError } = await supabase
      .from("family_groups")
      .select("id")
      .eq("owner_id", userId);

    if (ownerError) {
      console.log(`[Renewal] Warning: Could not fetch owned groups for ${userId}:`, ownerError.message);
    } else if (ownedGroups && ownedGroups.length > 0) {
      for (const group of ownedGroups) {
        const familyGroupId = group.id;
        console.log(`[Renewal] User ${userId} is the OWNER of family group ${familyGroupId}`);

        // Get all members of this group
        const { data: groupMembers, error: membersError } = await supabase
          .from("family_group_members")
          .select("user_id")
          .eq("family_group_id", familyGroupId);

        if (membersError) {
          console.log(`[Renewal] Warning: Could not fetch group members for ${familyGroupId}:`, membersError.message);
        } else if (groupMembers) {
          console.log(`[Renewal] Found ${groupMembers.length} members in group ${familyGroupId}`);
          groupMembers.forEach((member: any) => {
            userIdsToProcess.add(member.user_id);
            console.log(`[Renewal]   Added member: ${member.user_id}`);
          });
        }
      }
    }
  } catch (err) {
    console.error(`[Renewal] Error fetching family group info for ${userId}:`, err);
  }

  console.log(`[Renewal] Will process renewals for ${userIdsToProcess.size} user(s): ${Array.from(userIdsToProcess).join(", ")}`);

  // Process renewals for each user
  for (const currentUserId of userIdsToProcess) {
    const advancedCount = await advanceSubscriptionsForUser(currentUserId, today);
    totalAdvancedCount += advancedCount;
  }

  console.log(`[Renewal] Completed: advanced ${totalAdvancedCount} total subscriptions`);
  return { anyAdvanced: totalAdvancedCount > 0, count: totalAdvancedCount };
}

// Send renewal reminder emails (uses dynamic import to avoid module loading issues)
export type RenewalReminderSummary = {
  runAt: string;
  userId?: string;
  subscriptionRows: number;
  userGroups: number;
  emailAttempted: number;
  emailSent: number;
  emailSkippedNoAddress: number;
  emailSendErrors: number;
  notices: string[];
  shouldPersist?: boolean;
};

export type RenewalRunLogRecord = {
  id: string;
  run_at: string;
  mode: "scheduled" | "manual";
  user_id: string | null;
  subscription_rows: number;
  user_groups: number;
  email_attempted: number;
  email_sent: number;
  email_skipped_no_address: number;
  email_send_errors: number;
  notices: string;
  created_at: string;
};

export async function sendRenewalReminders(userId?: string): Promise<RenewalReminderSummary> {
  const summary: RenewalReminderSummary = {
    runAt: new Date().toISOString(),
    userId,
    subscriptionRows: 0,
    userGroups: 0,
    emailAttempted: 0,
    emailSent: 0,
    emailSkippedNoAddress: 0,
    emailSendErrors: 0,
    notices: [],
    shouldPersist: true,
  };

  try {
    // Dynamically import Resend to avoid module loading issues
    let resend: any;
    try {
      const ResendModule = await import("resend");
      resend = new ResendModule.Resend(process.env.RESEND_API_KEY);
    } catch (err) {
      const msg = "[Renewal] Resend module not available, skipping email reminders";
      console.warn(msg);
      summary.notices.push(msg);
      return summary;
    }

    const supabase = getSupabaseClient();

    // Check if we've already sent renewal emails to this user today
    if (userId) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: recentRuns, error: logError } = await supabase
        .from('renewal_run_logs')
        .select('id, run_at, email_sent')
        .eq('user_id', userId)
        .gte('run_at', today.toISOString())
        .lt('run_at', tomorrow.toISOString())
        .gt('email_sent', 0)
        .limit(1);

      if (!logError && recentRuns && recentRuns.length > 0) {
        const msg = `[Renewal] Already sent renewal email to user ${userId} today, skipping`;
        console.log(msg);
        summary.notices.push(msg);
        return summary;
      }
    }

    // Get upcoming renewals (next 3-7 days)
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 5); // 5 days from today

    const startStr = formatDateLocal(startDate);
    const endStr = formatDateLocal(endDate);

    let query = supabase
      .from("subscriptions")
      .select("id, name, amount, frequency, next_billing_at, user_id, currency")
      .eq("status", "active")
      .gte("next_billing_at", startStr)
      .lte("next_billing_at", endStr);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: upcomingSubscriptions, error } = await query;

    if (error) {
      console.error("[Renewal] Error fetching upcoming renewals:", error);
      summary.notices.push("Error querying upcoming renewals");
      if (error.message?.includes('fetch failed') || error.details?.includes('ConnectTimeoutError')) {
        summary.shouldPersist = false;
      }
      return summary;
    }

    if (!upcomingSubscriptions || upcomingSubscriptions.length === 0) {
      const msg = "[Renewal] No upcoming renewals to notify";
      console.log(msg);
      summary.notices.push(msg);
      return summary;
    }

    summary.subscriptionRows = upcomingSubscriptions.length;

    // Group by user
    const byUser = new Map<string, typeof upcomingSubscriptions>();
    (upcomingSubscriptions || []).forEach((sub: any) => {
      if (!byUser.has(sub.user_id)) {
        byUser.set(sub.user_id, []);
      }
      byUser.get(sub.user_id)!.push(sub);
    });

    summary.userGroups = byUser.size;

    // Send emails to each user
    for (const [uid, subs] of Array.from(byUser)) {
      try {
        // Get user email from Supabase auth
        const { data } = await supabase.auth.admin.getUserById(uid);
        const email = data?.user?.email;

        if (!email) {
          const msg = `[Renewal] Could not find email for user ${uid}`;
          console.log(msg);
          summary.notices.push(msg);
          summary.emailSkippedNoAddress += 1;
          continue;
        }

        summary.emailAttempted += 1;

        // Get user's preferred currency
        const { data: userRecord } = await supabase
          .from('users')
          .select('currency')
          .eq('id', uid)
          .single();
        const userCurrency = userRecord?.currency || 'USD';

        // Create email content
        const subscriptionList = subs
          .map(
            (s: any) =>
              `<li><strong>${s.name}</strong>: ${formatForEmail(s.amount, s.currency, userCurrency)} (${s.frequency}) - Renews: ${s.next_billing_at}</li>`
          )
          .join("");

        const content = `
          <p>Hi there,</p>
          <p>Your subscriptions are renewing soon:</p>
          <ul style="line-height: 1.8;">
            ${subscriptionList}
          </ul>
          <p>Please make sure you have sufficient funds to cover these charges.</p>
          <p>You can manage your subscriptions anytime in your Subveris dashboard.</p>
        `;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="background-color: #f0f7ff; padding: 20px; border-radius: 8px 8px 0 0; border-left: 4px solid #007bff;">
              <h1 style="color: #007bff; margin: 0; font-size: 24px;">Upcoming Subscription Renewals</h1>
            </div>
            <div style="padding: 30px; background-color: #fff; border: 1px solid #e0e0e0; border-top: none;">
              ${content}
              <p style="margin-top: 30px; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
                Best regards,<br/>
                The Subveris Team
              </p>
            </div>
          </div>
        `;

        // Send using Resend
        const { error: sendError } = await resend.emails.send({
          from: "Subveris <onboarding@resend.dev>",
          to: email,
          subject: "Upcoming Subscription Renewals",
          html: emailHtml,
        });

        if (sendError) {
          summary.emailSendErrors += 1;
          // Store error but suppress individual logging to reduce noise
          const msg = `[Renewal] Error sending email to ${email}: ${sendError.message || JSON.stringify(sendError)}`;
          summary.notices.push(msg);
        } else {
          summary.emailSent += 1;
          const msg = `[Renewal] Sent reminder email to ${email} for ${subs.length} subscriptions`;
          console.log(msg);
        }
      } catch (err) {
        summary.emailSendErrors += 1;
        const msg = `[Renewal] Error sending email to user ${uid}: ${err instanceof Error ? err.message : JSON.stringify(err)}`;
        summary.notices.push(msg);
      }
    }
  } catch (err) {
    summary.notices.push("[Renewal] Error in sendRenewalReminders");
    console.error("[Renewal] Error in sendRenewalReminders:", err);
    summary.emailSendErrors += 1;
  }

  return summary;
}

async function persistRenewalRun(
  summary: RenewalReminderSummary,
  options: { mode: "scheduled" | "manual"; userId?: string }
): Promise<{ id: string; row?: any; error?: any }> {
  const supabase = getSupabaseClient();
  const record: Partial<RenewalRunLogRecord> = {
    id: randomUUID(),
    run_at: summary.runAt,
    mode: options.mode,
    user_id: options.userId ?? null,
    subscription_rows: summary.subscriptionRows,
    user_groups: summary.userGroups,
    email_attempted: summary.emailAttempted,
    email_sent: summary.emailSent,
    email_skipped_no_address: summary.emailSkippedNoAddress,
    email_send_errors: summary.emailSendErrors,
    notices: JSON.stringify(summary.notices),
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('renewal_run_logs').insert(record).select('*').single();
  if (error) {
    console.error('[Renewal] Failed to persist renewal run log:', error);

    // guidance for missing schema/table
    if (
      error.message?.includes("Could not find the table") ||
      error.message?.includes("renewal_run_logs") ||
      error.code === 'PGRST205'
    ) {
      summary.notices.push(
        "Missing table renewal_run_logs. Create it in your DB using the migration SQL in migrations/2026-03-16-add-renewal-run-logs.sql or supabase-schema.sql."
      );
    }

    return { id: record.id!, error };
  }
  return { id: record.id!, row: data };
}

// Run renewal checks periodically (call from a cron job or on startup)
// This function is used for both manual admin triggers and scheduled background runs.
// Each run is persisted to the renewal_run_logs table for auditing and troubleshooting.
export async function runRenewalChecks(options: { mode?: "scheduled" | "manual"; userId?: string } = {}) {
  const mode = options.mode ?? "scheduled";
  console.log(`[Renewal] Running renewal checks (${mode})...`);

  try {
    const summary = await sendRenewalReminders(options.userId);
    console.log("[Renewal] Renewal checks completed", summary);

    if (summary.shouldPersist === false) {
      const msg = "[Renewal] Skipping renewal run persistence because upstream Supabase fetch failed.";
      console.warn(msg);
      summary.notices.push(msg);
      return { summary, runLogId: '' };
    }

    const logResult = await persistRenewalRun(summary, { mode, userId: options.userId });
    if (logResult.error) {
      summary.notices.push("Failed to persist renewal run log");
    } else {
      summary.notices.push(`Persisted renewal run as ${logResult.id}`);
    }

    return { summary, runLogId: logResult.id };
  } catch (err) {
    console.error("[Renewal] Error running renewal checks:", err);
    throw err;
  }
}
