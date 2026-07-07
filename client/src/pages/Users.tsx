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
  const [userToDelete, setUserToDelete] = React.useState<EndUser | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const isModalOpen = activeDialog !== null;
  const selectedUser = activeDialog && typeof activeDialog === 'object' ? activeDialog : undefined;

  const handleCloseModal = () => {
    setActiveDialog(null);
    setSubmitError(null);
  };

  const handleCloseDeleteModal = () => {
    setUserToDelete(null);
    setDeleteError(null);
  };

  React.useEffect(() => {
    if (!isModalOpen && !userToDelete) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
        handleCloseDeleteModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, userToDelete]);

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

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.users.delete(userToDelete.id);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseDeleteModal();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete user. Please try again.');
    } finally {
      setIsDeleting(false);
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
        onDelete={(user) => {
          setUserToDelete(user);
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

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseDeleteModal();
            }
          }}
          aria-label="Delete confirmation backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                Confirm Deletion
              </h3>
              <button
                onClick={handleCloseDeleteModal}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Close delete modal"
              >
                ✕
              </button>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-xl">
                {deleteError}
              </div>
            )}

            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Are you sure you want to delete user <span className="font-semibold text-white">{userToDelete.name}</span>? This action will disable their account.
              </p>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl font-semibold transition-all flex items-center justify-center"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
