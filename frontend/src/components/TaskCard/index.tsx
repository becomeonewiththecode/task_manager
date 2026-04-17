import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import type { Task, Priority } from '@/types';

const PRIORITY_STYLES: Record<Priority, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

interface Props {
  task: Task;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskCard({ task, onToggle, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          ⠿
        </button>

        <input
          type="checkbox"
          checked={task.status === 'COMPLETED'}
          onChange={() => onToggle(task)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${
              task.status === 'COMPLETED' ? 'line-through text-gray-400' : ''
            }`}
          >
            {task.title}
          </p>

          {task.description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
              {task.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5 items-center">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[task.priority]}`}>
              {task.priority}
            </span>

            {task.dueDate && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Due {format(new Date(task.dueDate), 'MMM d')}
              </span>
            )}

            {task.tags.map(({ category }) => (
              <span
                key={category.id}
                className="text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: category.color }}
              >
                {category.name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Edit task"
          >
            ✎
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            aria-label="Delete task"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
