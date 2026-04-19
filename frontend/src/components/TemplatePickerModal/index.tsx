import { useEffect, useState } from 'react';
import { taskTemplatesService } from '@/services/taskTemplates.service';
import type { TaskTemplate } from '@/types';

interface Props {
  onSelect: (template: TaskTemplate) => void;
  onClose: () => void;
}

export function TemplatePickerModal({ onSelect, onClose }: Props) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);

  useEffect(() => {
    taskTemplatesService.list().then(setTemplates).catch(console.error);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Use a template</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {templates.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
            No templates yet. Create one in Settings → Templates.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => { onSelect(t); onClose(); }}
                className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.name}</p>
                {t.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{t.description}</p>
                )}
                <div className="mt-1 flex gap-2 text-xs text-gray-400">
                  <span>{t.priority}</span>
                  {t.recurring && <span>· {t.recurring}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
