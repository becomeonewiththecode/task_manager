import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStore } from '@/store/adminStore';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const { users, totalUsers, currentPage, totalPages, fetchUsers, deleteUser, banUser, unbanUser, lockUser, loading } = useAdminStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchUsers({ page, search });
  }, [fetchUsers, page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers({ page: 1, search });
  };

  const handleDelete = async (id: string, email: string) => {
    if (window.confirm(`Are you sure you want to delete user ${email}?`)) {
      try {
        await deleteUser(id);
        toast.success('User deleted successfully');
        fetchUsers({ page, search });
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  const handleBan = async (id: string, email: string) => {
    const reason = window.prompt(`Enter ban reason for ${email} (optional):`);
    if (reason !== null) {
      try {
        await banUser(id, reason || undefined);
        toast.success('User banned successfully');
        fetchUsers({ page, search });
      } catch (error) {
        toast.error('Failed to ban user');
      }
    }
  };

  const handleUnban = async (id: string) => {
    try {
      await unbanUser(id);
      toast.success('User unbanned successfully');
      fetchUsers({ page, search });
    } catch (error) {
      toast.error('Failed to unban user');
    }
  };

  const handleLock = async (id: string, email: string) => {
    if (window.confirm(`Lock account for ${email}? This will invalidate all their sessions.`)) {
      try {
        await lockUser(id);
        toast.success('User account locked');
        fetchUsers({ page, search });
      } catch (error) {
        toast.error('Failed to lock user');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {totalUsers} total users
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-4">
        <input
          type="text"
          placeholder="Search by email or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Search
        </button>
      </form>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tasks</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.isBanned ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400">
                        Banned
                      </span>
                    ) : user.totpEnabled ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400">
                        Active (2FA)
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user._count?.tasks || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Link
                      to={`/admin/users/${user.id}`}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                    >
                      View
                    </Link>
                    {user.isBanned ? (
                      <button
                        onClick={() => handleUnban(user.id)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBan(user.id, user.email)}
                        className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400"
                      >
                        Ban
                      </button>
                    )}
                    <button
                      onClick={() => handleLock(user.id, user.email)}
                      className="text-orange-600 hover:text-orange-900 dark:text-orange-400"
                    >
                      Lock
                    </button>
                    <button
                      onClick={() => handleDelete(user.id, user.email)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
