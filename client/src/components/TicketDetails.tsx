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
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-6 shadow-lg backdrop-blur-md">
      <div className="flex flex-col gap-4">
        {/* Ticket Header Details */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-violet-500/10 text-violet-400 font-bold border border-violet-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                Ticket #{ticket.ticketNumber}
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">
                {ticket.category.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">{ticket.subject}</h1>
          </div>
        </div>

        {/* Sender and Date Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-violet-400" />
            <div>
              <span className="text-slate-500 font-medium mr-1">Sender:</span>
              <span className="text-slate-200 font-semibold">{ticket.studentEmail}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-violet-400" />
            <div>
              <span className="text-slate-500 font-medium mr-1">Opened:</span>
              <span className="text-slate-200 font-semibold">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Initial Message Body */}
        <div className="mt-2 bg-slate-950/40 border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5" />
            Initial Inquiry Description
          </div>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {initialMessage.body}
          </p>
        </div>
      </div>
    </div>
  );
};
