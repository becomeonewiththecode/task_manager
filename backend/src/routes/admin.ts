import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import * as adminController from '../controllers/admin.controller';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// ─────────────────────────────────────────────
// User Management
// ─────────────────────────────────────────────
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/reset-password', adminController.resetUserPassword);
router.post('/users/:id/ban', adminController.banUser);
router.post('/users/:id/unban', adminController.unbanUser);
router.post('/users/:id/unlock', adminController.unlockUser);
router.post('/users/:id/lock', adminController.lockUser);
router.get('/users/:id/activity', adminController.getUserActivity);

// ─────────────────────────────────────────────
// User Sessions
// ─────────────────────────────────────────────
router.get('/users/:id/sessions', adminController.getUserSessions);
router.delete('/users/:id/sessions/:sessionId', adminController.dropSession);
router.delete('/users/:id/sessions', adminController.dropAllUserSessions);

// ─────────────────────────────────────────────
// Application Monitoring
// ─────────────────────────────────────────────
router.get('/monitoring', adminController.getAppMonitoring);
router.get('/monitoring/stats', adminController.getContainerStats);
router.get('/monitoring/restarts', adminController.getRestartHistory);

// ─────────────────────────────────────────────
// System Stats & Health
// ─────────────────────────────────────────────
router.get('/stats', adminController.getSystemStats);
router.get('/health', adminController.getHealthStatus);
router.get('/activity', adminController.getRecentActivity);

// ─────────────────────────────────────────────
// Service Management
// ─────────────────────────────────────────────
router.get('/services', adminController.getServices);
router.post('/services/:name/restart', adminController.restartService);

// ─────────────────────────────────────────────
// System Settings
// ─────────────────────────────────────────────
router.get('/settings', adminController.getSystemSettings);
router.put('/settings', adminController.updateSystemSettings);

// ─────────────────────────────────────────────
// Backup & Restore
// ─────────────────────────────────────────────
router.post('/backup', adminController.backupDatabase);
router.get('/backup', adminController.listBackups);
router.post('/backup/upload', adminController.uploadBackupMiddleware, adminController.uploadBackupHandler);
router.get('/backup/:id/download', adminController.downloadBackup);
router.post('/backup/:id/restore', adminController.restoreDatabase);
router.delete('/backup/:id', adminController.deleteBackup);

// ─────────────────────────────────────────────
// Audit Logs
// ─────────────────────────────────────────────
router.get('/audit', adminController.getAuditLogs);
router.get('/audit/export', adminController.exportAuditLogs);
router.get('/audit/stats', adminController.getAuditLogStats);
router.get('/audit/retention', adminController.getLogRetention);
router.put('/audit/retention', adminController.setLogRetention);
router.post('/audit/cleanup', adminController.cleanupOldLogs);

export default router;
