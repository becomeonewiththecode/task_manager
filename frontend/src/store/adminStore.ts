import { create } from 'zustand';
import { adminService } from '@/services/admin.service';
import type {
  User, AdminUser, MailConfig, MailTemplate, SystemStats, HealthStatus,
  AuditLogEntry, ServiceInfo, ContainerStats, AppMonitoring, RestartRecord,
  RestartHistory, UserSession, BackupInfo, PaginatedAuditLogs, AuditLogStats,
  SystemSettings,
} from '@/types';

interface AdminState {
  users: User[];
  totalUsers: number;
  currentPage: number;
  totalPages: number;
  selectedUser: AdminUser | null;
  mailConfig: MailConfig | null;
  mailTemplates: MailTemplate[];
  systemStats: SystemStats | null;
  healthStatus: HealthStatus | null;
  recentActivity: AuditLogEntry[];
  services: ServiceInfo[];
  monitoring: AppMonitoring | null;
  containerStats: ContainerStats[];
  restartHistory: RestartHistory | null;
  userSessions: UserSession[];
  backups: BackupInfo[];
  auditLogs: PaginatedAuditLogs | null;
  auditStats: AuditLogStats | null;
  systemSettings: SystemSettings | null;
  logRetention: { logRetentionDays: number } | null;
  loading: boolean;
  error: string | null;

