import { api } from './api';
import type { User, Stats } from '@/types';

export const usersService = {
  getProfile: () =>
    api.get<User>('/users/me').then((r) => r.data),

  getStats: () =>
    api.get<Stats>('/users/me/stats').then((r) => r.data),

  updateEmail: (data: { email: string; password: string }) =>
    api.put<User>('/users/me/email', data).then((r) => r.data),

  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/users/me/password', data),

  deleteAccount: (password: string) =>
    api.delete('/users/me', { data: { password } }),
};
