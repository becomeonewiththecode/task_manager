import { create } from 'zustand';
import { tasksService, type TaskFilters } from '@/services/tasks.service';
import type { Task } from '@/types';

interface TaskState {
  tasks: Task[];
  total: number;
  totalPages: number;
  page: number;
  filters: TaskFilters;
  loading: boolean;
  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  createTask: (data: Partial<Task> & { categoryIds?: string[] }) => Promise<void>;
  updateTask: (id: string, data: Partial<Task> & { categoryIds?: string[] }) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  reorderTasks: (ids: string[]) => Promise<void>;
  setFilters: (filters: TaskFilters) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  total: 0,
  totalPages: 1,
  page: 1,
  filters: {},
  loading: false,

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
  },

  updateTask: async (id, data) => {
    const updated = await tasksService.update(id, data);
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
  },

  deleteTask: async (id) => {
    await tasksService.delete(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  reorderTasks: async (ids) => {
    await tasksService.reorder(ids);
    const ordered = ids.map((id) => get().tasks.find((t) => t.id === id)!);
    set({ tasks: ordered });
  },

  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
}));
