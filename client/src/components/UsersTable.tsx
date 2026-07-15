import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import type { EndUser } from '../utils/api';

interface UsersTableProps {
  users: EndUser[];
  isLoading: boolean;
  onEdit: (user: EndUser) => void;
  onDelete: (user: EndUser) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({ users, isLoading, onEdit, onDelete }) => {
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
          <div className="h-4 w-32 bg-muted rounded-md"></div>
        </td>
        <td className="py-4 px-6">
          <div className="h-4 w-48 bg-muted rounded-md"></div>
        </td>
        <td className="py-4 px-6">
          <div className="h-5 w-16 bg-muted rounded-full"></div>
        </td>
        <td className="py-4 px-6">
          <div className="h-4 w-24 bg-muted rounded-md"></div>
        </td>
        <td className="py-4 px-6 text-right">
          <div className="h-8 w-8 bg-muted rounded-xl ml-auto"></div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
              <th className="py-4 px-6">Name</th>
              <th className="py-4 px-6">Email</th>
              <th className="py-4 px-6">Role</th>
              <th className="py-4 px-6">Created</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              renderSkeletons()
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-teal-500/[0.02] dark:hover:bg-teal-500/[0.04] transition-colors duration-150">
                  <td className="py-4 px-6 text-sm font-semibold text-foreground">
                    {user.name}
                  </td>
                  <td className="py-4 px-6 text-sm text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="py-4 px-6 text-sm">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      user.role.toUpperCase() === 'ADMIN'
                        ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20'
                        : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                    }`}>
                      {user.role.toLowerCase()}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="py-4 px-6 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(user)}
                        className="p-2 text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-500/5 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-teal-500/10"
                        title="Edit User"
                        aria-label={`Edit ${user.name}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {user.role.toUpperCase() !== 'ADMIN' && (
                        <button
                          onClick={() => onDelete(user)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                          title="Delete User"
                          aria-label={`Delete ${user.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
