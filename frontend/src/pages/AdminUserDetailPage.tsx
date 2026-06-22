import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminStore } from '@/store/adminStore';
import toast from 'react-hot-toast';

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedUser, fetchUser, updateUser, resetPassword, banUser, unbanUser, lockUser, unlockUser, userSessions, fetchUserSessions, dropSession, dropAllUserSessions, loading } = useAdminStore();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchUser(id);
      fetchUserSessions(id);
    }
  }, [id, fetchUser, fetchUserSessions]);

  useEffect(() => {
    if (selectedUser) {
      setEmail(selectedUser.email);
      setUsername(selectedUser.username);
    }
  }, [selectedUser]);

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateUser(id, { email, username });
      toast.success('User updated successfully');
      setEditing(false);
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleResetPassword = async () => {
    if (!id) return;
    if (window.confirm('Are you sure you want to reset this user\'s password?')) {
      try {
        const password = await resetPassword(id);
        setTempPassword(password);
        toast.success('Password reset successful');
      } catch (error) {
        toast.error('Failed to reset password');
      }
    }
  };

  const handleBan = async () => {
    if (!id) return;
    const reason = window.prompt('Enter ban reason (optional):');
    if (reason !== null) {
      try {
        await banUser(id, reason || undefined);
        toast.success('User banned successfully');
        fetchUser(id);
      } catch (error) {
        toast.error('Failed to ban user');
      }
    }
  };

  const handleUnban = async () => {
    if (!id) return;
    try {
      await unbanUser(id);
      toast.success('User unbanned successfully');
      fetchUser(id);
    } catch (error) {
      toast.error('Failed to unban user');
    }
  };

  const handleLock = async () => {
    if (!id) return;
    if (window.confirm('Lock this account? This will invalidate all their sessions.')) {
      try {
        await lockUser(id);
        toast.success('Account locked');
        fetchUser(id);
        fetchUserSessions(id);
      } catch (error) {
        toast.error('Failed to lock user');
      }
    }
  };

  const handleUnlock = async () => {
    if (!id) return;
    try {
      await unlockUser(id);
      toast.success('Account unlocked');
      fetchUser(id);
    } catch (error) {
      toast.error('Failed to unlock user');
    }
  };

  const handleDropSession = async (sessionId: string) => {
    if (!id) return;
    if (window.confirm('Drop this session?')) {
      try {
        await dropSession(id, sessionId);
        toast.success('Session dropped');
      } catch (error) {
        toast.error('Failed to drop session');
      }
    }
  };

  const handleDropAllSessions = async () => {
    if (!id) return;
    if (window.confirm('Drop ALL sessions for this user?')) {
      try {
        await dropAllUserSessions(id);
        toast.success('All sessions dropped');
      } catch (error) {
        toast.error('Failed to drop sessions');
      }
    }
  };

  if (loading && !selectedUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">User not found</p>
        <button onClick={() => navigate('/admin/users')} className="mt-4 text-indigo-600 hover:text-indigo-500">
          Back to Users
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/users')} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Details</h1>
        </div>
        <div className="flex gap-2">
          {selectedUser.isBanned ? (
            <button onClick={handleUnban} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Unban User
            </button>
          ) : (
            <button onClick={handleBan} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
              Ban User
            </button>
          )}
          {selectedUser.lockedUntil ? (
            <button onClick={handleUnlock} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Unlock Account
            </button>
          ) : (
            <button onClick={handleLock} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
              Lock Account
            </button>
          )}
          <button onClick={handleResetPassword} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Reset Password
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            {editing ? (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">{selectedUser.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            {editing ? (
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">{selectedUser.username}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <div className="flex items-center gap-2">
              {selectedUser.isBanned ? (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400">
                  Banned
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400">
                  Active
                </span>
              )}
              {selectedUser.totpEnabled && (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400">
                  2FA Enabled
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Created</label>
            <p className="text-gray-900 dark:text-white">{new Date(selectedUser.createdAt).toLocaleString()}</p>
          </div>
        </div>

        {editing && (
          <div className="mt-4 flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Save Changes
            </button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
          </div>
        )}

        {!editing && (
          <button onClick={() => setEditing(true)} className="mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            Edit Profile
          </button>
        )}
      </div>

      {tempPassword && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Temporary Password</h3>
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
            Share this password securely with the user. They should change it after logging in.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-sm font-mono">{tempPassword}</code>
            <button
              onClick={() => navigator.clipboard.writeText(tempPassword)}
              className="text-sm text-yellow-700 dark:text-yellow-300 hover:underline"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {selectedUser.bannedAt && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Ban Information</h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            Banned on: {new Date(selectedUser.bannedAt).toLocaleString()}
          </p>
          {selectedUser.banReason && (
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              Reason: {selectedUser.banReason}
            </p>
          )}
        </div>
      )}

      {/* Active Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Active Sessions ({userSessions.length})
          </h2>
          {userSessions.length > 0 && (
            <button
              onClick={handleDropAllSessions}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900/70 transition-colors"
            >
              Drop All Sessions
            </button>
          )}
        </div>
        {userSessions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">No active sessions</p>
        ) : (
          <div className="space-y-3">
            {userSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">{session.id.slice(0, 12)}...</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Created: {new Date(session.createdAt).toLocaleString()} | Expires: {new Date(session.expiresAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDropSession(session.id)}
                  className="px-3 py-1 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900/70 transition-colors"
                >
                  Drop
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedUser.lockedUntil && new Date(selectedUser.lockedUntil) > new Date() && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200">Account Locked</h3>
          <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
            Locked until: {new Date(selectedUser.lockedUntil).toLocaleString()}
          </p>
          {selectedUser.failedLoginCount && selectedUser.failedLoginCount > 0 && (
            <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
              Failed login attempts: {selectedUser.failedLoginCount}
            </p>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedUser._count?.tasks || 0}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tasks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedUser._count?.sessions || 0}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sessions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedUser._count?.auditLogs || 0}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Audit Logs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedUser._count?.timeEntries || 0}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Time Entries</p>
          </div>
        </div>
      </div>

      {selectedUser.taskStats && selectedUser.taskStats.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Task Breakdown</h2>
          <div className="space-y-2">
            {selectedUser.taskStats.map((stat) => (
              <div key={stat.status} className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">{stat.status}</span>
                <span className="font-medium text-gray-900 dark:text-white">{stat._count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedUser.recentActivity && selectedUser.recentActivity.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {selectedUser.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{activity.action}</span>
                  <span className="text-gray-500 dark:text-gray-400"> on {activity.entity}</span>
                  {activity.entityId && <span className="text-gray-400 dark:text-gray-500"> ({activity.entityId.slice(0, 8)}...)</span>}
                </div>
                <span className="text-gray-500 dark:text-gray-400">{new Date(activity.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
