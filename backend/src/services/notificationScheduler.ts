import { PrismaClient } from '@prisma/client';
import { redis } from '../utils/redis';
import { sendNotification } from './pushSubscriptions.service';
import { sendEmail } from './mail.service';
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

    const minutesLeft = Math.round((task.dueDate!.getTime() - now.getTime()) / 60000);
    const body = minutesLeft <= 1 ? 'Due now!' : `Due in ${minutesLeft} minutes`;

    let emailFailed = false;

    // Send push notification
    try {
      await sendNotification(task.userId, {
        title: task.title,
        body,
        taskId: task.id,
        url: '/tasks',
      });
    } catch (err) {
      logger.error({ err, taskId: task.id }, 'Failed to send push notification');
    }

    // Send email notification if mail is configured
    try {
      const user = await prisma.user.findUnique({
        where: { id: task.userId },
        select: { email: true, username: true },
      });

      if (user?.email) {
        const mailConfig = await prisma.mailConfig.findUnique({
          where: { id: 'default' },
        });

        if (mailConfig?.smtpHost && mailConfig?.smtpUser && mailConfig?.smtpPass) {
          await sendEmail(
            user.email,
            `Task Reminder: ${task.title}`,
            `
              <h1>Task Reminder</h1>
              <p>Hi ${user.username || 'there'},</p>
              <p>Your task <strong>${task.title}</strong> is ${body.toLowerCase()}.</p>
              <p>Due: ${task.dueDate?.toLocaleString()}</p>
              <hr>
              <p style="color: #666; font-size: 12px;">Task Manager - ${new Date().toISOString()}</p>
            `
          );
          logger.info({ taskId: task.id, userId: task.userId }, 'Email notification sent');
        }
      }
    } catch (err) {
      emailFailed = true;
      logger.error({ err, taskId: task.id }, 'Failed to send email notification');
    }

    // Mark as notified only after both push and email succeed,
    // so the next scheduler run can retry if either failed.
    if (!emailFailed) {
      await redis.set(notifiedKey, '1', 'EX', NOTIFIED_TTL);
    }
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
