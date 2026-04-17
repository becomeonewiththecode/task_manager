import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme } from '@/types';

interface UiState {
  theme: Theme;
  sidebarOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: true,
      setTheme: (theme) => {
        const root = document.documentElement;
        root.classList.remove('dark', 'theme-ocean', 'theme-forest');
        if (theme === 'dark') root.classList.add('dark');
        else if (theme !== 'light') root.classList.add(`theme-${theme}`);
        set({ theme });
      },
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    { name: 'ui', partialize: (s) => ({ theme: s.theme }) },
  ),
);
