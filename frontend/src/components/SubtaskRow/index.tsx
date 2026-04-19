import type { Task } from '@/types';

interface Props {
  subtask: Task;
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function SubtaskRow({ subtask, onToggle, onDelete }: Props) {
  return (
    <div className="flex items-center gap-2 py-1.5 pl-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
      <input
        type="checkbox"
        checked={subtask.status === 'COMPLETED'}
        onChange={() => onToggle(subtask)}
        className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      <span
        className={`flex-1 text-xs ${
          subtask.status === 'COMPLETED'
            ? 'line-through text-gray-400 dark:text-gray-500'
            : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        {subtask.title}
      </span>
      <button
        onClick={() => onDelete(subtask.id)}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-opacity"
        aria-label="Delete subtask"
      >
        ✕
      </button>
    </div>
  );
}
