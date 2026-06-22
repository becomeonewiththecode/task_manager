import { PrismaClient, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const demo = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      username: 'demo',
      passwordHash,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@taskmanager.local' },
    update: {},
    create: {
      email: 'admin@taskmanager.local',
      username: 'admin',
      passwordHash,
    },
  });

  const work = await prisma.category.upsert({
    where: { userId_name: { userId: demo.id, name: 'Work' } },
    update: {},
    create: { userId: demo.id, name: 'Work', color: '#6366f1' },
  });

  const personal = await prisma.category.upsert({
    where: { userId_name: { userId: demo.id, name: 'Personal' } },
    update: {},
    create: { userId: demo.id, name: 'Personal', color: '#22c55e' },
  });

  await prisma.task.createMany({
    skipDuplicates: true,
    data: [
      { userId: demo.id, title: 'Set up project repository', priority: Priority.HIGH, sortOrder: 0 },
      { userId: demo.id, title: 'Write API documentation', priority: Priority.MEDIUM, sortOrder: 1 },
      { userId: demo.id, title: 'Review pull requests', priority: Priority.LOW, sortOrder: 2 },
    ],
  });

  console.log('Seed complete.');
  console.log('  Demo user:  demo@example.com / Password123!');
  console.log('  Admin user: admin@taskmanager.local / Password123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
