import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword, meetsStrengthRequirements } from '../utils/password';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export async function getProfile(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, username: true, totpEnabled: true, createdAt: true },
  });
  return user;
}

export async function updateEmail(userId: string, newEmail: string, password: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await comparePassword(password, user.passwordHash))) {
    throw new AppError(401, 'Invalid password');
  }
  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) throw new AppError(409, 'Email already in use');
  return prisma.user.update({
    where: { id: userId },
    data: { email: newEmail },
    select: { id: true, email: true, username: true },
  });
}

export async function updatePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await comparePassword(currentPassword, user.passwordHash))) {
    throw new AppError(401, 'Invalid current password');
  }
  if (!meetsStrengthRequirements(newPassword)) {
    throw new AppError(400, 'New password does not meet strength requirements');
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
}

export async function deleteAccount(userId: string, password: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await comparePassword(password, user.passwordHash))) {
    throw new AppError(401, 'Invalid password');
  }
  await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
}

export async function getStats(userId: string) {
  const [total, completed, byPriority] = await prisma.$transaction([
    prisma.task.count({ where: { userId, deletedAt: null } }),
    prisma.task.count({ where: { userId, deletedAt: null, status: 'COMPLETED' } }),
    prisma.task.groupBy({
      by: ['priority'],
      where: { userId, deletedAt: null },
      _count: true,
    }),
  ]);

  return {
    total,
    completed,
    active: total - completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    byPriority,
  };
}
