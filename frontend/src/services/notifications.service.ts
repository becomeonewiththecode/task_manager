import { api } from './api';

async function getVapidPublicKey(): Promise<string | null> {
  const { data } = await api.get<{ publicKey: string | null }>('/push/vapid-public-key');
  return data.publicKey;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function swReady(timeoutMs = 10_000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Service worker not ready')), timeoutMs),
    ),
  ]);
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

  const vapidKey = await getVapidPublicKey();
  if (!vapidKey) return null;

  const reg = await swReady();

  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    // Ensure it's registered on the backend
    const json = existing.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    await api.post('/push/subscribe', json).catch(() => null);
    return existing;
  }

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
  });

  const json = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  await api.post('/push/subscribe', json);

  return subscription;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const reg = await swReady();
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return;

  await api.delete('/push/subscribe', { data: { endpoint: subscription.endpoint } }).catch(() => null);
  await subscription.unsubscribe();
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await swReady(3_000);
    return reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}
