import React, { useState, useEffect } from 'react';
import { api, Role } from '../utils/api';
import type { DashboardStats } from '../utils/api';
import { Ticket, CircleAlert, Sparkles, UserCheck, Loader2, UserCog, Users as UsersIcon, Percent, Clock, TrendingUp, Calendar } from 'lucide-react';
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

const formatDateFull = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

// Animated smooth counter component
const AnimatedNumber: React.FC<{ value: number; suffix?: string; prefix?: string }> = ({ value, suffix = '', prefix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1200; // ms

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeProgress * value));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    window.requestAnimationFrame(step);
  }, [value]);

  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

export const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [rangeFilter, setRangeFilter] = useState<'30' | '14' | '7'>('30');
  const [chartKey, setChartKey] = useState(0); // Trigger bar re-animation on filter change

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

  const handleRangeChange = (range: '30' | '14' | '7') => {
    setRangeFilter(range);
    setChartKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
        <span className="text-xs font-semibold text-muted-foreground animate-pulse">Loading real-time statistics...</span>
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
      value: <AnimatedNumber value={stats.totalTickets} />,
      icon: Ticket,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/15',
    },
    {
      label: 'Open Tickets',
      value: <AnimatedNumber value={stats.statusStats.OPEN} />,
      icon: CircleAlert,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/15',
    },
    {
      label: 'Resolved by AI',
      value: <AnimatedNumber value={stats.aiMetrics.autoResolved} />,
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

  // Filter daily stats based on selected time range
  const daysToKeep = parseInt(rangeFilter, 10);
  const filteredDailyStats = stats.dailyStats.slice(-daysToKeep);
  const maxVal = Math.max(...filteredDailyStats.map(d => d.count), 1);
  const totalPeriodTickets = filteredDailyStats.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-card p-6 rounded-2xl border border-border flex items-center justify-between transition-all duration-300 hover:scale-[1.03] hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5 relative overflow-hidden group"
            >
              <div className="relative z-10">
                <span className="text-muted-foreground text-[10px] lg:text-[11px] font-bold uppercase tracking-wider block mb-1">
                  {card.label}
                </span>
                <span className="text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">{card.value}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${card.border} ${card.bg} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm relative z-10`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>

              {/* Ambient Glow in background on card hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>
          );
        })}
      </div>

      {/* Dynamic Animated Ticket Volume Bar Chart */}
      <div className="bg-card border border-border p-6 lg:p-8 rounded-2xl space-y-6 shadow-sm relative overflow-hidden">
        {/* Top Header & Range Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground tracking-tight">Tickets Per Day</h3>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
                <TrendingUp className="w-3 h-3" />
                {totalPeriodTickets} total
              </span>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Daily support ticket volume distribution and trends
            </p>
          </div>

          {/* Interactive Date Range Toggle Buttons */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
            <button
              onClick={() => handleRangeChange('30')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                rangeFilter === '30'
                  ? 'bg-card text-teal-600 dark:text-teal-400 shadow-sm border border-border font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => handleRangeChange('14')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                rangeFilter === '14'
                  ? 'bg-card text-teal-600 dark:text-teal-400 shadow-sm border border-border font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              14 Days
            </button>
            <button
              onClick={() => handleRangeChange('7')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                rangeFilter === '7'
                  ? 'bg-card text-teal-600 dark:text-teal-400 shadow-sm border border-border font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              7 Days
            </button>
          </div>
        </div>

        {/* Chart Canvas Area */}
        <div className="relative pt-4">
          {/* Y-Axis Gridlines & Labels */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-muted-foreground font-semibold h-52 select-none z-0">
            <div className="w-full border-b border-border/40 pb-1 flex justify-between">
              <span>{maxVal} {maxVal === 1 ? 'ticket' : 'tickets'}</span>
              <div className="flex-1 border-b border-dashed border-border/30 ml-2" />
            </div>
            <div className="w-full border-b border-border/40 pb-1 flex justify-between">
              <span>{Math.round(maxVal / 2)} {Math.round(maxVal / 2) === 1 ? 'ticket' : 'tickets'}</span>
              <div className="flex-1 border-b border-dashed border-border/30 ml-2" />
            </div>
            <div className="w-full flex justify-between">
              <span>0 tickets</span>
              <div className="flex-1 border-b border-dashed border-border/30 ml-2" />
            </div>
          </div>

          {/* Bar Columns Container */}
          <div 
            key={chartKey} 
            className="flex items-end justify-between h-52 pt-6 gap-[3px] sm:gap-[8px] relative z-10"
            onMouseLeave={() => setHoveredBarIndex(null)}
          >
            {filteredDailyStats.map((day, idx) => {
              const heightPct = (day.count / maxVal) * 100;
              const isHovered = hoveredBarIndex === idx;
              const isAnyHovered = hoveredBarIndex !== null;

              return (
                <div 
                  key={day.date} 
                  className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer"
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                >
                  {/* Floating Glassmorphic Tooltip */}
                  <div
                    className={`absolute bottom-full mb-3 bg-card/95 border border-teal-500/30 text-foreground text-xs font-bold px-3 py-2 rounded-xl shadow-2xl transition-all duration-200 pointer-events-none whitespace-nowrap z-30 backdrop-blur-md flex flex-col items-center gap-1 ${
                      isHovered ? 'opacity-100 scale-100 -translate-y-1' : 'opacity-0 scale-95 translate-y-2'
                    }`}
                  >
                    <span className="text-teal-600 dark:text-teal-400 font-extrabold flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3" />
                      {formatDateFull(day.date)}
                    </span>
                    <span className="text-foreground text-sm font-black">
                      {day.count} {day.count === 1 ? 'ticket' : 'tickets'}
                    </span>

                    {/* Tooltip Arrow */}
                    <div className="w-2 h-2 bg-card border-r border-b border-teal-500/30 rotate-45 -mb-3 bg-card/95" />
                  </div>

                  {/* Animated Bar with Staggered Rise-up */}
                  <div 
                    className={`w-full rounded-t-md transition-all duration-300 relative overflow-hidden ${
                      isHovered 
                        ? 'bg-gradient-to-t from-teal-500 via-cyan-400 to-emerald-300 brightness-125 shadow-lg shadow-teal-500/40 scale-x-110 z-20'
                        : isAnyHovered 
                        ? 'bg-gradient-to-t from-teal-600/60 to-cyan-500/60 dark:from-teal-500/50 dark:to-cyan-400/50 opacity-40' 
                        : 'bg-gradient-to-t from-teal-600 to-cyan-500 dark:from-teal-500 dark:to-cyan-400 shadow-sm shadow-teal-500/10 hover:shadow-teal-500/30'
                    }`}
                    style={{ 
                      height: `${Math.max(6, heightPct)}%`,
                      animation: `barGrow 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                      animationDelay: `${idx * (rangeFilter === '30' ? 25 : rangeFilter === '14' ? 45 : 75)}ms`,
                      transformOrigin: 'bottom',
                    }}
                  >
                    {/* Top Glow Highlight Cap */}
                    <div className={`w-full h-1 bg-white/40 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-20'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* X-Axis labels at the bottom */}
        <div className="flex justify-between text-[10px] text-muted-foreground font-semibold px-1 pt-1">
          {filteredDailyStats.map((day, idx) => {
            const step = rangeFilter === '30' ? 7 : rangeFilter === '14' ? 3 : 1;
            const showLabel = idx % step === 0 || idx === filteredDailyStats.length - 1;
            const isHovered = hoveredBarIndex === idx;

            return (
              <span 
                key={day.date} 
                className={`transition-all duration-200 ${
                  isHovered ? 'text-teal-600 dark:text-teal-400 font-bold scale-110' : 'opacity-80'
                } ${showLabel ? 'block' : 'hidden sm:block opacity-0'}`}
              >
                {formatDateShort(day.date)}
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Metrics Performance Card */}
        <div className="lg:col-span-2 bg-card border border-border p-8 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight">AI Automation Performance</h3>
                  <p className="text-xs text-muted-foreground">Real-time resolution breakdown</p>
                </div>
              </div>
              
              {/* Live Status Badge with Animated Pulse Dot */}
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-teal-700 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full shadow-sm">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulseDot" />
                Active System
              </div>
            </div>

            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Tracking automated resolutions handled by the Claude API vs. manual responses sent by support agents. High-confidence responses (above threshold) are delivered automatically.
            </p>

            {/* Progress Bars with Smooth Animation & Shimmer */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm font-semibold text-foreground mb-2">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    AI Auto-Resolved ({stats.aiMetrics.autoResolved})
                  </span>
                  <span className="text-teal-600 dark:text-teal-400 font-extrabold">{autoPercent}%</span>
                </div>
                <div className="w-full bg-muted h-3.5 rounded-full overflow-hidden border border-border/50 p-0.5 relative">
                  <div
                    className="bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out shadow-sm shadow-teal-500/30 relative overflow-hidden"
                    style={{ width: `${autoPercent}%` }}
                  >
                    {/* Animated Shimmer Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold text-foreground mb-2">
                  <span className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-slate-500" />
                    Agent Handled ({stats.aiMetrics.manualResolved})
                  </span>
                  <span className="text-slate-500 font-extrabold">{manualPercent}%</span>
                </div>
                <div className="w-full bg-muted h-3.5 rounded-full overflow-hidden border border-border/50 p-0.5">
                  <div
                    className="bg-slate-400 dark:bg-slate-600 h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${manualPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border grid grid-cols-2 gap-4">
            <div className="p-4 bg-teal-500/5 dark:bg-teal-950/10 rounded-xl border border-teal-500/10 transition-all hover:border-teal-500/30 hover:bg-teal-500/10">
              <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block mb-1">
                Average Confidence Score
              </span>
              <span className="text-2xl font-extrabold text-foreground">
                <AnimatedNumber value={Math.round(stats.aiMetrics.avgConfidence * 100)} suffix="%" />
              </span>
            </div>
            <div className="p-4 bg-teal-500/5 dark:bg-teal-950/10 rounded-xl border border-teal-500/10 transition-all hover:border-teal-500/30 hover:bg-teal-500/10">
              <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block mb-1">
                Auto-Resolve Ratio
              </span>
              <span className="text-2xl font-extrabold text-foreground">
                <AnimatedNumber value={autoPercent} suffix="%" />
              </span>
            </div>
          </div>
        </div>

        {/* Category Breakdown Card */}
        <div className="bg-card border border-border p-8 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div>
            <h3 className="text-lg font-bold text-foreground mb-6 tracking-tight">Topic Distribution</h3>
            
            <div className="space-y-4">
              {/* General Question */}
              <div className="p-4 bg-blue-500/5 dark:bg-blue-950/10 rounded-xl border border-blue-500/10 transition-all duration-300 hover:scale-[1.02] hover:border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-blue-700 dark:text-blue-400 text-sm font-semibold">General Question</span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">Policies, calendar, directory</span>
                  </div>
                  <span className="text-xl font-extrabold text-blue-700 dark:text-blue-400">
                    <AnimatedNumber value={stats.categoryStats.GENERAL_QUESTION} />
                  </span>
                </div>
                {/* Progress Mini Bar */}
                <div className="w-full bg-blue-500/10 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${stats.totalTickets > 0 ? (stats.categoryStats.GENERAL_QUESTION / stats.totalTickets) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Technical Question */}
              <div className="p-4 bg-indigo-500/5 dark:bg-indigo-950/10 rounded-xl border border-indigo-500/10 transition-all duration-300 hover:scale-[1.02] hover:border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-indigo-700 dark:text-indigo-400 text-sm font-semibold">Technical Question</span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">Credentials, Wi-Fi, portal issues</span>
                  </div>
                  <span className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400">
                    <AnimatedNumber value={stats.categoryStats.TECHNICAL_QUESTION} />
                  </span>
                </div>
                {/* Progress Mini Bar */}
                <div className="w-full bg-indigo-500/10 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${stats.totalTickets > 0 ? (stats.categoryStats.TECHNICAL_QUESTION / stats.totalTickets) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Refund Request */}
              <div className="p-4 bg-pink-500/5 dark:bg-pink-950/10 rounded-xl border border-pink-500/10 transition-all duration-300 hover:scale-[1.02] hover:border-pink-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-pink-700 dark:text-pink-400 text-sm font-semibold">Refund Request</span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">Tuition credits, adjustments</span>
                  </div>
                  <span className="text-xl font-extrabold text-pink-700 dark:text-pink-400">
                    <AnimatedNumber value={stats.categoryStats.REFUND_REQUEST} />
                  </span>
                </div>
                {/* Progress Mini Bar */}
                <div className="w-full bg-pink-500/10 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-pink-500 h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${stats.totalTickets > 0 ? (stats.categoryStats.REFUND_REQUEST / stats.totalTickets) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 mt-6 bg-teal-500/5 border border-teal-500/15 rounded-xl text-center shadow-inner">
            <span className="text-teal-700 dark:text-teal-400 text-xs font-semibold flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-pulse" />
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

