import { useState, useEffect, useRef } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  format, addMonths, subMonths, startOfWeek, endOfWeek,
  addWeeks, subWeeks, addDays, subDays, isToday as dfIsToday,
} from 'date-fns';
import { tasksService } from '@/services/tasks.service';
import { categoriesService } from '@/services/categories.service';
import { useTaskStore } from '@/store/taskStore';
import type { Task, Category } from '@/types';
import { PRIORITY_STYLES } from '@/components/TaskCard';
import { TaskForm } from '@/components/TaskForm';
import { parseIcs, type IcsEvent } from '@/utils/icsParser';
import toast from 'react-hot-toast';

type CalView = 'month' | 'week' | 'day';
export function CalendarPage() {
  const invalidate = useTaskStore((s) => s.invalidate);
  const [view, setView] = useState<CalView>('month');
  const [viewDate, setViewDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Day panel state (used by month + week views)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayView, setDayView] = useState<'list' | 'create' | 'detail' | 'edit'>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Day-view inline create/edit
  const [dayInlineView, setDayInlineView] = useState<'list' | 'create' | 'detail' | 'edit'>('list');
  const [dayInlineTask, setDayInlineTask] = useState<Task | null>(null);

  // ICS state
  const [icsEvents, setIcsEvents] = useState<IcsEvent[] | null>(null);
  const [icsSelected, setIcsSelected] = useState<Set<number>>(new Set());
  const [icsImporting, setIcsImporting] = useState(false);
  const icsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    categoriesService.list().then(setCategories).catch(console.error);
  }, []);

  // Compute fetch range based on view
  useEffect(() => {
    let from: string, to: string;
    if (view === 'month') {
      const ms = startOfMonth(viewDate);
      const me = endOfMonth(viewDate);
      from = format(startOfWeek(ms), 'yyyy-MM-dd');
      to = format(endOfWeek(me), 'yyyy-MM-dd');
    } else if (view === 'week') {
      from = format(startOfWeek(viewDate), 'yyyy-MM-dd');
      to = format(endOfWeek(viewDate), 'yyyy-MM-dd');
    } else {
      from = format(viewDate, 'yyyy-MM-dd');
      to = format(viewDate, 'yyyy-MM-dd');
    }
    setLoading(true);
    tasksService
      .list({ dueDateFrom: from, dueDateTo: to, limit: 500 })
      .then((r) => setTasks(r.tasks))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [view, viewDate]);

  const tasksForDay = (day: Date) => {
    const matched = tasks.filter((t) => {
      if (t.status === 'COMPLETED') return false;
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      if (isSameDay(due, day)) return true;
      if (!t.recurring) return false;
      const dayMid = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dueMid = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      if (dayMid < dueMid) return false;
      switch (t.recurring) {
        case 'DAILY': return true;
        case 'WEEKLY': return day.getDay() === due.getDay();
        case 'MONTHLY': return day.getDate() === due.getDate();
        default: return false;
      }
    });
    return matched.sort((a, b) => {
      const aDate = new Date(a.dueDate!);
      const bDate = new Date(b.dueDate!);
      const aH = aDate.getHours() !== 0 || aDate.getMinutes() !== 0;
      const bH = bDate.getHours() !== 0 || bDate.getMinutes() !== 0;
      if (aH && !bH) return -1;
      if (!aH && bH) return 1;
      return aDate.getHours() * 60 + aDate.getMinutes() - (bDate.getHours() * 60 + bDate.getMinutes());
    });
  };

  // Navigation
  const goBack = () => {
    if (view === 'month') setViewDate((d) => subMonths(d, 1));
    else if (view === 'week') setViewDate((d) => subWeeks(d, 1));
    else setViewDate((d) => subDays(d, 1));
  };
  const goForward = () => {
    if (view === 'month') setViewDate((d) => addMonths(d, 1));
    else if (view === 'week') setViewDate((d) => addWeeks(d, 1));
    else setViewDate((d) => addDays(d, 1));
  };
  const goToday = () => setViewDate(new Date());

  const viewLabel = () => {
    if (view === 'month') return format(viewDate, 'MMMM yyyy');
    if (view === 'week') {
      const ws = startOfWeek(viewDate);
      const we = endOfWeek(viewDate);
      return ws.getMonth() === we.getMonth()
        ? `${format(ws, 'MMM d')} – ${format(we, 'd, yyyy')}`
        : `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    return format(viewDate, 'EEEE, MMMM d, yyyy');
  };

  // Shared CRUD handlers
  const handleCreateSubmit = async (data: Partial<Task> & { categoryIds?: string[] }) => {
    try {
      const created = await tasksService.create(data);
      setTasks((prev) => [...prev, created]);
      invalidate();
      toast.success('Task created');
      if (view === 'day') { setDayInlineView('list'); setDayInlineTask(null); }
      else { setDayView('list'); }
    } catch {
      toast.error('Failed to create task');
    }
  };

  const handleEditSubmit = async (data: Partial<Task> & { categoryIds?: string[] }) => {
    const task = view === 'day' ? dayInlineTask : selectedTask;
    if (!task) return;
    try {
      const updated = await tasksService.update(task.id, data);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      invalidate();
      toast.success('Task updated');
      if (view === 'day') { setDayInlineTask(updated); setDayInlineView('detail'); }
      else { setSelectedTask(updated); setDayView('detail'); }
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (task: Task) => {
    try {
      await tasksService.delete(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      invalidate();
      toast.success('Task deleted');
      if (view === 'day') { setDayInlineView('list'); setDayInlineTask(null); }
      else { setDayView('list'); setSelectedTask(null); }
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const openDay = (day: Date) => {
    setSelectedDay(day);
    setDayView('list');
    setSelectedTask(null);
  };

  const closeDay = () => {
    setSelectedDay(null);
    setDayView('list');
    setSelectedTask(null);
  };

  const handleIcsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const events = parseIcs(ev.target?.result as string);
        if (events.length === 0) { toast.error('No events found in the .ics file'); return; }
        setIcsEvents(events);
        setIcsSelected(new Set(events.map((_, i) => i)));
      } catch { toast.error('Failed to parse .ics file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleIcsImport = async () => {
    if (!icsEvents) return;
    setIcsImporting(true);
    const toImport = icsEvents.filter((_, i) => icsSelected.has(i));
    let created = 0;
    for (const ev of toImport) {
      try {
        const task = await tasksService.create({ title: ev.title, description: ev.description, location: ev.location, dueDate: ev.dueDate, priority: 'MEDIUM' });
        setTasks((prev) => [...prev, task]);
        created++;
      } catch { /* continue */ }
    }
    setIcsImporting(false);
    setIcsEvents(null);
    if (created > 0) invalidate();
    toast.success(`Imported ${created} task${created !== 1 ? 's' : ''}`);
  };

  const dayTasks = selectedDay ? tasksForDay(selectedDay) : [];
  const todayTasks = tasksForDay(viewDate);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Calendar</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View switcher */}
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-xs font-medium">
            {(['day', 'week', 'month'] as CalView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  view === v
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <button onClick={goBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">‹</button>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 min-w-40 text-center">{viewLabel()}</span>
          <button onClick={goForward} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">›</button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">Today</button>
          <button onClick={() => icsInputRef.current?.click()} className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">Import .ics</button>
          <input ref={icsInputRef} type="file" accept=".ics,text/calendar" className="hidden" onChange={handleIcsFile} />
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center py-16 text-sm text-gray-400">Loading…</div>
      ) : (
        <>
          {/* ── Month view ── */}
          {view === 'month' && <MonthGrid viewDate={viewDate} tasksForDay={tasksForDay} onDayClick={openDay} selectedDay={selectedDay} />}

          {/* ── Week view ── */}
          {view === 'week' && <WeekGrid viewDate={viewDate} tasksForDay={tasksForDay} onDayClick={openDay} selectedDay={selectedDay} />}

          {/* ── Day view ── */}
          {view === 'day' && (
            <DayPanel
              day={viewDate}
              tasks={todayTasks}
              categories={categories}
              inlineView={dayInlineView}
              inlineTask={dayInlineTask}
              onSetInlineView={setDayInlineView}
              onSetInlineTask={setDayInlineTask}
              onCreateSubmit={handleCreateSubmit}
              onEditSubmit={handleEditSubmit}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      {/* Day panel modal (month + week) */}
      {selectedDay && view !== 'day' && (
        <Modal onClose={closeDay}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {dayView === 'create'
                ? `New Task — ${format(selectedDay, 'EEEE, MMMM d')}`
                : dayView === 'edit'
                ? 'Edit Task'
                : format(selectedDay, 'EEEE, MMMM d')}
            </h3>
            {dayView !== 'list' && (
              <button onClick={() => { setDayView('list'); setSelectedTask(null); }} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                ← Back
              </button>
            )}
          </div>

          {dayView === 'list' && (
            <div className="space-y-3">
              {dayTasks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No tasks scheduled for this day.</p>
              ) : (
                <div className="space-y-1.5">
                  {dayTasks.map((task) => {
                    const d = new Date(task.dueDate!);
                    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
                    return (
                      <button
                        key={task.id}
                        onClick={() => { setSelectedTask(task); setDayView('detail'); }}
                        className={`w-full text-left text-sm px-3 py-2.5 rounded-lg hover:opacity-80 transition-opacity ${PRIORITY_STYLES[task.priority]} ${task.status === 'COMPLETED' ? 'opacity-50 line-through' : ''}`}
                      >
                        {hasTime && <span className="font-semibold mr-2">{format(d, 'h:mm a')}</span>}
                        {task.title}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setDayView('create')} className="w-full px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
                  + Add task
                </button>
              </div>
            </div>
          )}

          {dayView === 'create' && (
            <TaskForm
              categories={categories}
              defaultDueDate={format(selectedDay, 'yyyy-MM-dd')}
              onSubmit={handleCreateSubmit}
              onCancel={() => setDayView('list')}
            />
          )}

          {dayView === 'detail' && selectedTask && (
            <TaskDetail
              task={selectedTask}
              onEdit={() => setDayView('edit')}
              onDelete={() => handleDelete(selectedTask)}
            />
          )}

          {dayView === 'edit' && selectedTask && (
            <TaskForm
              task={selectedTask}
              categories={categories}
              onSubmit={handleEditSubmit}
              onCancel={() => setDayView('detail')}
            />
          )}
        </Modal>
      )}

      {/* ICS import modal */}
      {icsEvents && (
        <Modal onClose={() => setIcsEvents(null)} title={`Import ${icsEvents.length} event${icsEvents.length !== 1 ? 's' : ''}`}>
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">Select the events to import as tasks:</p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {icsEvents.map((ev, i) => (
                <label key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={icsSelected.has(i)}
                    onChange={() => setIcsSelected((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{ev.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(ev.dueDate), 'EEE, MMM d, yyyy')}
                      {new Date(ev.dueDate).getHours() !== 0 || new Date(ev.dueDate).getMinutes() !== 0 ? ` at ${format(new Date(ev.dueDate), 'h:mm a')}` : ''}
                    </p>
                    {ev.location && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{ev.location}</p>}
                  </div>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIcsSelected(icsSelected.size === icsEvents.length ? new Set() : new Set(icsEvents.map((_, i) => i)))}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                {icsSelected.size === icsEvents.length ? 'Deselect all' : 'Select all'}
              </button>
              <div className="flex gap-2">
                <button onClick={() => setIcsEvents(null)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleIcsImport} disabled={icsSelected.size === 0 || icsImporting} className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                  {icsImporting ? 'Importing…' : `Import ${icsSelected.size} task${icsSelected.size !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Month grid ──────────────────────────────────────────────────────────────

function MonthGrid({ viewDate, tasksForDay, onDayClick, selectedDay }: {
  viewDate: Date;
  tasksForDay: (day: Date) => Task[];
  onDayClick: (day: Date) => void;
  selectedDay: Date | null;
}) {
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(viewDate)), end: endOfWeek(endOfMonth(viewDate)) });
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="px-1 sm:px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center uppercase tracking-wide">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 dark:divide-gray-700/50">
        {days.map((day) => {
          const isCurrentMonth = day.getMonth() === viewDate.getMonth();
          const isToday = dfIsToday(day);
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const dayTaskList = tasksForDay(day);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`min-h-16 sm:min-h-24 p-1 sm:p-2 cursor-pointer group transition-colors ${
                isSelected ? 'bg-primary-50 dark:bg-primary-900/20'
                : isCurrentMonth ? 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className={`text-xs font-medium w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-primary-600 text-white'
                  : isSelected ? 'bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-200'
                  : isCurrentMonth ? 'text-gray-700 dark:text-gray-300'
                  : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {format(day, 'd')}
                </div>
                <span className="hidden sm:block text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity text-base leading-none pr-0.5">+</span>
              </div>
              {dayTaskList.length > 0 && (
                <div className="sm:hidden flex flex-wrap gap-0.5 mt-0.5">
                  {dayTaskList.slice(0, 4).map((t) => (
                    <div key={t.id} className={`w-2 h-2 rounded-full shrink-0 ${t.priority === 'HIGH' ? 'bg-red-500' : t.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'} ${t.status === 'COMPLETED' ? 'opacity-40' : ''}`} />
                  ))}
                  {dayTaskList.length > 4 && <span className="text-[10px] text-primary-600 dark:text-primary-400 leading-none">+{dayTaskList.length - 4}</span>}
                </div>
              )}
              <div className="hidden sm:block space-y-0.5">
                {dayTaskList.slice(0, 3).map((task) => {
                  const d = new Date(task.dueDate!);
                  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
                  return (
                    <div key={task.id} className={`w-full text-xs px-1.5 py-0.5 rounded ${PRIORITY_STYLES[task.priority]} ${task.status === 'COMPLETED' ? 'opacity-50 line-through' : ''}`}>
                      {hasTime && <span className="font-semibold mr-1">{format(d, 'h:mm a')}</span>}
                      <span className="truncate">{task.title}</span>
                    </div>
                  );
                })}
                {dayTaskList.length > 3 && <div className="text-xs text-primary-600 dark:text-primary-400 px-1.5">+{dayTaskList.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week grid ───────────────────────────────────────────────────────────────

function WeekGrid({ viewDate, tasksForDay, onDayClick, selectedDay }: {
  viewDate: Date;
  tasksForDay: (day: Date) => Task[];
  onDayClick: (day: Date) => void;
  selectedDay: Date | null;
}) {
  const days = eachDayOfInterval({ start: startOfWeek(viewDate), end: endOfWeek(viewDate) });
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-gray-100 dark:divide-gray-700/50 border-b border-gray-200 dark:border-gray-700">
        {days.map((day) => {
          const isToday = dfIsToday(day);
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          return (
            <div
              key={day.toISOString()}
              className={`py-2 text-center cursor-pointer transition-colors ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
              onClick={() => onDayClick(day)}
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{format(day, 'EEE')}</p>
              <div className={`mx-auto mt-1 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold ${
                isToday ? 'bg-primary-600 text-white'
                : isSelected ? 'bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-200'
                : 'text-gray-700 dark:text-gray-300'
              }`}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 divide-x divide-gray-100 dark:divide-gray-700/50">
        {days.map((day) => {
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const dayTaskList = tasksForDay(day);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`min-h-32 p-1.5 cursor-pointer transition-colors ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
            >
              {dayTaskList.length === 0 ? (
                <p className="text-xs text-gray-300 dark:text-gray-600 text-center mt-4">—</p>
              ) : (
                <div className="space-y-0.5">
                  {dayTaskList.map((task) => {
                    const d = new Date(task.dueDate!);
                    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
                    return (
                      <div key={task.id} className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_STYLES[task.priority]} ${task.status === 'COMPLETED' ? 'opacity-50 line-through' : ''}`}>
                        {hasTime && <span className="font-semibold mr-1">{format(d, 'h:mm a')}</span>}
                        <span className="break-words">{task.title}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Day panel (inline, used for day view) ───────────────────────────────────

function DayPanel({ day, tasks, categories, inlineView, inlineTask, onSetInlineView, onSetInlineTask, onCreateSubmit, onEditSubmit, onDelete }: {
  day: Date;
  tasks: Task[];
  categories: Category[];
  inlineView: 'list' | 'create' | 'detail' | 'edit';
  inlineTask: Task | null;
  onSetInlineView: (v: 'list' | 'create' | 'detail' | 'edit') => void;
  onSetInlineTask: (t: Task | null) => void;
  onCreateSubmit: (data: Partial<Task> & { categoryIds?: string[] }) => Promise<void>;
  onEditSubmit: (data: Partial<Task> & { categoryIds?: string[] }) => Promise<void>;
  onDelete: (task: Task) => Promise<void>;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {inlineView === 'create' ? `New Task — ${format(day, 'EEEE, MMMM d')}` : inlineView === 'edit' ? 'Edit Task' : format(day, 'EEEE, MMMM d')}
        </h3>
        {inlineView !== 'list' && (
          <button onClick={() => { onSetInlineView('list'); onSetInlineTask(null); }} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            ← Back
          </button>
        )}
      </div>

      {inlineView === 'list' && (
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No tasks scheduled for this day.</p>
          ) : (
            <div className="space-y-1.5">
              {tasks.map((task) => {
                const d = new Date(task.dueDate!);
                const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
                return (
                  <button
                    key={task.id}
                    onClick={() => { onSetInlineTask(task); onSetInlineView('detail'); }}
                    className={`w-full text-left text-sm px-3 py-2.5 rounded-lg hover:opacity-80 transition-opacity ${PRIORITY_STYLES[task.priority]} ${task.status === 'COMPLETED' ? 'opacity-50 line-through' : ''}`}
                  >
                    {hasTime && <span className="font-semibold mr-2">{format(d, 'h:mm a')}</span>}
                    {task.title}
                  </button>
                );
              })}
            </div>
          )}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => onSetInlineView('create')} className="w-full px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
              + Add task
            </button>
          </div>
        </div>
      )}

      {inlineView === 'create' && (
        <TaskForm
          categories={categories}
          defaultDueDate={format(day, 'yyyy-MM-dd')}
          onSubmit={onCreateSubmit}
          onCancel={() => onSetInlineView('list')}
        />
      )}

      {inlineView === 'detail' && inlineTask && (
        <TaskDetail task={inlineTask} onEdit={() => onSetInlineView('edit')} onDelete={() => onDelete(inlineTask)} />
      )}

      {inlineView === 'edit' && inlineTask && (
        <TaskForm task={inlineTask} categories={categories} onSubmit={onEditSubmit} onCancel={() => onSetInlineView('detail')} />
      )}
    </div>
  );
}

// ── Task detail ─────────────────────────────────────────────────────────────

function TaskDetail({ task, onEdit, onDelete }: { task: Task; onEdit: () => void; onDelete: () => void }) {
  const d = new Date(task.dueDate!);
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  return (
    <div className="space-y-4">
      <div>
        {task.dueDate && (
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            {format(d, hasTime ? 'EEEE, MMMM d · h:mm a' : 'EEEE, MMMM d')}
          </p>
        )}
        <h4 className={`text-base font-semibold text-gray-900 dark:text-gray-100 ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}`}>
          {task.title}
        </h4>
        {task.description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{task.description}</p>}
        {task.location && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.location)}`} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline">
            📍 {task.location}
          </a>
        )}
        {task.webLink && (
          <a href={task.webLink} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline truncate">
            🔗 {task.webLink}
          </a>
        )}
        <div className="mt-2 flex gap-2 items-center">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
            {task.status === 'COMPLETED' ? 'Completed' : 'Active'}
          </span>
        </div>
      </div>
      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button onClick={onEdit} className="flex-1 px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">Edit</button>
        <button onClick={onDelete} className="flex-1 px-4 py-2 text-sm font-medium bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg transition-colors">Delete</button>
      </div>
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        {title && <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>}
        {children}
      </div>
    </div>
  );
}
