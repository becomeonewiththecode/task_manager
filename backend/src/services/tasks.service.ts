import { PrismaClient, Priority, TaskStatus, Recurring } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { writeAudit } from '../utils/audit';

const prisma = new PrismaClient();

const TASK_INCLUDE = {
  tags: { include: { category: true } },
  subtasks: { where: { deletedAt: null }, include: { tags: { include: { category: true } } } },
  dependencies: { select: { dependsOnId: true } },
  dependedOnBy: { select: { taskId: true } },
};

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
  dueDateFrom?: string;
  dueDateTo?: string;
  parentId?: string | null;
}

export async function listTasks(userId: string, filters: TaskFilters) {
  const { status, priority, categoryId, search, page = 1, limit = 20, dueDateFrom, dueDateTo, parentId } = filters;
  const skip = (page - 1) * limit;

  const where: any = {
    userId,
    deletedAt: null,
    parentId: parentId === undefined ? null : parentId,
    ...(status && { status }),
    ...(priority && { priority }),
    ...(search && { title: { contains: search, mode: 'insensitive' as const } }),
    ...(categoryId && { tags: { some: { categoryId } } }),
    ...((dueDateFrom || dueDateTo) && {
      dueDate: {
        ...(dueDateFrom && { gte: new Date(dueDateFrom) }),
        ...(dueDateTo && { lte: new Date(dueDateTo) }),
      },
    }),
  };

  const [tasks, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
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
    include: TASK_INCLUDE,
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
    where: { userId, deletedAt: null, parentId: null },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const task = await prisma.task.create({
    data: {
      ...data,
      userId,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      tags: categoryIds.length
        ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
        : undefined,
    },
    include: TASK_INCLUDE,
  });

  await writeAudit(prisma, userId, 'create', 'task', task.id, { title: task.title });
  return task;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: TaskStatus;
  sortOrder?: number;
}

export async function updateTask(id: string, userId: string, input: UpdateTaskInput) {
  await getTask(id, userId);
  const { categoryIds, ...data } = input;

  const task = await prisma.task.update({
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
    include: TASK_INCLUDE,
  });

  await writeAudit(prisma, userId, 'update', 'task', id, { fields: Object.keys(input) });
  return task;
}

export async function deleteTask(id: string, userId: string) {
  await getTask(id, userId);
  await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit(prisma, userId, 'delete', 'task', id);
}

export async function reorderTasks(userId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.task.updateMany({ where: { id, userId }, data: { sortOrder: index } }),
    ),
  );
}

export async function createSubtask(parentId: string, userId: string, input: CreateTaskInput) {
  const parent = await getTask(parentId, userId);
  if (parent.parentId) throw new AppError(400, 'Subtasks cannot be nested more than one level');

  const last = await prisma.task.findFirst({
    where: { userId, parentId, deletedAt: null },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const { categoryIds = [], ...data } = input;
  const task = await prisma.task.create({
    data: {
      ...data,
      userId,
      parentId,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      tags: categoryIds.length ? { create: categoryIds.map((categoryId) => ({ categoryId })) } : undefined,
    },
    include: TASK_INCLUDE,
  });

  await writeAudit(prisma, userId, 'create', 'subtask', task.id, { parentId, title: task.title });
  return task;
}

export async function addDependency(taskId: string, dependsOnId: string, userId: string) {
  await getTask(taskId, userId);
  await getTask(dependsOnId, userId);
  if (taskId === dependsOnId) throw new AppError(400, 'A task cannot depend on itself');

  // BFS cycle detection
  const visited = new Set<string>();
  const queue = [dependsOnId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === taskId) throw new AppError(400, 'Circular dependency detected');
    if (visited.has(current)) continue;
    visited.add(current);
    const deps = await prisma.taskDependency.findMany({ where: { taskId: current }, select: { dependsOnId: true } });
    queue.push(...deps.map((d) => d.dependsOnId));
  }

  await prisma.taskDependency.upsert({
    where: { taskId_dependsOnId: { taskId, dependsOnId } },
    update: {},
    create: { taskId, dependsOnId },
  });

  await writeAudit(prisma, userId, 'add_dependency', 'task', taskId, { dependsOnId });
}

export async function removeDependency(taskId: string, dependsOnId: string, userId: string) {
  await getTask(taskId, userId);
  await prisma.taskDependency.deleteMany({ where: { taskId, dependsOnId } });
  await writeAudit(prisma, userId, 'remove_dependency', 'task', taskId, { dependsOnId });
}

export async function bulkUpdateTasks(
  userId: string,
  ids: string[],
  patch: { status?: TaskStatus; priority?: Priority },
) {
  if (!ids.length) return;
  await prisma.task.updateMany({ where: { id: { in: ids }, userId, deletedAt: null }, data: patch });
  await writeAudit(prisma, userId, 'bulk_update', 'task', ids[0], { ids, patch });
}

export async function bulkDeleteTasks(userId: string, ids: string[]) {
  if (!ids.length) return;
  await prisma.task.updateMany({
    where: { id: { in: ids }, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  await writeAudit(prisma, userId, 'bulk_delete', 'task', ids[0], { ids });
}
