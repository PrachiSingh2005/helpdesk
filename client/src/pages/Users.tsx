import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateUserForm } from '../components/CreateUserForm';
import { UsersTable } from '../components/UsersTable';
import type { UpdateUserSchemaType } from 'core';
import { api, type EndUser } from '../utils/api';

type DialogState = null | 'create' | EndUser;

export const Users: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.list(),
  });

  const users = data?.users || [];

  const [activeDialog, setActiveDialog] = React.useState<DialogState>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const isModalOpen = activeDialog !== null;
  const selectedUser = activeDialog && typeof activeDialog === 'object' ? activeDialog : undefined;

  const handleCloseModal = () => {
    setActiveDialog(null);
    setSubmitError(null);
  };

  React.useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  const onSubmit = async (formData: UpdateUserSchemaType) => {
    setSubmitError(null);
    try {
      if (selectedUser) {
        await api.users.update(selectedUser.id, formData);
      } else {
        await api.users.create(formData as any);
      }
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseModal();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit form. Please try again.');
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
          onClick={() => {
            setActiveDialog('create');
          }}
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
      <UsersTable
        users={users}
        isLoading={isLoading}
        onEdit={(user) => {
          setActiveDialog(user);
        }}
      />

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
          aria-label="Modal backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {selectedUser ? 'Edit User' : 'Create New User'}
              </h3>
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

            <CreateUserForm
              onSubmit={onSubmit}
              onCancel={handleCloseModal}
              initialData={selectedUser}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
