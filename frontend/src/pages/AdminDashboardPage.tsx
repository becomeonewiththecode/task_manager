import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'ok') {
    return (
      <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  if (status === 'degraded') {
    return (
      <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    );
  }
  return (
    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ServiceIcon({ name }: { name: string }) {
  const cls = 'w-6 h-6 text-gray-400';
  switch (name) {
    case 'backend':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z" />
        </svg>
      );
    case 'frontend':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      );
    case 'db':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
      );
    case 'redis':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      );
  }
}

export default function AdminDashboard() {
  const { systemStats, healthStatus, services, monitoring, fetchStats, fetchHealth, fetchServices, fetchMonitoring, restartService, loading } = useAdminStore();
  const [restarting, setRestarting] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    fetchHealth();
    fetchServices();
    fetchMonitoring();
  }, [fetchStats, fetchHealth, fetchServices, fetchMonitoring]);

  const handleRestart = async (name: string) => {
    if (!confirm(`Restart ${SERVICE_LABELS[name] || name}?`)) return;
    setRestarting(name);
    try {
      await restartService(name);
      toast.success(`${SERVICE_LABELS[name] || name} restarted`);
    } catch {
      toast.error(`Failed to restart ${SERVICE_LABELS[name] || name}`);
    } finally {
      setRestarting(null);
    }
  };

  if (loading && !systemStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Status</p>
              <p className={`text-2xl font-bold ${
                healthStatus?.status === 'ok' ? 'text-green-600 dark:text-green-400' :
                healthStatus?.status === 'degraded' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {healthStatus?.status?.toUpperCase() || 'UNKNOWN'}
              </p>
            </div>
            <StatusIcon status={healthStatus?.status || 'error'} />
          </div>
        </div>

        {monitoring?.diskUsage && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Disk Usage</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{monitoring.diskUsage.percent}%</p>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formatBytes(monitoring.diskUsage.used)} / {formatBytes(monitoring.diskUsage.total)}
            </div>
          </div>
        )}

        {monitoring?.cpuLoad && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CPU Load (1m)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{monitoring.cpuLoad[0].toFixed(2)}</p>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z" />
              </svg>
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              5m: {monitoring.cpuLoad[1].toFixed(2)} / 15m: {monitoring.cpuLoad[2].toFixed(2)}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Uptime</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {healthStatus?.uptime ? `${Math.floor(healthStatus.uptime / 3600)}h ${Math.floor((healthStatus.uptime % 3600) / 60)}m` : '0h 0m'}
              </p>
            </div>
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Services */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Services</h2>
          <Link to="/admin/monitoring" className="text-sm text-indigo-600 hover:text-indigo-500">
            View Details
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((svc) => (
            <div key={svc.name} className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <ServiceIcon name={svc.name} />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{SERVICE_LABELS[svc.name] || svc.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{svc.containerName}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  svc.state === 'running'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                }`}>
                  {svc.state}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 space-y-1">
                <p>Image: {svc.image}</p>
                <p>Status: {svc.status}</p>
              </div>
              <button
                onClick={() => handleRestart(svc.name)}
                disabled={restarting !== null}
                className="w-full px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                {restarting === svc.name ? 'Restarting...' : 'Restart'}
              </button>
            </div>
          ))}
          {services.length === 0 && !loading && (
            <p className="text-sm text-gray-400 col-span-full">No services found. Docker socket may not be mounted.</p>
          )}
        </div>
      </div>

      {/* Stats + Health + Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Stats</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Users</span>
              <span className="font-medium text-gray-900 dark:text-white">{systemStats?.users.total || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Active Tasks</span>
              <span className="font-medium text-gray-900 dark:text-white">{systemStats?.tasks.active || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Active Sessions</span>
              <span className="font-medium text-gray-900 dark:text-white">{systemStats?.sessions || 0}</span>
            </div>
            {monitoring?.restartCounts && Object.keys(monitoring.restartCounts).length > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Restarts</p>
                {Object.entries(monitoring.restartCounts).map(([svc, count]) => (
                  <div key={svc} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{SERVICE_LABELS[svc] || svc}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Health</h2>
            <Link to="/admin/health" className="text-sm text-indigo-600 hover:text-indigo-500">
              View Details
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Database</span>
              <span className={`px-2 py-1 rounded text-sm ${healthStatus?.services.database.status === 'ok' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'}`}>
                {healthStatus?.services.database.status || 'unknown'} ({healthStatus?.services.database.responseTime || 0}ms)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Redis</span>
              <span className={`px-2 py-1 rounded text-sm ${healthStatus?.services.redis.status === 'ok' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'}`}>
                {healthStatus?.services.redis.status || 'unknown'} ({healthStatus?.services.redis.responseTime || 0}ms)
              </span>
            </div>
            {healthStatus?.memory && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Memory</span>
                <span className="text-gray-900 dark:text-white">
                  {formatBytes(healthStatus.memory.heapUsed)} / {formatBytes(healthStatus.memory.heapTotal)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Users</h2>
            <Link to="/admin/users" className="text-sm text-indigo-600 hover:text-indigo-500">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {systemStats?.recentUsers.slice(0, 5).map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div>
                  <p className="text-gray-900 dark:text-white">{user.username}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
