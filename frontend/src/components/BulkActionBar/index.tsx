import { useTaskStore } from '@/store/taskStore';
import type { Priority, TaskStatus } from '@/types';
import toast from 'react-hot-toast';

export function BulkActionBar() {
  const { selectedIds, clearSelection, bulkUpdate, bulkDelete } = useTaskStore();
  const count = selectedIds.size;

  if (count === 0) return null;

  const handleStatus = async (status: TaskStatus) => {
    try {
      await bulkUpdate({ status });
      toast.success(`${count} task${count > 1 ? 's' : ''} updated`);
    } catch {
      toast.error('Failed to update tasks');
    }
  };

  const handlePriority = async (priority: Priority) => {
    try {
      await bulkUpdate({ priority });
      toast.success(`Priority updated for ${count} task${count > 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to update tasks');
    }
  };

  const handleDelete = async () => {
    try {
      await bulkDelete();
      toast.success(`${count} task${count > 1 ? 's' : ''} deleted`);
    } catch {
      toast.error('Failed to delete tasks');
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 dark:bg-gray-700 text-white rounded-2xl shadow-xl px-4 py-3">
      <span className="text-sm font-medium mr-2">{count} selected</span>

      <button
        onClick={() => handleStatus('COMPLETED')}
        className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
      >
        Complete
      </button>
      <button
        onClick={() => handleStatus('ACTIVE')}
        className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
      >
        Reopen
      </button>
      <button
        onClick={() => handleStatus('CANCELLED')}
        className="px-3 py-1.5 text-xs font-medium bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
      >
        Cancel
      </button>

      <select
        onChange={(e) => e.target.value && handlePriority(e.target.value as Priority)}
        defaultValue=""
        className="px-3 py-1.5 text-xs font-medium bg-gray-700 dark:bg-gray-600 border border-gray-500 rounded-lg focus:outline-none"
      >
        <option value="" disabled>Set priority</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>

      <button
        onClick={handleDelete}
        className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
      >
        Delete
      </button>

      <button
        onClick={clearSelection}
        className="ml-1 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
