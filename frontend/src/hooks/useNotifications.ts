import { useState, useEffect, useCallback } from 'react';
import { subscribeToPush, unsubscribeFromPush, getCurrentSubscription } from '@/services/notifications.service';

export type NotificationPermissionState = 'default' | 'granted' | 'denied';

export function useNotifications() {
  const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  const [permission, setPermission] = useState<NotificationPermissionState>(
    supported ? (Notification.permission as NotificationPermissionState) : 'denied',
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    getCurrentSubscription().then((sub) => setSubscribed(!!sub));
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported) return;
    setLoading(true);
    setError(null);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      if (result !== 'granted') return;

      await subscribeToPush();
      setSubscribed(true);
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to enable notifications';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const disable = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await unsubscribeFromPush();
      setSubscribed(false);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, permission, subscribed, loading, error, enable, disable };
}
