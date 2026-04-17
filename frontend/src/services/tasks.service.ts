import { api } from './api';
import type { Task, PaginatedResponse } from '@/types';

export interface TaskFilters {
  status?: string;
  priority?: string;
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const tasksService = {
  list: (filters?: TaskFilters) =>
    api.get<PaginatedResponse<Task>>('/tasks', { params: filters }).then((r) => r.data),

  get: (id: string) =>
    api.get<Task>(`/tasks/${id}`).then((r) => r.data),

  create: (data: Partial<Task> & { categoryIds?: string[] }) =>
    api.post<Task>('/tasks', data).then((r) => r.data),

  update: (id: string, data: Partial<Task> & { categoryIds?: string[] }) =>
    api.put<Task>(`/tasks/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/tasks/${id}`),

  reorder: (ids: string[]) =>
    api.put('/tasks/reorder', { ids }),
};
