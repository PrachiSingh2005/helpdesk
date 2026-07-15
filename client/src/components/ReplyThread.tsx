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
        <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </div>
        <div className="flex flex-col gap-1 max-w-[72%]">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
            {msg.senderEmail}
          </span>
          <div className="bg-muted/70 border border-border text-foreground rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
          </div>
          <span className="text-[10px] text-muted-foreground/60 pl-1 font-medium">{formattedTime}</span>
        </div>
      </div>
    );
  }

  if (isAI) {
    return (
      <div className="flex items-end gap-3 pl-10 animate-fadeIn" data-testid="message-bubble-ai">
        {/* Avatar */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-teal-500/10 dark:bg-teal-950/30 border border-teal-500/20 dark:border-teal-900/40 flex items-center justify-center">
          <Bot className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        </div>
        <div className="flex flex-col gap-1 max-w-[72%]">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider pl-1">
            <Sparkles className="w-3 h-3 animate-pulse" />
            AI Auto-Reply
          </span>
          <div className="bg-teal-500/5 dark:bg-teal-950/20 border border-teal-500/20 dark:border-teal-900/30 text-foreground rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm shadow-teal-500/5">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
          </div>
          <span className="text-[10px] text-muted-foreground/60 pl-1 font-medium">{formattedTime}</span>
        </div>
      </div>
    );
  }

  // Agent — right-aligned
  return (
    <div className="flex items-end gap-3 justify-end animate-fadeIn" data-testid="message-bubble-agent">
      <div className="flex flex-col gap-1 items-end max-w-[72%]">
        <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider pr-1">
          {msg.senderEmail}
        </span>
        <div className="bg-violet-500/5 dark:bg-violet-950/20 border border-violet-500/20 dark:border-violet-900/30 text-foreground rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm shadow-violet-500/5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
        </div>
        <span className="text-[10px] text-muted-foreground/60 pr-1 font-medium">{formattedTime}</span>
      </div>
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-full bg-violet-500/10 dark:bg-violet-950/30 border border-violet-500/20 dark:border-violet-900/40 flex items-center justify-center">
        <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
      </div>
    </div>
  );
};

// ── Date separator ────────────────────────────────────────────────────────────
const DateSeparator: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 py-2" data-testid="date-separator">
    <div className="flex-1 h-px bg-border/60" />
    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">
      {label}
    </span>
    <div className="flex-1 h-px bg-border/60" />
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
        <MessageSquare className="w-8 h-8 text-muted-foreground/40 mb-2 animate-bounce" />
        <p className="text-xs font-semibold text-muted-foreground">No replies yet</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Use the form below to start the conversation.</p>
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
