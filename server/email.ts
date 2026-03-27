import { Resend } from 'resend';
import { checkNotificationPreference } from './notification-preferences.js';
import { sendBatchPushNotifications } from './push-notifications.js';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to get currency symbol
function getCurrencySymbol(currency: string): string {
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$',
    'CHF': 'CHF',
    'CNY': '¥',
    'INR': '₹',
    'NZD': 'NZ$',
  };
  return currencySymbols[currency.toUpperCase()] || currency;
}

const emailTemplate = (title: string, content: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
    <div style="background-color: #f0f7ff; padding: 20px; border-radius: 8px 8px 0 0; border-left: 4px solid #007bff;">
      <h1 style="color: #007bff; margin: 0; font-size: 24px;">${title}</h1>
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

export const emailService = {
  // Welcome email for new signups
  async sendWelcomeEmail(userEmail: string, userName?: string) {
    try {
      const name = userName || 'there';
      const content = `
        <p>Hi ${name},</p>
        <p>Welcome to Subveris! We're excited to have you on board.</p>
        <p>Subveris helps you take complete control of your subscription spending by:</p>
        <ul style="line-height: 1.8;">
          <li>🎯 Tracking all your subscriptions in one place</li>
          <li>💡 Getting AI-powered recommendations to save money</li>
          <li>🏦 Connecting your bank accounts to auto-detect subscriptions</li>
          <li>📊 Analyzing your spending patterns</li>
          <li>⏰ Scheduling automatic cancellations</li>
        </ul>
        <p><strong>Get Started:</strong> Log in to your dashboard to add your first subscription or connect your bank account.</p>
        <p>Questions? Check out our help center or reply to this email.</p>
        <p>For support, contact us at: <strong>help.subveris@gmail.com</strong></p>
      `;
      
      const { data: result, error } = await resend.emails.send({
        from: 'Subveris <onboarding@resend.dev>',
        to: userEmail,
        subject: 'Welcome to Subveris! 🎉',
        html: emailTemplate('Welcome to Subveris', content),
      });

      if (error) {
        console.error('[Email] Failed to send welcome email:', error);
        return { success: false, error };
      }

      console.log('[Email] Welcome email sent to', userEmail);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Email] Error sending welcome email:', error);
      return { success: false, error };
    }
  },

  // Subscription added notification
  async sendSubscriptionAddedEmail(userEmail: string, userId: string, data: {
    subscriptionName: string;
    amount: number;
    currency: string;
    frequency: string;
  }) {
    try {
      // Check if user has email notifications enabled
      const hasEmailPreference = await checkNotificationPreference(userId, 'email');
      if (!hasEmailPreference) {
        console.log('[Email] Email notifications disabled for user, skipping subscription added email');
        return { success: true, skipped: true };
      }

      const content = `
        <p>Hi there,</p>
        <p>You've successfully added a new subscription to your Subveris dashboard!</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">
            <strong>Subscription:</strong> ${data.subscriptionName}<br/>
            <strong>Amount:</strong> ${data.currency} ${data.amount}/${data.frequency}<br/>
            <strong>Annual Cost:</strong> ${data.currency} ${(data.amount * 12).toFixed(2)}
          </p>
        </div>
        <p>Your subscription is now being tracked. You can:</p>
        <ul>
          <li>View your cost-per-use analytics</li>
          <li>Schedule automatic cancellation if needed</li>
          <li>Track your usage</li>
          <li>Get AI recommendations</li>
        </ul>
      `;

      const { data: result, error } = await resend.emails.send({
        from: 'Subveris <onboarding@resend.dev>',
        to: userEmail,
        subject: `New subscription added: ${data.subscriptionName}`,
        html: emailTemplate('Subscription Added', content),
      });

      if (error) {
        console.error('[Email] Failed to send subscription added email:', error);
        return { success: false, error };
      }

      console.log('[Email] Subscription added email sent to', userEmail);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Email] Error sending subscription added email:', error);
      return { success: false, error };
    }
  },

  // Subscription deleted notification
  async sendSubscriptionDeletedEmail(userEmail: string, userId: string, data: {
    subscriptionName: string;
    amount: number;
    currency: string;
  }) {
    try {
      // Check if user has email notifications enabled
      const hasEmailPreference = await checkNotificationPreference(userId, 'email');
      if (!hasEmailPreference) {
        console.log('[Email] Email notifications disabled for user, skipping subscription deleted email');
        return { success: true, skipped: true };
      }

      const content = `
        <p>Hi there,</p>
        <p>You've successfully removed <strong>${data.subscriptionName}</strong> from your subscriptions.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">
            <strong>Subscription:</strong> ${data.subscriptionName}<br/>
            <strong>Monthly Savings:</strong> ${data.currency} ${data.amount}<br/>
            <strong>Annual Savings:</strong> ${data.currency} ${(data.amount * 12).toFixed(2)}
          </p>
        </div>
        <p>🎉 Great job optimizing your subscriptions! You're saving money every month.</p>
      `;

      const { data: result, error } = await resend.emails.send({
        from: 'Subveris <onboarding@resend.dev>',
        to: userEmail,
        subject: `Subscription cancelled: ${data.subscriptionName}`,
        html: emailTemplate('Subscription Cancelled', content),
      });

      if (error) {
        console.error('[Email] Failed to send subscription deleted email:', error);
        return { success: false, error };
      }

      console.log('[Email] Subscription deleted email sent to', userEmail);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Email] Error sending subscription deleted email:', error);
      return { success: false, error };
    }
  },

  // Bank account connected notification
  async sendBankConnectedEmail(userEmail: string, userId: string, data: {
    bankName: string;
    accountType?: string;
  }) {
    try {
      // Check if user has email notifications enabled
      const hasEmailPreference = await checkNotificationPreference(userId, 'email');
      if (!hasEmailPreference) {
        console.log('[Email] Email notifications disabled for user, skipping bank connected email');
        return { success: true, skipped: true };
      }

      const content = `
        <p>Hi there,</p>
        <p>Your <strong>${data.bankName}</strong> account has been successfully connected to Subveris!</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">
            <strong>Bank:</strong> ${data.bankName}<br/>
            ${data.accountType ? `<strong>Account Type:</strong> ${data.accountType}<br/>` : ''}
            <strong>Status:</strong> Connected ✅
          </p>
        </div>
        <p>Subveris is now analyzing your transactions to automatically detect subscriptions.</p>
        <p>This helps us:</p>
        <ul>
          <li>Find all your subscriptions automatically</li>
          <li>Alert you about duplicate subscriptions</li>
          <li>Provide better savings recommendations</li>
        </ul>
      `;

      const { data: result, error } = await resend.emails.send({
        from: 'Subveris <onboarding@resend.dev>',
        to: userEmail,
        subject: `Bank account connected: ${data.bankName}`,
        html: emailTemplate('Bank Account Connected', content),
      });

      if (error) {
        console.error('[Email] Failed to send bank connected email:', error);
        return { success: false, error };
      }

      console.log('[Email] Bank connected email sent to', userEmail);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Email] Error sending bank connected email:', error);
      return { success: false, error };
    }
  },

  // Subscription status changed notification
  async sendStatusChangedEmail(userEmail: string, userId: string, data: {
    subscriptionName: string;
    oldStatus: string;
    newStatus: string;
  }) {
    try {
      // Check if user has email notifications enabled
      const hasEmailPreference = await checkNotificationPreference(userId, 'email');
      if (!hasEmailPreference) {
        console.log('[Email] Email notifications disabled for user, skipping status changed email');
        return { success: true, skipped: true };
      }

      const statusEmoji = {
        'active': '✅',
        'unused': '⏸️',
        'to-cancel': '❌',
        'deleted': '🗑️',
      };
      
      const content = `
        <p>Hi there,</p>
        <p>The status of your <strong>${data.subscriptionName}</strong> subscription has changed.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">
            <strong>Subscription:</strong> ${data.subscriptionName}<br/>
            <strong>Previous Status:</strong> ${statusEmoji[data.oldStatus as keyof typeof statusEmoji] || ''} ${data.oldStatus}<br/>
            <strong>New Status:</strong> ${statusEmoji[data.newStatus as keyof typeof statusEmoji] || ''} ${data.newStatus}
          </p>
        </div>
        <p>If you didn't make this change, please log in to your dashboard to review your subscriptions.</p>
      `;

      const { data: result, error } = await resend.emails.send({
        from: 'Subveris <onboarding@resend.dev>',
        to: userEmail,
        subject: `Subscription status changed: ${data.subscriptionName}`,
        html: emailTemplate('Status Updated', content),
      });

      if (error) {
        console.error('[Email] Failed to send status changed email:', error);
        return { success: false, error };
      }

      console.log('[Email] Status changed email sent to', userEmail);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Email] Error sending status changed email:', error);
      return { success: false, error };
    }
  },

  // 2FA enabled notification
  async send2FAEnabledEmail(userEmail: string, userId: string) {
    try {
      // Check if user has email notifications enabled
      const hasEmailPreference = await checkNotificationPreference(userId, 'email');
      if (!hasEmailPreference) {
        console.log('[Email] Email notifications disabled for user, skipping 2FA enabled email');
        return { success: true, skipped: true };
      }

      const content = `
        <p>Hi there,</p>
        <p>Two-factor authentication (2FA) has been successfully enabled on your Subveris account.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">
            <strong>Security Status:</strong> Enhanced ✅<br/>
            <strong>2FA Method:</strong> Authenticator App<br/>
            <strong>Protected:</strong> Account Login
          </p>
        </div>
        <p>Your account is now more secure. When you log in, you'll be asked for a code from your authenticator app in addition to your password.</p>
        <p><strong>Important:</strong> Keep your recovery codes in a safe place. You can find them in your account settings.</p>
      `;

      const { data: result, error } = await resend.emails.send({
        from: 'Subveris <onboarding@resend.dev>',
        to: userEmail,
        subject: 'Two-Factor Authentication Enabled',
        html: emailTemplate('Security Enhanced', content),
      });

      if (error) {
        console.error('[Email] Failed to send 2FA enabled email:', error);
        return { success: false, error };
      }

      console.log('[Email] 2FA enabled email sent to', userEmail);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Email] Error sending 2FA enabled email:', error);
      return { success: false, error };
    }
  },

  // Premium upgrade notification
  async sendPremiumUpgradeEmail(userEmail: string, userId: string) {
    try {
      // Check if user has email notifications enabled
      const hasEmailPreference = await checkNotificationPreference(userId, 'email');
      if (!hasEmailPreference) {
        console.log('[Email] Email notifications disabled for user, skipping premium upgrade email');
        return { success: true, skipped: true };
      }

      const content = `
        <p>Hi there,</p>
        <p>🎉 Welcome to Subveris Premium! Your upgrade was successful.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">
            <strong>Plan:</strong> Premium<br/>
            <strong>Status:</strong> Active ✅<br/>
            <strong>Renewal:</strong> Auto-renewal enabled
          </p>
        </div>
        <p>You now have access to premium features:</p>
        <ul>
          <li>⏰ Schedule automatic cancellations</li>
          <li>🤖 Advanced AI recommendations</li>
          <li>📧 Unlimited email notifications</li>
          <li>📊 Detailed analytics reports</li>
          <li>🔒 Priority support</li>
        </ul>
        <p>Start using your premium features in your dashboard!</p>
      `;

      const { data: result, error } = await resend.emails.send({
        from: 'Subveris <onboarding@resend.dev>',
        to: userEmail,
        subject: 'Welcome to Subveris Premium! 🎉',
        html: emailTemplate('Premium Plan Activated', content),
      });

      if (error) {
        console.error('[Email] Failed to send premium upgrade email:', error);
        return { success: false, error };
      }

      console.log('[Email] Premium upgrade email sent to', userEmail);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Email] Error sending premium upgrade email:', error);
      return { success: false, error };
    }
  },

  // AI Recommendation notification
  async sendRecommendationEmail(userEmail: string, userId: string, data: {
    recommendationType: string;
    subscriptionName: string;
    savings?: number;
    currency?: string;
  }) {
    try {
      // Check if user has email notifications enabled
      const hasEmailPreference = await checkNotificationPreference(userId, 'email');
      if (!hasEmailPreference) {
        console.log('[Email] Email notifications disabled for user, skipping recommendation email');
        return { success: true, skipped: true };
      }

      const content = `
        <p>Hi there,</p>
        <p>We have a recommendation that could help you save money! 💰</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">
            <strong>Recommendation:</strong> ${data.recommendationType}<br/>
            <strong>Subscription:</strong> ${data.subscriptionName}<br/>
            ${data.savings ? `<strong>Potential Savings:</strong> ${data.currency} ${data.savings}/month<br/>` : ''}
            <strong>Status:</strong> Review in dashboard
          </p>
        </div>
        <p>Log in to your Subveris dashboard to review this recommendation and take action.</p>
      `;

      const { data: result, error } = await resend.emails.send({
        from: 'Subveris <onboarding@resend.dev>',
        to: userEmail,
        subject: `💡 Money-saving recommendation: ${data.subscriptionName}`,
        html: emailTemplate('New Recommendation', content),
      });

      if (error) {
        console.error('[Email] Failed to send recommendation email:', error);
        return { success: false, error };
      }

      console.log('[Email] Recommendation email sent to', userEmail);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Email] Error sending recommendation email:', error);
      return { success: false, error };
    }
  },

  // Cancellation reminder (existing)
  async sendCancellationScheduledReminder(userEmail: string, userId: string, data: {
    subscriptionName: string;
    cancellationDate: string;
    amount: number;
    currency: string;
  }) {
    try {
      // Check if user has email notifications enabled
      const hasEmailPreference = await checkNotificationPreference(userId, 'email');
      if (!hasEmailPreference) {
        console.log('[Email] Email notifications disabled for user, skipping cancellation scheduled reminder');
        return { success: true, skipped: true };
      }

      const cancellationDate = new Date(data.cancellationDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      const content = `
        <p>Hi there,</p>
        <p>This is a friendly reminder that your <strong>${data.subscriptionName}</strong> subscription cancellation reminder is set for <strong>${cancellationDate}</strong>.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">
            <strong>Subscription:</strong> ${data.subscriptionName}<br/>
            <strong>Monthly Cost:</strong> ${data.currency} ${data.amount}<br/>
            <strong>Reminder Date:</strong> ${cancellationDate}
          </p>
        </div>

        <p>If you'd like to cancel this reminder or keep the subscription active, please log in to your Subveris dashboard.</p>
      `;

      const { data: result, error } = await resend.emails.send({
        from: 'Subveris <onboarding@resend.dev>',
        to: userEmail,
        subject: `Reminder scheduled for ${data.subscriptionName} on ${cancellationDate}`,
        html: emailTemplate('Cancellation Reminder Scheduled', content),
      });

      if (error) {
        console.error('[Email] Failed to send cancellation scheduled reminder:', error);
        return { success: false, error };
      }

      console.log('[Email] Cancellation scheduled reminder sent to', userEmail);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Email] Error sending cancellation scheduled reminder:', error);
      return { success: false, error };
    }
  },

  // Cancellation confirmation (existing)
  async sendCancellationConfirmation(userEmail: string, userId: string, data: {
    subscriptionName: string;
    amount: number;
    currency: string;
  }) {
    try {
      // Check if user has email notifications enabled
      const hasEmailPreference = await checkNotificationPreference(userId, 'email');
      if (!hasEmailPreference) {
        console.log('[Email] Email notifications disabled for user, skipping cancellation confirmation');
        return { success: true, skipped: true };
      }

      const content = `
        <p>Hi there,</p>
        <p>Your <strong>${data.subscriptionName}</strong> subscription has been successfully cancelled.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">
            <strong>Subscription:</strong> ${data.subscriptionName}<br/>
            <strong>Monthly Savings:</strong> ${data.currency} ${data.amount}<br/>
            <strong>Annual Savings:</strong> ${data.currency} ${(data.amount * 12).toFixed(2)}
          </p>
        </div>

        <p>Great job optimizing your subscriptions! You're now saving <strong>${data.currency} ${data.amount} per month</strong>.</p>
      `;

      const { data: result, error } = await resend.emails.send({
        from: 'Subveris <onboarding@resend.dev>',
        to: userEmail,
        subject: `${data.subscriptionName} has been cancelled`,
        html: emailTemplate('Subscription Cancelled', content),
      });

      if (error) {
        console.error('[Email] Failed to send cancellation confirmation:', error);
        return { success: false, error };
      }

      console.log('[Email] Cancellation confirmation sent to', userEmail);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Email] Error sending cancellation confirmation:', error);
      return { success: false, error };
    }
  },

  // Smart cancellation reminder email
  async sendCancellationReminder(userEmail: string, userId: string, data: {
    subscriptionName: string;
    amount: number;
    currency: string;
    cancellationUrl?: string;
  }) {
    try {
      const currencySymbol = getCurrencySymbol(data.currency);
      
      let actionButton = '';
      if (data.cancellationUrl) {
        actionButton = `
          <div style="margin: 30px 0; text-align: center;">
            <a href="${data.cancellationUrl}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Cancel ${data.subscriptionName}
            </a>
            <p style="margin-top: 12px; font-size: 12px; color: #666;">
              Click the button above to go directly to the cancellation page
            </p>
          </div>
        `;
      }

      const annualCost = (data.amount * 12).toFixed(2);
      const content = `
        <p>Hi there,</p>
        <p>Today is the day you scheduled to cancel <strong>${data.subscriptionName}</strong>!</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 0;">
            <strong>Subscription:</strong> ${data.subscriptionName}<br/>
            <strong>Monthly Cost:</strong> ${currencySymbol} ${data.amount}<br/>
            <strong>Annual Cost:</strong> ${currencySymbol} ${annualCost}<br/>
            <strong>Potential Annual Savings:</strong> ${currencySymbol} ${annualCost}
          </p>
        </div>

        <h3 style="color: #333; margin-top: 25px;">Next Steps:</h3>
        <ol style="line-height: 1.8; color: #555;">
          <li><strong>Review your decision</strong> - Make sure you still want to cancel</li>
          <li><strong>Cancel the subscription</strong> - Use the button below or visit the provider's website</li>
          <li><strong>Confirm cancellation</strong> - Save any data you might need before it's deleted</li>
        </ol>

        ${actionButton}

        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
          <strong>Didn't mean to cancel?</strong> You can always log back into ${data.subscriptionName} to reactivate your subscription.
        </p>
      `;

      // Check email notification preference
      const hasEmailPreference = await checkNotificationPreference(userId, 'email');
      if (hasEmailPreference) {
        const { data: result, error } = await resend.emails.send({
          from: 'Subveris <onboarding@resend.dev>',
          to: userEmail,
          subject: `Time to cancel ${data.subscriptionName}? Save ${currencySymbol} ${annualCost}/year`,
          html: emailTemplate('Cancellation Reminder', content),
        });

        if (error) {
          console.error('[Email] Failed to send cancellation reminder:', error);
        } else {
          console.log('[Email] Cancellation reminder sent to', userEmail);
        }
      }

      // Send push notification if enabled
      const hasPushPreference = await checkNotificationPreference(userId, 'push');
      if (hasPushPreference) {
        await this.sendCancellationReminderPush(userId, {
          subscriptionName: data.subscriptionName,
          amount: data.amount,
          currency: data.currency,
          cancellationUrl: data.cancellationUrl,
        });
      }

      return { success: true };
    } catch (error) {
      console.error('[Email] Error sending cancellation reminder:', error);
      return { success: false, error };
    }
  },

  // Helper: Send push notification for cancellation reminder
  async sendCancellationReminderPush(userId: string, data: {
    subscriptionName: string;
    amount: number;
    currency: string;
    cancellationUrl?: string;
  }) {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Get user's push subscriptions
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, auth_key, p256dh_key')
        .eq('user_id', userId);

      if (error || !subscriptions || subscriptions.length === 0) {
        console.log('[Push] No push subscriptions found for user', userId);
        return;
      }

      const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
      const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
      if (!vapidPrivateKey || !vapidPublicKey) {
        console.warn('[Push] VAPID keys not configured');
        return;
      }

      const payload = {
        title: 'Cancellation Reminder',
        body: `Time to cancel ${data.subscriptionName}! Save ${data.currency}${(data.amount * 12).toFixed(2)}/year`,
        tag: `cancellation-${data.subscriptionName}`,
        data: {
          url: data.cancellationUrl || '/dashboard',
          subscriptionName: data.subscriptionName,
          amount: data.amount,
          currency: data.currency,
        },
      };

      const results = await sendBatchPushNotifications(
        subscriptions.map(s => ({
          endpoint: s.endpoint,
          authKey: s.auth_key,
          p256dhKey: s.p256dh_key,
        })),
        payload,
        vapidPrivateKey,
        vapidPublicKey,
        'support@subveris.com'
      );

      console.log('[Push] Cancellation reminder sent:', results);
    } catch (error) {
      console.error('[Push] Error sending cancellation reminder:', error);
    }
  },

  // Weekly digest email
  async sendWeeklyDigest(userId: string, userEmail: string, data: {
    totalSubscriptions: number;
    monthlySpending: number;
    weeklySavings: number;
    currency: string;
    topSubscriptions: Array<{ name: string; amount: number }>;
  }) {
    try {
      // Check if user has weekly digest enabled
      const hasDigestPreference = await checkNotificationPreference(userId, 'digest');
      if (!hasDigestPreference) {
        console.log('[Email] Weekly digest disabled for user, skipping');
        return { success: true, skipped: true };
      }

      const annualSpending = (data.monthlySpending * 12).toFixed(2);
      const topSubscriptionsHtml = data.topSubscriptions
        .map(
          (sub) =>
            `<tr style="border-bottom: 1px solid #e0e0e0;">
              <td style="padding: 12px; text-align: left;">${sub.name}</td>
              <td style="padding: 12px; text-align: right;"><strong>${data.currency} ${sub.amount}/month</strong></td>
            </tr>`
        )
        .join('');

      const content = `
        <p>Hi there,</p>
        <p>Here's your weekly subscription summary for the week of ${new Date().toLocaleDateString()}:</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px;">
                <p style="margin: 0; color: #666; font-size: 12px;">Total Subscriptions</p>
                <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: bold; color: #007bff;">${data.totalSubscriptions}</p>
              </td>
              <td style="padding: 12px;">
                <p style="margin: 0; color: #666; font-size: 12px;">Monthly Spending</p>
                <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: bold; color: #007bff;">${data.currency} ${data.monthlySpending.toFixed(2)}</p>
              </td>
              <td style="padding: 12px;">
                <p style="margin: 0; color: #666; font-size: 12px;">Annual Cost</p>
                <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: bold; color: #28a745;">${data.currency} ${annualSpending}</p>
              </td>
            </tr>
          </table>
        </div>

        <h3 style="color: #333; margin: 25px 0 15px 0;">Your Top Subscriptions</h3>
        <table style="width: 100%; border-collapse: collapse; background-color: #f8f9fa;">
          <thead>
            <tr style="background-color: #e9ecef; border-bottom: 2px solid #dee2e6;">
              <th style="padding: 12px; text-align: left; font-weight: bold;">Subscription</th>
              <th style="padding: 12px; text-align: right; font-weight: bold;">Cost</th>
            </tr>
          </thead>
          <tbody>
            ${topSubscriptionsHtml}
          </tbody>
        </table>

        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
          <strong>💡 Tip:</strong> Review your subscriptions regularly to identify ones you're no longer using. 
          Log in to Subveris to see AI-powered recommendations for potential savings!
        </p>
      `;

      const { data: result, error } = await resend.emails.send({
        from: 'Subveris <onboarding@resend.dev>',
        to: userEmail,
        subject: `Your Weekly Subscription Summary - ${data.currency} ${data.monthlySpending.toFixed(2)}/month`,
        html: emailTemplate('Weekly Digest', content),
      });

      if (error) {
        console.error('[Email] Failed to send weekly digest:', error);
        return { success: false, error };
      }

      console.log('[Email] Weekly digest sent to', userEmail);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Email] Error sending weekly digest:', error);
      return { success: false, error };
    }
  },

  // Contact form submission email
  async sendContactEmail(contactData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    try {
      const content = `
        <p><strong>New contact form submission from Subveris website</strong></p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">
            <strong>From:</strong> ${contactData.name} (${contactData.email})<br/>
            <strong>Subject:</strong> ${contactData.subject}<br/>
            <strong>Received:</strong> ${new Date().toLocaleString()}
          </p>
        </div>
        <h3 style="color: #333; margin: 25px 0 15px 0;">Message:</h3>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff;">
          <p style="margin: 0; white-space: pre-wrap;">${contactData.message}</p>
        </div>
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
          <strong>Reply to:</strong> ${contactData.email}<br/>
          <strong>Dashboard:</strong> <a href="https://app.subveris.com" style="color: #007bff;">https://app.subveris.com</a>
        </p>
      `;

      const { data: result, error } = await resend.emails.send({
        from: 'Subveris <onboarding@resend.dev>',
        to: 'alexi.donckerwolcke@gmail.com',
        replyTo: contactData.email,
        subject: `Contact Form: ${contactData.subject}`,
        html: emailTemplate('New Contact Form Submission', content),
      });

      if (error) {
        console.error('[Email] Failed to send contact email:', error);
        console.error('[Email] Error details:', JSON.stringify(error, null, 2));
        return { success: false, error };
      }

      console.log('[Email] Contact email sent to alexi.donckerwolcke@gmail.com (forwarded to help.subveris@gmail.com), reply-to:', contactData.email);
      console.log('[Email] Email ID:', result?.id);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Email] Error sending contact email:', error);
      return { success: false, error };
    }
  },
};

