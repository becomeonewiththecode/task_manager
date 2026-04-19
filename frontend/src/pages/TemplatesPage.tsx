import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { taskTemplatesService } from '@/services/taskTemplates.service';
import { categoriesService } from '@/services/categories.service';
import type { TaskTemplate, Category, Priority, Recurring } from '@/types';

interface FormValues {
  name: string;
  description: string;
  priority: Priority;
  recurring: Recurring | '';
  categoryIds: string[];
}

export function TemplatesPage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<TaskTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { name: '', description: '', priority: 'MEDIUM', recurring: '', categoryIds: [] },
  });

  useEffect(() => {
    taskTemplatesService.list().then(setTemplates).catch(console.error);
    categoriesService.list().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        description: editing.description ?? '',
        priority: editing.priority,
        recurring: editing.recurring ?? '',
        categoryIds: editing.categoryIds,
      });
    } else {
      reset({ name: '', description: '', priority: 'MEDIUM', recurring: '', categoryIds: [] });
    }
  }, [editing, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        priority: values.priority,
        recurring: (values.recurring || undefined) as Recurring | undefined,
        categoryIds: values.categoryIds,
      };
      if (editing) {
        const updated = await taskTemplatesService.update(editing.id, payload);
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        toast.success('Template updated');
      } else {
        const created = await taskTemplatesService.create(payload);
        setTemplates((prev) => [...prev, created]);
        toast.success('Template created');
      }
      setShowForm(false);
      setEditing(null);
    } catch {
      toast.error('Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await taskTemplatesService.delete(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Task Templates</h2>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          + New Template
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {editing ? 'Edit Template' : 'New Template'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name *</label>
              <input
                {...register('name', { required: true })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Weekly Review"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                {...register('description')}
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
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
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: cat.color }}>
                        {cat.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {templates.length === 0 && !showForm ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No templates yet. Create one to speed up task creation.
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.name}</p>
                {t.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{t.description}</p>
                )}
                <div className="mt-1.5 flex gap-2 text-xs text-gray-400">
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    t.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                    t.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>{t.priority}</span>
                  {t.recurring && <span className="text-gray-400">{t.recurring}</span>}
                  {t.categoryIds.length > 0 && <span>{t.categoryIds.length} categor{t.categoryIds.length === 1 ? 'y' : 'ies'}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { setEditing(t); setShowForm(true); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
