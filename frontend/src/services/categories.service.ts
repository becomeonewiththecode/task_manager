import { api } from './api';
import type { Category } from '@/types';

export const categoriesService = {
  list: () =>
    api.get<Category[]>('/categories').then((r) => r.data),

  create: (data: { name: string; color?: string }) =>
    api.post<Category>('/categories', data).then((r) => r.data),

  update: (id: string, data: { name?: string; color?: string }) =>
    api.put<Category>(`/categories/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/categories/${id}`),
};
