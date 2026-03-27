import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  isPushNotificationsSupported,
  requestPushPermission,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  sendSubscriptionToServer,
  getExistingSubscription,
} from '@/lib/push-notifications';

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const supported = isPushNotificationsSupported();
    setIsSupported(supported);

    if (supported) {
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      if (!('serviceWorker' in navigator)) return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await getExistingSubscription(registration);
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const handleTogglePushNotifications = async () => {
    if (!isSupported) {
      toast({
        variant: 'destructive',
        title: 'Not Supported',
        description: 'Push notifications are not supported on your device',
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isSubscribed) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.ready;
        const subscription = await getExistingSubscription(registration);
        if (subscription) {
          await unsubscribeFromPush(subscription);
          // Notify server to remove subscription
          await fetch('/api/notifications/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
        }
        setIsSubscribed(false);
        toast({
          title: 'Push Notifications Disabled',
          description: 'You will no longer receive push notifications',
        });
      } else {
        // Subscribe
        const permission = await requestPushPermission();
        if (permission === 'granted') {
          const registration = await registerServiceWorker();
          const vapidResponse = await fetch('/api/notifications/vapid-public-key');
          const { vapidPublicKey } = await vapidResponse.json();
          const subscription = await subscribeToPush(registration, vapidPublicKey);
          await sendSubscriptionToServer(subscription);
          setIsSubscribed(true);
          toast({
            title: 'Push Notifications Enabled',
            description: 'You will receive push notifications for reminders and updates',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Permission Denied',
            description: 'You denied push notification permissions. Enable them in your browser settings.',
          });
        }
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update push notification settings',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      onClick={handleTogglePushNotifications}
      disabled={isLoading}
      variant={isSubscribed ? 'default' : 'outline'}
      size="sm"
      className="gap-2"
    >
      <Bell className={`h-4 w-4 ${isSubscribed ? '' : 'opacity-50'}`} />
      {isLoading ? 'Loading...' : isSubscribed ? 'Notifications On' : 'Enable Notifications'}
    </Button>
  );
}
