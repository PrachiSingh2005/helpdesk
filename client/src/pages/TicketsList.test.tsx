import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TicketsList } from './TicketsList';
import { api } from '../utils/api';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the api module
vi.mock('../utils/api', () => ({
  api: {
    tickets: {
      list: vi.fn(),
    },
  },
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
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

describe('TicketsList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTickets = [
    {
      id: 'ticket-1',
      ticketNumber: 101,
      studentEmail: 'student1@college.edu',
      subject: 'WiFi connection issues in dorm',
      status: 'OPEN' as const,
      category: 'TECHNICAL_QUESTION' as const,
      aiSummary: 'Student has trouble connecting to campus WiFi.',
      aiConfidence: 0.95,
      createdAt: '2026-07-08T10:00:00.000Z',
      updatedAt: '2026-07-08T10:05:00.000Z',
    },
    {
      id: 'ticket-2',
      ticketNumber: 102,
      studentEmail: 'student2@college.edu',
      subject: 'Question about library opening hours',
      status: 'RESOLVED' as const,
      category: 'GENERAL_QUESTION' as const,
      aiSummary: 'Wants to know when the library is open.',
      aiConfidence: 0.88,
      createdAt: '2026-07-08T09:00:00.000Z',
      updatedAt: '2026-07-08T09:10:00.000Z',
    },
  ];

  it('renders loading state initially', async () => {
    let resolvePromise: (value: any) => void = () => {};
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(api.tickets.list).mockReturnValue(promise as any);

    const { container } = renderWithClient(<TicketsList />);

    // Check that loading spinner is visible
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();

    // Resolve the promise to clean up
    resolvePromise({ tickets: [] });
  });

  it('renders tickets list successfully and calls list API with default sorting', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({ tickets: mockTickets });

    renderWithClient(<TicketsList />);

    // Verify API is called on mount with default filters and sorting: createdAt desc
    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenCalledWith({
        status: '',
        category: '',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        limit: 10,
      });
    });

    // Check that ticket details are visible
    expect(screen.getByText('#101')).toBeInTheDocument();
    expect(screen.getByText('WiFi connection issues in dorm')).toBeInTheDocument();
    expect(screen.getByText('student1@college.edu')).toBeInTheDocument();
    expect(screen.getAllByText('Open')[0]).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('Student has trouble connecting to campus WiFi.')).toBeInTheDocument();
    expect(screen.getByText('(95% conf)')).toBeInTheDocument();

    expect(screen.getByText('#102')).toBeInTheDocument();
    expect(screen.getByText('Question about library opening hours')).toBeInTheDocument();
    expect(screen.getByText('student2@college.edu')).toBeInTheDocument();
    expect(screen.getAllByText('Resolved')[0]).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Wants to know when the library is open.')).toBeInTheDocument();
    expect(screen.getByText('(88% conf)')).toBeInTheDocument();
  });

  it('navigates to ticket details view when View button is clicked', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({ tickets: mockTickets });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
    });

    // Click the first "View" button
    const viewButtons = screen.getAllByRole('button', { name: /View/i });
    fireEvent.click(viewButtons[0]);

    // Verify navigation was triggered
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/tickets/ticket-1');
  });

  it('refetches tickets when status filter changes', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({ tickets: [] });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenCalledTimes(1);
    });

    const selects = screen.getAllByRole('combobox');
    const statusDropdown = selects[0]; // status dropdown is the first one

    // Change status dropdown to OPEN
    fireEvent.change(statusDropdown, { target: { value: 'OPEN' } });

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: 'OPEN',
        category: '',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        limit: 10,
      });
    });
  });

  it('refetches tickets when category filter changes', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({ tickets: [] });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenCalledTimes(1);
    });

    const selects = screen.getAllByRole('combobox');
    const categoryDropdown = selects[1]; // category dropdown is the second one

    // Change category dropdown to REFUND_REQUEST
    fireEvent.change(categoryDropdown, { target: { value: 'REFUND_REQUEST' } });

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: '',
        category: 'REFUND_REQUEST',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        limit: 10,
      });
    });
  });

  it('refetches tickets when sorting option dropdown changes', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({ tickets: [] });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenCalledTimes(1);
    });

    const selects = screen.getAllByRole('combobox');
    const sortDropdown = selects[2]; // sort dropdown is the third one

    // Change sort dropdown to oldest
    fireEvent.change(sortDropdown, { target: { value: 'oldest' } });

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: '',
        category: '',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'asc',
        page: 1,
        limit: 10,
      });
    });
  });

  it('refetches tickets with search value on search form submission', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({ tickets: [] });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenCalledTimes(1);
    });

    // Enter search keyword
    const searchInput = screen.getByPlaceholderText(/Search tickets, emails, message text.../i);
    fireEvent.change(searchInput, { target: { value: 'campus' } });

    // Submit form (press enter / submit)
    const searchForm = searchInput.closest('form');
    if (searchForm) {
      fireEvent.submit(searchForm);
    }

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: '',
        category: '',
        search: 'campus',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        limit: 10,
      });
    });
  });

  it('renders empty state correctly when API returns no tickets', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({ tickets: [] });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(screen.getByText('No tickets found')).toBeInTheDocument();
    });

    expect(screen.getByText('Try adjusting your search keywords, status filters, or topics to fetch matched items.')).toBeInTheDocument();
  });

  it('renders error message when API call fails', async () => {
    vi.mocked(api.tickets.list).mockRejectedValue(new Error('Failed to load tickets'));

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load tickets')).toBeInTheDocument();
    });
  });

  it('sorts by ticket number when Ticket column header is clicked', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({ tickets: mockTickets });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
    });

    // Click "Ticket" header to sort by ticketNumber desc
    const ticketHeader = screen.getByRole('button', { name: /Ticket/i });
    fireEvent.click(ticketHeader);

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: '',
        category: '',
        search: '',
        sortBy: 'ticketNumber',
        sortOrder: 'desc',
        page: 1,
        limit: 10,
      });
    });

    // Click "Ticket" header again to sort by ticketNumber asc
    const ticketHeaderAgain = screen.getByRole('button', { name: /Ticket/i });
    fireEvent.click(ticketHeaderAgain);

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: '',
        category: '',
        search: '',
        sortBy: 'ticketNumber',
        sortOrder: 'asc',
        page: 1,
        limit: 10,
      });
    });
  });

  it('sorts by student email when Student column header is clicked', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({ tickets: mockTickets });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
    });

    // Click "Student" header to sort by studentEmail asc
    const studentHeader = screen.getByRole('button', { name: /Student/i });
    fireEvent.click(studentHeader);

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: '',
        category: '',
        search: '',
        sortBy: 'studentEmail',
        sortOrder: 'asc',
        page: 1,
        limit: 10,
      });
    });
  });

  it('sorts by status when Classification column header is clicked', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({ tickets: mockTickets });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
    });

    // Click "Classification" header to sort by status asc
    const classificationHeader = screen.getByRole('button', { name: /Classification/i });
    fireEvent.click(classificationHeader);

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: '',
        category: '',
        search: '',
        sortBy: 'status',
        sortOrder: 'asc',
        page: 1,
        limit: 10,
      });
    });
  });

  it('sorts by AI confidence when AI Insight column header is clicked', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({ tickets: mockTickets });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
    });

    // Click "AI Insight" header to sort by aiConfidence desc
    const aiInsightHeader = screen.getByRole('button', { name: /AI Insight/i });
    fireEvent.click(aiInsightHeader);

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: '',
        category: '',
        search: '',
        sortBy: 'aiConfidence',
        sortOrder: 'desc',
        page: 1,
        limit: 10,
      });
    });
  });

  it('filters by student email when the advanced input is changed', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({ tickets: mockTickets });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
    });

    // Expand the Advanced Filters panel
    const toggleButton = screen.getByTitle('Toggle Advanced Filters');
    fireEvent.click(toggleButton);

    // Get the Student Email input and type a value
    const studentEmailInput = screen.getByLabelText(/Student Email/i);
    fireEvent.change(studentEmailInput, { target: { value: 'alice' } });

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: '',
        category: '',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        studentEmail: 'alice',
        page: 1,
        limit: 10,
      });
    });
  });

  it('filters by AI confidence when the advanced dropdown changes', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({ tickets: mockTickets });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
    });

    // Expand the Advanced Filters panel
    const toggleButton = screen.getByTitle('Toggle Advanced Filters');
    fireEvent.click(toggleButton);

    // Get the AI Confidence select and choose 'low'
    const confidenceSelect = screen.getByLabelText(/AI Confidence/i);
    fireEvent.change(confidenceSelect, { target: { value: 'low' } });

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: '',
        category: '',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        maxConfidence: '0.85',
        page: 1,
        limit: 10,
      });
    });
  });

  it('filters by date range when the advanced dropdown changes', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({ tickets: mockTickets });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
    });

    // Expand the Advanced Filters panel
    const toggleButton = screen.getByTitle('Toggle Advanced Filters');
    fireEvent.click(toggleButton);

    // Get the Date Range select and choose 'week'
    const dateRangeSelect = screen.getByLabelText(/Date Range/i);
    fireEvent.change(dateRangeSelect, { target: { value: 'week' } });

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: '',
        category: '',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        dateRange: 'week',
        page: 1,
        limit: 10,
      });
    });
  });

  it('clears all filters when the Clear All Filters button is clicked', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({ tickets: mockTickets });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
    });

    // Expand the Advanced Filters panel and set a filter
    const toggleButton = screen.getByTitle('Toggle Advanced Filters');
    fireEvent.click(toggleButton);

    const confidenceSelect = screen.getByLabelText(/AI Confidence/i);
    fireEvent.change(confidenceSelect, { target: { value: 'low' } });

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: '',
        category: '',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        maxConfidence: '0.85',
        page: 1,
        limit: 10,
      });
    });

    // Click "Clear All Filters"
    const clearButton = screen.getByRole('button', { name: /Clear All Filters/i });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: '',
        category: '',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        limit: 10,
      });
    });
  });

  it('refetches tickets when page changes via next/previous buttons', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({
      tickets: mockTickets,
      total: 25,
      page: 1,
      limit: 10,
      totalPages: 3,
    });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
    });

    // Verify pagination indicator shows "Page 1 of 3"
    expect(screen.getByText((_content, element) => element?.textContent === 'Page 1 of 3')).toBeInTheDocument();

    // Click "Next" button
    const nextButton = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: '',
        category: '',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 2,
        limit: 10,
      });
    });
  });

  it('refetches tickets when limit changes via page size dropdown', async () => {
    vi.mocked(api.tickets.list).mockResolvedValue({
      tickets: mockTickets,
      total: 25,
      page: 1,
      limit: 10,
      totalPages: 3,
    });

    renderWithClient(<TicketsList />);

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
    });

    // Change limit select to 20
    const limitSelects = screen.getAllByRole('combobox');
    const sizeSelect = limitSelects[limitSelects.length - 1]; // the last select is the page size select
    fireEvent.change(sizeSelect, { target: { value: '20' } });

    await waitFor(() => {
      expect(api.tickets.list).toHaveBeenLastCalledWith({
        status: '',
        category: '',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      });
    });
  });
});
