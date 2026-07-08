import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import type { Ticket } from '../utils/api';
import { Loader2, ArrowLeft, Send, Sparkles } from 'lucide-react';

export const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    fetchTicketDetails();
  }, [id]);

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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !replyBody.trim()) return;
    setIsSubmitting(true);

    try {
      await api.tickets.reply(ticket.id, replyBody);
      setReplyBody('');
      await fetchTicketDetails();
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
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl">
        {error || 'Ticket not found.'}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-8 animate-fadeIn">
      {/* Left Column: Messages Thread and Input form */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-900/10 rounded-2xl border border-slate-800/80 overflow-hidden">
        {/* Thread Header bar */}
        <div className="p-4 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/tickets')}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm font-semibold cursor-pointer border border-transparent hover:border-slate-800 hover:bg-slate-900 px-3 py-1.5 rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Queue
            </button>
            <h2 className="text-md font-bold text-white tracking-wide">{ticket.subject}</h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-bold">Ticket # {ticket.ticketNumber}</span>
          </div>
        </div>

        {/* Message scroll viewport */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {(ticket.messages || []).map((msg) => {
            const isStudent = msg.sender === 'STUDENT';
            const isAI = msg.sender === 'SYSTEM_AI';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isStudent ? 'items-start' : isAI ? 'items-start pl-8' : 'items-end'
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl p-4 shadow-md border ${
                    isStudent
                      ? 'bg-slate-800/80 border-slate-700/50 text-slate-200'
                      : isAI
                      ? 'bg-indigo-950/80 border-indigo-500/30 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.05)]'
                      : 'bg-violet-900/80 border-violet-700/50 text-violet-100'
                  }`}
                >
                  <div className="flex items-center gap-2 text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">
                    {isAI && <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />}
                    <span>{isAI ? 'AI Automated response' : msg.senderEmail}</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-2 font-semibold">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>

        {/* Compose editor footer */}
        <div className="p-4 bg-slate-900/40 border-t border-slate-800/80">
          <form onSubmit={handleSendReply} className="space-y-4">
            <textarea
              rows={4}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Draft your reply to the student here..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all resize-none"
            />
            <div className="flex justify-between items-center">
              {ticket.aiSuggestedReply ? (
                <button
                  type="button"
                  onClick={applyAISuggestion}
                  className="flex items-center gap-2 text-violet-400 hover:text-violet-300 text-xs font-semibold bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  Insert AI Suggestion
                </button>
              ) : (
                <div />
              )}
              <button
                type="submit"
                disabled={isSubmitting || !replyBody.trim()}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none hover:scale-[1.01] active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Reply
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Sidebar Metadata Panel */}
      <div className="w-full md:w-80 flex flex-col gap-6 h-full overflow-y-auto">
        {/* Status/Category panel */}
        <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-800/80 space-y-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
            Ticket Attributes
          </h3>

          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-2">
              Status
            </label>
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-2">
              Category
            </label>
            <select
              value={ticket.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="GENERAL_QUESTION">General Question</option>
              <option value="TECHNICAL_QUESTION">Technical Question</option>
              <option value="REFUND_REQUEST">Refund Request</option>
            </select>
          </div>
        </div>

        {/* AI Summary Panel */}
        <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-800/80 bg-violet-950/5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              AI Ticket Summary
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed italic">
            "{ticket.aiSummary || 'Summary generation is pending or failed.'}"
          </p>
        </div>

        {/* AI Suggested Response rating panel */}
        {ticket.aiSuggestedReply && (
          <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-indigo-500/20 bg-indigo-950/5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  AI Suggested Reply
                </h3>
              </div>
              {ticket.aiConfidence !== undefined && ticket.aiConfidence !== null && (
                <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                  {Math.round(ticket.aiConfidence * 100)}% Match
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              Claude auto-drafted a response using the available Knowledge Base articles. Review the draft to the left, edit if necessary, and dispatch it to the student.
            </p>
            <button
              onClick={applyAISuggestion}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              Apply Suggestion
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
