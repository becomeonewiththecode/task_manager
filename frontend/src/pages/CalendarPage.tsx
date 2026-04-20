import { useState, useEffect } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  format, addMonths, subMonths, startOfWeek, endOfWeek,
} from 'date-fns';
import { tasksService } from '@/services/tasks.service';
import { categoriesService } from '@/services/categories.service';
import type { Task, Category } from '@/types';
import { PRIORITY_STYLES } from '@/components/TaskCard';
import { TaskForm } from '@/components/TaskForm';
import toast from 'react-hot-toast';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedDay, setExpandedDay] = useState<{ day: Date; tasks: Task[] } | null>(null);
  const [creatingForDay, setCreatingForDay] = useState<Date | null>(null);

  useEffect(() => {
    categoriesService.list().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const to = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    setLoading(true);
    tasksService
      .list({ dueDateFrom: from, dueDateTo: to, limit: 200 })
      .then((r) => setTasks(r.tasks))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const tasksForDay = (day: Date) => {
    const matched = tasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      if (isSameDay(due, day)) return true;
      if (!t.recurring) return false;

      const dayMid = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dueMid = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      if (dayMid < dueMid) return false;

      switch (t.recurring) {
        case 'DAILY':
          return true;
        case 'WEEKLY':
          return day.getDay() === due.getDay();
        case 'MONTHLY':
          return day.getDate() === due.getDate();
        default:
          return false;
      }
    });

    return matched.sort((a, b) => {
      const aDate = new Date(a.dueDate!);
      const bDate = new Date(b.dueDate!);
      const aHasTime = aDate.getHours() !== 0 || aDate.getMinutes() !== 0;
      const bHasTime = bDate.getHours() !== 0 || bDate.getMinutes() !== 0;
      // Timed tasks first, sorted by time; all-day (midnight) tasks at end
      if (aHasTime && !bHasTime) return -1;
      if (!aHasTime && bHasTime) return 1;
      return aDate.getHours() * 60 + aDate.getMinutes() - (bDate.getHours() * 60 + bDate.getMinutes());
    });
  };

  const handleEditSubmit = async (data: Partial<Task> & { categoryIds?: string[] }) => {
    if (!editingTask) return;
    try {
      const updated = await tasksService.update(editingTask.id, data);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success('Task updated');
    } catch {
      toast.error('Failed to update task');
    }
    setEditingTask(null);
    setSelectedTask(null);
  };

  const handleDelete = async (task: Task) => {
    try {
      await tasksService.delete(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
    setSelectedTask(null);
  };

  const handleCreateSubmit = async (data: Partial<Task> & { categoryIds?: string[] }) => {
    try {
      const created = await tasksService.create(data);
      setTasks((prev) => [...prev, created]);
      toast.success('Task created');
    } catch {
      toast.error('Failed to create task');
    }
    setCreatingForDay(null);
  };

  const closeModals = () => {
    setSelectedTask(null);
    setEditingTask(null);
    setExpandedDay(null);
    setCreatingForDay(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Calendar</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            ‹
          </button>
          <span className="text-base font-semibold text-gray-900 dark:text-gray-100 min-w-36 text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            ›
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            Today
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-1 sm:px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center uppercase tracking-wide">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d[0]}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-sm text-gray-400">Loading…</div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 dark:divide-gray-700/50">
            {days.map((day) => {
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isToday = isSameDay(day, new Date());
              const dayTasks = tasksForDay(day);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setCreatingForDay(day)}
                  className={`min-h-16 sm:min-h-24 p-1 sm:p-2 cursor-pointer group ${isCurrentMonth ? 'hover:bg-gray-50 dark:hover:bg-gray-700/30' : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50'} transition-colors`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div
                      className={`text-xs font-medium w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-primary-600 text-white'
                          : isCurrentMonth
                          ? 'text-gray-700 dark:text-gray-300'
                          : 'text-gray-400 dark:text-gray-600'
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                    <span className="hidden sm:block text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity text-base leading-none pr-0.5">+</span>
                  </div>

                  {/* Mobile: dot indicators */}
                  {dayTasks.length > 0 && (
                    <div className="sm:hidden flex flex-wrap gap-0.5 mt-0.5">
                      {dayTasks.slice(0, 4).map((task) => (
                        <button
                          key={task.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            task.priority === 'HIGH' ? 'bg-red-500' : task.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                          } ${task.status === 'COMPLETED' ? 'opacity-40' : ''}`}
                          title={task.title}
                        />
                      ))}
                      {dayTasks.length > 4 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedDay({ day, tasks: dayTasks }); }}
                          className="text-[10px] text-primary-600 dark:text-primary-400 leading-none"
                        >
                          +{dayTasks.length - 4}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Desktop: text task labels */}
                  <div className="hidden sm:block space-y-0.5">
                    {dayTasks.slice(0, 3).map((task) => {
                      const d = new Date(task.dueDate!);
                      const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
                      return (
                        <button
                          key={task.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                          className={`w-full text-left text-xs px-1.5 py-0.5 rounded transition-opacity hover:opacity-80 ${PRIORITY_STYLES[task.priority]} ${
                            task.status === 'COMPLETED' ? 'opacity-50 line-through' : ''
                          }`}
                          title={task.title}
                        >
                          {hasTime && (
                            <span className="font-semibold mr-1 shrink-0">{format(d, 'h:mm a')}</span>
                          )}
                          <span className="truncate">{task.title}</span>
                        </button>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedDay({ day, tasks: dayTasks }); }}
                        className="text-xs text-primary-600 dark:text-primary-400 px-1.5 hover:underline"
                      >
                        +{dayTasks.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task action modal */}
      {selectedTask && !editingTask && (
        <Modal onClose={closeModals}>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                {selectedTask.dueDate
                  ? format(new Date(selectedTask.dueDate), 'EEEE, MMMM d')
                  : 'No due date'}
              </p>
              <h3 className={`text-base font-semibold text-gray-900 dark:text-gray-100 ${
                selectedTask.status === 'COMPLETED' ? 'line-through text-gray-400' : ''
              }`}>
                {selectedTask.title}
              </h3>
              {selectedTask.description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{selectedTask.description}</p>
              )}
              {selectedTask.location && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedTask.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  📍 {selectedTask.location}
                </a>
              )}
              {selectedTask.webLink && (
                <a
                  href={selectedTask.webLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline truncate"
                >
                  🔗 {selectedTask.webLink}
                </a>
              )}
              <div className="mt-2 flex gap-2 items-center">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[selectedTask.priority]}`}>
                  {selectedTask.priority}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  selectedTask.status === 'COMPLETED'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {selectedTask.status === 'COMPLETED' ? 'Completed' : 'Active'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setEditingTask(selectedTask)}
                className="flex-1 px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(selectedTask)}
                className="flex-1 px-4 py-2 text-sm font-medium bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg transition-colors"
              >
                Delete
              </button>
              <button
                onClick={closeModals}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Day overflow modal */}
      {expandedDay && !selectedTask && !editingTask && (
        <Modal onClose={closeModals} title={format(expandedDay.day, 'EEEE, MMMM d')}>
          <div className="space-y-1">
            {expandedDay.tasks.map((task) => {
              const d = new Date(task.dueDate!);
              const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
              return (
                <button
                  key={task.id}
                  onClick={() => { setSelectedTask(task); setExpandedDay(null); }}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-opacity hover:opacity-80 ${PRIORITY_STYLES[task.priority]} ${
                    task.status === 'COMPLETED' ? 'opacity-50 line-through' : ''
                  }`}
                  title={task.title}
                >
                  {hasTime && (
                    <span className="font-semibold mr-2">{format(d, 'h:mm a')}</span>
                  )}
                  {task.title}
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Edit form modal */}
      {editingTask && (
        <Modal onClose={closeModals} title="Edit Task">
          <TaskForm
            task={editingTask}
            categories={categories}
            onSubmit={handleEditSubmit}
            onCancel={closeModals}
          />
        </Modal>
      )}

      {/* Create task modal */}
      {creatingForDay && !selectedTask && !editingTask && !expandedDay && (
        <Modal onClose={closeModals} title={`New Task — ${format(creatingForDay, 'EEEE, MMMM d')}`}>
          <TaskForm
            categories={categories}
            defaultDueDate={format(creatingForDay, 'yyyy-MM-dd')}
            onSubmit={handleCreateSubmit}
            onCancel={closeModals}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        {title && (
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
        )}
        {children}
      </div>
    </div>
  );
}
