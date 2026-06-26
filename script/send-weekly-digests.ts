import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables FIRST
const envPathLocal = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPathLocal)) {
  config({ path: envPathLocal });
} else {
  config({ path: envPath });
}

import { createClient } from '@supabase/supabase-js';
import { emailService } from '../server/email.js';

// Fix env names: allow Vite-style settings to provide Supabase runtime config
if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
}

if (!process.env.SUPABASE_ANON_KEY && process.env.VITE_SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const initialKey = serviceKey || anonKey;
let usingServiceKey = Boolean(serviceKey);

console.log('[Weekly Digest] Supabase URL loaded:', supabaseUrl ? 'YES' : 'NO');
console.log('[Weekly Digest] Using service key:', usingServiceKey);
console.log('[Weekly Digest] Has anon key:', !!anonKey);

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL or VITE_SUPABASE_URL is required.');
}

if (!initialKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY, SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, or VITE_SUPABASE_ANON_KEY is required.');
}

let supabase = createClient(supabaseUrl, initialKey);

async function maybeRetryWithAnon<T>(result: { data: T; error: any }, operation: () => Promise<{ data: T; error: any }>) {
  if (result.error?.message?.includes('Invalid API key') && anonKey && usingServiceKey) {
    console.warn('[Weekly Digest] Service key invalid; retrying with anon key.');
    supabase = createClient(supabaseUrl, anonKey);
    usingServiceKey = false;
    return operation();
  }
  return result;
}

async function getUserEmail(userId: string): Promise<string | null> {
  if (usingServiceKey) {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (!userError && userData?.user?.email) {
      return userData.user.email;
    }
  }

  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  if (!error && data?.email) {
    return data.email;
  }

  console.warn(`[Weekly Digest] Could not load email for user ${userId}:`, error?.message ?? 'unknown');
  return null;
}

// Helper to get user's preferred currency
async function getUserCurrency(userId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('users')
      .select('currency')
      .eq('id', userId)
      .single();
    return data?.currency || 'USD';
  } catch (err) {
    console.warn(`[Weekly Digest] Error getting currency for user ${userId}:`, err);
    return 'USD';
  }
}

