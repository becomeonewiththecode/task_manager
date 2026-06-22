import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as adminService from '../services/admin.service';
import * as dockerService from '../services/docker.service';
import { AppError } from '../middleware/error.middleware';

// ─────────────────────────────────────────────
// User Management
// ─────────────────────────────────────────────

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc';

    const result = await adminService.listUsers({ page, limit, search, sortBy, sortOrder });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await adminService.getUserById(req.params.id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, username } = req.body;
    const user = await adminService.updateUser(req.params.id, { email, username }, req.userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.deleteUser(req.params.id, req.userId);
    if (!result) {
      throw new AppError(404, 'User not found');
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function resetUserPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const tempPassword = await adminService.resetUserPassword(req.params.id, req.userId);
    res.json({ tempPassword, message: 'Password reset successful. Share this password securely with the user.' });
  } catch (error) {
    next(error);
  }
}

export async function banUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body;
    const result = await adminService.banUser(req.params.id, reason, req.userId);
    if (!result) {
      throw new AppError(404, 'User not found');
    }
    res.json({ message: 'User banned successfully' });
  } catch (error) {
    next(error);
  }
}

export async function unbanUser(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.unbanUser(req.params.id, req.userId);
    if (!result) {
      throw new AppError(404, 'User not found');
    }
    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    next(error);
  }
}

export async function unlockUser(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.unlockUser(req.params.id, req.userId);
    if (!result) {
      throw new AppError(404, 'User not found');
    }
    res.json({ message: 'User account unlocked successfully' });
  } catch (error) {
    next(error);
  }
}

export async function lockUser(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.lockUser(req.params.id, req.userId);
    if (!result) {
      throw new AppError(404, 'User not found');
    }
    res.json({ message: 'User account locked successfully' });
  } catch (error) {
    next(error);
  }
}

export async function getUserActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const activity = await adminService.getUserActivity(req.params.id);
    res.json(activity);
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────
// User Sessions
// ─────────────────────────────────────────────

export async function getUserSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const sessions = await adminService.getUserSessions(req.params.id);
    if (sessions === null) {
      throw new AppError(404, 'User not found');
    }
    res.json(sessions);
  } catch (error) {
    next(error);
  }
}

export async function dropSession(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.dropSession(req.params.sessionId);
    if (!result) {
      throw new AppError(404, 'Session not found');
    }
    res.json({ message: 'Session dropped successfully' });
  } catch (error) {
    next(error);
  }
}

export async function dropAllUserSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.dropAllUserSessions(req.params.id);
    if (result === null) {
      throw new AppError(404, 'User not found');
    }
    res.json({ message: 'All sessions dropped successfully', count: result.count });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────
// Application Monitoring
// ─────────────────────────────────────────────

export async function getAppMonitoring(_req: Request, res: Response, next: NextFunction) {
  try {
    const monitoring = await adminService.getAppMonitoring();
    res.json(monitoring);
  } catch (error) {
    next(error);
  }
}

export async function getContainerStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await dockerService.getContainerStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

export async function getRestartHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const serviceName = req.query.serviceName as string;

    const result = await adminService.getRestartHistory({ page, limit, serviceName });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────
// System Stats & Health
// ─────────────────────────────────────────────

export async function getSystemStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await adminService.getSystemStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

export async function getHealthStatus(_req: Request, res: Response, next: NextFunction) {
  try {
    const health = await adminService.getHealthStatus();
    res.json(health);
  } catch (error) {
    next(error);
  }
}

export async function getRecentActivity(_req: Request, res: Response, next: NextFunction) {
  try {
    const activity = await adminService.getRecentActivity();
    res.json(activity);
  } catch (error) {
    next(error);
  }
}

export async function getServices(_req: Request, res: Response, next: NextFunction) {
  try {
    const services = await dockerService.getServiceStatus();
    res.json(services);
  } catch (error) {
    next(error);
  }
}

export async function restartService(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await dockerService.restartService(req.params.name);

    // Track the restart
    const adminUserId = (req as any).userId;
    if (adminUserId) {
      await adminService.trackRestart(req.params.name, adminUserId);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────
// System Settings
// ─────────────────────────────────────────────

export async function getSystemSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await adminService.getSystemSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
}

export async function updateSystemSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await adminService.updateSystemSettings(req.body, req.userId);
    res.json(settings);
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────
// Backup & Restore
// ─────────────────────────────────────────────

export async function backupDatabase(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.backupDatabase(req.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listBackups(_req: Request, res: Response, next: NextFunction) {
  try {
    const backups = await adminService.listBackups();
    res.json(backups);
  } catch (error) {
    next(error);
  }
}

export async function restoreDatabase(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.restoreDatabase(req.params.id, req.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteBackup(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.deleteBackup(req.params.id, req.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function downloadBackup(req: Request, res: Response, next: NextFunction) {
  try {
    const filepath = adminService.getBackupfilepath(req.params.id);
    res.download(filepath);
  } catch (error) {
    next(error);
  }
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

export const uploadBackupMiddleware = upload.single('backup');

export async function uploadBackupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new AppError(400, 'No backup file provided');
    }
    const result = await adminService.uploadBackup(req.file.originalname, req.file.buffer, req.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────
// Audit Logs
// ─────────────────────────────────────────────

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const userId = req.query.userId as string;
    const action = req.query.action as string;
    const entity = req.query.entity as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const result = await adminService.getAuditLogs({
      page, limit, userId, action, entity, startDate, endDate,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function exportAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.query.userId as string;
    const action = req.query.action as string;
    const entity = req.query.entity as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const csv = await adminService.exportAuditLogs({
      userId, action, entity, startDate, endDate,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await adminService.getAuditLogStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

export async function getLogRetention(_req: Request, res: Response, next: NextFunction) {
  try {
    const retention = await adminService.getLogRetention();
    res.json(retention);
  } catch (error) {
    next(error);
  }
}

export async function setLogRetention(req: Request, res: Response, next: NextFunction) {
  try {
    const { days } = req.body;
    if (typeof days !== 'number' || days < 1) {
      throw new AppError(400, 'Days must be a positive number');
    }
    const result = await adminService.setLogRetention(days);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function cleanupOldLogs(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.cleanupOldLogs();
    res.json(result);
  } catch (error) {
    next(error);
  }
}
