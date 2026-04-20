import webpush from 'web-push';
import { redis } from '../utils/redis';
import { config } from '../config';
import { logger } from '../utils/logger';

const SUBSCRIPTIONS_PREFIX = 'push:subs:';

if (config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(config.VAPID_EMAIL, config.VAPID_PUBLIC_KEY, config.VAPID_PRIVATE_KEY);
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function subsKey(userId: string) {
  return `${SUBSCRIPTIONS_PREFIX}${userId}`;
}

function endpointHash(endpoint: string) {
  return Buffer.from(endpoint).toString('base64').slice(0, 32);
}

export async function saveSubscription(userId: string, subscription: PushSubscriptionData) {
  const field = endpointHash(subscription.endpoint);
  await redis.hset(subsKey(userId), field, JSON.stringify(subscription));
}

export async function removeSubscription(userId: string, endpoint: string) {
  const field = endpointHash(endpoint);
  await redis.hdel(subsKey(userId), field);
}

export async function getUserSubscriptions(userId: string): Promise<PushSubscriptionData[]> {
  const data = await redis.hgetall(subsKey(userId));
  if (!data) return [];
  return Object.values(data).map((v) => JSON.parse(v));
}

export async function sendNotification(userId: string, payload: object) {
  if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) return;

  const subscriptions = await getUserSubscriptions(userId);
  const dead: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub as any, JSON.stringify(payload));
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          dead.push(sub.endpoint);
        } else {
          logger.warn({ err, userId }, 'Push notification failed');
        }
      }
    }),
  );

  for (const endpoint of dead) {
    await removeSubscription(userId, endpoint);
  }
}
