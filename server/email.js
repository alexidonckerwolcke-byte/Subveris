import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY?.trim();

async function sendWithResend({ to, subject, html }) {
  const resend = new Resend(RESEND_API_KEY);
  const response = await resend.emails.send({
    from: 'noreply@subveris.com',
    to,
    subject,
    html,
  });

  if (response?.data?.id) {
    return { success: true };
  }
  
  const errorMsg = response?.error?.message || 'Unknown error';
  return { success: false, error: `Resend email failed: ${errorMsg}` };
}

async function sendWithSendGrid({ to, subject, html }) {
  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: 'noreply@subveris.com' },
    subject,
    content: [{ type: 'text/html', value: html }],
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    return { success: true };
  }

  const errorText = await response.text();
  return { success: false, error: `SendGrid error: ${errorText}` };
}

async function sendEmail({ to, subject, html }) {
  if (RESEND_API_KEY) {
    try {
      return await sendWithResend({ to, subject, html });
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  if (SENDGRID_API_KEY) {
    try {
      return await sendWithSendGrid({ to, subject, html });
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return { success: false, error: 'No email provider configured. Set RESEND_API_KEY or SENDGRID_API_KEY.' };
}

function buildWeeklyDigestHtml({ monthlySpending, currency, topSubscriptions }) {
  const rows = topSubscriptions
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${currency} ${item.amount.toFixed(2)}</td>
        </tr>
      `
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
      <h1 style="font-size: 24px;">Your weekly Subveris digest</h1>
      <p>Here’s your latest subscription summary.</p>
      <p><strong>Total monthly spending:</strong> ${currency} ${monthlySpending.toFixed(2)}</p>
      <h2 style="font-size: 18px;">Top subscriptions</h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <thead>
          <tr>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Subscription</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Monthly cost</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p style="margin-top: 24px;">Thanks for using Subveris.</p>
    </div>
  `;
}

async function sendWeeklyDigest(userId, email, data) {
  const subject = 'Your weekly Subveris digest';
  const html = buildWeeklyDigestHtml(data);
  return sendEmail({ to: email, subject, html });
}

async function sendCancellationReminder(userId, email, details) {
  const subject = 'Your subscription cancellation reminder';
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
      <h1 style="font-size: 24px;">Cancellation reminder</h1>
      <p>${details.message || 'A subscription event requires your attention.'}</p>
      <p>If you have questions, reply to this email.</p>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
}

function buildWelcomeEmailHtml(email) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6; max-width: 600px;">
      <h1 style="font-size: 28px; margin-bottom: 16px; color: #000;">Welcome to Subveris! 🎉</h1>
      
      <p style="font-size: 16px; margin-bottom: 12px;">Hi there,</p>
      
      <p style="font-size: 16px; margin-bottom: 12px;">
        Welcome aboard! We're thrilled to have you join Subveris, your personal subscription manager.
      </p>
      
      <h2 style="font-size: 20px; margin-top: 24px; margin-bottom: 12px; color: #333;">What's next?</h2>
      
      <ol style="font-size: 16px; margin-bottom: 12px; line-height: 1.8;">
        <li><strong>Install the browser extension</strong> - Track subscriptions as you browse</li>
        <li><strong>Add your subscriptions</strong> - Manual entry or auto-detect from transactions</li>
        <li><strong>Get insights</strong> - Understand your spending patterns and find savings</li>
        <li><strong>Upgrade to Premium</strong> - Unlock AI-powered recommendations and family sharing</li>
      </ol>
      
      <p style="font-size: 16px; margin-bottom: 12px;">
        <strong>Pro tip:</strong> Our browser extension auto-detects subscription services as you visit websites, making setup a breeze.
      </p>

      <div style="background-color: #fef3cd; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #ffc107;">
        <p style="font-size: 14px; margin-top: 0; color: #333;">
          <strong>🔒 Secure your account:</strong> We recommend enabling two-factor authentication (2FA) in your settings to protect your subscription data. You can set it up anytime in your account settings.
        </p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="font-size: 14px; margin: 0; color: #666;">
          <strong>Questions?</strong> Check out our getting started guide or reply to this email. We're here to help!
        </p>
      </div>
      
      <p style="font-size: 16px; margin-bottom: 12px;">Happy tracking!</p>
      
      <p style="font-size: 14px; color: #666; margin-top: 32px;">
        Best regards,<br>
        The Subveris Team
      </p>
    </div>
  `;
}

async function sendWelcomeEmail(userId, email) {
  const subject = 'Welcome to Subveris – Let\'s track your subscriptions!';
  const html = buildWelcomeEmailHtml(email);
  return sendEmail({ to: email, subject, html });
}

export const emailService = {
  sendWeeklyDigest,
  sendCancellationReminder,
  sendWelcomeEmail,
};
