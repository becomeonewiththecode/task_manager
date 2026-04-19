import axios from 'axios';
import { api } from './api';
import type { TaskShare, Task } from '@/types';

export const taskSharesService = {
  create: (taskId: string, expiresAt?: string) =>
    api.post<TaskShare>(`/tasks/${taskId}/shares`, { expiresAt }).then((r) => r.data),

  list: (taskId: string) =>
    api.get<TaskShare[]>(`/tasks/${taskId}/shares`).then((r) => r.data),

  delete: (taskId: string, shareId: string) =>
    api.delete(`/tasks/${taskId}/shares/${shareId}`),

  getPublic: (token: string) =>
    axios.get<{ task: Task; share: TaskShare }>(`/api/v1/share/${token}`).then((r) => r.data),
};
