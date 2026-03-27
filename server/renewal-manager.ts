import { getSupabaseClient } from "./supabase";
import { randomUUID } from "crypto";

// Helper to format a Date as YYYY-MM-DD using its local year/month/day (avoid toISOString timezone shifts)
function formatDateLocal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Auto-advance renewal dates that have passed
export async function autoAdvanceRenewalDates(userId: string) {
  const supabase = getSupabaseClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all active/unused subscriptions
  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select("id, name, next_billing_at, frequency, user_id")
    .eq("user_id", userId)
    .in("status", ["active", "unused"]);

  if (error) {
    console.error("[Renewal] Error fetching subscriptions:", error);
    return;
  }

  // helper to advance a date by a subscription frequency
  function advanceByFrequency(d: Date, freq: string): Date {
    const result = new Date(d);
    if (freq === "monthly") {
      const day = result.getDate();
      result.setMonth(result.getMonth() + 1);
      // if month overflow occurred (e.g. Jan 31 -> Mar 3), clamp to last day of
      // the intended month by setting date 0 which yields the previous month's
      // last day.
      if (result.getDate() !== day) {
        result.setDate(0); // last day of previous month, effectively month-end
      }
    } else if (freq === "yearly") {
      result.setFullYear(result.getFullYear() + 1);
    } else if (freq === "quarterly") {
      result.setMonth(result.getMonth() + 3);
    } else if (freq === "weekly") {
      result.setDate(result.getDate() + 7);
    }
    return result;
  }

  for (const sub of subscriptions || []) {
    if (!sub.next_billing_at) continue;

    const nextBillingDate = new Date(sub.next_billing_at);
    nextBillingDate.setHours(0, 0, 0, 0);

    // If renewal date is in the past, advance to next cycle
    if (nextBillingDate < today) {
      const newDate = advanceByFrequency(nextBillingDate, sub.frequency);
      const newDateStr = formatDateLocal(newDate);

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ next_billing_at: newDateStr })
        .eq("id", sub.id);

      if (!updateError) {
        console.log(
          `[Renewal] Advanced ${sub.name} from ${sub.next_billing_at} to ${newDateStr}`
        );
      } else {
        console.error(`[Renewal] Error updating ${sub.name}:`, updateError);
      }
    }
  }
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
    (upcomingSubscriptions || []).forEach((sub) => {
      if (!byUser.has(sub.user_id)) {
        byUser.set(sub.user_id, []);
      }
      byUser.get(sub.user_id)!.push(sub);
    });

    summary.userGroups = byUser.size;

    // Send emails to each user
    for (const [uid, subs] of byUser) {
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

        // Create email content
        const subscriptionList = subs
          .map(
            (s) =>
              `<li><strong>${s.name}</strong>: $${s.amount} ${s.currency} (${s.frequency}) - Renews: ${s.next_billing_at}</li>`
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
          const msg = `[Renewal] Error sending email to ${email}: ${sendError.message || JSON.stringify(sendError)}`;
          console.error(msg);
          summary.notices.push(msg);
        } else {
          summary.emailSent += 1;
          const msg = `[Renewal] Sent reminder email to ${email} for ${subs.length} subscriptions`;
          console.log(msg);
          summary.notices.push(msg);
        }
      } catch (err) {
        summary.emailSendErrors += 1;
        const msg = `[Renewal] Error sending email to user ${uid}: ${err instanceof Error ? err.message : JSON.stringify(err)}`;
        console.error(msg);
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
