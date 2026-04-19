import { config } from 'dotenv';

// Load environment variables FIRST
config();

import { createClient } from '@supabase/supabase-js';
import { emailService } from '../server/email.js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq('weekly_digest', true);

    if (prefError) {
      console.error('[Weekly Digest] Error fetching preferences:', prefError);
      return;
    }

    if (!preferences || preferences.length === 0) {
      console.log('[Weekly Digest] No users have weekly digest enabled');
      return;
    }

    console.log(`[Weekly Digest] Found ${preferences.length} users with weekly digest enabled`);

    let successCount = 0;
    let errorCount = 0;

    for (const pref of preferences) {
      try {
        const userId = pref.user_id;

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
              monthlyAmount,
              currency: sub.currency || 'USD',
              category: sub.category
            };
          })
          .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
          .slice(0, 5);

        // Get user currency
        const userCurrency = await getUserCurrency(userId);

        // Prepare digest data
        const digestData = {
          monthlySpending: totalMonthlySpend,
          currency: userCurrency,
          activeSubscriptions,
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
        console.error(`[Weekly Digest] Error processing user ${pref.user_id}:`, err);
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