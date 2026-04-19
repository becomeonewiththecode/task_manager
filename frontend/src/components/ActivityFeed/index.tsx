import { formatDistanceToNow } from 'date-fns';
import type { AuditLogEntry } from '@/types';

const ACTION_ICONS: Record<string, string> = {
  create: '✚',
  update: '✎',
  delete: '✕',
  bulk_update: '⚡',
  bulk_delete: '🗑',
  add_dependency: '🔗',
  remove_dependency: '✂',
};

const ACTION_COLORS: Record<string, string> = {
  create: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  update: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  delete: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  bulk_update: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  bulk_delete: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  add_dependency: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  remove_dependency: 'text-gray-600 bg-gray-100 dark:bg-gray-700',
};

interface Props {
  entries: AuditLogEntry[];
  loading?: boolean;
}

export function ActivityFeed({ entries, loading }: Props) {
  if (loading) {
    return <div className="text-center py-6 text-sm text-gray-400">Loading activity…</div>;
  }

  if (!entries.length) {
    return <div className="text-center py-6 text-sm text-gray-400">No activity yet.</div>;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const icon = ACTION_ICONS[entry.action] ?? '·';
        const color = ACTION_COLORS[entry.action] ?? 'text-gray-600 bg-gray-100 dark:bg-gray-700';
        const label = entry.action.replace(/_/g, ' ');

        return (
          <div key={entry.id} className="flex items-start gap-3">
            <span className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${color}`}>
              {icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium capitalize">{label}</span>
                {' '}
                <span className="text-gray-500 dark:text-gray-400">{entry.entity}</span>
                {entry.metadata && typeof entry.metadata === 'object' && 'title' in entry.metadata && (
                  <span className="text-gray-700 dark:text-gray-300"> — {String((entry.metadata as any).title)}</span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
