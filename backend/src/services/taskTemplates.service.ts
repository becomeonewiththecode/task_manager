import { PrismaClient, Priority, Recurring } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { writeAudit } from '../utils/audit';
import { createTask } from './tasks.service';

const prisma = new PrismaClient();

export interface TemplateInput {
  name: string;
  description?: string;
  priority?: Priority;
  recurring?: Recurring;
  categoryIds?: string[];
}

export async function listTemplates(userId: string) {
  return prisma.taskTemplate.findMany({ where: { userId }, orderBy: { name: 'asc' } });
}

export async function createTemplate(userId: string, input: TemplateInput) {
  const { categoryIds = [], ...data } = input;
  const template = await prisma.taskTemplate.create({ data: { ...data, userId, categoryIds } });
  await writeAudit(prisma, userId, 'create', 'template', template.id, { name: template.name });
  return template;
}

export async function updateTemplate(id: string, userId: string, input: Partial<TemplateInput>) {
  const existing = await prisma.taskTemplate.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, 'Template not found');
  const { categoryIds, ...data } = input;
  const updated = await prisma.taskTemplate.update({
    where: { id },
    data: { ...data, ...(categoryIds !== undefined && { categoryIds }) },
  });
  await writeAudit(prisma, userId, 'update', 'template', id, {
    previousName: existing.name,
    name: data.name ?? existing.name,
  });
  return updated;
}

export async function deleteTemplate(id: string, userId: string) {
  const existing = await prisma.taskTemplate.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, 'Template not found');
  await prisma.taskTemplate.delete({ where: { id } });
  await writeAudit(prisma, userId, 'delete', 'template', id, { name: existing.name });
}

export async function applyTemplate(
  templateId: string,
  userId: string,
  overrides: { title?: string; dueDate?: Date } = {},
) {
  const template = await prisma.taskTemplate.findFirst({ where: { id: templateId, userId } });
  if (!template) throw new AppError(404, 'Template not found');

  // Verify category IDs still exist for this user
  const validCats = await prisma.category.findMany({
    where: { id: { in: template.categoryIds }, userId },
    select: { id: true },
  });
  const validCatIds = validCats.map((c) => c.id);

  return createTask(userId, {
    title: overrides.title ?? template.name,
    description: template.description ?? undefined,
    priority: template.priority,
    recurring: template.recurring ?? undefined,
    categoryIds: validCatIds,
    dueDate: overrides.dueDate,
  });
}
