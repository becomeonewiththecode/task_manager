import { api } from './api';
import type { TimeEntry } from '@/types';

export const timeEntriesService = {
  start: (taskId: string) =>
    api.post<TimeEntry>(`/tasks/${taskId}/time-entries`).then((r) => r.data),

  stop: (taskId: string, entryId: string) =>
    api.patch<TimeEntry>(`/tasks/${taskId}/time-entries/${entryId}/stop`).then((r) => r.data),

  list: (taskId: string) =>
    api.get<TimeEntry[]>(`/tasks/${taskId}/time-entries`).then((r) => r.data),

  delete: (taskId: string, entryId: string) =>
    api.delete(`/tasks/${taskId}/time-entries/${entryId}`),

  getTotal: (taskId: string) =>
    api.get<{ totalMs: number; entries: number }>(`/tasks/${taskId}/time-entries/total`).then((r) => r.data),

  getActive: () =>
    api.get<TimeEntry | null>('/users/me/active-timer').then((r) => r.data),
};
