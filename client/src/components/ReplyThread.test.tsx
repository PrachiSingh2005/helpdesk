import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReplyThread } from './ReplyThread';
import type { Message } from '../utils/api';

describe('ReplyThread Component', () => {
  it('renders "No replies yet" when message list is empty', () => {
    render(<ReplyThread messages={[]} />);

    expect(screen.getByTestId('no-replies')).toBeInTheDocument();
    expect(screen.getByText('No replies yet')).toBeInTheDocument();
    expect(screen.getByText('Use the form below to start the conversation.')).toBeInTheDocument();
  });

  it('renders student, AI, and agent messages grouped by day with date separators', () => {
    // Setup date locale strings for consistency
    const mockToLocaleString = vi.spyOn(Date.prototype, 'toLocaleString');
    mockToLocaleString.mockReturnValue('Jul 8, 10:00 AM');

    const mockToLocaleDateString = vi.spyOn(Date.prototype, 'toLocaleDateString');
    mockToLocaleDateString
      .mockReturnValueOnce('Wednesday, July 8, 2026') // for message 1
      .mockReturnValueOnce('Wednesday, July 8, 2026') // for message 2
      .mockReturnValueOnce('Thursday, July 9, 2026');  // for message 3

    const messages: Message[] = [
      {
        id: 'msg-1',
        ticketId: 'ticket-1',
        sender: 'STUDENT',
        senderEmail: 'student@example.com',
        body: 'Any update on my issue?',
        createdAt: '2026-07-08T10:00:00.000Z',
      },
      {
        id: 'msg-2',
        ticketId: 'ticket-1',
        sender: 'SYSTEM_AI',
        senderEmail: 'ai@helpdesk.edu',
        body: 'I am looking into this.',
        createdAt: '2026-07-08T10:05:00.000Z',
      },
      {
        id: 'msg-3',
        ticketId: 'ticket-1',
        sender: 'AGENT',
        senderEmail: 'agent@helpdesk.edu',
        body: 'Hello student, I have processed your request.',
        createdAt: '2026-07-09T09:00:00.000Z',
      },
    ];

    render(<ReplyThread messages={messages} />);

    // Expecting 2 date separators
    const separators = screen.getAllByTestId('date-separator');
    expect(separators).toHaveLength(2);
    expect(screen.getByText('Wednesday, July 8, 2026')).toBeInTheDocument();
    expect(screen.getByText('Thursday, July 9, 2026')).toBeInTheDocument();

    // Verify student bubble
    const studentBubble = screen.getByTestId('message-bubble-student');
    expect(studentBubble).toBeInTheDocument();
    expect(studentBubble).toHaveTextContent('student@example.com');
    expect(studentBubble).toHaveTextContent('Any update on my issue?');

    // Verify AI bubble
    const aiBubble = screen.getByTestId('message-bubble-ai');
    expect(aiBubble).toBeInTheDocument();
    expect(aiBubble).toHaveTextContent('AI Auto-Reply');
    expect(aiBubble).toHaveTextContent('I am looking into this.');

    // Verify Agent bubble
    const agentBubble = screen.getByTestId('message-bubble-agent');
    expect(agentBubble).toBeInTheDocument();
    expect(agentBubble).toHaveTextContent('agent@helpdesk.edu');
    expect(agentBubble).toHaveTextContent('Hello student, I have processed your request.');

    mockToLocaleString.mockRestore();
    mockToLocaleDateString.mockRestore();
  });
});
