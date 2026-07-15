import React, { useState, useEffect } from 'react';
import { api, Role } from '../utils/api';
import type { DashboardStats } from '../utils/api';
import { Ticket, CircleAlert, Sparkles, UserCheck, Loader2, UserCog, Users as UsersIcon, Percent, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const formatResolutionTime = (minutes: number) => {
  if (minutes < 1) {
    return 'Under 1m';
  }
  if (minutes < 60) {
    return `${minutes} mins`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatDateShort = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const DashboardHome: React.FC = () => {
  const { user } = useAuth();
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
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/15',
    },
    {
      label: 'Open Tickets',
      value: stats.statusStats.OPEN,
      icon: CircleAlert,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/15',
    },
    {
      label: 'Resolved by AI',
      value: stats.aiMetrics.autoResolved,
      icon: Sparkles,
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/15',
    },
    {
      label: '% Resolved by AI',
      value: `${stats.totalTickets > 0 ? Math.round((stats.aiMetrics.autoResolved / stats.totalTickets) * 100) : 0}%`,
      icon: Percent,
      color: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/15',
    },
    {
      label: 'Avg Resolution Time',
      value: formatResolutionTime(stats.aiMetrics.avgResolutionTimeMin),
      icon: Clock,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/15',
    },
  ];

  const totalResolved = stats.aiMetrics.autoResolved + stats.aiMetrics.manualResolved;
  const autoPercent = totalResolved > 0 ? Math.round((stats.aiMetrics.autoResolved / totalResolved) * 100) : 0;
  const manualPercent = totalResolved > 0 ? Math.round((stats.aiMetrics.manualResolved / totalResolved) * 100) : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-card p-6 rounded-2xl border border-border flex items-center justify-between transition-all duration-300 hover:scale-[1.02] hover:border-teal-500/25 shadow-sm relative overflow-hidden group"
            >
              <div>
                <span className="text-muted-foreground text-[10px] lg:text-[11px] font-bold uppercase tracking-wider block mb-1">
                  {card.label}
                </span>
                <span className="text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">{card.value}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${card.border} ${card.bg} transition-transform duration-300 group-hover:scale-110`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily Ticket Volume Bar Chart */}
      <div className="bg-card border border-border p-6 lg:p-8 rounded-2xl space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground tracking-tight">Tickets Per Day</h3>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Last 30 days support query distribution
            </p>
          </div>
          <span className="text-[10px] text-teal-700 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            Last 30 Days
          </span>
        </div>

        <div className="relative">
          {/* Y-Axis Gridlines & Labels */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-muted-foreground font-semibold h-48 select-none">
            <div className="w-full border-b border-border/50 pb-1 flex justify-between">
              <span>{Math.max(...stats.dailyStats.map(d => d.count), 1)} tickets</span>
              <div className="flex-1 border-b border-dashed border-border/30 ml-2" />
            </div>
            <div className="w-full border-b border-border/50 pb-1 flex justify-between">
              <span>{Math.round(Math.max(...stats.dailyStats.map(d => d.count), 1) / 2)} tickets</span>
              <div className="flex-1 border-b border-dashed border-border/30 ml-2" />
            </div>
            <div className="w-full flex justify-between">
              <span>0 tickets</span>
              <div className="flex-1 border-b border-dashed border-border/30 ml-2" />
            </div>
          </div>

          {/* Bar Columns Container */}
          <div className="flex items-end justify-between h-48 pt-4 gap-[2px] sm:gap-[6px] relative z-10">
            {stats.dailyStats.map((day) => {
              const maxVal = Math.max(...stats.dailyStats.map(d => d.count), 1);
              const heightPct = (day.count / maxVal) * 100;

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 bg-card/90 border border-teal-500/20 text-foreground text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 backdrop-blur-md">
                    <span className="text-teal-600 dark:text-teal-400 font-extrabold">{formatDateShort(day.date)}</span>: {day.count} {day.count === 1 ? 'ticket' : 'tickets'}
                  </div>

                  {/* The Bar */}
                  <div 
                    className="w-full bg-gradient-to-t from-teal-600 to-cyan-500 dark:from-teal-500 dark:to-cyan-400 rounded-t-[4px] transition-all duration-300 hover:brightness-110 shadow-sm shadow-teal-500/5 hover:shadow-teal-500/20"
                    style={{ height: `${Math.max(4, heightPct)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* X-Axis labels at the bottom */}
        <div className="flex justify-between text-[10px] text-muted-foreground font-semibold px-1">
          {stats.dailyStats.map((day, idx) => {
            const showLabel = idx === 0 || idx === 10 || idx === 20 || idx === 29;
            return (
              <span 
                key={day.date} 
                className={`transition-opacity duration-200 ${showLabel ? 'opacity-100' : 'opacity-0 h-0 w-0 overflow-hidden'}`}
              >
                {formatDateShort(day.date)}
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Metrics Card */}
        <div className="lg:col-span-2 bg-card border border-border p-8 rounded-2xl flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                  <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">AI Automation Performance</h3>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-teal-700 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full">
                Active System
              </span>
            </div>

            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Tracking automated resolutions handled by the Claude API vs. manual responses sent by support agents. High-confidence responses (above threshold) are delivered automatically.
            </p>

            {/* Progress Bars */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm font-semibold text-foreground mb-2">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    AI Auto-Resolved ({stats.aiMetrics.autoResolved})
                  </span>
                  <span className="text-teal-600 dark:text-teal-400">{autoPercent}%</span>
                </div>
                <div className="w-full bg-muted h-3 rounded-full overflow-hidden border border-border/50">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-teal-500/20"
                    style={{ width: `${autoPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold text-foreground mb-2">
                  <span className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-slate-500" />
                    Agent Handled ({stats.aiMetrics.manualResolved})
                  </span>
                  <span className="text-slate-500">{manualPercent}%</span>
                </div>
                <div className="w-full bg-muted h-3 rounded-full overflow-hidden border border-border/50">
                  <div
                    className="bg-slate-400 dark:bg-slate-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${manualPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border grid grid-cols-2 gap-4">
            <div className="p-4 bg-teal-500/5 dark:bg-teal-950/10 rounded-xl border border-teal-500/10">
              <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block mb-1">
                Average Confidence Score
              </span>
              <span className="text-2xl font-extrabold text-foreground">
                {Math.round(stats.aiMetrics.avgConfidence * 100)}%
              </span>
            </div>
            <div className="p-4 bg-teal-500/5 dark:bg-teal-950/10 rounded-xl border border-teal-500/10">
              <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block mb-1">
                Auto-Resolve Ratio
              </span>
              <span className="text-2xl font-extrabold text-foreground">{autoPercent}%</span>
            </div>
          </div>
        </div>

        {/* Category Breakdown Card */}
        <div className="bg-card border border-border p-8 rounded-2xl flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-foreground mb-6 tracking-tight">Topic Distribution</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-500/5 dark:bg-blue-950/10 rounded-xl border border-blue-500/10">
                <div>
                  <span className="text-blue-700 dark:text-blue-400 text-sm font-semibold">General Question</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">Policies, calendar, directory</span>
                </div>
                <span className="text-xl font-extrabold text-blue-700 dark:text-blue-400">{stats.categoryStats.GENERAL_QUESTION}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-indigo-500/5 dark:bg-indigo-950/10 rounded-xl border border-indigo-500/10">
                <div>
                  <span className="text-indigo-700 dark:text-indigo-400 text-sm font-semibold">Technical Question</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">Credentials, Wi-Fi, portal issues</span>
                </div>
                <span className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400">{stats.categoryStats.TECHNICAL_QUESTION}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-pink-500/5 dark:bg-pink-950/10 rounded-xl border border-pink-500/10">
                <div>
                  <span className="text-pink-700 dark:text-pink-400 text-sm font-semibold">Refund Request</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">Tuition credits, adjustments</span>
                </div>
                <span className="text-xl font-extrabold text-pink-700 dark:text-pink-400">{stats.categoryStats.REFUND_REQUEST}</span>
              </div>
            </div>
          </div>

          <div className="p-4 mt-6 bg-teal-500/5 border border-teal-500/15 rounded-xl text-center shadow-inner">
            <span className="text-teal-700 dark:text-teal-400 text-xs font-semibold flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              AI Routing and Classification active
            </span>
          </div>
        </div>
      </div>

      {user?.role === Role.ADMIN && (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-xl">
              <UserCog className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">Administrator Quick Actions</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/dashboard/agents"
              className="flex items-center justify-between p-4 bg-card hover:bg-teal-500/5 border border-border hover:border-teal-500/25 rounded-xl transition-all duration-200 group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary border border-border rounded-lg group-hover:bg-teal-500/10 group-hover:border-teal-500/20 transition-all">
                  <UsersIcon className="w-5 h-5 text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" />
                </div>
                <div>
                  <span className="text-foreground text-sm font-semibold block">Manage Agents</span>
                  <span className="text-xs text-muted-foreground">Configure support agent accounts and permissions</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-semibold group-hover:translate-x-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-all">
                Configure →
              </span>
            </Link>

            <Link
              to="/users"
              className="flex items-center justify-between p-4 bg-card hover:bg-teal-500/5 border border-border hover:border-teal-500/25 rounded-xl transition-all duration-200 group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary border border-border rounded-lg group-hover:bg-teal-500/10 group-hover:border-teal-500/20 transition-all">
                  <UserCog className="w-5 h-5 text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" />
                </div>
                <div>
                  <span className="text-foreground text-sm font-semibold block">User Administration</span>
                  <span className="text-xs text-muted-foreground">View and manage customer/end-user accounts</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-semibold group-hover:translate-x-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-all">
                Configure →
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
