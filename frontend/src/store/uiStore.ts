import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme, ShortcutConfig } from '@/types';

const DEFAULT_SHORTCUTS: ShortcutConfig = {
  newTask: 'n',
  focusSearch: '/',
  toggleSidebar: 'b',
  openCalendar: 'c',
  openAnalytics: 'a',
};

interface UiState {
  theme: Theme;
  sidebarOpen: boolean;
  shortcuts: ShortcutConfig;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setShortcut: (action: keyof ShortcutConfig, key: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: true,
      shortcuts: DEFAULT_SHORTCUTS,
      setTheme: (theme) => {
        const root = document.documentElement;
        root.classList.remove('dark', 'theme-ocean', 'theme-forest');
        if (theme === 'dark') root.classList.add('dark');
        else if (theme !== 'light') root.classList.add(`theme-${theme}`);
        set({ theme });
      },
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setShortcut: (action, key) =>
        set((s) => ({ shortcuts: { ...s.shortcuts, [action]: key } })),
    }),
    {
      name: 'ui',
      partialize: (s) => ({ theme: s.theme, shortcuts: s.shortcuts }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const root = document.documentElement;
        root.classList.remove('dark', 'theme-ocean', 'theme-forest');
        if (state.theme === 'dark') root.classList.add('dark');
        else if (state.theme !== 'light') root.classList.add(`theme-${state.theme}`);
      },
    },
  ),
);
