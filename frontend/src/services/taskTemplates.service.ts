import { api } from './api';
import type { TaskTemplate, Task } from '@/types';

export const taskTemplatesService = {
  list: () =>
    api.get<TaskTemplate[]>('/templates').then((r) => r.data),

  create: (data: Partial<TaskTemplate>) =>
    api.post<TaskTemplate>('/templates', data).then((r) => r.data),

  update: (id: string, data: Partial<TaskTemplate>) =>
    api.put<TaskTemplate>(`/templates/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/templates/${id}`),

  apply: (id: string, overrides?: { title?: string; dueDate?: string }) =>
    api.post<Task>(`/templates/${id}/apply`, overrides ?? {}).then((r) => r.data),
};
