import { api } from './api';
import type { AuthTokens, User } from '@/types';

export const authService = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post<{ user: User }>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string; totpCode?: string }) =>
    api.post<AuthTokens>('/auth/login', data).then((r) => r.data),

  adminLogin: (data: { email: string; password: string; totpCode?: string }) =>
    api.post<AuthTokens>('/auth/admin-login', data).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post<AuthTokens>('/auth/refresh', { refreshToken }).then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  setupTotp: () =>
    api.post<{ qrDataUrl: string; secret: string }>('/auth/totp/setup').then((r) => r.data),

  enableTotp: (code: string) =>
    api.post('/auth/totp/enable', { code }),

  disableTotp: (code: string) =>
    api.post('/auth/totp/disable', { code }),
};
