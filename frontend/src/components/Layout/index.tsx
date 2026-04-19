import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { Theme } from '@/types';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/settings', label: 'Settings' },
];

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'forest', label: 'Forest' },
];

export function Layout() {
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme, sidebarOpen, toggleSidebar } = useUiStore();
  const { isOnline } = useOnlineStatus();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {sidebarOpen && (
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-primary-600">TaskManager</h1>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as Theme)}
                className="mt-1 w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5"
              >
                {THEMES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-sm text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Sign out
            </button>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          {!isOnline && (
            <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-3 py-1 rounded-full font-medium">
              Offline — changes will sync when reconnected
            </span>
          )}
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
