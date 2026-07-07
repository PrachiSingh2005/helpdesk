import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema } from 'core';
import type { CreateUserSchemaType } from 'core';

interface CreateUserFormProps {
  onSubmit: (data: CreateUserSchemaType) => Promise<void>;
  onCancel: () => void;
}

export const CreateUserForm: React.FC<CreateUserFormProps> = ({ onSubmit, onCancel }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserSchemaType>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  return (
    <form aria-label="Create User Form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="name-input" className="text-sm font-medium text-slate-300 flex items-center">
          Name
        </label>
        <input
          id="name-input"
          type="text"
          autoComplete="off"
          {...register('name')}
          className={`w-full h-10 px-3 bg-slate-950 border ${
            errors.name ? 'border-destructive focus:ring-destructive/25' : 'border-slate-800 focus:ring-violet-500/25'
          } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
          placeholder="Enter name"
        />
        {errors.name && (
          <p className="text-xs text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email-input" className="text-sm font-medium text-slate-300 flex items-center">
          Email
        </label>
        <input
          id="email-input"
          type="email"
          autoComplete="new-email"
          {...register('email')}
          className={`w-full h-10 px-3 bg-slate-950 border ${
            errors.email ? 'border-destructive focus:ring-destructive/25' : 'border-slate-800 focus:ring-violet-500/25'
          } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
          placeholder="Enter email address"
        />
        {errors.email && (
          <p className="text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password-input" className="text-sm font-medium text-slate-300 flex items-center">
          Password
        </label>
        <input
          id="password-input"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          className={`w-full h-10 px-3 bg-slate-950 border ${
            errors.password ? 'border-destructive focus:ring-destructive/25' : 'border-slate-800 focus:ring-violet-500/25'
          } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
          placeholder="Enter password"
        />
        {errors.password && (
          <p className="text-xs text-red-400">{errors.password.message}</p>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-xl font-semibold transition-all flex items-center justify-center"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  );
};
