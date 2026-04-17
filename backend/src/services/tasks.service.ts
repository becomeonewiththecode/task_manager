import { PrismaClient, Priority, TaskStatus, Recurring } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listTasks(userId: string, filters: TaskFilters) {
  const { status, priority, categoryId, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where = {
    userId,
    deletedAt: null,
    ...(status && { status }),
    ...(priority && { priority }),
    ...(search && { title: { contains: search, mode: 'insensitive' as const } }),
    ...(categoryId && { tags: { some: { categoryId } } }),
  };

  const [tasks, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      include: { tags: { include: { category: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getTask(id: string, userId: string) {
  const task = await prisma.task.findFirst({
    where: { id, userId, deletedAt: null },
    include: { tags: { include: { category: true } } },
  });
  if (!task) throw new AppError(404, 'Task not found');
  return task;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: Date;
  recurring?: Recurring;
  categoryIds?: string[];
}

export async function createTask(userId: string, input: CreateTaskInput) {
  const { categoryIds = [], ...data } = input;

  const last = await prisma.task.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  return prisma.task.create({
    data: {
      ...data,
      userId,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      tags: categoryIds.length
        ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
        : undefined,
    },
    include: { tags: { include: { category: true } } },
  });
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: TaskStatus;
  sortOrder?: number;
}

export async function updateTask(id: string, userId: string, input: UpdateTaskInput) {
  await getTask(id, userId);
  const { categoryIds, ...data } = input;

  return prisma.task.update({
    where: { id },
    data: {
      ...data,
      ...(categoryIds !== undefined && {
        tags: {
          deleteMany: {},
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
      }),
    },
    include: { tags: { include: { category: true } } },
  });
}

export async function deleteTask(id: string, userId: string) {
  await getTask(id, userId);
  await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function reorderTasks(userId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.task.updateMany({ where: { id, userId }, data: { sortOrder: index } }),
    ),
  );
}
