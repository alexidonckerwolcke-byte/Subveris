import crypto from 'crypto';

/**
 * Generate VAPID keys for Web Push API
 * These should be generated once and stored in .env
 * Run this once: node -e "import('./server/push-notifications.ts').then(m => console.log(m.generateVapidKeys()))"
 */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  const vapidKeys = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });

  const publicKey = vapidKeys.publicKey.export({ type: 'spki', format: 'pem' });
  const privateKey = vapidKeys.privateKey.export({ type: 'pkcs8', format: 'pem' });

  // Convert to base64 for use in Web Push
  const publicKeyB64 = Buffer.from(publicKey).toString('base64');
  const privateKeyB64 = Buffer.from(privateKey).toString('base64');

  return {
    publicKey: publicKeyB64,
    privateKey: privateKeyB64,
  };
}

/**
 * Create a signed JWT for Web Push
 * @param subject Contact email or URL
 * @param vapidPrivateKey VAPID private key
 */
export function createVapidJwt(subject: string, vapidPrivateKey: string): string {
  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };

  const payload = {
    aud: 'https://fcm.googleapis.com', // or appropriate push service
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const message = `${headerEncoded}.${payloadEncoded}`;

  // Sign with private key
  const privateKeyPem = Buffer.from(vapidPrivateKey, 'base64').toString('utf-8');
  const signature = crypto.sign('SHA256', Buffer.from(message), { key: privateKeyPem });
  const signatureB64 = Buffer.from(signature).toString('base64url');

  return `${message}.${signatureB64}`;
}

/**
 * Parse push subscription from client
 */
export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

/**
 * Send a push notification to a subscription
 * @param subscription Push subscription from database
 * @param payload Notification payload
 * @param vapidPrivateKey VAPID private key
 * @param vapidPublicKey VAPID public key
 * @param subject Contact email/URL for push service
 */
export async function sendPushNotification(
  subscription: {
    endpoint: string;
    authKey: string;
    p256dhKey: string;
  },
  payload: {
    title: string;
    body: string;
    tag?: string;
    data?: Record<string, any>;
  },
  vapidPrivateKey: string,
  vapidPublicKey: string,
  subject: string
): Promise<Response> {
  const jwt = createVapidJwt(subject, vapidPrivateKey);

  const body = JSON.stringify(payload);

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'aes128gcm',
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send push notification: ${response.status} ${error}`);
  }

  return response;
}

/**
 * Batch send push notifications to multiple users
 */
export async function sendBatchPushNotifications(
  subscriptions: Array<{
    endpoint: string;
    authKey: string;
    p256dhKey: string;
  }>,
  payload: {
    title: string;
    body: string;
    tag?: string;
    data?: Record<string, any>;
  },
  vapidPrivateKey: string,
  vapidPublicKey: string,
  subject: string
): Promise<{ successful: number; failed: number; errors: string[] }> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const subscription of subscriptions) {
    try {
      await sendPushNotification(
        subscription,
        payload,
        vapidPrivateKey,
        vapidPublicKey,
        subject
      );
      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return results;
}
