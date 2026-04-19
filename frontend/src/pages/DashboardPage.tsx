import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { usersService } from '@/services/users.service';
import { tasksService } from '@/services/tasks.service';
import { categoriesService } from '@/services/categories.service';
import { TaskForm } from '@/components/TaskForm';
import { PRIORITY_STYLES } from '@/components/TaskCard';
import type { Stats, Task, Category } from '@/types';
import toast from 'react-hot-toast';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tomorrowTasks, setTomorrowTasks] = useState<Task[]>([]);
  const [tomorrowLoading, setTomorrowLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const tomorrow = addDays(new Date(), 1);
  const tomorrowLabel = format(tomorrow, 'EEEE, MMMM d');

  useEffect(() => {
    usersService.getStats().then(setStats).catch(console.error);
    categoriesService.list().then(setCategories).catch(console.error);

    setTomorrowLoading(true);
    const from = format(startOfDay(tomorrow), "yyyy-MM-dd'T'HH:mm:ss");
    const to = format(endOfDay(tomorrow), "yyyy-MM-dd'T'HH:mm:ss");
    tasksService.list({ dueDateFrom: from, dueDateTo: to, limit: 50, status: 'ACTIVE' })
      .then((r) => {
        const sorted = r.tasks.sort((a, b) => {
          const aD = new Date(a.dueDate!);
          const bD = new Date(b.dueDate!);
          const aHasTime = aD.getHours() !== 0 || aD.getMinutes() !== 0;
          const bHasTime = bD.getHours() !== 0 || bD.getMinutes() !== 0;
          if (aHasTime && !bHasTime) return -1;
          if (!aHasTime && bHasTime) return 1;
          return aD.getTime() - bD.getTime();
        });
        setTomorrowTasks(sorted);
      })
      .catch(console.error)
      .finally(() => setTomorrowLoading(false));
  }, []);

  const handleEditSubmit = async (data: Partial<Task> & { categoryIds?: string[] }) => {
    if (!editingTask) return;
    try {
      const updated = await tasksService.update(editingTask.id, data);
      setTomorrowTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success('Task updated');
    } catch {
      toast.error('Failed to update task');
    }
    setEditingTask(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome back, {user?.username ?? ''}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Here's your task overview</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Tasks" value={stats.total} color="text-gray-900 dark:text-gray-100" />
          <StatCard label="Active" value={stats.active} color="text-blue-600" />
          <StatCard label="Completed" value={stats.completed} color="text-green-600" />
          <StatCard label="Completion Rate" value={`${stats.completionRate}%`} color="text-primary-600" />
        </div>
      )}

      {stats && stats.byPriority.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Tasks by Priority</h3>
          <div className="space-y-3">
            {stats.byPriority.map(({ priority, _count }) => (
              <div key={priority} className="flex items-center gap-3">
                <span className="text-xs w-16 text-gray-500 dark:text-gray-400">{priority}</span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      priority === 'HIGH' ? 'bg-red-500' : priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.round((_count / (stats.total || 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-right">{_count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tomorrow's Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Tomorrow — {tomorrowLabel}
          </h3>
          <Link
            to="/calendar"
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            View calendar →
          </Link>
        </div>

        {tomorrowLoading ? (
          <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
        ) : tomorrowTasks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No tasks scheduled for tomorrow.</p>
        ) : (
          <div className="space-y-2">
            {tomorrowTasks.map((task) => {
              const d = new Date(task.dueDate!);
              const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
              return (
                <button
                  key={task.id}
                  onClick={() => setEditingTask(task)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[task.priority]}`}>
                    {task.priority}
                  </span>
                  <span className="flex-1 text-sm text-gray-800 dark:text-gray-100 truncate">
                    {task.title}
                  </span>
                  {hasTime && (
                    <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                      {format(d, 'h:mm a')}
                    </span>
                  )}
                  {task.location && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      title={task.location}
                    >
                      📍
                    </a>
                  )}
                  {task.webLink && (
                    <a
                      href={task.webLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      title={task.webLink}
                    >
                      🔗
                    </a>
                  )}
                  <span className="shrink-0 text-gray-300 dark:text-gray-600 text-xs">✎</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Link
          to="/tasks"
          className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          View all tasks →
        </Link>
        <Link
          to="/tasks?new=1"
          className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          + New task
        </Link>
        <Link
          to="/analytics"
          className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          View analytics →
        </Link>
      </div>

      {/* Edit modal */}
      {editingTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingTask(null); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Task</h3>
            <TaskForm
              task={editingTask}
              categories={categories}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditingTask(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
