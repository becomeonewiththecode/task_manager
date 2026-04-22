import { create } from 'zustand';
import { tasksService, type TaskFilters } from '@/services/tasks.service';
import type { Task, Priority, TaskStatus } from '@/types';

interface TaskState {
  tasks: Task[];
  total: number;
  totalPages: number;
  page: number;
  filters: TaskFilters;
  loading: boolean;
  selectedIds: Set<string>;
  taskVersion: number;

  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  createTask: (data: Partial<Task> & { categoryIds?: string[] }) => Promise<void>;
  updateTask: (id: string, data: Partial<Task> & { categoryIds?: string[] }) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  reorderTasks: (ids: string[]) => Promise<void>;
  setFilters: (filters: TaskFilters) => void;
  invalidate: () => void;

  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  bulkUpdate: (patch: { status?: TaskStatus; priority?: Priority }) => Promise<void>;
  bulkDelete: () => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  total: 0,
  totalPages: 1,
  page: 1,
  filters: {},
  loading: false,
  selectedIds: new Set(),
  taskVersion: 0,

  fetchTasks: async (filters) => {
    const merged = { ...get().filters, ...filters };
    set({ loading: true, filters: merged });
    try {
      const result = await tasksService.list(merged);
      set({ tasks: result.tasks, total: result.total, totalPages: result.totalPages, page: result.page });
    } finally {
      set({ loading: false });
    }
  },

  createTask: async (data) => {
    await tasksService.create(data);
    await get().fetchTasks();
    set((s) => ({ taskVersion: s.taskVersion + 1 }));
  },

  updateTask: async (id, data) => {
    const updated = await tasksService.update(id, data);
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)), taskVersion: s.taskVersion + 1 }));
    return updated;
  },

  deleteTask: async (id) => {
    await tasksService.delete(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id), taskVersion: s.taskVersion + 1 }));
  },

  reorderTasks: async (ids) => {
    await tasksService.reorder(ids);
    const ordered = ids.map((id) => get().tasks.find((t) => t.id === id)!);
    set({ tasks: ordered });
  },

  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),

  invalidate: () => set((s) => ({ taskVersion: s.taskVersion + 1 })),

  toggleSelect: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      next.has(id) ? next.delete(id) : next.add(id);
      return { selectedIds: next };
    }),

  selectAll: () => set((s) => ({ selectedIds: new Set(s.tasks.map((t) => t.id)) })),

  clearSelection: () => set({ selectedIds: new Set() }),

  bulkUpdate: async (patch) => {
    const ids = [...get().selectedIds];
    if (!ids.length) return;
    await tasksService.bulkUpdate(ids, patch);
    set((s) => ({
      tasks: s.tasks.map((t) => (s.selectedIds.has(t.id) ? { ...t, ...patch } : t)),
      selectedIds: new Set(),
    }));
  },

  bulkDelete: async () => {
    const ids = [...get().selectedIds];
    if (!ids.length) return;
    await tasksService.bulkDelete(ids);
    set((s) => ({
      tasks: s.tasks.filter((t) => !s.selectedIds.has(t.id)),
      selectedIds: new Set(),
    }));
  },
}));
