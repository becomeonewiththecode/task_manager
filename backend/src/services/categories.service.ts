import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export async function listCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createCategory(userId: string, name: string, color: string) {
  return prisma.category.create({ data: { userId, name, color } });
}

export async function updateCategory(id: string, userId: string, name?: string, color?: string) {
  const cat = await prisma.category.findFirst({ where: { id, userId } });
  if (!cat) throw new AppError(404, 'Category not found');
  return prisma.category.update({ where: { id }, data: { name, color } });
}

export async function deleteCategory(id: string, userId: string) {
  const cat = await prisma.category.findFirst({ where: { id, userId } });
  if (!cat) throw new AppError(404, 'Category not found');
  await prisma.category.delete({ where: { id } });
}
