import { PrismaClient, User, Prisma } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { redis } from '../utils/redis';
import { logger } from '../utils/logger';
import { writeAudit } from '../utils/audit';
import * as dockerService from './docker.service';

const prisma = new PrismaClient();

const BACKUP_DIR = '/app/backups';

// ─────────────────────────────────────────────
// User Management (existing + new)
// ─────────────────────────────────────────────

export interface UserListParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedUsers {
  users: Omit<User, 'passwordHash' | 'totpSecret'>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listUsers(params: UserListParams): Promise<PaginatedUsers> {
  const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = params;
  const skip = (page - 1) * limit;

  const where = search ? {
    deletedAt: null,
    OR: [
      { email: { contains: search, mode: 'insensitive' as const } },
      { username: { contains: search, mode: 'insensitive' as const } },
    ],
  } : { deletedAt: null };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        totpEnabled: true,
        isBanned: true,
        bannedAt: true,
        banReason: true,
        failedLoginCount: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { tasks: true, sessions: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users as any,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      email: true,
      username: true,
      totpEnabled: true,
      isBanned: true,
      bannedAt: true,
      banReason: true,
      failedLoginCount: true,
      lockedUntil: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { tasks: true, sessions: true, auditLogs: true, timeEntries: true },
      },
    },
  });

  if (!user) {
    return null;
  }

  const recentActivity = await prisma.auditLog.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const taskStats = await prisma.task.groupBy({
    by: ['status'],
    where: { userId: id, deletedAt: null },
    _count: true,
  });

  return {
    ...user,
    recentActivity,
    taskStats,
  };
}

export async function updateUser(id: string, data: { email?: string; username?: string }, adminUserId?: string) {
  const user = await prisma.user.findUnique({
    where: { id, deletedAt: null },
  });

  if (!user) {
    return null;
  }

  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new Error('Email already in use');
    }
  }

  if (data.username && data.username !== user.username) {
    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existing) {
      throw new Error('Username already in use');
    }
  }

  const result = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      username: true,
      totpEnabled: true,
      isBanned: true,
      createdAt: true,
    },
  });

  if (adminUserId) {
    const fields = Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined);
    await writeAudit(prisma, adminUserId, 'admin_update', 'user', id, {
      targetUserId: id,
      fields,
      previousEmail: data.email && data.email !== user.email ? user.email : undefined,
      previousUsername: data.username && data.username !== user.username ? user.username : undefined,
    });
  }

  return result;
}

