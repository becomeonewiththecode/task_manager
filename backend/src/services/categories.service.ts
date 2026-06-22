import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { writeAudit } from '../utils/audit';

const prisma = new PrismaClient();

export async function listCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createCategory(userId: string, name: string, color: string) {
  const category = await prisma.category.create({ data: { userId, name, color } });
  await writeAudit(prisma, userId, 'create', 'category', category.id, { name, color });
  return category;
}

export async function updateCategory(id: string, userId: string, name?: string, color?: string) {
  const cat = await prisma.category.findFirst({ where: { id, userId } });
  if (!cat) throw new AppError(404, 'Category not found');
  const updated = await prisma.category.update({ where: { id }, data: { name, color } });
  await writeAudit(prisma, userId, 'update', 'category', id, {
    previousName: cat.name,
    previousColor: cat.color,
    name: name ?? cat.name,
    color: color ?? cat.color,
  });
  return updated;
}

export async function deleteCategory(id: string, userId: string) {
  const cat = await prisma.category.findFirst({ where: { id, userId } });
  if (!cat) throw new AppError(404, 'Category not found');
  await prisma.category.delete({ where: { id } });
  await writeAudit(prisma, userId, 'delete', 'category', id, { name: cat.name });
}
