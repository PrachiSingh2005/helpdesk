import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';

export const Users: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.list(),
  });

  const users = data?.users || [];

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    } catch (e) {
      return dateString;
    }
  };

  const renderSkeletons = () => {
    return Array.from({ length: 3 }).map((_, idx) => (
      <tr key={idx} className="animate-pulse">
        <td className="py-4 px-6">
          <div className="h-4 w-32 bg-slate-800 rounded-md"></div>
        </td>
        <td className="py-4 px-6">
          <div className="h-4 w-48 bg-slate-800 rounded-md"></div>
        </td>
        <td className="py-4 px-6">
          <div className="h-5 w-16 bg-slate-800 rounded-full"></div>
        </td>
        <td className="py-4 px-6">
          <div className="h-4 w-24 bg-slate-800 rounded-md"></div>
        </td>
      </tr>
    ));
  };

  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Heading */}
      <h2 className="text-2xl font-bold text-white tracking-tight">
        Users
      </h2>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-xl">
          {errorMessage}
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
              {isLoading ? (
                renderSkeletons()
              ) : (
                users.map((user) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users;
