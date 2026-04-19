import { PrismaClient, Prisma } from '@prisma/client';

export async function writeAudit(
  prisma: PrismaClient,
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
    },
  });
}
