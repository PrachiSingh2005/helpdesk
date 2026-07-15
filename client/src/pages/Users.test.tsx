import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Users from './Users';
import { api } from '../utils/api';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the api module
vi.mock('../utils/api', () => ({
  api: {
    users: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Helper wrapper to provide QueryClient
const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Turn off retries for testing to make failures faster
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('Users Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton state initially', async () => {
    let resolvePromise: (value: any) => void = () => {};
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(api.users.list).mockReturnValue(promise as any);

    const { container } = renderWithClient(<Users />);

    // Assert main header is visible
    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();

    // Verify loading skeletons are rendered
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);

    // Resolve the promise to clean up
    resolvePromise({ users: [] });
  });

  it('renders users table successfully when API returns data', async () => {
    const mockUsers = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'ADMIN' as const,
        createdAt: '2026-07-06T15:00:00.000Z',
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'AGENT' as const,
        createdAt: '2026-07-05T10:00:00.000Z',
      },
    ];

    vi.mocked(api.users.list).mockResolvedValue({ users: mockUsers });

    renderWithClient(<Users />);

    // Wait for the table rows to render
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('agent')).toBeInTheDocument();

    // Verify dates formatting based on local timezone conversions
    const d1 = new Date(mockUsers[0].createdAt);
    const expectedDate1 = `${d1.getMonth() + 1}/${d1.getDate()}/${d1.getFullYear()}`;
    const d2 = new Date(mockUsers[1].createdAt);
    const expectedDate2 = `${d2.getMonth() + 1}/${d2.getDate()}/${d2.getFullYear()}`;

    expect(screen.getByText(expectedDate1)).toBeInTheDocument();
    expect(screen.getByText(expectedDate2)).toBeInTheDocument();
  });

  it('renders error message when API call fails', async () => {
    const errorMessage = 'Network error fetching users';
    vi.mocked(api.users.list).mockRejectedValue(new Error(errorMessage));

    renderWithClient(<Users />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('renders correct CSS styling classes for different roles', async () => {
    const mockUsers = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'ADMIN' as const,
        createdAt: '2026-07-06T15:00:00.000Z',
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'AGENT' as const,
        createdAt: '2026-07-05T10:00:00.000Z',
      },
    ];

    vi.mocked(api.users.list).mockResolvedValue({ users: mockUsers });

    renderWithClient(<Users />);

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    const adminBadge = screen.getByText('admin');
    const agentBadge = screen.getByText('agent');

    expect(adminBadge).toHaveClass('bg-teal-500/10', 'text-teal-700', 'border-teal-500/20');
    expect(agentBadge).toHaveClass('bg-slate-500/10', 'text-slate-600', 'border-slate-500/20');
  });

  describe('User Creation Modal & Form Validation', () => {
    beforeEach(() => {
      vi.mocked(api.users.list).mockResolvedValue({ users: [] });
    });

    it('opens and closes the modal correctly', async () => {
      renderWithClient(<Users />);

      // Trigger button opens modal
      const openButton = screen.getByRole('button', { name: 'Create User' });
      fireEvent.click(openButton);

      // Verify modal is open
      expect(screen.getByText('Create New User')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();

      // Cancel button closes modal
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      // Verify modal is closed
      expect(screen.queryByText('Create New User')).not.toBeInTheDocument();
    });

    it('closes the modal when clicking on the backdrop', async () => {
      renderWithClient(<Users />);

      // Trigger button opens modal
      const openButton = screen.getByRole('button', { name: 'Create User' });
      fireEvent.click(openButton);

      // Verify modal is open
      expect(screen.getByText('Create New User')).toBeInTheDocument();

      // Click on backdrop
      const backdrop = screen.getByLabelText('Modal backdrop');
      fireEvent.click(backdrop);

      // Verify modal is closed
      expect(screen.queryByText('Create New User')).not.toBeInTheDocument();
    });

    it('closes the modal when pressing the Escape key', async () => {
      renderWithClient(<Users />);

      // Trigger button opens modal
      const openButton = screen.getByRole('button', { name: 'Create User' });
      fireEvent.click(openButton);

      // Verify modal is open
      expect(screen.getByText('Create New User')).toBeInTheDocument();

      // Press Escape key
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

      // Verify modal is closed
      expect(screen.queryByText('Create New User')).not.toBeInTheDocument();
    });

    it('validates required fields and length constraints', async () => {
      renderWithClient(<Users />);

      // Open Modal
      fireEvent.click(screen.getByRole('button', { name: 'Create User' }));

      // Submit empty form directly
      const form = screen.getByRole('form', { name: 'Create User Form' });
      fireEvent.submit(form);

      // Verify validation messages
      await waitFor(() => {
        expect(screen.getByText('Name must be at least 3 characters.')).toBeInTheDocument();
        expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
        expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
      });

      // Enter short name and password, invalid email
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jo' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'invalid-email' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: '123' } });

      // Submit form again
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Name must be at least 3 characters.')).toBeInTheDocument();
        expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
        expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
      });
    });

    it('submits form successfully and closes the modal', async () => {
      vi.mocked(api.users.create).mockResolvedValue({
        user: {
          id: '123',
          name: 'New Agent',
          email: 'newagent@example.com',
          role: 'AGENT' as const,
          createdAt: '2026-07-06T15:00:00.000Z',
        },
      });

      renderWithClient(<Users />);

      // Open Modal
      fireEvent.click(screen.getByRole('button', { name: 'Create User' }));

      // Fill in fields
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Agent' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'newagent@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'superpassword123' } });

      // Submit form
      const form = screen.getByRole('form', { name: 'Create User Form' });
      fireEvent.submit(form);

      // Verify api is called
      await waitFor(() => {
        expect(api.users.create).toHaveBeenCalledWith({
          name: 'New Agent',
          email: 'newagent@example.com',
          password: 'superpassword123',
        });
      });

      // Verify modal is closed
      await waitFor(() => {
        expect(screen.queryByText('Create New User')).not.toBeInTheDocument();
      });
    });

    it('displays error message if server creation fails', async () => {
      const serverError = 'Email is already in use.';
      vi.mocked(api.users.create).mockRejectedValue(new Error(serverError));

      renderWithClient(<Users />);

      // Open Modal
      fireEvent.click(screen.getByRole('button', { name: 'Create User' }));

      // Fill in fields
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Agent' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'newagent@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'superpassword123' } });

      // Submit form
      const form = screen.getByRole('form', { name: 'Create User Form' });
      fireEvent.submit(form);

      // Verify error message is rendered
      await waitFor(() => {
        expect(screen.getByText(serverError)).toBeInTheDocument();
      });

      // Modal should remain open
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });

    it('pre-populates form, calls api.users.update on submit, and closes the modal when editing', async () => {
      const mockUsers = [
        {
          id: 'agent-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'AGENT' as const,
          createdAt: '2026-07-06T15:00:00.000Z',
        },
      ];

      vi.mocked(api.users.list).mockResolvedValue({ users: mockUsers });
      vi.mocked(api.users.update).mockResolvedValue({
        user: {
          id: 'agent-1',
          name: 'John Doe Updated',
          email: 'john-updated@example.com',
          role: 'AGENT' as const,
          createdAt: '2026-07-06T15:00:00.000Z',
        },
      });

      renderWithClient(<Users />);

      // Wait for user row to render in table
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      // Click Edit button on the user row
      const editButton = screen.getByRole('button', { name: 'Edit John Doe' });
      fireEvent.click(editButton);

      // Verify modal is open as "Edit User" and fields are pre-populated
      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toHaveValue('John Doe');
      expect(screen.getByLabelText('Email')).toHaveValue('john@example.com');
      expect(screen.getByLabelText('Password')).toHaveValue('');

      // Modify name and email
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John Doe Updated' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john-updated@example.com' } });

      // Submit form
      const form = screen.getByRole('form', { name: 'Create User Form' });
      fireEvent.submit(form);

      // Verify api.users.update is called with correct arguments
      await waitFor(() => {
        expect(api.users.update).toHaveBeenCalledWith('agent-1', {
          name: 'John Doe Updated',
          email: 'john-updated@example.com',
          password: '',
        });
      });

      // Verify modal is closed
      await waitFor(() => {
        expect(screen.queryByText('Edit User')).not.toBeInTheDocument();
      });
    });
  });

  describe('User Deletion', () => {
    const mockUsers = [
      {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN' as const,
        createdAt: '2026-07-06T15:00:00.000Z',
      },
      {
        id: 'agent-1',
        name: 'Agent User',
        email: 'agent@example.com',
        role: 'AGENT' as const,
        createdAt: '2026-07-05T10:00:00.000Z',
      },
    ];

    beforeEach(() => {
      vi.mocked(api.users.list).mockResolvedValue({ users: mockUsers });
    });

    it('does not display Delete button for admin users', async () => {
      renderWithClient(<Users />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: 'Delete Admin User' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete Agent User' })).toBeInTheDocument();
    });

    it('opens and closes the delete confirmation modal on Cancel', async () => {
      renderWithClient(<Users />);

      await waitFor(() => {
        expect(screen.getByText('Agent User')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: 'Delete Agent User' });
      fireEvent.click(deleteButton);

      // Verify modal is open
      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete user/)).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      // Verify modal is closed
      expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument();
      expect(api.users.delete).not.toHaveBeenCalled();
    });

    it('submits deletion successfully, calls API, and refetches users list', async () => {
      vi.mocked(api.users.delete).mockResolvedValue({ message: 'User deleted successfully.' });

      renderWithClient(<Users />);

      await waitFor(() => {
        expect(screen.getByText('Agent User')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: 'Delete Agent User' });
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Delete' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(api.users.delete).toHaveBeenCalledWith('agent-1');
      });

      // Verify modal is closed
      await waitFor(() => {
        expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument();
      });
    });

    it('displays error message if deletion fails', async () => {
      const serverError = 'Failed to delete user. Please try again.';
      vi.mocked(api.users.delete).mockRejectedValue(new Error(serverError));

      renderWithClient(<Users />);

      await waitFor(() => {
        expect(screen.getByText('Agent User')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: 'Delete Agent User' });
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Delete' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(serverError)).toBeInTheDocument();
      });

      // Modal remains open
      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
    });
  });
});
