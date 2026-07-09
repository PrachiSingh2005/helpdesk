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
}

export const UpdateTicket: React.FC<UpdateTicketProps> = ({
  ticket,
  agents,
  handleStatusChange,
  handleCategoryChange,
  handleAgentChange,
  applyAISuggestion,
}) => {
  const messages = ticket.messages || [];

  return (
    <div className="w-full md:w-80 flex flex-col gap-5 h-full overflow-y-auto">
      {/* Ticket attributes */}
      <div className="bg-slate-900/40 backdrop-blur-xl p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
          Ticket Attributes
        </h3>

        <div>
          <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5">
            Status
          </label>
          <select
            value={ticket.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none cursor-pointer focus:border-violet-500 transition-all"
          >
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5">
            Category
          </label>
          <select
            value={ticket.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none cursor-pointer focus:border-violet-500 transition-all"
          >
            <option value="GENERAL_QUESTION">General Question</option>
            <option value="TECHNICAL_QUESTION">Technical Question</option>
            <option value="REFUND_REQUEST">Refund Request</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="select-assigned-agent"
            className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5"
          >
            Assigned Agent
          </label>
          <select
            id="select-assigned-agent"
            value={ticket.assignedTo?.id || ''}
            onChange={(e) => handleAgentChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none cursor-pointer focus:border-violet-500 transition-all"
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
        <div className="pt-1 border-t border-slate-800 grid grid-cols-2 gap-3">
          <div className="bg-slate-900/50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-white">{messages.length}</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Messages</div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-white">
              {messages.filter((m) => m.sender === 'AGENT').length}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Replies</div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-slate-900/40 backdrop-blur-xl p-5 rounded-2xl border border-slate-800/80">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            AI Ticket Summary
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed italic">
          "{ticket.aiSummary || 'Summary generation is pending or failed.'}"
        </p>
      </div>

      {/* AI Suggested Reply */}
      {ticket.aiSuggestedReply && (
        <div className="bg-slate-900/40 backdrop-blur-xl p-5 rounded-2xl border border-indigo-500/20">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                AI Suggested Reply
              </h3>
            </div>
            {ticket.aiConfidence !== undefined && ticket.aiConfidence !== null && (
              <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                {Math.round(ticket.aiConfidence * 100)}% Match
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
            Claude drafted a response from your Knowledge Base. Review, edit if needed, then send.
          </p>
          <button
            onClick={applyAISuggestion}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          >
            Apply Suggestion
          </button>
        </div>
      )}

      {/* Student info card */}
      <div className="bg-slate-900/40 backdrop-blur-xl p-5 rounded-2xl border border-slate-800/80">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">
          Student
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{ticket.studentEmail}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
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
