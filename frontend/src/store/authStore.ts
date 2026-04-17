import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/services/auth.service';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      login: async (email, password, totpCode) => {
        const tokens = await authService.login({ email, password, totpCode });
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      },

      refresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');
        const tokens = await authService.refresh(refreshToken);
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      },

      logout: () => {
        const { refreshToken } = get();
        if (refreshToken) authService.logout(refreshToken).catch(() => {});
        set({ user: null, accessToken: null, refreshToken: null });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth',
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken }),
    },
  ),
);
