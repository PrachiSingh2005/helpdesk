import React from 'react';
import { Bot, Sparkles, User, GraduationCap, MessageSquare } from 'lucide-react';
import type { Message } from '../utils/api';

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble: React.FC<{ msg: Message }> = ({ msg }) => {
  const isStudent = msg.sender === 'STUDENT';
  const isAI = msg.sender === 'SYSTEM_AI';

  const formattedTime = new Date(msg.createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isStudent) {
    return (
      <div className="flex items-end gap-3 animate-fadeIn" data-testid="message-bubble-student">
        {/* Avatar */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-slate-300" />
        </div>
        <div className="flex flex-col gap-1 max-w-[72%]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
            {msg.senderEmail}
          </span>
          <div className="bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-md">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
          </div>
          <span className="text-[10px] text-slate-600 pl-1 font-medium">{formattedTime}</span>
        </div>
      </div>
    );
  }

  if (isAI) {
    return (
      <div className="flex items-end gap-3 pl-10 animate-fadeIn" data-testid="message-bubble-ai">
        {/* Avatar */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center">
          <Bot className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex flex-col gap-1 max-w-[72%]">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider pl-1">
            <Sparkles className="w-3 h-3 animate-pulse" />
            AI Auto-Reply
          </span>
          <div className="bg-indigo-950/70 border border-indigo-500/25 text-indigo-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-md shadow-indigo-950/20">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
          </div>
          <span className="text-[10px] text-slate-600 pl-1 font-medium">{formattedTime}</span>
        </div>
      </div>
    );
  }

  // Agent — right-aligned
  return (
    <div className="flex items-end gap-3 justify-end animate-fadeIn" data-testid="message-bubble-agent">
      <div className="flex flex-col gap-1 items-end max-w-[72%]">
        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider pr-1">
          {msg.senderEmail}
        </span>
        <div className="bg-violet-900/80 border border-violet-700/50 text-violet-100 rounded-2xl rounded-tr-sm px-4 py-3 shadow-md shadow-violet-950/30">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
        </div>
        <span className="text-[10px] text-slate-600 pr-1 font-medium">{formattedTime}</span>
      </div>
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-full bg-violet-900 border border-violet-600/50 flex items-center justify-center">
        <User className="w-4 h-4 text-violet-300" />
      </div>
    </div>
  );
};

// ── Date separator ────────────────────────────────────────────────────────────
const DateSeparator: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 py-2" data-testid="date-separator">
    <div className="flex-1 h-px bg-slate-800/80" />
    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2">
      {label}
    </span>
    <div className="flex-1 h-px bg-slate-800/80" />
  </div>
);

// ── Group messages by day ─────────────────────────────────────────────────────
function groupByDay(messages: Message[]) {
  const groups: { label: string; messages: Message[] }[] = [];
  let currentDay = '';

  for (const msg of messages) {
    const day = new Date(msg.createdAt).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    if (day !== currentDay) {
      groups.push({ label: day, messages: [] });
      currentDay = day;
    }
    groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

interface ReplyThreadProps {
  messages: Message[];
}

export const ReplyThread: React.FC<ReplyThreadProps> = ({ messages }) => {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center" data-testid="no-replies">
        <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
        <p className="text-xs font-semibold text-slate-600">No replies yet</p>
        <p className="text-[10px] text-slate-700 mt-0.5">Use the form below to start the conversation.</p>
      </div>
    );
  }

  const dayGroups = groupByDay(messages);

  return (
    <div className="space-y-6" data-testid="reply-thread">
      {dayGroups.map((group) => (
        <div key={group.label} className="space-y-4">
          <DateSeparator label={group.label} />
          {group.messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
        </div>
      ))}
    </div>
  );
};