export async function deleteUser(id: string, adminUserId?: string) {
  const user = await prisma.user.findUnique({
    where: { id, deletedAt: null },
  });

  if (!user) {
    return null;
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  if (adminUserId) {
    await writeAudit(prisma, adminUserId, 'admin_delete', 'user', id, {
      targetUserId: id,
      targetEmail: user.email,
    });
  }

  return true;
}

export async function resetUserPassword(id: string, adminUserId?: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id, deletedAt: null },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({
    where: { id },
    data: {
      passwordHash,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  if (adminUserId) {
    await writeAudit(prisma, adminUserId, 'admin_reset_password', 'user', id, {
      targetUserId: id,
      targetEmail: user.email,
    });
  }

  return tempPassword;
}

export async function banUser(id: string, reason?: string, adminUserId?: string) {
  const user = await prisma.user.findUnique({
    where: { id, deletedAt: null },
  });

  if (!user) {
    return null;
  }

  await prisma.user.update({
    where: { id },
    data: {
      isBanned: true,
      bannedAt: new Date(),
      banReason: reason,
      lockedUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.session.deleteMany({
    where: { userId: id },
  });

  if (adminUserId) {
    await writeAudit(prisma, adminUserId, 'admin_ban', 'user', id, {
      targetUserId: id,
      targetEmail: user.email,
      reason,
    });
  }

  return true;
}

export async function unbanUser(id: string, adminUserId?: string) {
  const user = await prisma.user.findUnique({
    where: { id, deletedAt: null },
  });

  if (!user) {
    return null;
  }

  await prisma.user.update({
    where: { id },
    data: {
      isBanned: false,
      bannedAt: null,
      banReason: null,
      lockedUntil: null,
      failedLoginCount: 0,
    },
  });

  if (adminUserId) {
    await writeAudit(prisma, adminUserId, 'admin_unban', 'user', id, {
      targetUserId: id,
      targetEmail: user.email,
    });
  }

  return true;
}

export async function unlockUser(id: string, adminUserId?: string) {
  const user = await prisma.user.findUnique({
    where: { id, deletedAt: null },
  });

  if (!user) {
    return null;
  }

  await prisma.user.update({
    where: { id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  if (adminUserId) {
    await writeAudit(prisma, adminUserId, 'admin_unlock', 'user', id, {
      targetUserId: id,
      targetEmail: user.email,
    });
  }

  return true;
}

export async function lockUser(id: string, adminUserId?: string) {
  const user = await prisma.user.findUnique({
    where: { id, deletedAt: null },
  });

  if (!user) {
    return null;
  }

  await prisma.user.update({
    where: { id },
    data: {
      lockedUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.session.deleteMany({
    where: { userId: id },
  });

  if (adminUserId) {
    await writeAudit(prisma, adminUserId, 'admin_lock', 'user', id, {
      targetUserId: id,
      targetEmail: user.email,
    });
  }

  return true;
}

export async function getUserActivity(id: string) {
  const tasks = await prisma.task.findMany({
    where: { userId: id, deletedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });

  const timeEntries = await prisma.timeEntry.findMany({
    where: { userId: id },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      task: { select: { id: true, title: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: 20,
  });

  return { tasks, timeEntries };
}

// ─────────────────────────────────────────────
// User Sessions (NEW)
// ─────────────────────────────────────────────

export async function getUserSessions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  });

  if (!user) {
    return null;
  }

  const sessions = await prisma.session.findMany({
    where: { userId },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return sessions;
}

export async function dropSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return false;
  }

  await prisma.session.delete({
    where: { id: sessionId },
  });

  return true;
}

export async function dropAllUserSessions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  });

  if (!user) {
    return null;
  }

  const result = await prisma.session.deleteMany({
    where: { userId },
  });

  return { count: result.count };
}

// ─────────────────────────────────────────────
// Application Monitoring (NEW)
// ─────────────────────────────────────────────

export async function trackRestart(serviceName: string, adminUserId: string, reason?: string) {
  return prisma.serviceRestart.create({
    data: {
      serviceName,
      triggeredBy: adminUserId,
      reason,
    },
  });
}

export async function getRestartCounts() {
  const counts = await prisma.serviceRestart.groupBy({
    by: ['serviceName'],
    _count: true,
  });

  const result: Record<string, number> = {};
  for (const c of counts) {
    result[c.serviceName] = c._count;
  }
  return result;
}

export async function getRestartHistory(params: { page?: number; limit?: number; serviceName?: string }) {
  const { page = 1, limit = 20, serviceName } = params;
  const skip = (page - 1) * limit;

  const where = serviceName ? { serviceName } : {};

  const [logs, total] = await Promise.all([
    prisma.serviceRestart.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.serviceRestart.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAppMonitoring() {
  const [health, containerStats, restartCounts, diskUsage, cpuLoad] = await Promise.all([
    getHealthStatus(),
    dockerService.getContainerStats(),
    getRestartCounts(),
    dockerService.getDiskUsage(),
    dockerService.getCpuLoad(),
  ]);

  return {
    health,
    containers: containerStats,
    restartCounts,
    diskUsage,
    cpuLoad,
  };
}

// ─────────────────────────────────────────────
// System Stats & Health (existing)
// ─────────────────────────────────────────────

export async function getSystemStats() {
  const [
    totalUsers,
    activeUsers,
    bannedUsers,
    totalTasks,
    activeTasks,
    completedTasks,
    totalCategories,
    totalTemplates,
    totalSessions,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, isBanned: false } }),
    prisma.user.count({ where: { deletedAt: null, isBanned: true } }),
    prisma.task.count({ where: { deletedAt: null } }),
    prisma.task.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
    prisma.task.count({ where: { deletedAt: null, status: 'COMPLETED' } }),
    prisma.category.count(),
    prisma.taskTemplate.count(),
    prisma.session.count(),
  ]);

  const recentUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      email: true,
      username: true,
      createdAt: true,
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const recentTasks = await prisma.task.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      user: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return {
    users: { total: totalUsers, active: activeUsers, banned: bannedUsers },
    tasks: { total: totalTasks, active: activeTasks, completed: completedTasks },
    categories: totalCategories,
    templates: totalTemplates,
    sessions: totalSessions,
    recentUsers,
    recentTasks,
  };
}

export async function getHealthStatus() {
  const os = await import('os');

  const dbStart = Date.now();
  let dbStatus = 'ok';
  let dbResponseTime = 0;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbResponseTime = Date.now() - dbStart;
  } catch (error) {
    dbStatus = 'error';
    dbResponseTime = Date.now() - dbStart;
    logger.error({ error }, 'Database health check failed');
  }

  const redisStart = Date.now();
  let redisStatus = 'ok';
  let redisResponseTime = 0;

  try {
    await redis.ping();
    redisResponseTime = Date.now() - redisStart;
  } catch (error) {
    redisStatus = 'error';
    redisResponseTime = Date.now() - redisStart;
    logger.error({ error }, 'Redis health check failed');
  }

  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();

  return {
    status: dbStatus === 'ok' && redisStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    services: {
      database: { status: dbStatus, responseTime: dbResponseTime },
      redis: { status: redisStatus, responseTime: redisResponseTime },
    },
    memory: {
      rss: memoryUsage.rss,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
    },
    systemMemory: {
      total: totalMemory,
      free: freeMemory,
      used: totalMemory - freeMemory,
      percentUsed: Math.round(((totalMemory - freeMemory) / totalMemory) * 100 * 100) / 100,
    },
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
  };
}

export async function getRecentActivity() {
  const recentLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: {
        select: { id: true, email: true, username: true },
      },
    },
  });

  return recentLogs;
}

// ─────────────────────────────────────────────
// System Settings (NEW)
// ─────────────────────────────────────────────

const DEFAULT_SETTINGS: Record<string, string> = {
  backupRetentionDays: '30',
  logRetentionDays: '90',
  maintenanceWindowEnabled: 'false',
  maintenanceWindowStart: '02:00',
  maintenanceWindowEnd: '04:00',
  maintenanceMessage: 'System is under maintenance. Please try again later.',
};

export async function getSystemSettings() {
  const settings = await prisma.systemSetting.findMany();
  const result: Record<string, string> = { ...DEFAULT_SETTINGS };

  for (const s of settings) {
    result[s.key] = s.value;
  }

  return result;
}

export async function updateSystemSettings(settings: Record<string, string>, adminUserId?: string) {
  const updates = Object.entries(settings).map(([key, value]) =>
    prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  );

  await Promise.all(updates);

  if (adminUserId) {
    await writeAudit(prisma, adminUserId, 'settings_update', 'system', 'settings', {
      keys: Object.keys(settings),
    });
  }

  return getSystemSettings();
}

// ─────────────────────────────────────────────
// Backup & Restore (NEW)
// ─────────────────────────────────────────────

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export async function backupDatabase(adminUserId?: string) {
  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  const dbUrl = process.env.DATABASE_URL || '';
  const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!urlMatch) {
    throw new Error('Invalid DATABASE_URL format');
  }

  const [, user, password, host, port, dbname] = urlMatch;

  try {
    const dumpCmd = `PGPASSWORD='${password}' pg_dump -h ${host} -p ${port} -U ${user} -d ${dbname} --no-owner --no-acl -f "${filepath}"`;
    execSync(dumpCmd, { timeout: 120000 });

    const stats = fs.statSync(filepath);

    logger.info({ filename, size: stats.size }, 'Database backup created');

    if (adminUserId) {
      await writeAudit(prisma, adminUserId, 'backup_create', 'system', filename, {
        filename,
        size: stats.size,
      });
    }

    return {
      id: filename,
      filename,
      size: stats.size,
      createdAt: new Date().toISOString(),
      type: 'manual' as const,
    };
  } catch (error) {
    logger.error({ error }, 'Database backup failed');
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    throw new Error('Database backup failed');
  }
}

export async function listBackups() {
  ensureBackupDir();

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql'))
    .map(f => {
      const filepath = path.join(BACKUP_DIR, f);
      const stats = fs.statSync(filepath);
      return {
        id: f,
        filename: f,
        size: stats.size,
        createdAt: stats.mtime.toISOString(),
        type: 'manual' as const,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return files;
}

export async function restoreDatabase(backupId: string, adminUserId?: string) {
  const filepath = path.join(BACKUP_DIR, backupId);

  if (!fs.existsSync(filepath)) {
    throw new Error('Backup file not found');
  }

  const dbUrl = process.env.DATABASE_URL || '';
  const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!urlMatch) {
    throw new Error('Invalid DATABASE_URL format');
  }

  const [, user, password, host, port, dbname] = urlMatch;

  try {
    const restoreCmd = `PGPASSWORD='${password}' psql -h ${host} -p ${port} -U ${user} -d ${dbname} -f "${filepath}"`;
    execSync(restoreCmd, { timeout: 120000 });

    logger.info({ backupId }, 'Database restored successfully');

    if (adminUserId) {
      await writeAudit(prisma, adminUserId, 'backup_restore', 'system', backupId, {
        backupId,
        filename: backupId,
      });
    }

    return { message: 'Database restored successfully', backupId };
  } catch (error) {
    logger.error({ error, backupId }, 'Database restore failed');
    throw new Error('Database restore failed');
  }
}

export async function deleteBackup(backupId: string, adminUserId?: string) {
  const filepath = path.join(BACKUP_DIR, backupId);

  if (!fs.existsSync(filepath)) {
    throw new Error('Backup file not found');
  }

  const stats = fs.statSync(filepath);
  fs.unlinkSync(filepath);

  logger.info({ backupId }, 'Backup deleted');

  if (adminUserId) {
    await writeAudit(prisma, adminUserId, 'backup_delete', 'system', backupId, {
      backupId,
      size: stats.size,
    });
  }

  return { message: 'Backup deleted successfully', backupId };
}

export function getBackupfilepath(backupId: string): string {
  const filepath = path.join(BACKUP_DIR, backupId);
  if (!fs.existsSync(filepath)) {
    throw new Error('Backup file not found');
  }
  return filepath;
}

export async function uploadBackup(filename: string, fileBuffer: Buffer, adminUserId?: string) {
  ensureBackupDir();

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filepath = path.join(BACKUP_DIR, safeName);

  fs.writeFileSync(filepath, fileBuffer);

  const stats = fs.statSync(filepath);

  logger.info({ filename: safeName, size: stats.size }, 'Backup uploaded');

  if (adminUserId) {
    await writeAudit(prisma, adminUserId, 'backup_upload', 'system', safeName, {
      filename: safeName,
      size: stats.size,
      originalFilename: filename,
    });
  }

  return {
    id: safeName,
    filename: safeName,
    size: stats.size,
    createdAt: new Date().toISOString(),
    type: 'manual' as const,
  };
}

// ─────────────────────────────────────────────
// Audit Logs (enhanced)
// ─────────────────────────────────────────────

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entity?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export async function getAuditLogs(filters: AuditLogFilters) {
  const { userId, action, entity, startDate, endDate, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function exportAuditLogs(filters: AuditLogFilters) {
  const { userId, action, entity, startDate, endDate } = filters;

  const where: Prisma.AuditLogWhereInput = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  });

  const csvHeader = 'id,action,entity,entityId,userEmail,username,metadata,createdAt\n';
  const csvRows = logs.map(log =>
    [
      log.id,
      log.action,
      log.entity,
      log.entityId || '',
      log.user.email,
      log.user.username,
      log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""') : '',
      log.createdAt.toISOString(),
    ].map(v => `"${v}"`).join(',')
  ).join('\n');

  return csvHeader + csvRows;
}

export async function getAuditLogStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalLogs, logsByAction, logsByEntity, recentDaily] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.groupBy({
      by: ['action'],
      _count: true,
      orderBy: { _count: { action: 'desc' } },
    }),
    prisma.auditLog.groupBy({
      by: ['entity'],
      _count: true,
      orderBy: { _count: { entity: 'desc' } },
    }),
    prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "AuditLog"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `,
  ]);

  return {
    totalLogs,
    logsByAction: logsByAction.map(l => ({ action: l.action, count: l._count })),
    logsByEntity: logsByEntity.map(l => ({ entity: l.entity, count: l._count })),
    dailyCounts: recentDaily.map(d => ({ date: d.date.toISOString().split('T')[0], count: Number(d.count) })),
  };
}

export async function getLogRetention() {
  const settings = await getSystemSettings();
  return {
    logRetentionDays: parseInt(settings.logRetentionDays) || 90,
  };
}

export async function setLogRetention(days: number) {
  await updateSystemSettings({ logRetentionDays: String(days) });
  return { logRetentionDays: days };
}

export async function cleanupOldLogs() {
  const settings = await getSystemSettings();
  const retentionDays = parseInt(settings.logRetentionDays) || 90;

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });

  logger.info({ deletedCount: result.count, retentionDays }, 'Old audit logs cleaned up');

  return { deletedCount: result.count };
}
