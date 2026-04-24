import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { format, isSameDay, endOfDay, addDays } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useTaskStore } from '@/store/taskStore';
import { usersService } from '@/services/users.service';
import { tasksService } from '@/services/tasks.service';
import { categoriesService } from '@/services/categories.service';
import { TaskForm } from '@/components/TaskForm';
import { TaskCard } from '@/components/TaskCard';
import type { Stats, Task, Category } from '@/types';
import toast from 'react-hot-toast';

type DayView = 'today' | 'tomorrow';

function getTasksForDay(allTasks: Task[], day: Date): Task[] {
  const filtered = allTasks.reduce<Task[]>((acc, t) => {
    if (!t.dueDate) return acc;
    const due = new Date(t.dueDate);
    if (isSameDay(due, day)) {
      acc.push(t);
      return acc;
    }
    if (!t.recurring) return acc;
    const dayMid = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dueMid = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    if (dayMid < dueMid) return acc;
    let include = false;
    switch (t.recurring) {
      case 'DAILY': include = true; break;
      case 'WEEKLY': include = day.getDay() === due.getDay(); break;
      case 'MONTHLY': include = day.getDate() === due.getDate(); break;
    }
    if (include) {
      // Project the occurrence date to the viewed day, preserving original time
      const occurrence = new Date(day.getFullYear(), day.getMonth(), day.getDate(), due.getHours(), due.getMinutes());
      acc.push({ ...t, dueDate: occurrence.toISOString() });
    }
    return acc;
  }, []);
  return filtered.sort((a, b) => {
    const aD = new Date(a.dueDate!);
    const bD = new Date(b.dueDate!);
    const aHasTime = aD.getHours() !== 0 || aD.getMinutes() !== 0;
    const bHasTime = bD.getHours() !== 0 || bD.getMinutes() !== 0;
    if (aHasTime && !bHasTime) return -1;
    if (!aHasTime && bHasTime) return 1;
    return aD.getHours() * 60 + aD.getMinutes() - (bD.getHours() * 60 + bD.getMinutes());
  });
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const taskVersion = useTaskStore((s) => s.taskVersion);
  const { key: locationKey } = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [dayView, setDayView] = useState<DayView>('today');

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const activeDay = dayView === 'today' ? today : tomorrow;

  const loadDayTasks = useCallback((day: Date) => {
    setDayLoading(true);
    // Fetch all tasks up to end-of-day; recurring tasks have past due dates so
    // we can't filter by dueDateFrom — getTasksForDay handles the day matching.
    const to = endOfDay(day).toISOString();
    tasksService.list({ dueDateTo: to, limit: 500, status: 'ACTIVE' })
      .then((r) => setDayTasks(getTasksForDay(r.tasks, day)))
      .catch(console.error)
      .finally(() => setDayLoading(false));
  }, []);

  useEffect(() => {
    usersService.getStats().then(setStats).catch(console.error);
    categoriesService.list().then(setCategories).catch(console.error);
    loadDayTasks(activeDay);
  }, [locationKey, taskVersion]);

  useEffect(() => {
    loadDayTasks(activeDay);
  }, [dayView]);

  const handleToggle = async (task: Task) => {
    try {
      const updated = await tasksService.update(task.id, {
        status: task.status === 'ACTIVE' ? 'COMPLETED' : 'ACTIVE',
      });
      setDayTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await tasksService.delete(id);
      setDayTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleEditSubmit = async (data: Partial<Task> & { categoryIds?: string[] }) => {
    if (!editingTask) return;
    try {
      const updated = await tasksService.update(editingTask.id, data);
      setDayTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success('Task updated');
    } catch {
      toast.error('Failed to update task');
    }
    setEditingTask(null);
  };

  const dayLabel = format(activeDay, 'EEEE, MMMM d');
  const emptyMsg = dayView === 'today' ? 'No tasks scheduled for today.' : 'No tasks scheduled for tomorrow.';

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

      {/* Day Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-medium">
              <button
                onClick={() => setDayView('today')}
                className={`px-3 py-1.5 transition-colors ${
                  dayView === 'today'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDayView('tomorrow')}
                className={`px-3 py-1.5 transition-colors border-l border-gray-200 dark:border-gray-700 ${
                  dayView === 'tomorrow'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Tomorrow
              </button>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{dayLabel}</span>
          </div>
          <Link
            to="/calendar"
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            View calendar →
          </Link>
        </div>

        {dayLoading ? (
          <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
        ) : dayTasks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">{emptyMsg}</p>
        ) : (
          <div className="space-y-2">
            {dayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onEdit={setEditingTask}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
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
