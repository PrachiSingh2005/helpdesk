import React from 'react';
import { Sparkles, GraduationCap } from 'lucide-react';
import type { Ticket } from '../utils/api';

interface Agent {
  id: string;
  email: string;
  role: string;
  name: string;
}

interface UpdateTicketProps {
  ticket: Ticket;
  agents: Agent[];
  handleStatusChange: (status: string) => Promise<void>;
  handleCategoryChange: (category: string) => Promise<void>;
  handleAgentChange: (agentId: string) => Promise<void>;
  applyAISuggestion: () => void;
  handlePriorityChange: (priority: string) => Promise<void>;
  handleSentimentChange: (sentiment: string) => Promise<void>;
}

export const UpdateTicket: React.FC<UpdateTicketProps> = ({
  ticket,
  agents,
  handleStatusChange,
  handleCategoryChange,
  handleAgentChange,
  applyAISuggestion,
  handlePriorityChange,
  handleSentimentChange,
}) => {
  const messages = ticket.messages || [];

  return (
    <div className="w-full md:w-80 flex flex-col gap-5 h-full overflow-y-auto pr-1">
      {/* Ticket attributes */}
      <div className="bg-card p-5 rounded-2xl border border-border space-y-4 shadow-sm">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-2.5">
          Ticket Attributes
        </h3>

        <div>
          <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">
            Status
          </label>
          <select
            value={ticket.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none cursor-pointer focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all font-semibold"
          >
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">
            Category
          </label>
          <select
            value={ticket.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none cursor-pointer focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all font-semibold"
          >
            <option value="GENERAL_QUESTION">General Question</option>
            <option value="TECHNICAL_QUESTION">Technical Question</option>
            <option value="REFUND_REQUEST">Refund Request</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">
            Priority
          </label>
          <select
            value={ticket.priority || 'MEDIUM'}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none cursor-pointer focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all font-semibold"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">
            Sentiment
          </label>
          <select
            value={ticket.sentiment || 'NEUTRAL'}
            onChange={(e) => handleSentimentChange(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none cursor-pointer focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all font-semibold"
          >
            <option value="POSITIVE">😊 Positive</option>
            <option value="NEUTRAL">😐 Neutral</option>
            <option value="NEGATIVE">😠 Negative</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="select-assigned-agent"
            className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5"
          >
            Assigned Agent
          </label>
          <select
            id="select-assigned-agent"
            value={ticket.assignedTo?.id || ''}
            onChange={(e) => handleAgentChange(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none cursor-pointer focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all font-semibold"
          >
            <option value="">Unassigned</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.role})
              </option>
            ))}
          </select>
        </div>

        {/* Thread stats */}
        <div className="pt-2 border-t border-border grid grid-cols-2 gap-3">
          <div className="bg-muted/70 rounded-xl p-3 text-center">
            <div className="text-xl font-extrabold text-foreground">{messages.length}</div>
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Messages</div>
          </div>
          <div className="bg-muted/70 rounded-xl p-3 text-center">
            <div className="text-xl font-extrabold text-foreground">
              {messages.filter((m) => m.sender === 'AGENT').length}
            </div>
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Replies</div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-2.5 mb-3">
          <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            AI Ticket Summary
          </h3>
        </div>
        <p className="text-xs text-foreground leading-relaxed italic">
          "{ticket.aiSummary || 'Summary generation is pending or failed.'}"
        </p>
      </div>

      {/* AI Suggested Reply */}
      {ticket.aiSuggestedReply && (
        <div className="bg-teal-500/5 dark:bg-teal-950/10 p-5 rounded-2xl border border-teal-500/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-teal-500 to-cyan-500" />
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-pulse" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">
                AI Suggested Reply
              </h3>
            </div>
            {ticket.aiConfidence !== undefined && ticket.aiConfidence !== null && (
              <span className="text-[10px] text-teal-700 dark:text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full font-bold">
                {Math.round(ticket.aiConfidence * 100)}% Match
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-4 font-medium">
            Claude drafted a response from your Knowledge Base. Review, edit if needed, then send.
          </p>
          <button
            onClick={applyAISuggestion}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-teal-600/10 hover:shadow-teal-600/20 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          >
            Apply Suggestion
          </button>
        </div>
      )}

      {/* Student info card */}
      <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-2.5 mb-3">
          Student
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{ticket.studentEmail}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Opened {new Date(ticket.createdAt).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
