import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TicketDetail } from './TicketDetail';
import { api } from '../utils/api';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the api module
vi.mock('../utils/api', () => ({
  api: {
    tickets: {
      get: vi.fn(),
      update: vi.fn(),
      reply: vi.fn(),
      listAgents: vi.fn(),
    },
  },
}));

// Mock react-router-dom useParams and useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'ticket-123' }),
  useNavigate: () => mockNavigate,
}));

// Helper wrapper to provide QueryClient
const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('TicketDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTicket = {
    id: 'ticket-123',
    ticketNumber: 456,
    studentEmail: 'student@example.com',
    subject: 'Need help with math assignment',
    status: 'OPEN' as const,
    category: 'GENERAL_QUESTION' as const,
    aiSummary: 'Wants assistance with algebra questions.',
    aiSuggestedReply: 'Check KB article algebra-101.',
    aiConfidence: 0.9,
    assignedTo: null,
    messages: [
      {
        id: 'msg-1',
        ticketId: 'ticket-123',
        sender: 'STUDENT' as const,
        senderEmail: 'student@example.com',
        body: 'I have some issues solving linear equations.',
        createdAt: '2026-07-08T10:00:00.000Z',
      },
    ],
    createdAt: '2026-07-08T10:00:00.000Z',
    updatedAt: '2026-07-08T10:05:00.000Z',
  };

  const mockAgents = [
    {
      id: 'agent-1',
      email: 'john@helpdesk.edu',
      role: 'AGENT',
      name: 'John',
    },
    {
      id: 'agent-2',
      email: 'admin@helpdesk.edu',
      role: 'ADMIN',
      name: 'Admin',
    },
  ];

  it('renders ticket details and lists agents in the dropdown', async () => {
    vi.mocked(api.tickets.get).mockResolvedValue({ ticket: mockTicket });
    vi.mocked(api.tickets.listAgents).mockResolvedValue({ agents: mockAgents });

    renderWithClient(<TicketDetail />);

    // Verify loading state is shown, then resolves
    await waitFor(() => {
      expect(screen.getAllByText('Need help with math assignment')[0]).toBeInTheDocument();
    });

    expect(screen.getByText('#456')).toBeInTheDocument();
    expect(screen.getByText('I have some issues solving linear equations.')).toBeInTheDocument();

    // Verify status, category, and assignment dropdown options are rendered
    const statusSelect = screen.getByDisplayValue('Open');
    expect(statusSelect).toBeInTheDocument();

    const categorySelect = screen.getByDisplayValue('General Question');
    expect(categorySelect).toBeInTheDocument();

    const agentSelect = screen.getByLabelText('Assigned Agent');
    expect(agentSelect).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Unassigned' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'John (AGENT)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Admin (ADMIN)' })).toBeInTheDocument();
  });

  it('calls api.tickets.update when the Assigned Agent is changed', async () => {
    vi.mocked(api.tickets.get).mockResolvedValue({ ticket: mockTicket });
    vi.mocked(api.tickets.listAgents).mockResolvedValue({ agents: mockAgents });
    vi.mocked(api.tickets.update).mockResolvedValue({
      ticket: {
        ...mockTicket,
        assignedTo: {
          id: 'agent-1',
          email: 'john@helpdesk.edu',
          role: 'AGENT',
          name: 'John',
        },
      },
    });

    renderWithClient(<TicketDetail />);

    await waitFor(() => {
      expect(screen.getAllByText('Need help with math assignment')[0]).toBeInTheDocument();
    });

    const agentSelect = screen.getByLabelText(/Assigned Agent/i);
    fireEvent.change(agentSelect, { target: { value: 'agent-1' } });

    await waitFor(() => {
      expect(api.tickets.update).toHaveBeenCalledWith('ticket-123', {
        assignedToId: 'agent-1',
      });
    });
  });

  it('calls api.tickets.update with null when Assigned Agent is set to Unassigned', async () => {
    const mockTicketWithAssignee = {
      ...mockTicket,
      assignedTo: {
        id: 'agent-1',
        email: 'john@helpdesk.edu',
        role: 'AGENT',
        name: 'John',
      },
    };

    vi.mocked(api.tickets.get).mockResolvedValue({ ticket: mockTicketWithAssignee });
    vi.mocked(api.tickets.listAgents).mockResolvedValue({ agents: mockAgents });
    vi.mocked(api.tickets.update).mockResolvedValue({
      ticket: {
        ...mockTicket,
        assignedTo: null,
      },
    });

    renderWithClient(<TicketDetail />);

    await waitFor(() => {
      expect(screen.getAllByText('Need help with math assignment')[0]).toBeInTheDocument();
    });

    const agentSelect = screen.getByLabelText(/Assigned Agent/i);
    expect(agentSelect).toHaveValue('agent-1');

    fireEvent.change(agentSelect, { target: { value: '' } });

    await waitFor(() => {
      expect(api.tickets.update).toHaveBeenCalledWith('ticket-123', {
        assignedToId: null,
      });
    });
  });

  it('alerts an error message when ticket assignment fails', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.mocked(api.tickets.get).mockResolvedValue({ ticket: mockTicket });
    vi.mocked(api.tickets.listAgents).mockResolvedValue({ agents: mockAgents });
    vi.mocked(api.tickets.update).mockRejectedValue(new Error('Assigned agent not found.'));

    renderWithClient(<TicketDetail />);

    await waitFor(() => {
      expect(screen.getAllByText('Need help with math assignment')[0]).toBeInTheDocument();
    });

    const agentSelect = screen.getByLabelText(/Assigned Agent/i);
    fireEvent.change(agentSelect, { target: { value: 'agent-1' } });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Assigned agent not found.');
    });

    alertSpy.mockRestore();
  });

  it('disables the Send Reply and Polish buttons when the draft reply is empty, and enables them when text is entered', async () => {
    vi.mocked(api.tickets.get).mockResolvedValue({ ticket: mockTicket });
    vi.mocked(api.tickets.listAgents).mockResolvedValue({ agents: mockAgents });

    renderWithClient(<TicketDetail />);

    await waitFor(() => {
      expect(screen.getAllByText('Need help with math assignment')[0]).toBeInTheDocument();
    });

    const sendBtn = screen.getByRole('button', { name: /Send Reply/i });
    const polishBtn = screen.getByRole('button', { name: /Polish/i });

    // Assert initially disabled
    expect(sendBtn).toBeDisabled();
    expect(polishBtn).toBeDisabled();

    // Type into draft reply textarea
    const textarea = screen.getByPlaceholderText(/Draft your reply to the student/i);
    fireEvent.change(textarea, { target: { value: 'Let me look into that for you.' } });

    // Assert buttons are now enabled
    expect(sendBtn).not.toBeDisabled();
    expect(polishBtn).not.toBeDisabled();
  });
});
