import { api } from './api';

export const recurringCompletionsService = {
  toggle: (taskId: string, date: string) =>
    api.post<{ completed: boolean; date: string }>(`/tasks/${taskId}/occurrences/${date}/toggle`).then((r) => r.data),
};
