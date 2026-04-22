import { useTaskStore } from '@/store/taskStore';

interface Props {
  onSearch: (q: string) => void;
}

export function FilterBar({ onSearch }: Props) {
  const { filters, setFilters, fetchTasks } = useTaskStore();

  const apply = (update: Record<string, string | undefined>) => {
    const next = { ...filters, ...update, page: 1 };
    setFilters(next);
    fetchTasks(next);
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <input
        type="search"
        placeholder="Search tasks… (/)"
        defaultValue={filters.search ?? ''}
        onChange={(e) => onSearch(e.target.value)}
        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-48"
        id="task-search"
      />

      <select
        value={filters.status ?? ''}
        onChange={(e) => apply({ status: e.target.value || undefined })}
        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">All status</option>
        <option value="ACTIVE">Active</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      <select
        value={filters.priority ?? ''}
        onChange={(e) => apply({ priority: e.target.value || undefined })}
        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">All priority</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>

      <select
        value={filters.limit ?? 20}
        onChange={(e) => apply({ limit: e.target.value } as any)}
        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value={5}>5 / page</option>
        <option value={10}>10 / page</option>
        <option value={20}>20 / page</option>
        <option value={50}>50 / page</option>
        <option value={100}>100 / page</option>
      </select>
    </div>
  );
}
