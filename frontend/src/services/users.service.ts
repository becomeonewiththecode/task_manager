import { api } from './api';
import type { User, Stats, AnalyticsData, AuditLogEntry } from '@/types';

export const usersService = {
  getProfile: () =>
    api.get<User>('/users/me').then((r) => r.data),

  getStats: () =>
    api.get<Stats>('/users/me/stats').then((r) => r.data),

  getAnalytics: (params: { from?: string; to?: string }) =>
    api.get<AnalyticsData>('/users/me/analytics', { params }).then((r) => r.data),

  getActivity: (params?: { page?: number; limit?: number; entity?: string }) =>
    api.get<{ entries: AuditLogEntry[]; total: number; page: number; totalPages: number }>(
      '/users/me/activity', { params }
    ).then((r) => r.data),

  updateEmail: (data: { email: string; password: string }) =>
    api.put<User>('/users/me/email', data).then((r) => r.data),

  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/users/me/password', data),

  deleteAccount: (password: string) =>
    api.delete('/users/me', { data: { password } }),

  exportData: () =>
    api.get('/users/me/export').then((r) => r.data),

  importData: (backup: unknown) =>
    api.post<{ imported: { categories: number; tasks: number; taskTemplates: number } }>(
      '/users/me/import', backup
    ).then((r) => r.data),
};
