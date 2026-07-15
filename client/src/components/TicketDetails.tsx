import React from 'react';
import { Calendar, Mail, MessageSquare } from 'lucide-react';
import type { Ticket, Message } from '../utils/api';

interface TicketDetailsProps {
  ticket: Ticket;
  initialMessage: Message;
}

export const TicketDetails: React.FC<TicketDetailsProps> = ({ ticket, initialMessage }) => {
  const formattedDate = new Date(ticket.createdAt).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex flex-col gap-4">
        {/* Ticket Header Details */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold border border-teal-500/20 px-2.5 py-1 rounded-xl uppercase tracking-wider">
                Ticket #{ticket.ticketNumber}
              </span>
              <span className="text-[10px] bg-secondary text-secondary-foreground font-semibold px-2.5 py-1 rounded-xl uppercase tracking-wider">
                {ticket.category.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{ticket.subject}</h1>
          </div>
        </div>

        {/* Sender and Date Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <div>
              <span className="text-muted-foreground/80 font-medium mr-1">Sender:</span>
              <span className="text-foreground font-semibold">{ticket.studentEmail}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <div>
              <span className="text-muted-foreground/80 font-medium mr-1">Opened:</span>
              <span className="text-foreground font-semibold">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Initial Message Body */}
        <div className="mt-2 bg-muted/40 border border-border/80 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Initial Inquiry Description
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {initialMessage.body}
          </p>
        </div>
      </div>
    </div>
  );
};
