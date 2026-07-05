import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { DashboardStats } from '../utils/api';
import { Ticket, ShieldAlert, BadgeCheck, CircleAlert, Sparkles, UserCheck, Loader2 } from 'lucide-react';

export const DashboardHome: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.dashboard.stats();
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dashboard stats.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl">
        {error || 'An error occurred while loading dashboard statistics.'}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Tickets',
      value: stats.totalTickets,
      icon: Ticket,
      color: 'text-blue-400',
      bg: 'bg-blue-500/5',
      border: 'border-blue-500/10',
    },
    {
      label: 'Open Tickets',
      value: stats.statusStats.OPEN,
      icon: CircleAlert,
      color: 'text-amber-400',
      bg: 'bg-amber-500/5',
      border: 'border-amber-500/10',
    },
    {
      label: 'Resolved Tickets',
      value: stats.statusStats.RESOLVED,
      icon: BadgeCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/5',
      border: 'border-emerald-500/10',
    },
    {
      label: 'Closed Tickets',
      value: stats.statusStats.CLOSED,
      icon: ShieldAlert,
      color: 'text-slate-400',
      bg: 'bg-slate-500/5',
      border: 'border-slate-500/10',
    },
  ];

  const totalResolved = stats.aiMetrics.autoResolved + stats.aiMetrics.manualResolved;
  const autoPercent = totalResolved > 0 ? Math.round((stats.aiMetrics.autoResolved / totalResolved) * 100) : 0;
  const manualPercent = totalResolved > 0 ? Math.round((stats.aiMetrics.manualResolved / totalResolved) * 100) : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border ${card.border} ${card.bg} flex items-center justify-between transition-all duration-300 hover:scale-[1.02] hover:border-white/10`}
            >
              <div>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">
                  {card.label}
                </span>
                <span className="text-4xl font-extrabold text-white">{card.value}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Metrics Card */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-8 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-600/10 border border-violet-500/20 rounded-xl">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="text-lg font-bold text-white">AI Automation Performance</h3>
              </div>
              <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full font-medium">
                Active System
              </span>
            </div>

            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Tracking automated resolutions handled by the Claude API vs. manual responses sent by support agents. High-confidence responses (above threshold) are delivered automatically.
            </p>

            {/* Progress Bars */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm font-medium text-slate-300 mb-2">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    AI Auto-Resolved ({stats.aiMetrics.autoResolved})
                  </span>
                  <span>{autoPercent}%</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${autoPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-medium text-slate-300 mb-2">
                  <span className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-slate-400" />
                    Agent Handled ({stats.aiMetrics.manualResolved})
                  </span>
                  <span>{manualPercent}%</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className="bg-slate-700 h-full rounded-full transition-all duration-500"
                    style={{ width: `${manualPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-1">
                Average Confidence Score
              </span>
              <span className="text-2xl font-extrabold text-white">
                {Math.round(stats.aiMetrics.avgConfidence * 100)}%
              </span>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-1">
                Auto-Resolve Ratio
              </span>
              <span className="text-2xl font-extrabold text-white">{autoPercent}%</span>
            </div>
          </div>
        </div>

        {/* Category Breakdown Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-8 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-6">Topic Distribution</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-800/60">
                <div>
                  <span className="text-slate-200 text-sm font-semibold">General Question</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Policies, calendar, directory</span>
                </div>
                <span className="text-xl font-extrabold text-white">{stats.categoryStats.GENERAL_QUESTION}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-800/60">
                <div>
                  <span className="text-slate-200 text-sm font-semibold">Technical Question</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Credentials, Wi-Fi, portal issues</span>
                </div>
                <span className="text-xl font-extrabold text-white">{stats.categoryStats.TECHNICAL_QUESTION}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-800/60">
                <div>
                  <span className="text-slate-200 text-sm font-semibold">Refund Request</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Tuition credits, adjustments</span>
                </div>
                <span className="text-xl font-extrabold text-white">{stats.categoryStats.REFUND_REQUEST}</span>
              </div>
            </div>
          </div>

          <div className="p-4 mt-6 bg-violet-600/5 rounded-xl border border-violet-500/10 text-center">
            <span className="text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
              AI Routing and Classification is active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
