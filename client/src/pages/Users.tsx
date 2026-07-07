import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateUserForm } from '../components/CreateUserForm';
import { UsersTable } from '../components/UsersTable';
import type { CreateUserSchemaType } from 'core';
import { api } from '../utils/api';

export const Users: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.list(),
  });

  const users = data?.users || [];

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSubmitError(null);
  };

  const onSubmit = async (formData: CreateUserSchemaType) => {
    setSubmitError(null);
    try {
      await api.users.create(formData);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseModal();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create user. Please try again.');
    }
  };

  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Heading & Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Users
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold rounded-xl transition-all shadow-lg hover:shadow-violet-600/25 active:scale-[0.98]"
        >
          Create User
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-xl">
          {errorMessage}
        </div>
      )}

      {/* Users Table Component */}
      <UsersTable users={users} isLoading={isLoading} />

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Create New User</h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-xl">
                {submitError}
              </div>
            )}

            <CreateUserForm onSubmit={onSubmit} onCancel={handleCloseModal} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
