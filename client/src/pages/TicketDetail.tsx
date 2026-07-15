import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import type { Ticket } from '../utils/api';
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
  const [isPolishing, setIsPolishing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [ticketSummary, setTicketSummary] = useState<string | null>(null);

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

  const handlePolishReply = async () => {
    if (!ticket || !replyBody.trim()) return;
    setIsPolishing(true);
    try {
      const data = await api.tickets.polish(ticket.id, replyBody);
      setReplyBody(data.polishedBody);
    } catch (err: any) {
      alert(err.message || 'Failed to polish reply.');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleSummarize = async () => {
    if (!ticket) return;
    setIsSummarizing(true);
    try {
      const data = await api.tickets.summarize(ticket.id);
      setTicketSummary(data.summary);
    } catch (err: any) {
      alert(err.message || 'Failed to summarize ticket.');
    } finally {
      setIsSummarizing(false);
    }
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
      <div className="flex-1 flex flex-col min-w-0 h-full bg-card rounded-2xl border border-border shadow-md overflow-hidden">

        {/* Thread header */}
        <div className="shrink-0 px-5 py-4 bg-muted/50 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/dashboard/tickets')}
              className="shrink-0 flex items-center gap-1.5 text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400 text-xs font-semibold cursor-pointer border border-border hover:border-teal-500/25 hover:bg-teal-500/5 px-2.5 py-1.5 rounded-xl transition-all shadow-sm bg-card"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Queue
            </button>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="shrink-0 w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h2 className="text-sm font-bold text-foreground truncate">{ticket.subject}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusColor}`}>
              {ticket.status}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold">
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

          {/* ── Summarize button row ─────────────────────────────────────── */}
          <div className="flex justify-center pt-2 pb-1">
            <button
              type="button"
              onClick={handleSummarize}
              disabled={isSummarizing || messages.length === 0}
              className="flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 text-xs font-semibold bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 disabled:opacity-40 disabled:pointer-events-none px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99]"
            >
              {isSummarizing ? (
                <Loader2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              )}
              {isSummarizing ? 'Summarizing…' : ticketSummary ? 'Regenerate Summary' : 'Summarize Conversation'}
            </button>
          </div>

          {/* ── Inline summary panel ─────────────────────────────────────── */}
          {ticketSummary && (
            <div className="bg-teal-500/5 dark:bg-teal-950/10 border border-teal-500/20 rounded-2xl p-4 space-y-2 animate-fadeIn relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-teal-500 to-cyan-500" />
              <div className="flex items-center gap-2 pb-1.5 border-b border-teal-500/15">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-widest">AI Conversation Summary</span>
              </div>
              <div
                className="prose prose-sm prose-invert max-w-none text-foreground font-medium text-xs leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(marked.parse(ticketSummary) as string),
                }}
              />
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={scrollAnchorRef} />
        </div>

        {/* ── Compose footer ─────────────────────────────────────────────── */}
        <div className="shrink-0 bg-muted/40 border-t border-border p-4">
          <form onSubmit={handleSendReply} className="space-y-3">
            <div className="relative">
              <textarea
                rows={4}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Draft your reply to the student…"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 pr-16 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all resize-none leading-relaxed shadow-inner"
              />
              {/* Character count badge */}
              {charCount > 0 && (
                <span className="absolute bottom-3 right-3 text-[10px] font-semibold text-muted-foreground/60">
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
                  className="flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 text-xs font-semibold bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Insert AI Suggestion
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {/* Polish button */}
                <button
                  type="button"
                  onClick={handlePolishReply}
                  disabled={isSubmitting || isPolishing || !replyBody.trim()}
                  className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 disabled:opacity-40 text-foreground text-xs font-bold px-4 py-2.5 rounded-xl border border-border shadow-md transition-all cursor-pointer disabled:pointer-events-none hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isPolishing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-teal-600 dark:text-teal-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  )}
                  {isPolishing ? 'Polishing…' : 'Polish'}
                </button>

                {/* Send button */}
                <button
                  type="submit"
                  disabled={isSubmitting || isPolishing || !replyBody.trim()}
                  className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 disabled:from-slate-500 disabled:to-slate-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/10 hover:shadow-teal-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isSubmitting ? 'Sending…' : 'Send Reply'}
                </button>
              </div>
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
