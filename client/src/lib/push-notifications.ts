/**
 * Push Notification Utility
 * Handles Web Push API integration with Subveris backend
 */

export interface PushNotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, any>;
  actions?: PushNotificationAction[];
}

/**
 * Request permission for push notifications
 * @returns Promise resolving to permission state
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support push notifications');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }

  return 'denied';
}

/**
 * Register service worker for push notifications
 * @returns Promise resolving to service worker registration
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers are not supported in this browser');
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
}

/**
 * Subscribe to push notifications
 * @param registration Service worker registration
 * @param vapidPublicKey VAPID public key from server
 * @returns Promise resolving to push subscription
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string
): Promise<PushSubscription> {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    console.log('Push subscription created:', subscription);
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    throw error;
  }
}

/**
 * Check if user is already subscribed
 * @param registration Service worker registration
 * @returns Promise resolving to existing subscription or null
 */
export async function getExistingSubscription(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  return await registration.pushManager.getSubscription();
}

/**
 * Unsubscribe from push notifications
 * @param subscription Push subscription
 * @returns Promise resolving when unsubscribed
 */
export async function unsubscribeFromPush(subscription: PushSubscription): Promise<boolean> {
  return await subscription.unsubscribe();
}

/**
 * Send push subscription to server
 * @param subscription Push subscription object
 * @returns Promise resolving to server response
 */
export async function sendSubscriptionToServer(subscription: PushSubscription): Promise<Response> {
  const response = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscription),
  });

  if (!response.ok) {
    throw new Error('Failed to send subscription to server');
  }

  return response;
}

/**
 * Check if push notifications are supported and enabled
 * @returns boolean indicating push notification support
 */
export function isPushNotificationsSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Convert VAPID public key from base64
 * @param base64String VAPID public key in base64
 * @returns Uint8Array representation
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Initialize push notifications
 * Call this on app startup
 * @returns Promise resolving when setup is complete
 */
export async function initializePushNotifications(): Promise<void> {
  if (!isPushNotificationsSupported()) {
    console.warn('Push notifications not supported');
    return;
  }

  try {
    // Register service worker
    const registration = await registerServiceWorker();

    // Check if already subscribed
    const existingSubscription = await getExistingSubscription(registration);

    if (existingSubscription) {
      console.log('Already subscribed to push notifications');
      return;
    }

    // Check permission status
    if (Notification.permission === 'granted') {
      // User has already granted permission, subscribe them
      try {
        const response = await fetch('/api/notifications/vapid-public-key');
        const { vapidPublicKey } = await response.json();

        const subscription = await subscribeToPush(registration, vapidPublicKey);
        await sendSubscriptionToServer(subscription);
        console.log('Push notifications enabled');
      } catch (error) {
        console.error('Failed to auto-subscribe to push:', error);
      }
    }
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
  }
}
