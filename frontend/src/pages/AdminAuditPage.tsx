import { useEffect, useState } from 'react';
import { useAdminStore } from '@/store/adminStore';
import toast from 'react-hot-toast';

export default function AdminAuditPage() {
  const {
    auditLogs, auditStats, logRetention, loading,
    fetchAuditLogs, fetchAuditStats, fetchLogRetention, setLogRetention, cleanupOldLogs,
  } = useAdminStore();

  const [filters, setFilters] = useState<{
    userId?: string;
    action?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
    page: number;
  }>({ page: 1 });

  const [retentionDays, setRetentionDays] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAuditLogs(filters);
    fetchAuditStats();
    fetchLogRetention();
  }, [fetchAuditLogs, fetchAuditStats, fetchLogRetention, filters]);

  useEffect(() => {
    if (logRetention) {
      setRetentionDays(String(logRetention.logRetentionDays));
    }
  }, [logRetention]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { adminService } = await import('@/services/admin.service');
      const csv = await adminService.exportAuditLogs(filters);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Logs exported successfully');
    } catch {
      toast.error('Failed to export logs');
    } finally {
      setExporting(false);
    }
  };

  const handleRetentionSave = async () => {
    const days = parseInt(retentionDays);
    if (isNaN(days) || days < 1) {
      toast.error('Please enter a valid number of days');
      return;
    }
    try {
      await setLogRetention(days);
      toast.success('Retention policy updated');
    } catch {
      toast.error('Failed to update retention policy');
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm('Clean up old audit logs? This cannot be undone.')) return;
    try {
      const result = await cleanupOldLogs();
      toast.success(`Cleaned up old logs`);
      fetchAuditLogs(filters);
      fetchAuditStats();
    } catch {
      toast.error('Failed to clean up logs');
    }
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Stats */}
      {auditStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Logs</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{auditStats.totalLogs.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Top Action</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {auditStats.logsByAction[0]?.action || 'N/A'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {auditStats.logsByAction[0]?.count || 0} occurrences
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Top Entity</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {auditStats.logsByEntity[0]?.entity || 'N/A'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {auditStats.logsByEntity[0]?.count || 0} occurrences
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User ID</label>
            <input
              type="text"
              value={filters.userId || ''}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              placeholder="Filter by user ID"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
            <input
              type="text"
              value={filters.action || ''}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              placeholder="e.g. CREATE, DELETE"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity</label>
            <input
              type="text"
              value={filters.entity || ''}
              onChange={(e) => handleFilterChange('entity', e.target.value)}
              placeholder="e.g. Task, User"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Log Retention */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Log Retention</h2>
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Retention Period (days)
            </label>
            <input
              type="number"
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={handleRetentionSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Update
          </button>
          <button
            onClick={handleCleanup}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cleanup Now
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : auditLogs && auditLogs.logs.length > 0 ? (
          <>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Entity ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Metadata</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {auditLogs.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        log.action === 'CREATE' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400' :
                        log.action === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{log.entity}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {log.entityId ? log.entityId.slice(0, 8) + '...' : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {log.user.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditLogs.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Page {auditLogs.page} of {auditLogs.totalPages} ({auditLogs.total} total)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(auditLogs.page - 1)}
                    disabled={auditLogs.page === 1}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(auditLogs.page + 1)}
                    disabled={auditLogs.page === auditLogs.totalPages}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            No audit logs found
          </div>
        )}
      </div>
    </div>
  );
}
