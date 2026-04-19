import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { taskSharesService } from '@/services/taskShares.service';
import type { Task } from '@/types';
import { format } from 'date-fns';

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-green-100 text-green-700',
};

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    taskSharesService
      .getPublic(token)
      .then(({ task }) => setTask(task))
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 410) setError('This share link has expired.');
        else setError('Share link not found or is no longer valid.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-primary-600">TaskManager</h1>
          <p className="text-xs text-gray-400 mt-0.5">Shared task</p>
        </div>

        {loading && <p className="text-sm text-gray-500 text-center py-8">Loading…</p>}

        {error && (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🔒</p>
            <p className="text-gray-600">{error}</p>
          </div>
        )}

        {task && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className={`text-xl font-semibold ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                {task.title}
              </h2>
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[task.priority]}`}>
                {task.priority}
              </span>
            </div>

            {task.description && (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.description}</p>
            )}

            <div className="flex flex-wrap gap-2 text-sm text-gray-500">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {task.status}
              </span>
              {task.dueDate && (
                <span>Due {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
              )}
            </div>

            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map(({ category }) => (
                  <span
                    key={category.id}
                    className="text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            )}

            {task.subtasks && task.subtasks.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Subtasks ({task.subtasks.filter((s) => s.status === 'COMPLETED').length}/{task.subtasks.length})
                </h3>
                <div className="space-y-1.5">
                  {task.subtasks.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <span className={s.status === 'COMPLETED' ? 'text-green-500' : 'text-gray-300'}>
                        {s.status === 'COMPLETED' ? '✓' : '○'}
                      </span>
                      <span className={s.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-700'}>
                        {s.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
