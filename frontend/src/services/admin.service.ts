import { api } from './api';
import type {
  User, AdminUser, PaginatedUsers, MailConfig, MailTemplate,
  SystemStats, HealthStatus, AuditLogEntry, ServiceInfo,
  ContainerStats, AppMonitoring, RestartRecord, RestartHistory,
  UserSession, BackupInfo, PaginatedAuditLogs, AuditLogStats, SystemSettings,
} from '@/types';

export const adminService = {
  // ─────────────────────────────────────────────
  // User Management
  // ─────────────────────────────────────────────

  async listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedUsers> {
    const { data } = await api.get('/admin/users', { params });
    return data;
  },

  async getUser(id: string): Promise<AdminUser> {
    const { data } = await api.get(`/admin/users/${id}`);
    return data;
  },

  async updateUser(id: string, updates: { email?: string; username?: string }): Promise<User> {
    const { data } = await api.put(`/admin/users/${id}`, updates);
    return data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`);
  },

  async resetPassword(id: string): Promise<{ tempPassword: string }> {
    const { data } = await api.post(`/admin/users/${id}/reset-password`);
    return data;
  },

  async banUser(id: string, reason?: string): Promise<void> {
    await api.post(`/admin/users/${id}/ban`, { reason });
  },

  async unbanUser(id: string): Promise<void> {
    await api.post(`/admin/users/${id}/unban`);
  },

  async unlockUser(id: string): Promise<void> {
    await api.post(`/admin/users/${id}/unlock`);
  },

  async lockUser(id: string): Promise<void> {
    await api.post(`/admin/users/${id}/lock`);
  },

  async getUserActivity(id: string): Promise<{
    tasks: Array<{ id: string; title: string; status: string; priority: string; createdAt: string; updatedAt: string }>;
    timeEntries: Array<{ id: string; startedAt: string; endedAt: string | null; task: { id: string; title: string } }>;
  }> {
    const { data } = await api.get(`/admin/users/${id}/activity`);
    return data;
  },

  // ─────────────────────────────────────────────
  // User Sessions
  // ─────────────────────────────────────────────

  async getUserSessions(userId: string): Promise<UserSession[]> {
    const { data } = await api.get(`/admin/users/${userId}/sessions`);
    return data;
  },

  async dropSession(userId: string, sessionId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}/sessions/${sessionId}`);
  },

  async dropAllUserSessions(userId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}/sessions`);
  },

  // ─────────────────────────────────────────────
  // Application Monitoring
  // ─────────────────────────────────────────────

  async getMonitoring(): Promise<AppMonitoring> {
    const { data } = await api.get('/admin/monitoring');
    return data;
  },

  async getContainerStats(): Promise<ContainerStats[]> {
    const { data } = await api.get('/admin/monitoring/stats');
    return data;
  },

  async getRestartHistory(params?: {
    page?: number;
    limit?: number;
    serviceName?: string;
  }): Promise<RestartHistory> {
    const { data } = await api.get('/admin/monitoring/restarts', { params });
    return data;
  },

  // ─────────────────────────────────────────────
  // System Stats & Health
  // ─────────────────────────────────────────────

  async getStats(): Promise<SystemStats> {
    const { data } = await api.get('/admin/stats');
    return data;
  },

  async getHealth(): Promise<HealthStatus> {
    const { data } = await api.get('/admin/health');
    return data;
  },

  async getActivity(): Promise<AuditLogEntry[]> {
    const { data } = await api.get('/admin/activity');
    return data;
  },

  // ─────────────────────────────────────────────
  // Service Management
  // ─────────────────────────────────────────────

  async getServices(): Promise<ServiceInfo[]> {
    const { data } = await api.get('/admin/services');
    return data;
  },

  async restartService(name: string): Promise<{ service: string; container: string; message: string }> {
    const { data } = await api.post(`/admin/services/${name}/restart`);
    return data;
  },

  // ─────────────────────────────────────────────
  // Mail Configuration
  // ─────────────────────────────────────────────

  async getMailConfig(): Promise<MailConfig> {
    const { data } = await api.get('/mail/config');
    return data;
  },

  async updateMailConfig(config: Partial<MailConfig>): Promise<MailConfig> {
    const { data } = await api.put('/mail/config', config);
    return data;
  },

  async sendTestEmail(to: string): Promise<{ messageId: string }> {
    const { data } = await api.post('/mail/test', { to });
    return data;
  },

  async getMailTemplates(): Promise<MailTemplate[]> {
    const { data } = await api.get('/mail/templates');
    return data;
  },

  async updateMailTemplate(id: string, template: { subject?: string; body?: string }): Promise<MailTemplate> {
    const { data } = await api.put(`/mail/templates/${id}`, template);
    return data;
  },

  // ─────────────────────────────────────────────
  // System Settings
  // ─────────────────────────────────────────────

  async getSystemSettings(): Promise<SystemSettings> {
    const { data } = await api.get('/admin/settings');
    return data;
  },

  async updateSystemSettings(settings: Record<string, string>): Promise<SystemSettings> {
    const { data } = await api.put('/admin/settings', settings);
    return data;
  },

  // ─────────────────────────────────────────────
  // Backup & Restore
  // ─────────────────────────────────────────────

  async backupDatabase(): Promise<BackupInfo> {
    const { data } = await api.post('/admin/backup');
    return data;
  },

  async listBackups(): Promise<BackupInfo[]> {
    const { data } = await api.get('/admin/backup');
    return data;
  },

  async restoreDatabase(backupId: string): Promise<{ message: string; backupId: string }> {
    const { data } = await api.post(`/admin/backup/${backupId}/restore`);
    return data;
  },

  async deleteBackup(backupId: string): Promise<void> {
    await api.delete(`/admin/backup/${backupId}`);
  },

  async downloadBackup(backupId: string): Promise<void> {
    const { data } = await api.get(`/admin/backup/${backupId}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupId;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async uploadBackup(file: File): Promise<BackupInfo> {
    const formData = new FormData();
    formData.append('backup', file);
    const { data } = await api.post('/admin/backup/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // ─────────────────────────────────────────────
  // Audit Logs
  // ─────────────────────────────────────────────

  async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedAuditLogs> {
    const { data } = await api.get('/admin/audit', { params: filters });
    return data;
  },

  async exportAuditLogs(filters: {
    userId?: string;
    action?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<string> {
    const { data } = await api.get('/admin/audit/export', {
      params: filters,
      responseType: 'text',
    });
    return data;
  },

  async getAuditLogStats(): Promise<AuditLogStats> {
    const { data } = await api.get('/admin/audit/stats');
    return data;
  },

  async getLogRetention(): Promise<{ logRetentionDays: number }> {
    const { data } = await api.get('/admin/audit/retention');
    return data;
  },

  async setLogRetention(days: number): Promise<{ logRetentionDays: number }> {
    const { data } = await api.put('/admin/audit/retention', { days });
    return data;
  },

  async cleanupOldLogs(): Promise<{ deletedCount: number }> {
    const { data } = await api.post('/admin/audit/cleanup');
    return data;
  },
};
