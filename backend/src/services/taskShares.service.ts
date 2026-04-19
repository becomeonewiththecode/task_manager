import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

const PUBLIC_TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  dueDate: true,
  tags: { include: { category: { select: { id: true, name: true, color: true } } } },
  subtasks: {
    where: { deletedAt: null },
    select: { id: true, title: true, status: true, priority: true },
  },
};

export async function createShare(taskId: string, userId: string, expiresAt?: Date) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId, deletedAt: null } });
  if (!task) throw new AppError(404, 'Task not found');

  const token = randomBytes(24).toString('base64url');
  return prisma.taskShare.create({ data: { taskId, userId, token, expiresAt } });
}

export async function getShareByToken(token: string) {
  const share = await prisma.taskShare.findUnique({
    where: { token },
    include: { task: { select: PUBLIC_TASK_SELECT } },
  });

  if (!share) throw new AppError(404, 'Share link not found');
  if (!share.task || share.task.status === undefined) throw new AppError(404, 'Task not found');
  if (share.expiresAt && share.expiresAt < new Date()) throw new AppError(410, 'Share link has expired');

  return { share: { id: share.id, token: share.token, expiresAt: share.expiresAt, createdAt: share.createdAt }, task: share.task };
}

export async function listShares(taskId: string, userId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId, deletedAt: null } });
  if (!task) throw new AppError(404, 'Task not found');
  return prisma.taskShare.findMany({ where: { taskId, userId }, orderBy: { createdAt: 'desc' } });
}

export async function deleteShare(shareId: string, userId: string) {
  const share = await prisma.taskShare.findFirst({ where: { id: shareId, userId } });
  if (!share) throw new AppError(404, 'Share not found');
  await prisma.taskShare.delete({ where: { id: shareId } });
}
