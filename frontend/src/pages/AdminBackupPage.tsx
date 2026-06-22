import { useEffect, useState, useRef } from 'react';
import { useAdminStore } from '@/store/adminStore';
import toast from 'react-hot-toast';

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AdminBackupPage() {
  const { backups, fetchBackups, createBackup, restoreBackup, deleteBackup, downloadBackup, uploadBackup, loading } = useAdminStore();
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedRestoreId, setSelectedRestoreId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleBackupToServer = async () => {
    setCreating(true);
    try {
      await createBackup();
      toast.success('Backup saved to server');
      setShowBackupModal(false);
    } catch {
      toast.error('Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleBackupDownload = async () => {
    setCreating(true);
    try {
      const backup = await createBackup();
      await downloadBackup(backup.filename);
      toast.success('Backup downloaded');
      setShowBackupModal(false);
    } catch {
      toast.error('Failed to download backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreFromFile = async () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.sql')) {
      toast.error('Please select a .sql backup file');
      return;
    }
    setShowRestoreModal(false);
    if (!window.confirm(`Upload and restore "${file.name}"? This will overwrite the current database.`)) return;
    setUploading(true);
    try {
      await uploadBackup(file);
      await restoreBackup(file.name);
      toast.success('Database restored from uploaded file');
    } catch {
      toast.error('Failed to restore from uploaded file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRestoreFromServer = async () => {
    if (!selectedRestoreId) return;
    if (!window.confirm('Restore this backup? This will overwrite the current database.')) return;
    setRestoring(true);
    try {
      await restoreBackup(selectedRestoreId);
      toast.success('Database restored successfully');
      setShowRestoreModal(false);
      setSelectedRestoreId(null);
    } catch {
      toast.error('Failed to restore database');
    } finally {
      setRestoring(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this backup?')) return;
    try {
      await deleteBackup(id);
      toast.success('Backup deleted');
    } catch {
      toast.error('Failed to delete backup');
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await downloadBackup(id);
      toast.success('Backup downloaded');
    } catch {
      toast.error('Failed to download backup');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Database Backups</h1>
        <button
          onClick={() => setShowBackupModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Create Backup
        </button>
      </div>

      {/* Backups Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {backups.length} backup{backups.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {backups.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
            </svg>
            <p className="mt-2 text-gray-500 dark:text-gray-400">No backups yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Create your first backup to get started</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filename</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {backups.map((backup) => (
                <tr key={backup.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-900 dark:text-white">{backup.filename}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatBytes(backup.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(backup.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <button
                      onClick={() => handleDownload(backup.id)}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRestoreId(backup.id);
                        setShowRestoreModal(true);
                      }}
                      className="text-green-600 hover:text-green-900 dark:text-green-400"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleDelete(backup.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Important</h3>
        <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
          Restoring a backup will overwrite the current database. Always download a backup before restoring.
        </p>
      </div>

      {/* Backup Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBackupModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Backup</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Choose how to create the database backup.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleBackupToServer}
                disabled={creating}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left disabled:opacity-50"
              >
                <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Save to Server</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Store backup on the server for later use</p>
                </div>
              </button>
              <button
                onClick={handleBackupDownload}
                disabled={creating}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left disabled:opacity-50"
              >
                <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Download</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Download backup file to your computer</p>
                </div>
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowBackupModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowRestoreModal(false); setSelectedRestoreId(null); }} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Restore Database</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Choose a backup to restore. This will overwrite the current database.
            </p>
            <div className="space-y-3">
              {backups.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">From Server</p>
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-600 rounded-lg p-2">
                    {backups.map((backup) => (
                      <label
                        key={backup.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedRestoreId === backup.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-600'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restore-backup"
                          checked={selectedRestoreId === backup.id}
                          onChange={() => setSelectedRestoreId(backup.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono text-gray-900 dark:text-white truncate">{backup.filename}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatBytes(backup.size)} - {new Date(backup.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">From File</p>
                <button
                  onClick={handleRestoreFromFile}
                  disabled={uploading}
                  className="w-full flex items-center gap-4 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left disabled:opacity-50"
                >
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Upload .sql file</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Select a backup file from your computer</p>
                  </div>
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowRestoreModal(false); setSelectedRestoreId(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreFromServer}
                disabled={!selectedRestoreId || restoring}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {restoring ? 'Restoring...' : 'Restore Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".sql"
        onChange={handleFileSelected}
        className="hidden"
      />
    </div>
  );
}
