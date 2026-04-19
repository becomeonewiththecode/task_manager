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
    prisma.task.count({ where: { userId, deletedAt: null, parentId: null } }),
    prisma.task.count({ where: { userId, deletedAt: null, status: 'COMPLETED', parentId: null } }),
    prisma.task.groupBy({
      by: ['priority'],
      where: { userId, deletedAt: null, parentId: null },
      orderBy: { priority: 'asc' },
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

export async function getAnalytics(userId: string, from: Date, to: Date) {
  const [timeSeries, byPriority, byStatus] = await Promise.all([
    prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE_TRUNC('day', "updatedAt") AS date, COUNT(*) AS count
      FROM "Task"
      WHERE "userId" = ${userId}
        AND "status" = 'COMPLETED'
        AND "deletedAt" IS NULL
        AND "updatedAt" >= ${from}
        AND "updatedAt" <= ${to}
      GROUP BY DATE_TRUNC('day', "updatedAt")
      ORDER BY date ASC
    `,
    prisma.task.groupBy({
      by: ['priority'],
      where: { userId, deletedAt: null, parentId: null },
      orderBy: { priority: 'asc' },
      _count: true,
    }),
    prisma.task.groupBy({
      by: ['status'],
      where: { userId, deletedAt: null, parentId: null },
      orderBy: { status: 'asc' },
      _count: true,
    }),
  ]);

  const total = await prisma.task.count({ where: { userId, deletedAt: null, parentId: null } });
  const completed = await prisma.task.count({ where: { userId, deletedAt: null, status: 'COMPLETED', parentId: null } });

  return {
    completionTimeSeries: timeSeries.map((r) => ({ date: r.date, count: Number(r.count) })),
    byPriority,
    byStatus,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    total,
  };
}

export async function exportData(userId: string) {
  const [categories, tasks, taskTemplates] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, color: true },
    }),
    prisma.task.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        dueDate: true,
        recurring: true,
        sortOrder: true,
        createdAt: true,
        parentId: true,
        tags: { select: { categoryId: true } },
        dependencies: { select: { dependsOnId: true } },
        timeEntries: { select: { startedAt: true, endedAt: true, note: true } },
      },
    }),
    prisma.taskTemplate.findMany({
      where: { userId },
      select: { name: true, description: true, priority: true, recurring: true, categoryIds: true },
    }),
  ]);

  return {
    version: '1',
    exportedAt: new Date().toISOString(),
    categories,
    tasks: tasks.map(({ tags, ...t }) => ({ ...t, categoryIds: tags.map((tag) => tag.categoryId) })),
    taskTemplates,
  };
}

export async function importData(userId: string, backup: any) {
  const { categories = [], tasks = [], taskTemplates = [] } = backup;

  const categoryIdMap = new Map<string, string>();
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { userId_name: { userId, name: cat.name } },
      update: { color: cat.color },
      create: { userId, name: cat.name, color: cat.color },
    });
    categoryIdMap.set(cat.id, created.id);
  }

  const taskIdMap = new Map<string, string>();
  for (const task of tasks) {
    const created = await prisma.task.create({
      data: {
        userId,
        title: task.title,
        description: task.description ?? null,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        recurring: task.recurring ?? null,
        sortOrder: task.sortOrder ?? 0,
      },
    });
    taskIdMap.set(task.id, created.id);
  }

  for (const task of tasks) {
    if (task.parentId && taskIdMap.has(task.parentId)) {
      await prisma.task.update({
        where: { id: taskIdMap.get(task.id)! },
        data: { parentId: taskIdMap.get(task.parentId) },
      });
    }
  }

  const tagData: Array<{ taskId: string; categoryId: string }> = [];
  for (const task of tasks) {
    const newTaskId = taskIdMap.get(task.id);
    if (!newTaskId) continue;
    for (const oldCatId of task.categoryIds ?? []) {
      const newCatId = categoryIdMap.get(oldCatId);
      if (newCatId) tagData.push({ taskId: newTaskId, categoryId: newCatId });
    }
  }
  if (tagData.length > 0) await prisma.taskTag.createMany({ data: tagData, skipDuplicates: true });

  const depData: Array<{ taskId: string; dependsOnId: string }> = [];
  for (const task of tasks) {
    const newTaskId = taskIdMap.get(task.id);
    if (!newTaskId) continue;
    for (const dep of task.dependencies ?? []) {
      const newDepId = taskIdMap.get(dep.dependsOnId);
      if (newDepId && newDepId !== newTaskId) depData.push({ taskId: newTaskId, dependsOnId: newDepId });
    }
  }
  if (depData.length > 0) await prisma.taskDependency.createMany({ data: depData, skipDuplicates: true });

  const timeEntryData: Array<{ taskId: string; userId: string; startedAt: Date; endedAt: Date | null; note: string | null }> = [];
  for (const task of tasks) {
    const newTaskId = taskIdMap.get(task.id);
    if (!newTaskId) continue;
    for (const entry of task.timeEntries ?? []) {
      timeEntryData.push({
        taskId: newTaskId,
        userId,
        startedAt: new Date(entry.startedAt),
        endedAt: entry.endedAt ? new Date(entry.endedAt) : null,
        note: entry.note ?? null,
      });
    }
  }
  if (timeEntryData.length > 0) await prisma.timeEntry.createMany({ data: timeEntryData });

  for (const template of taskTemplates) {
    const newCategoryIds = (template.categoryIds ?? [])
      .map((id: string) => categoryIdMap.get(id))
      .filter(Boolean) as string[];
    await prisma.taskTemplate.upsert({
      where: { userId_name: { userId, name: template.name } },
      update: { description: template.description, priority: template.priority, recurring: template.recurring, categoryIds: newCategoryIds },
      create: { userId, name: template.name, description: template.description ?? null, priority: template.priority, recurring: template.recurring ?? null, categoryIds: newCategoryIds },
    });
  }

  return { imported: { categories: categoryIdMap.size, tasks: taskIdMap.size, taskTemplates: taskTemplates.length } };
}

export async function getAuditLog(
  userId: string,
  options: { page: number; limit: number; entity?: string },
) {
  const { page = 1, limit = 20, entity } = options;
  const skip = (page - 1) * limit;
  const where = { userId, ...(entity && { entity }) };

  const [entries, total] = await prisma.$transaction([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.auditLog.count({ where }),
  ]);

  return { entries, total, page, limit, totalPages: Math.ceil(total / limit) };
}
