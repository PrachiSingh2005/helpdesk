import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import type { Ticket } from '../utils/api';
import { Search, SlidersHorizontal, ArrowUpDown, RefreshCw, Calendar, Eye, Sparkles } from 'lucide-react';

export const TicketsList: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters state
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  const navigate = useNavigate();

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await api.tickets.list({ status, category, search, sortBy });
      setTickets(data.tickets);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tickets list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [status, category, sortBy]); // Automatically refresh on status, category or sort changes

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const getStatusBadge = (ticketStatus: string) => {
    switch (ticketStatus) {
      case 'OPEN':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Open
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  const getCategoryBadge = (ticketCategory: string) => {
    switch (ticketCategory) {
      case 'GENERAL_QUESTION':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
            General
          </span>
        );
      case 'TECHNICAL_QUESTION':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
            Technical
          </span>
        );
      case 'REFUND_REQUEST':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20">
            Refund
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Search and Filters panel */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search tickets, emails, message text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
          />
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <button type="submit" className="hidden" />
        </form>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700/50 px-3 py-1.5 rounded-xl">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none font-semibold pr-2 cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-white">All Statuses</option>
              <option value="OPEN" className="bg-slate-900 text-white">Open</option>
              <option value="RESOLVED" className="bg-slate-900 text-white">Resolved</option>
              <option value="CLOSED" className="bg-slate-900 text-white">Closed</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700/50 px-3 py-1.5 rounded-xl">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none font-semibold pr-2 cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-white">All Categories</option>
              <option value="GENERAL_QUESTION" className="bg-slate-900 text-white">General Question</option>
              <option value="TECHNICAL_QUESTION" className="bg-slate-900 text-white">Technical Question</option>
              <option value="REFUND_REQUEST" className="bg-slate-900 text-white">Refund Request</option>
            </select>
          </div>

          {/* Sorting Option */}
          <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700/50 px-3 py-1.5 rounded-xl">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none font-semibold pr-2 cursor-pointer"
            >
              <option value="newest" className="bg-slate-900 text-white">Newest First</option>
              <option value="oldest" className="bg-slate-900 text-white">Oldest First</option>
              <option value="updated" className="bg-slate-900 text-white">Last Updated</option>
            </select>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={fetchTickets}
            className="p-2.5 bg-slate-900/50 hover:bg-slate-800/80 border border-slate-700/50 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-slate-400 hover:text-slate-200" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="glass-panel py-20 text-center rounded-2xl border border-slate-800/80">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No tickets found</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            Try adjusting your search keywords, status filters, or topics to fetch matched items.
          </p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden rounded-2xl border border-slate-800/80 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/40 border-b border-slate-800/80 text-xs text-slate-400 uppercase font-semibold tracking-wider">
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Classification</th>
                  <th className="px-6 py-4">AI Insight</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300 text-sm">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-900/20 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-white">#{t.ticketNumber}</div>
                      <div className="text-xs text-slate-400 max-w-[240px] truncate mt-1">
                        {t.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs font-semibold">
                      {t.studentEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap space-x-1.5">
                      {getStatusBadge(t.status)}
                      {getCategoryBadge(t.category)}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                        <span className="text-[10px] text-violet-300 font-bold uppercase tracking-wider">
                          Claude Summary
                        </span>
                        {t.aiConfidence !== undefined && t.aiConfidence !== null && (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            ({Math.round(t.aiConfidence * 100)}% conf)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 italic font-medium leading-relaxed">
                        {t.aiSummary || 'Summary pending...'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(t.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => navigate(`/dashboard/tickets/${t.id}`)}
                        className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-md transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
