import { useEffect, useState } from 'react';
import { useAdminStore } from '@/store/adminStore';
import toast from 'react-hot-toast';

const SERVICE_LABELS: Record<string, string> = {
  backend: 'Backend',
  frontend: 'Frontend',
  db: 'PostgreSQL',
  redis: 'Redis',
};

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

export default function AdminMonitoringPage() {
  const {
    monitoring, restartHistory, fetchMonitoring, fetchRestartHistory, restartService, loading,
  } = useAdminStore();
  const [restarting, setRestarting] = useState<string | null>(null);
  const [restartReason, setRestartReason] = useState('');

  useEffect(() => {
    fetchMonitoring();
    fetchRestartHistory();
    const interval = setInterval(fetchMonitoring, 15000);
    return () => clearInterval(interval);
  }, [fetchMonitoring, fetchRestartHistory]);

  const handleRestart = async (name: string) => {
    const reason = window.prompt(`Restart ${SERVICE_LABELS[name] || name}? Enter reason (optional):`);
    if (reason === null) return;
    setRestarting(name);
    try {
      await restartService(name);
      toast.success(`${SERVICE_LABELS[name] || name} restarted`);
      fetchRestartHistory();
    } catch {
      toast.error(`Failed to restart ${SERVICE_LABELS[name] || name}`);
    } finally {
      setRestarting(null);
    }
  };

  if (loading && !monitoring) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Application Monitoring</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Auto-refresh: 15s</span>
          <div className={`w-2 h-2 rounded-full ${
            monitoring?.health.status === 'ok' ? 'bg-green-500' :
            monitoring?.health.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CPU Load (1/5/15m)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {monitoring?.cpuLoad ? monitoring.cpuLoad.map(l => l.toFixed(2)).join(' / ') : '0 / 0 / 0'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Memory</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {monitoring?.health.systemMemory ? `${monitoring.health.systemMemory.percentUsed}%` : 'N/A'}
          </p>
          {monitoring?.health.systemMemory && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatBytes(monitoring.health.systemMemory.used)} / {formatBytes(monitoring.health.systemMemory.total)}
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Disk Usage</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {monitoring?.diskUsage ? `${monitoring.diskUsage.percent}%` : 'N/A'}
          </p>
          {monitoring?.diskUsage && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatBytes(monitoring.diskUsage.used)} / {formatBytes(monitoring.diskUsage.total)}
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Node.js Heap</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {monitoring?.health.memory ? formatBytes(monitoring.health.memory.heapUsed) : '0 MB'}
          </p>
          {monitoring?.health.memory && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatBytes(monitoring.health.memory.heapUsed)} / {formatBytes(monitoring.health.memory.heapTotal)}
            </p>
          )}
        </div>
      </div>

      {/* Container Stats */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Container Resources</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {monitoring?.containers.map((container) => (
            <div key={container.serviceName} className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{SERVICE_LABELS[container.serviceName] || container.serviceName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{container.containerName}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  container.state === 'running'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                }`}>
                  {container.state}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">CPU</span>
                    <span className="text-gray-900 dark:text-white">{container.cpuPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${Math.min(container.cpuPercent, 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Memory</span>
                    <span className="text-gray-900 dark:text-white">{container.memoryPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${Math.min(container.memoryPercent, 100)}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatBytes(container.memoryUsage)} / {formatBytes(container.memoryLimit)}
                  </p>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <p>Net RX: {formatBytes(container.networkRx)}</p>
                  <p>Net TX: {formatBytes(container.networkTx)}</p>
                </div>
              </div>

              <button
                onClick={() => handleRestart(container.serviceName)}
                disabled={restarting !== null}
                className="w-full mt-3 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                {restarting === container.serviceName ? 'Restarting...' : 'Restart'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Restart History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Restart History</h2>
        {restartHistory && restartHistory.logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Triggered By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {restartHistory.logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{SERVICE_LABELS[log.serviceName] || log.serviceName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{log.user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{log.reason || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">No restart history</p>
        )}
      </div>
    </div>
  );
}
