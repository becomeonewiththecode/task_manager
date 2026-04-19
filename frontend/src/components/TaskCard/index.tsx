import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { useState } from 'react';
import type { Task, Priority } from '@/types';
import { useTaskStore } from '@/store/taskStore';
import { tasksService } from '@/services/tasks.service';
import { SubtaskRow } from '@/components/SubtaskRow';
import { TimerButton } from '@/components/TimerButton';
import type { TimeEntry } from '@/types';
import toast from 'react-hot-toast';

export const PRIORITY_STYLES: Record<Priority, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

interface Props {
  task: Task;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  activeTimerEntry?: TimeEntry | null;
  onTimerChanged?: () => void;
}

export function TaskCard({ task, onToggle, onEdit, onDelete, activeTimerEntry, onTimerChanged }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const { selectedIds, toggleSelect } = useTaskStore();
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);
  const [localSubtasks, setLocalSubtasks] = useState(task.subtasks ?? []);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSelected = selectedIds.has(task.id);
  const subtaskCount = localSubtasks.length;
  const completedSubtasks = localSubtasks.filter((s) => s.status === 'COMPLETED').length;

  const handleSubtaskToggle = async (subtask: Task) => {
    try {
      const updated = await tasksService.update(subtask.id, {
        status: subtask.status === 'ACTIVE' ? 'COMPLETED' : 'ACTIVE',
      });
      setLocalSubtasks((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch {
      toast.error('Failed to update subtask');
    }
  };

  const handleSubtaskDelete = async (id: string) => {
    try {
      await tasksService.delete(id);
      setLocalSubtasks((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast.error('Failed to delete subtask');
    }
  };

  const handleAddSubtask = async (title: string) => {
    if (!title.trim()) return;
    try {
      const subtask = await tasksService.createSubtask(task.id, { title: title.trim() });
      setLocalSubtasks((prev) => [...prev, subtask]);
    } catch {
      toast.error('Failed to create subtask');
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-xl border transition-shadow ${
        isSelected
          ? 'border-primary-400 ring-2 ring-primary-200 dark:ring-primary-800 shadow-md'
          : 'border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Selection checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelect(task.id)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            aria-label="Select task"
          />

          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            ⠿
          </button>

          {/* Complete checkbox */}
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
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">{task.description}</p>
            )}

            {(task.location || task.webLink) && (
              <div className="mt-1 flex flex-wrap gap-2">
                {task.location && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-0.5 max-w-[160px] truncate"
                    title={task.location}
                  >
                    📍 {task.location}
                  </a>
                )}
                {task.webLink && (
                  <a
                    href={task.webLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-0.5 max-w-[160px] truncate"
                    title={task.webLink}
                  >
                    🔗 {task.webLink}
                  </a>
                )}
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[task.priority]}`}>
                {task.priority}
              </span>

              {task.dueDate && (() => {
                const d = new Date(task.dueDate);
                const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
                return (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Due {format(d, hasTime ? 'MMM d, h:mm a' : 'MMM d')}
                  </span>
                );
              })()}

              {task.tags.map(({ category }) => (
                <span
                  key={category.id}
                  className="text-xs px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: category.color }}
                >
                  {category.name}
                </span>
              ))}

              {subtaskCount > 0 && (
                <button
                  onClick={() => setSubtasksExpanded((v) => !v)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600"
                >
                  {completedSubtasks}/{subtaskCount} subtasks
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <TimerButton
              taskId={task.id}
              activeEntry={activeTimerEntry ?? null}
              onChanged={onTimerChanged ?? (() => {})}
            />
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

      {/* Subtasks panel */}
      {(subtasksExpanded || subtaskCount === 0) && task.status !== 'COMPLETED' && (
        <SubtasksPanel
          subtasks={localSubtasks}
          onToggle={handleSubtaskToggle}
          onDelete={handleSubtaskDelete}
          onAdd={handleAddSubtask}
          expanded={subtasksExpanded}
        />
      )}
    </div>
  );
}

function SubtasksPanel({
  subtasks,
  onToggle,
  onDelete,
  onAdd,
  expanded,
}: {
  subtasks: Task[];
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
  onAdd: (title: string) => void;
  expanded: boolean;
}) {
  const [newTitle, setNewTitle] = useState('');

  if (!expanded && subtasks.length === 0) return null;

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-3 pt-2 ml-10">
      {subtasks.map((s) => (
        <SubtaskRow key={s.id} subtask={s} onToggle={onToggle} onDelete={onDelete} />
      ))}
      <div className="flex items-center gap-2 mt-1">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTitle.trim()) {
              onAdd(newTitle.trim());
              setNewTitle('');
            }
          }}
          placeholder="Add subtask…"
          className="flex-1 text-xs bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:outline-none focus:border-primary-400 text-gray-600 dark:text-gray-400 py-1"
        />
      </div>
    </div>
  );
}
