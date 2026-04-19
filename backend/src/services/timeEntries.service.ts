import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export async function startTimer(taskId: string, userId: string) {
  // Verify task ownership
  const task = await prisma.task.findFirst({ where: { id: taskId, userId, deletedAt: null } });
  if (!task) throw new AppError(404, 'Task not found');

  // Auto-stop any open timer for this user
  const open = await prisma.timeEntry.findFirst({ where: { userId, endedAt: null } });
  if (open) {
    await prisma.timeEntry.update({ where: { id: open.id }, data: { endedAt: new Date() } });
  }

  return prisma.timeEntry.create({ data: { taskId, userId, startedAt: new Date() } });
}

export async function stopTimer(entryId: string, userId: string) {
  const entry = await prisma.timeEntry.findFirst({ where: { id: entryId, userId } });
  if (!entry) throw new AppError(404, 'Time entry not found');
  if (entry.endedAt) throw new AppError(400, 'Timer already stopped');
  return prisma.timeEntry.update({ where: { id: entryId }, data: { endedAt: new Date() } });
}

export async function listEntries(taskId: string, userId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId, deletedAt: null } });
  if (!task) throw new AppError(404, 'Task not found');
  return prisma.timeEntry.findMany({ where: { taskId, userId }, orderBy: { startedAt: 'desc' } });
}

export async function deleteEntry(entryId: string, userId: string) {
  const entry = await prisma.timeEntry.findFirst({ where: { id: entryId, userId } });
  if (!entry) throw new AppError(404, 'Time entry not found');
  await prisma.timeEntry.delete({ where: { id: entryId } });
}

export async function getTotalTime(taskId: string, userId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId, deletedAt: null } });
  if (!task) throw new AppError(404, 'Task not found');

  const entries = await prisma.timeEntry.findMany({
    where: { taskId, userId, endedAt: { not: null } },
  });

  const totalMs = entries.reduce((sum, e) => {
    return sum + (e.endedAt!.getTime() - e.startedAt.getTime());
  }, 0);

  return { totalMs, entries: entries.length };
}

export async function getActiveTimer(userId: string) {
  return prisma.timeEntry.findFirst({ where: { userId, endedAt: null } });
}
