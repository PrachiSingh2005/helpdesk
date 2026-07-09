import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import type { Ticket, Message } from '../utils/api';
import { TicketDetails } from '../components/TicketDetails';
import { ReplyThread } from '../components/ReplyThread';
import { UpdateTicket } from '../components/UpdateTicket';
import { TicketDetailSkeleton } from '../components/TicketDetailSkeleton';
import {
  Loader2,
  ArrowLeft,
  Send,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface Agent {
  id: string;
  email: string;
  role: string;
  name: string;
}

// ── Main component ────────────────────────────────────────────────────────────
export const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAnchorRef.current && typeof scrollAnchorRef.current.scrollIntoView === 'function') {
      scrollAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchTicketDetails = async () => {
    if (!id) return;
    try {
      const data = await api.tickets.get(id);
      setTicket(data.ticket);
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const data = await api.tickets.listAgents();
      setAgents(data.agents);
    } catch (err: any) {
      console.error('Failed to load agents list:', err);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
    fetchAgents();
  }, [id]);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (ticket?.messages?.length) {
      scrollToBottom();
    }
  }, [ticket?.messages?.length]);

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    try {
      const data = await api.tickets.update(ticket.id, { status: newStatus });
      setTicket((prev) => (prev ? { ...prev, status: data.ticket.status } : null));
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket status.');
    }
  };

  const handleCategoryChange = async (newCategory: string) => {
    if (!ticket) return;
    try {
      const data = await api.tickets.update(ticket.id, { category: newCategory });
      setTicket((prev) => (prev ? { ...prev, category: data.ticket.category } : null));
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket category.');
    }
  };

  const handleAgentChange = async (agentId: string) => {
    if (!ticket) return;
    const assignedToId = agentId === '' ? null : agentId;
    try {
      const data = await api.tickets.update(ticket.id, { assignedToId });
      setTicket((prev) => (prev ? { ...prev, assignedTo: data.ticket.assignedTo } : null));
    } catch (err: any) {
      alert(err.message || 'Failed to assign ticket.');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !replyBody.trim()) return;
    setIsSubmitting(true);
    try {
      const replyBodyHtml = DOMPurify.sanitize(marked.parse(replyBody) as string);
      await api.tickets.reply(ticket.id, replyBody, replyBodyHtml);
      setReplyBody('');
      await fetchTicketDetails(); // re-fetch full thread + updated status
    } catch (err: any) {
      alert(err.message || 'Failed to send reply.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyAISuggestion = () => {
    if (!ticket?.aiSuggestedReply) return;
    setReplyBody(ticket.aiSuggestedReply);
  };

  if (loading) {
    return <TicketDetailSkeleton />;
  }

  if (error || !ticket) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl">
        {error || 'Ticket not found.'}
      </div>
    );
  }

  const messages = ticket.messages || [];
  const initialMessage = messages[0];
  const replies = messages.slice(1);
  const charCount = replyBody.length;

  const statusColor =
    ticket.status === 'OPEN'
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      : ticket.status === 'RESOLVED'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      : 'text-slate-400 bg-slate-500/10 border-slate-500/30';

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 animate-fadeIn">

      {/* ── Left column: Thread + Compose ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-900/20 rounded-2xl border border-slate-800/80 overflow-hidden">

        {/* Thread header */}
        <div className="shrink-0 px-5 py-4 bg-slate-900/50 border-b border-slate-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/dashboard/tickets')}
              className="shrink-0 flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer border border-transparent hover:border-slate-700 hover:bg-slate-900 px-2.5 py-1.5 rounded-lg transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Queue
            </button>
            <div className="w-px h-4 bg-slate-700" />
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="shrink-0 w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-bold text-white truncate">{ticket.subject}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusColor}`}>
              {ticket.status}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">
              #{ticket.ticketNumber}
            </span>
          </div>
        </div>

        {/* ── Message thread scroll area ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          {initialMessage && (
            <TicketDetails ticket={ticket} initialMessage={initialMessage} />
          )}

          <ReplyThread messages={replies} />

          {/* Scroll anchor */}
          <div ref={scrollAnchorRef} />
        </div>

        {/* ── Compose footer ─────────────────────────────────────────────── */}
        <div className="shrink-0 bg-slate-900/50 border-t border-slate-800/80 p-4">
          <form onSubmit={handleSendReply} className="space-y-3">
            <div className="relative">
              <textarea
                rows={4}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Draft your reply to the student…"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 pr-16 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500/70 transition-all resize-none leading-relaxed"
              />
              {/* Character count badge */}
              {charCount > 0 && (
                <span className="absolute bottom-3 right-3 text-[10px] font-semibold text-slate-600">
                  {charCount}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              {/* AI suggestion button */}
              {ticket.aiSuggestedReply ? (
                <button
                  type="button"
                  onClick={applyAISuggestion}
                  className="flex items-center gap-2 text-violet-400 hover:text-violet-300 text-xs font-semibold bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Insert AI Suggestion
                </button>
              ) : (
                <div />
              )}

              {/* Send button */}
              <button
                type="submit"
                disabled={isSubmitting || !replyBody.trim()}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.01] active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSubmitting ? 'Sending…' : 'Send Reply'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Right column: Sidebar metadata ────────────────────────────────── */}
      <UpdateTicket
        ticket={ticket}
        agents={agents}
        handleStatusChange={handleStatusChange}
        handleCategoryChange={handleCategoryChange}
        handleAgentChange={handleAgentChange}
        applyAISuggestion={applyAISuggestion}
      />
    </div>
  );
};
