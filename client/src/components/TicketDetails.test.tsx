import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TicketDetails } from './TicketDetails';
import type { Ticket, Message } from '../utils/api';

describe('TicketDetails Component', () => {
  const mockTicket: Ticket = {
    id: 'ticket-abc',
    ticketNumber: 456,
    studentEmail: 'student@example.com',
    subject: 'Need help resetting my portal password',
    status: 'OPEN',
    category: 'TECHNICAL_QUESTION',
    createdAt: '2026-07-08T10:00:00.000Z',
    updatedAt: '2026-07-08T10:05:00.000Z',
  };

  const mockMessage: Message = {
    id: 'msg-1',
    ticketId: 'ticket-abc',
    sender: 'STUDENT',
    senderEmail: 'student@example.com',
    body: 'I tried resetting my password but the email link never arrived.',
    createdAt: '2026-07-08T10:00:00.000Z',
  };

  it('renders ticket details correctly', () => {
    render(<TicketDetails ticket={mockTicket} initialMessage={mockMessage} />);

    // Check ticket number and category
    expect(screen.getByText('Ticket #456')).toBeInTheDocument();
    expect(screen.getByText('TECHNICAL QUESTION')).toBeInTheDocument();

    // Check subject
    expect(screen.getByText('Need help resetting my portal password')).toBeInTheDocument();

    // Check student email
    expect(screen.getByText('student@example.com')).toBeInTheDocument();

    // Check initial message body
    expect(screen.getByText('I tried resetting my password but the email link never arrived.')).toBeInTheDocument();

    // Check section header for description
    expect(screen.getByText('Initial Inquiry Description')).toBeInTheDocument();
  });

  it('correctly formats the creation date', () => {
    // Mock toLocaleString to ensure consistent formatting across environments
    const mockToLocaleString = vi.spyOn(Date.prototype, 'toLocaleString');
    mockToLocaleString.mockReturnValue('Wednesday, July 8, 2026, 10:00 AM');

    render(<TicketDetails ticket={mockTicket} initialMessage={mockMessage} />);

    expect(screen.getByText('Wednesday, July 8, 2026, 10:00 AM')).toBeInTheDocument();

    mockToLocaleString.mockRestore();
  });
});
