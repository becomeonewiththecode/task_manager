import { PrismaClient } from '@prisma/client';
import { redis } from '../utils/redis';
import { sendNotification } from './pushSubscriptions.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const REMIND_BEFORE_MS = 15 * 60 * 1000; // 15 minutes
const NOTIFIED_TTL = 20 * 60; // 20 minutes in seconds

async function checkAndNotify() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMIND_BEFORE_MS);

  const tasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      dueDate: { gte: now, lte: windowEnd },
    },
    select: { id: true, title: true, dueDate: true, userId: true },
  });

  for (const task of tasks) {
    const notifiedKey = `push:notified:${task.id}`;
    const alreadySent = await redis.get(notifiedKey);
    if (alreadySent) continue;

    await redis.set(notifiedKey, '1', 'EX', NOTIFIED_TTL);

    const minutesLeft = Math.round((task.dueDate!.getTime() - now.getTime()) / 60000);
    const body = minutesLeft <= 1 ? 'Due now!' : `Due in ${minutesLeft} minutes`;

    await sendNotification(task.userId, {
      title: task.title,
      body,
      taskId: task.id,
      url: '/tasks',
    });
  }
}

export function startNotificationScheduler() {
  const interval = setInterval(async () => {
    try {
      await checkAndNotify();
    } catch (err) {
      logger.error({ err }, 'Notification scheduler error');
    }
  }, 60_000);

  // Run once immediately on start
  checkAndNotify().catch((err) => logger.error({ err }, 'Notification scheduler initial run error'));

  return interval;
}
