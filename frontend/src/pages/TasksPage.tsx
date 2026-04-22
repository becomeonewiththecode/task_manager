import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import toast from 'react-hot-toast';
import { useTaskStore } from '@/store/taskStore';
import { categoriesService } from '@/services/categories.service';
import { timeEntriesService } from '@/services/timeEntries.service';
import { TaskCard } from '@/components/TaskCard';
import { TaskForm } from '@/components/TaskForm';
import { FilterBar } from '@/components/FilterBar';
import { BulkActionBar } from '@/components/BulkActionBar';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { Task, Category, TimeEntry } from '@/types';

export function TasksPage() {
  const { tasks, loading, fetchTasks, createTask, updateTask, deleteTask, reorderTasks, selectedIds, page, totalPages } = useTaskStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTimerEntry, setActiveTimerEntry] = useState<TimeEntry | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [searchParams] = useSearchParams();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    fetchTasks();
    categoriesService.list().then(setCategories).catch(console.error);
    loadActiveTimer();
  }, []);

  useEffect(() => {
    if (searchParams.get('new')) setShowForm(true);
  }, [searchParams]);

  const loadActiveTimer = async () => {
    try {
      const entry = await timeEntriesService.getActive();
      setActiveTimerEntry(entry);
    } catch { /* ignore */ }
  };

  useKeyboardShortcuts({
    newTask: () => { setShowForm(true); setEditingTask(null); },
    focusSearch: () => document.getElementById('task-search')?.focus(),
  });

  const handleSearch = useCallback((q: string) => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchTasks({ search: q || undefined, page: 1 }), 300);
  }, [fetchTasks]);

  const handleToggle = async (task: Task) => {
    await updateTask(task.id, { status: task.status === 'ACTIVE' ? 'COMPLETED' : 'ACTIVE' });
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleFormSubmit = async (data: Partial<Task> & { categoryIds?: string[] }) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, data);
        toast.success('Task updated');
      } else {
        await createTask(data);
        toast.success('Task created');
      }
      setShowForm(false);
      setEditingTask(null);
    } catch {
      toast.error('Failed to save task');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tasks, oldIndex, newIndex);

    await reorderTasks(reordered.map((t) => t.id));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tasks</h2>
        <button
          onClick={() => { setShowForm(true); setEditingTask(null); }}
          className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          + New task
          <kbd className="ml-2 text-xs opacity-70">N</kbd>
        </button>
      </div>

      <FilterBar onSearch={handleSearch} />

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {editingTask ? 'Edit Task' : 'New Task'}
          </h3>
          <TaskForm
            task={editingTask ?? undefined}
            categories={categories}
            onSubmit={handleFormSubmit}
            onCancel={() => { setShowForm(false); setEditingTask(null); }}
          />
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {selectedIds.size} task{selectedIds.size > 1 ? 's' : ''} selected
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading…</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 dark:text-gray-500 text-sm">No tasks yet. Press N to create one.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  activeTimerEntry={activeTimerEntry}
                  onTimerChanged={loadActiveTimer}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchTasks({ page: page - 1 })}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ‹ Prev
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => fetchTasks({ page: page + 1 })}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next ›
          </button>
        </div>
      )}

      <BulkActionBar />
    </div>
  );
}
