import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export async function toggleOccurrence(taskId: string, userId: string, date: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId, deletedAt: null } });
  if (!task) throw new AppError(404, 'Task not found');
  if (!task.recurring) throw new AppError(400, 'Task is not recurring');

  const existing = await prisma.recurringCompletion.findUnique({
    where: { taskId_date: { taskId, date } },
  });

  if (existing) {
    await prisma.recurringCompletion.delete({ where: { taskId_date: { taskId, date } } });
    return { completed: false, date };
  } else {
    await prisma.recurringCompletion.create({ data: { taskId, date } });
    return { completed: true, date };
  }
}