  fetchUsers: (params?: { page?: number; limit?: number; search?: string }) => Promise<void>;
  fetchUser: (id: string) => Promise<void>;
  updateUser: (id: string, updates: { email?: string; username?: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  resetPassword: (id: string) => Promise<string>;
  banUser: (id: string, reason?: string) => Promise<void>;
  unbanUser: (id: string) => Promise<void>;
  lockUser: (id: string) => Promise<void>;
  unlockUser: (id: string) => Promise<void>;
  fetchMailConfig: () => Promise<void>;
  updateMailConfig: (config: Partial<MailConfig>) => Promise<void>;
  sendTestEmail: (to: string) => Promise<void>;
  fetchMailTemplates: () => Promise<void>;
  updateMailTemplate: (id: string, template: { subject?: string; body?: string }) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchHealth: () => Promise<void>;
  fetchActivity: () => Promise<void>;
  fetchServices: () => Promise<void>;
  restartService: (name: string) => Promise<void>;
  fetchMonitoring: () => Promise<void>;
  fetchContainerStats: () => Promise<void>;
  fetchRestartHistory: (params?: { page?: number; limit?: number; serviceName?: string }) => Promise<void>;
  fetchUserSessions: (userId: string) => Promise<void>;
  dropSession: (userId: string, sessionId: string) => Promise<void>;
  dropAllUserSessions: (userId: string) => Promise<void>;
  fetchBackups: () => Promise<void>;
  createBackup: () => Promise<BackupInfo>;
  restoreBackup: (id: string) => Promise<void>;
  deleteBackup: (id: string) => Promise<void>;
  downloadBackup: (id: string) => Promise<void>;
  uploadBackup: (file: File) => Promise<void>;
  fetchAuditLogs: (filters?: any) => Promise<void>;
  fetchAuditStats: () => Promise<void>;
  fetchLogRetention: () => Promise<void>;
  setLogRetention: (days: number) => Promise<void>;
  cleanupOldLogs: () => Promise<void>;
  fetchSystemSettings: () => Promise<void>;
  updateSystemSettings: (settings: Record<string, string>) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set) => ({
  users: [],
  totalUsers: 0,
  currentPage: 1,
  totalPages: 1,
  selectedUser: null,
  mailConfig: null,
  mailTemplates: [],
  systemStats: null,
  healthStatus: null,
  recentActivity: [],
  services: [],
  monitoring: null,
  containerStats: [],
  restartHistory: null,
  userSessions: [],
  backups: [],
  auditLogs: null,
  auditStats: null,
  systemSettings: null,
  logRetention: null,
  loading: false,
  error: null,

  // ─────────────────────────────────────────────
  // User Management
  // ─────────────────────────────────────────────

  fetchUsers: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const result = await adminService.listUsers(params);
      set({
        users: result.users,
        totalUsers: result.total,
        currentPage: result.page,
        totalPages: result.totalPages,
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchUser: async (id) => {
    set({ loading: true, error: null });
    try {
      const user = await adminService.getUser(id);
      set({ selectedUser: user, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  updateUser: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      await adminService.updateUser(id, updates);
      const { selectedUser } = useAdminStore.getState();
      if (selectedUser && selectedUser.id === id) {
        set({ selectedUser: { ...selectedUser, ...updates } });
      }
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  deleteUser: async (id) => {
    set({ loading: true, error: null });
    try {
      await adminService.deleteUser(id);
      const { users } = useAdminStore.getState();
      set({ users: users.filter((u) => u.id !== id), loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  resetPassword: async (id) => {
    set({ loading: true, error: null });
    try {
      const { tempPassword } = await adminService.resetPassword(id);
      set({ loading: false });
      return tempPassword;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  banUser: async (id, reason) => {
    set({ loading: true, error: null });
    try {
      await adminService.banUser(id, reason);
      const { selectedUser, users } = useAdminStore.getState();
      if (selectedUser && selectedUser.id === id) {
        set({ selectedUser: { ...selectedUser, isBanned: true } });
      }
      set({
        users: users.map((u) => (u.id === id ? { ...u, isBanned: true } : u)),
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  unbanUser: async (id) => {
    set({ loading: true, error: null });
    try {
      await adminService.unbanUser(id);
      const { selectedUser, users } = useAdminStore.getState();
      if (selectedUser && selectedUser.id === id) {
        set({ selectedUser: { ...selectedUser, isBanned: false } });
      }
      set({
        users: users.map((u) => (u.id === id ? { ...u, isBanned: false } : u)),
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  lockUser: async (id) => {
    set({ loading: true, error: null });
    try {
      await adminService.lockUser(id);
      const { selectedUser } = useAdminStore.getState();
      if (selectedUser && selectedUser.id === id) {
        set({ selectedUser: { ...selectedUser, lockedUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() } });
      }
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  unlockUser: async (id) => {
    set({ loading: true, error: null });
    try {
      await adminService.unlockUser(id);
      const { selectedUser } = useAdminStore.getState();
      if (selectedUser && selectedUser.id === id) {
        set({ selectedUser: { ...selectedUser, lockedUntil: null, failedLoginCount: 0 } });
      }
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  // ─────────────────────────────────────────────
  // Mail
  // ─────────────────────────────────────────────

  fetchMailConfig: async () => {
    set({ loading: true, error: null });
    try {
      const config = await adminService.getMailConfig();
      set({ mailConfig: config, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  updateMailConfig: async (config) => {
    set({ loading: true, error: null });
    try {
      const updated = await adminService.updateMailConfig(config);
      set({ mailConfig: updated, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  sendTestEmail: async (to) => {
    set({ loading: true, error: null });
    try {
      await adminService.sendTestEmail(to);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchMailTemplates: async () => {
    set({ loading: true, error: null });
    try {
      const templates = await adminService.getMailTemplates();
      set({ mailTemplates: templates, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  updateMailTemplate: async (id, template) => {
    set({ loading: true, error: null });
    try {
      const updated = await adminService.updateMailTemplate(id, template);
      const { mailTemplates } = useAdminStore.getState();
      set({
        mailTemplates: mailTemplates.map((t) => (t.id === id ? updated : t)),
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  // ─────────────────────────────────────────────
  // System Stats & Health
  // ─────────────────────────────────────────────

  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const stats = await adminService.getStats();
      set({ systemStats: stats, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchHealth: async () => {
    set({ loading: true, error: null });
    try {
      const health = await adminService.getHealth();
      set({ healthStatus: health, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchActivity: async () => {
    set({ loading: true, error: null });
    try {
      const activity = await adminService.getActivity();
      set({ recentActivity: activity, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchServices: async () => {
    set({ loading: true, error: null });
    try {
      const services = await adminService.getServices();
      set({ services, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  restartService: async (name) => {
    set({ loading: true, error: null });
    try {
      await adminService.restartService(name);
      const services = await adminService.getServices();
      set({ services, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  // ─────────────────────────────────────────────
  // Monitoring
  // ─────────────────────────────────────────────

  fetchMonitoring: async () => {
    set({ loading: true, error: null });
    try {
      const monitoring = await adminService.getMonitoring();
      set({ monitoring, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchContainerStats: async () => {
    set({ loading: true, error: null });
    try {
      const containerStats = await adminService.getContainerStats();
      set({ containerStats, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchRestartHistory: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const restartHistory = await adminService.getRestartHistory(params);
      set({ restartHistory, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  // ─────────────────────────────────────────────
  // User Sessions
  // ─────────────────────────────────────────────

  fetchUserSessions: async (userId) => {
    set({ loading: true, error: null });
    try {
      const sessions = await adminService.getUserSessions(userId);
      set({ userSessions: sessions, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  dropSession: async (userId, sessionId) => {
    set({ loading: true, error: null });
    try {
      await adminService.dropSession(userId, sessionId);
      const { userSessions } = useAdminStore.getState();
      set({ userSessions: userSessions.filter((s) => s.id !== sessionId), loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  dropAllUserSessions: async (userId) => {
    set({ loading: true, error: null });
    try {
      await adminService.dropAllUserSessions(userId);
      set({ userSessions: [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  // ─────────────────────────────────────────────
  // Backup & Restore
  // ─────────────────────────────────────────────

  fetchBackups: async () => {
    set({ loading: true, error: null });
    try {
      const backups = await adminService.listBackups();
      set({ backups, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createBackup: async () => {
    set({ loading: true, error: null });
    try {
      const backup = await adminService.backupDatabase();
      const backups = await adminService.listBackups();
      set({ backups, loading: false });
      return backup;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  restoreBackup: async (id) => {
    set({ loading: true, error: null });
    try {
      await adminService.restoreDatabase(id);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteBackup: async (id) => {
    set({ loading: true, error: null });
    try {
      await adminService.deleteBackup(id);
      const { backups } = useAdminStore.getState();
      set({ backups: backups.filter((b) => b.id !== id), loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  downloadBackup: async (id) => {
    set({ loading: true, error: null });
    try {
      await adminService.downloadBackup(id);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  uploadBackup: async (file) => {
    set({ loading: true, error: null });
    try {
      await adminService.uploadBackup(file);
      const backups = await adminService.listBackups();
      set({ backups, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // ─────────────────────────────────────────────
  // Audit Logs
  // ─────────────────────────────────────────────

  fetchAuditLogs: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const auditLogs = await adminService.getAuditLogs(filters);
      set({ auditLogs, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchAuditStats: async () => {
    set({ loading: true, error: null });
    try {
      const auditStats = await adminService.getAuditLogStats();
      set({ auditStats, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchLogRetention: async () => {
    set({ loading: true, error: null });
    try {
      const logRetention = await adminService.getLogRetention();
      set({ logRetention, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  setLogRetention: async (days) => {
    set({ loading: true, error: null });
    try {
      const result = await adminService.setLogRetention(days);
      set({ logRetention: result, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  cleanupOldLogs: async () => {
    set({ loading: true, error: null });
    try {
      await adminService.cleanupOldLogs();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  // ─────────────────────────────────────────────
  // System Settings
  // ─────────────────────────────────────────────

  fetchSystemSettings: async () => {
    set({ loading: true, error: null });
    try {
      const systemSettings = await adminService.getSystemSettings();
      set({ systemSettings, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  updateSystemSettings: async (settings) => {
    set({ loading: true, error: null });
    try {
      const updated = await adminService.updateSystemSettings(settings);
      set({ systemSettings: updated, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
}));
