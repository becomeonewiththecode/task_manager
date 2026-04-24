import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Task, Priority, Recurring, TaskShare, TimeEntry, TaskTemplate } from '@/types';
import { taskSharesService } from '@/services/taskShares.service';
import { timeEntriesService } from '@/services/timeEntries.service';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { TemplatePickerModal } from '@/components/TemplatePickerModal';
import { format, formatDuration, intervalToDuration } from 'date-fns';
import toast from 'react-hot-toast';

interface FormValues {
  title: string;
  description: string;
  priority: Priority;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  dueDate: string;
  dueTime: string;
  durationHours: string;
  durationMins: string;
  recurring: Recurring | '';
  categoryIds: string[];
  location: string;
  webLink: string;
}

interface Props {
  task?: Task;
  categories: Array<{ id: string; name: string; color: string }>;
  onSubmit: (data: Partial<Task> & { categoryIds?: string[] }) => Promise<void>;
  onCancel: () => void;
  defaultDueDate?: string;
  timeVersion?: number;
}

export function TaskForm({ task, categories, onSubmit, onCancel, defaultDueDate, timeVersion }: Props) {
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      status: 'ACTIVE' as const,
      dueDate: defaultDueDate ?? '',
      dueTime: '',
      durationHours: '',
      durationMins: '',
      recurring: '',
      categoryIds: [],
      location: '',
      webLink: '',
    },
  });

  const [activeTab, setActiveTab] = useState<'details' | 'time' | 'share'>('details');
  const [shares, setShares] = useState<TaskShare[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [shareExpiry, setShareExpiry] = useState('');

  const { listening, start: startVoice, stop: stopVoice, supported: voiceSupported } = useVoiceInput(
    (transcript) => setValue('title', transcript)
  );

  useEffect(() => {
    if (task) {
      const d = task.dueDate ? new Date(task.dueDate) : null;
      reset({
        title: task.title,
        description: task.description ?? '',
        priority: task.priority,
        dueDate: d ? format(d, 'yyyy-MM-dd') : '',
        dueTime: d ? format(d, 'HH:mm') : '',
        durationHours: task.durationMinutes != null ? String(Math.floor(task.durationMinutes / 60)) : '',
        durationMins: task.durationMinutes != null ? String(task.durationMinutes % 60) : '',
        recurring: task.recurring ?? '',
        status: task.status,
        categoryIds: task.tags.map((t) => t.category.id),
        location: task.location ?? '',
        webLink: task.webLink ?? '',
      });
      if (task.id) {
        taskSharesService.list(task.id).then(setShares).catch(() => {});
      }
    }
  }, [task, reset]);

  useEffect(() => {
    if (task?.id) {
      timeEntriesService.list(task.id).then(setTimeEntries).catch(() => {});
    }
  }, [task?.id, timeVersion]);

  const onFormSubmit = async (values: FormValues) => {
    let dueDate: string | undefined;
    if (values.dueDate) {
      dueDate = new Date(`${values.dueDate}T${values.dueTime || '00:00'}`).toISOString();
    }
    const hours = parseInt(values.durationHours || '0', 10) || 0;
    const mins = parseInt(values.durationMins || '0', 10) || 0;
    const durationMinutes = hours * 60 + mins || undefined;

    await onSubmit({
      title: values.title,
      description: values.description || undefined,
      priority: values.priority,
      status: values.status,
      dueDate,
      durationMinutes,
      recurring: (values.recurring || undefined) as Recurring | undefined,
      categoryIds: values.categoryIds,
      location: values.location || undefined,
      webLink: values.webLink || undefined,
    });
  };

  const handleApplyTemplate = (template: TaskTemplate) => {
    reset({
      title: template.name,
      description: template.description ?? '',
      priority: template.priority,
      dueDate: '',
      recurring: template.recurring ?? '',
      categoryIds: template.categoryIds,
    });
  };

  const handleCreateShare = async () => {
    if (!task?.id) return;
    try {
      const share = await taskSharesService.create(task.id, shareExpiry || undefined);
      setShares((prev) => [share, ...prev]);
      setShareExpiry('');
      toast.success('Share link created');
    } catch {
      toast.error('Failed to create share link');
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!task?.id) return;
    try {
      await taskSharesService.delete(task.id, shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      toast.success('Share link revoked');
    } catch {
      toast.error('Failed to revoke share link');
    }
  };

  const tabs = task ? (['details', 'time', 'share'] as const) : (['details'] as const);

  return (
    <div>
      {!task && (
        <button
          type="button"
          onClick={() => setShowTemplatePicker(true)}
          className="mb-4 text-xs text-primary-600 hover:underline"
        >
          Use a template
        </button>
      )}

      {task && (
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {tab === 'time' ? 'Time' : tab === 'share' ? 'Share' : 'Details'}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'details' && (
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <div className="flex gap-2">
              <input
                {...register('title', { required: true })}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Task title"
                autoFocus
              />
              {voiceSupported && (
                <button
                  type="button"
                  onClick={listening ? stopVoice : startVoice}
                  title="Voice input"
                  className={`px-3 rounded-lg border transition-colors text-sm ${
                    listening
                      ? 'border-red-400 bg-red-50 text-red-600 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:text-primary-600 hover:border-primary-400'
                  }`}
                >
                  🎤
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <input
              {...register('location')}
              type="text"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. 123 Main St, New York, NY"
            />
            <p className="mt-1 text-xs text-gray-400">Will open in Google Maps</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Web Link</label>
            <input
              {...register('webLink')}
              type="url"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select
                {...register('priority')}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input
                {...register('dueDate')}
                type="date"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-2 mb-1">Due Time <span className="font-normal">(optional)</span></label>
              <input
                {...register('dueTime')}
                type="time"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration <span className="font-normal text-gray-400">(optional)</span></label>
            <div className="flex items-center gap-2">
              <input
                {...register('durationHours')}
                type="number"
                min="0"
                max="99"
                placeholder="0"
                className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">hr</span>
              <input
                {...register('durationMins')}
                type="number"
                min="0"
                max="59"
                placeholder="0"
                className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">min</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recurring</label>
            <select
              {...register('recurring')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">None</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categories</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      value={cat.id}
                      {...register('categoryIds')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: cat.color }}
                    >
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {task && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="task-completed"
                checked={watch('status') === 'COMPLETED'}
                onChange={(e) => setValue('status', e.target.checked ? 'COMPLETED' : 'ACTIVE')}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
              />
              <label htmlFor="task-completed" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Mark as complete
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'time' && task && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {timeEntries.length} time entr{timeEntries.length === 1 ? 'y' : 'ies'} logged.
          </p>
          {timeEntries.map((entry) => {
            const duration = entry.endedAt
              ? formatDuration(intervalToDuration({ start: new Date(entry.startedAt), end: new Date(entry.endedAt) }), { format: ['hours', 'minutes'] }) || '< 1m'
              : 'In progress';
            return (
              <div key={entry.id} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                <span className="text-gray-600 dark:text-gray-300">{format(new Date(entry.startedAt), 'MMM d, h:mm a')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{duration}</span>
                <button
                  onClick={async () => {
                    try {
                      await timeEntriesService.delete(task.id, entry.id);
                      setTimeEntries((prev) => prev.filter((e) => e.id !== entry.id));
                    } catch { toast.error('Failed to delete entry'); }
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            );
          })}
          {timeEntries.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No time logged yet. Use the timer button on the task card.</p>
          )}
        </div>
      )}

      {activeTab === 'share' && task && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="date"
              value={shareExpiry}
              onChange={(e) => setShareExpiry(e.target.value)}
              placeholder="Expiry date (optional)"
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={handleCreateShare}
              className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              Create link
            </button>
          </div>

          {shares.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No share links yet.</p>
          ) : (
            <div className="space-y-2">
              {shares.map((share) => {
                const url = `${window.location.origin}/share/${share.token}`;
                return (
                  <div key={share.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                    <input
                      readOnly
                      value={url}
                      className="flex-1 text-xs bg-transparent text-gray-600 dark:text-gray-300 focus:outline-none"
                    />
                    {share.expiresAt && (
                      <span className="text-xs text-gray-400">exp. {format(new Date(share.expiresAt), 'MMM d')}</span>
                    )}
                    <button
                      onClick={() => { navigator.clipboard.writeText(url); toast.success('Copied!'); }}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleRevokeShare(share.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Revoke
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showTemplatePicker && (
        <TemplatePickerModal
          onSelect={handleApplyTemplate}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}
    </div>
  );
}
