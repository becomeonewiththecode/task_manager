import { useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import type { TaskFilters } from '@/services/tasks.service';

export function useTasks(filters?: TaskFilters) {
  const { tasks, loading, total, totalPages, page, fetchTasks } = useTaskStore();

  useEffect(() => {
    fetchTasks(filters);
  }, []);

  return { tasks, loading, total, totalPages, page, refetch: fetchTasks };
}
