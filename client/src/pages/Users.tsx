import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { EndUser } from '../utils/api';
import { Loader2 } from 'lucide-react';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<EndUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.users.list();
      setUsers(data.users);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load users list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Heading */}
      <h2 className="text-2xl font-bold text-white tracking-tight">
        Users
      </h2>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800/80 text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Email</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-900/20 transition-colors">
                  <td className="py-4 px-6 text-sm font-semibold text-white">
                    {user.name}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">
                    {user.email}
                  </td>
                  <td className="py-4 px-6 text-sm">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      user.role.toLowerCase() === 'admin'
                        ? 'bg-white text-slate-950 border border-white'
                        : 'bg-slate-800 text-slate-300 border border-slate-700/50'
                    }`}>
                      {user.role.toLowerCase()}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">
                    {formatDate(user.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Users;
