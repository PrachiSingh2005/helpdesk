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
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          Users
        </h2>
        <button
          onClick={() => {
            setActiveDialog('create');
          }}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          Create User
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-red-600 dark:text-red-400 text-sm rounded-xl">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fadeIn"
        >
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">
                {selectedUser ? 'Edit User' : 'Create New User'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-red-600 dark:text-red-400 text-xs rounded-xl">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fadeIn"
        >
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">
                Confirm Deletion
              </h3>
              <button
                onClick={handleCloseDeleteModal}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close delete modal"
              >
                ✕
              </button>
            </div>

            {deleteError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-red-600 dark:text-red-400 text-xs rounded-xl">
                {deleteError}
              </div>
            )}

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete user <span className="font-bold text-foreground">{userToDelete.name}</span>? This action will disable their account.
              </p>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2 bg-secondary hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 border border-border text-foreground text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center cursor-pointer"
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