async function sendWeeklyDigests() {
  console.log('[Weekly Digest] Starting weekly digest email job');

  try {
    // Get all users who have weekly digest enabled
    let result = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq('weekly_digest', true);

    result = await maybeRetryWithAnon(result, async () =>
      supabase.from('notification_preferences').select('user_id').eq('weekly_digest', true)
    );

    const { data: preferences, error: prefError } = result;

    if (prefError) {
      console.error('[Weekly Digest] Error fetching preferences:', prefError);
      return;
    }

    const enabledUserIds = new Set<string>(preferences?.map((pref) => pref.user_id) || []);

    let prefRowResult = await supabase
      .from('notification_preferences')
      .select('user_id');

    prefRowResult = await maybeRetryWithAnon(prefRowResult, async () =>
      supabase.from('notification_preferences').select('user_id')
    );

    const { data: preferenceRows, error: preferenceRowsError } = prefRowResult;

    if (preferenceRowsError) {
      console.error('[Weekly Digest] Error fetching preference rows:', preferenceRowsError);
      return;
    }

    const existingPrefUserIds = new Set<string>(preferenceRows?.map((pref) => pref.user_id) || []);

    // Include users who have no notification preference row yet, because defaults are enabled
    let userResult = await supabase
      .from('users')
      .select('id');

    userResult = await maybeRetryWithAnon(userResult, async () =>
      supabase.from('users').select('id')
    );

    const { data: allUsers, error: userError } = userResult;

    if (userError || !allUsers) {
      console.error('[Weekly Digest] Error fetching users:', userError);
      return;
    }

    const defaultEnabledUserIds = allUsers
      .map((user) => user.id)
      .filter((userId) => !existingPrefUserIds.has(userId));

    if (defaultEnabledUserIds.length > 0) {
      const { error: backfillError } = await supabase
        .from('notification_preferences')
        .insert(
          defaultEnabledUserIds.map((userId) => ({
            user_id: userId,
            email_notifications: true,
            push_notifications: true,
            weekly_digest: true,
          }))
        );

      if (backfillError) {
        console.warn('[Weekly Digest] Failed to backfill default preference rows:', backfillError);
      } else {
        console.log(`[Weekly Digest] Backfilled ${defaultEnabledUserIds.length} default preference rows`);
      }
    }

    const allEnabledUserIds = Array.from(enabledUserIds)
      .concat(defaultEnabledUserIds)
      .filter((userId, index, userIds) => userIds.indexOf(userId) === index);

    if (allEnabledUserIds.length === 0) {
      console.log('[Weekly Digest] No users have weekly digest enabled');
      return;
    }

    console.log(`[Weekly Digest] Found ${allEnabledUserIds.length} users with weekly digest enabled or default enabled`);

    let successCount = 0;
    let errorCount = 0;

    for (const userId of allEnabledUserIds) {
      try {

        // Get user email from auth
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

        if (userError || !userData?.user?.email) {
          console.warn(`[Weekly Digest] Could not get email for user ${userId}:`, userError);
          errorCount++;
          continue;
        }

        const userEmail = userData.user.email;

        // Get user's subscriptions for the digest
        const { data: subscriptions, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .neq('status', 'deleted');

        if (subError) {
          console.error(`[Weekly Digest] Error fetching subscriptions for user ${userId}:`, subError);
          errorCount++;
          continue;
        }

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`[Weekly Digest] User ${userId} has no subscriptions, skipping`);
          continue;
        }

        // Calculate metrics
        const activeSubscriptions = subscriptions.filter(s => s.status === 'active' || s.status === 'unused').length;
        const totalMonthlySpend = subscriptions
          .filter(s => s.status !== 'deleted' && s.status !== 'to-cancel')
          .reduce((total, sub) => {
            const amount = sub.amount;
            switch (sub.frequency) {
              case 'yearly': return total + amount / 12;
              case 'quarterly': return total + amount / 3;
              case 'weekly': return total + amount * 4.33; // ~4.33 weeks per month
              default: return total + amount;
            }
          }, 0);

        // Get top subscriptions by monthly cost
        const topSubscriptions = subscriptions
          .filter(s => s.status !== 'deleted' && s.status !== 'to-cancel')
          .map(sub => {
            const monthlyAmount = sub.frequency === 'yearly' ? sub.amount / 12 :
                                sub.frequency === 'quarterly' ? sub.amount / 3 :
                                sub.frequency === 'weekly' ? sub.amount * 4.33 : sub.amount;
            return {
              name: sub.name,
              amount: monthlyAmount,
            };
          })
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        // Get user currency
        const userCurrency = await getUserCurrency(userId);

        // Prepare digest data
        const digestData = {
          totalSubscriptions: subscriptions.length,
          monthlySpending: totalMonthlySpend,
          weeklySavings: 0,
          currency: userCurrency,
          topSubscriptions
        };

        // Send the digest
        const result = await emailService.sendWeeklyDigest(userId, userEmail, digestData);

        if (result.success) {
          console.log(`[Weekly Digest] Sent digest to ${userEmail}`);
          successCount++;
        } else {
          console.error(`[Weekly Digest] Failed to send digest to ${userEmail}:`, result.error);
          errorCount++;
        }

      } catch (err) {
        console.error(`[Weekly Digest] Error processing user ${userId}:`, err);
        errorCount++;
      }
    }

    console.log(`[Weekly Digest] Job completed. Success: ${successCount}, Errors: ${errorCount}`);

  } catch (err) {
    console.error('[Weekly Digest] Fatal error in weekly digest job:', err);
  }
}

// Run the job
sendWeeklyDigests().catch(console.error);