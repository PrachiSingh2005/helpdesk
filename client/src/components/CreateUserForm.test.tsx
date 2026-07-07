import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateUserForm } from './CreateUserForm';

describe('CreateUserForm Component', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form inputs and action buttons', () => {
    render(<CreateUserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create User' })).toBeInTheDocument();
  });

  it('triggers onCancel when Cancel button is clicked', () => {
    render(<CreateUserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('displays validation errors on submitting empty form', async () => {
    render(<CreateUserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const form = screen.getByRole('form', { name: 'Create User Form' });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Name must be at least 3 characters.')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
      expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('displays validation errors on entering invalid name/password and bad email format', async () => {
    render(<CreateUserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jo' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: '123' } });

    const form = screen.getByRole('form', { name: 'Create User Form' });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Name must be at least 3 characters.')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
      expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('triggers onSubmit with input data when form validation passes', async () => {
    render(<CreateUserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Valid Name' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'valid@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'securepassword123' } });

    const form = screen.getByRole('form', { name: 'Create User Form' });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockOnSubmit.mock.calls[0][0]).toEqual({
        name: 'Valid Name',
        email: 'valid@example.com',
        password: 'securepassword123',
      });
    });
  });
});
