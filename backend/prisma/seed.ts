import { PrismaClient, Priority } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      username: 'demo',
      passwordHash,
    },
  });

  const work = await prisma.category.upsert({
    where: { userId_name: { userId: user.id, name: 'Work' } },
    update: {},
    create: { userId: user.id, name: 'Work', color: '#6366f1' },
  });

  const personal = await prisma.category.upsert({
    where: { userId_name: { userId: user.id, name: 'Personal' } },
    update: {},
    create: { userId: user.id, name: 'Personal', color: '#22c55e' },
  });

  await prisma.task.createMany({
    skipDuplicates: true,
    data: [
      { userId: user.id, title: 'Set up project repository', priority: Priority.HIGH, sortOrder: 0 },
      { userId: user.id, title: 'Write API documentation', priority: Priority.MEDIUM, sortOrder: 1 },
      { userId: user.id, title: 'Review pull requests', priority: Priority.LOW, sortOrder: 2 },
    ],
  });

  console.log('Seed complete. Demo user: demo@example.com / Password123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
