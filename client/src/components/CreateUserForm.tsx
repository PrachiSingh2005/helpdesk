import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, updateUserSchema } from 'core';
import type { UpdateUserSchemaType } from 'core';

// Re-export EndUser from utils/api since core type is mapping
import type { EndUser as ApiEndUser } from '../utils/api';

interface CreateUserFormProps {
  onSubmit: (data: UpdateUserSchemaType) => Promise<void>;
  onCancel: () => void;
  initialData?: ApiEndUser;
}

export const CreateUserForm: React.FC<CreateUserFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserSchemaType>({
    resolver: zodResolver(initialData ? updateUserSchema : createUserSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      password: '',
    },
  });

  return (
    <form aria-label="Create User Form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="name-input" className="text-xs font-semibold text-muted-foreground flex items-center">
          Name
        </label>
        <input
          id="name-input"
          type="text"
          autoComplete="off"
          {...register('name')}
          className={`w-full h-10 px-3 bg-background border ${
            errors.name ? 'border-destructive focus:ring-destructive/10' : 'border-border focus:ring-teal-500/10'
          } rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 transition-all`}
          placeholder="Enter name"
        />
        {errors.name && (
          <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email-input" className="text-xs font-semibold text-muted-foreground flex items-center">
          Email
        </label>
        <input
          id="email-input"
          type="email"
          autoComplete="new-email"
          {...register('email')}
          className={`w-full h-10 px-3 bg-background border ${
            errors.email ? 'border-destructive focus:ring-destructive/10' : 'border-border focus:ring-teal-500/10'
          } rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 transition-all`}
          placeholder="Enter email address"
        />
        {errors.email && (
          <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password-input" className="text-xs font-semibold text-muted-foreground flex items-center">
          Password
        </label>
        <input
          id="password-input"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          className={`w-full h-10 px-3 bg-background border ${
            errors.password ? 'border-destructive focus:ring-destructive/10' : 'border-border focus:ring-teal-500/10'
          } rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 transition-all`}
          placeholder={initialData ? "Leave blank to keep current password" : "Enter password"}
        />
        {errors.password && (
          <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-secondary hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 border border-border text-foreground text-xs font-semibold rounded-xl transition-all cursor-pointer"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? (initialData ? 'Saving...' : 'Creating...')
            : (initialData ? 'Save Changes' : 'Create User')}
        </button>
      </div>
    </form>
  );
};
