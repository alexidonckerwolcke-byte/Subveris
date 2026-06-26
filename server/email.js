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

  return response?.id ? { success: true } : { success: false, error: 'Resend email failed' };
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

export const emailService = {
  sendWeeklyDigest,
  sendCancellationReminder,
};
