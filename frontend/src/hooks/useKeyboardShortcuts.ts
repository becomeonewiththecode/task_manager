import { useEffect } from 'react';
import { useUiStore } from '@/store/uiStore';
import type { ShortcutConfig } from '@/types';

type ShortcutHandlers = Partial<Record<keyof ShortcutConfig, () => void>>;

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const shortcuts = useUiStore((s) => s.shortcuts);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      for (const [action, callback] of Object.entries(handlers) as [keyof ShortcutConfig, () => void][]) {
        if (e.key === shortcuts[action] && callback) {
          e.preventDefault();
          callback();
          break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, handlers]);
}
