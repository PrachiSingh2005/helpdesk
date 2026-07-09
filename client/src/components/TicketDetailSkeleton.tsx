import React from 'react';

export const TicketDetailSkeleton: React.FC = () => {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 animate-pulse">
      {/* ── Left column: Thread + Compose ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-900/10 rounded-2xl border border-slate-800/40 overflow-hidden">
        {/* Thread header skeleton */}
        <div className="shrink-0 px-5 py-4 bg-slate-900/30 border-b border-slate-800/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-8 bg-slate-800 rounded-lg animate-pulse" />
            <div className="w-px h-4 bg-slate-800" />
            <div className="w-48 h-5 bg-slate-800 rounded-md animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-16 h-6 bg-slate-800 rounded-full animate-pulse" />
            <div className="w-10 h-4 bg-slate-800 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Message thread scroll area skeleton */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          {/* Main Inquiry Card Skeleton */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 mb-6">
            <div className="space-y-4">
              <div className="w-32 h-6 bg-slate-800 rounded-md animate-pulse" />
              <div className="grid grid-cols-2 gap-4">
                <div className="w-40 h-4 bg-slate-800 rounded-md animate-pulse" />
                <div className="w-48 h-4 bg-slate-800 rounded-md animate-pulse" />
              </div>
              <div className="space-y-2 mt-4">
                <div className="w-full h-4 bg-slate-800 rounded-md animate-pulse" />
                <div className="w-5/6 h-4 bg-slate-800 rounded-md animate-pulse" />
                <div className="w-4/5 h-4 bg-slate-800 rounded-md animate-pulse" />
              </div>
            </div>
          </div>

          {/* Reply bubble skeletons */}
          <div className="flex items-end gap-3 justify-end pl-12">
            <div className="flex flex-col gap-1 items-end max-w-[72%] w-full">
              <div className="w-24 h-3 bg-slate-800 rounded-md animate-pulse" />
              <div className="w-full h-16 bg-slate-800/50 rounded-2xl rounded-tr-sm animate-pulse" />
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />
          </div>

          <div className="flex items-end gap-3 pr-12">
            <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />
            <div className="flex flex-col gap-1 max-w-[72%] w-full">
              <div className="w-32 h-3 bg-slate-800 rounded-md animate-pulse" />
              <div className="w-5/6 h-12 bg-slate-800/50 rounded-2xl rounded-tl-sm animate-pulse" />
            </div>
          </div>
        </div>

        {/* Compose footer skeleton */}
        <div className="shrink-0 bg-slate-900/30 border-t border-slate-800/60 p-4 space-y-3">
          <div className="w-full h-24 bg-slate-950/50 border border-slate-800/50 rounded-xl animate-pulse" />
          <div className="flex items-center justify-between">
            <div className="w-32 h-8 bg-slate-800 rounded-xl animate-pulse" />
            <div className="w-24 h-9 bg-slate-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>

      {/* ── Right column: Sidebar skeleton ────────────────────────────────── */}
      <div className="w-full md:w-80 flex flex-col gap-5 h-full">
        {/* Attributes skeleton */}
        <div className="bg-slate-900/30 p-5 rounded-2xl border border-slate-800/60 space-y-4">
          <div className="w-28 h-4 bg-slate-800 rounded-md mb-2 animate-pulse" />
          <div className="space-y-3">
            <div>
              <div className="w-12 h-3 bg-slate-800 rounded-md mb-1.5 animate-pulse" />
              <div className="w-full h-9 bg-slate-800/50 rounded-xl animate-pulse" />
            </div>
            <div>
              <div className="w-16 h-3 bg-slate-800 rounded-md mb-1.5 animate-pulse" />
              <div className="w-full h-9 bg-slate-800/50 rounded-xl animate-pulse" />
            </div>
            <div>
              <div className="w-24 h-3 bg-slate-800 rounded-md mb-1.5 animate-pulse" />
              <div className="w-full h-9 bg-slate-800/50 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>

        {/* Summary skeleton */}
        <div className="bg-slate-900/30 p-5 rounded-2xl border border-slate-800/60 space-y-3">
          <div className="w-28 h-4 bg-slate-800 rounded-md animate-pulse" />
          <div className="space-y-2">
            <div className="w-full h-3 bg-slate-800 rounded-md animate-pulse" />
            <div className="w-5/6 h-3 bg-slate-800 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Student card skeleton */}
        <div className="bg-slate-900/30 p-5 rounded-2xl border border-slate-800/60 space-y-3">
          <div className="w-16 h-4 bg-slate-800 rounded-md animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800/50 animate-pulse" />
            <div className="space-y-1.5 flex-1 animate-pulse">
              <div className="w-32 h-3 bg-slate-800 rounded-md" />
              <div className="w-20 h-2 bg-slate-800 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
