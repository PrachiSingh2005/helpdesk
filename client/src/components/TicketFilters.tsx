import React from 'react';
import { SlidersHorizontal, RefreshCw, X } from 'lucide-react';

// ── Sidebar filter section label component ──────────────────────────────────
const FilterLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
    {children}
  </span>
);

const selectCls =
  'w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none cursor-pointer focus:border-violet-500 transition-all font-semibold';

interface TicketFiltersProps {
  status: string;
  setStatus: (status: string) => void;
  category: string;
  setCategory: (category: string) => void;
  studentEmail: string;
  setStudentEmail: (email: string) => void;
  confidenceFilter: string;
  setConfidenceFilter: (conf: string) => void;
  dateRange: string;
  setDateRange: (range: string) => void;
  dropdownVal: string;
  handleDropdownSortChange: (sort: string) => void;
  fetchTickets: () => Promise<void> | void;
  hasActiveFilters: boolean;
  handleClearFilters: () => void;
  setPage: (page: number) => void;
}

export const TicketFilters: React.FC<TicketFiltersProps> = ({
  status,
  setStatus,
  category,
  setCategory,
  studentEmail,
  setStudentEmail,
  confidenceFilter,
  setConfidenceFilter,
  dateRange,
  setDateRange,
  dropdownVal,
  handleDropdownSortChange,
  fetchTickets,
  hasActiveFilters,
  handleClearFilters,
  setPage,
}) => {
  return (
    <aside className="w-64 shrink-0 space-y-4 sticky top-6">
      {/* Sidebar header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
          <SlidersHorizontal className="w-4 h-4 text-violet-400" />
          Filters
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTickets()}
            title="Refresh"
            className="p-1.5 bg-slate-900/50 hover:bg-slate-800/80 border border-slate-700/50 rounded-lg transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
          </button>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              title="Clear all filters"
              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Filter card */}
      <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-4 space-y-5">
        {/* Status */}
        <div className="space-y-1.5">
          <FilterLabel>Status</FilterLabel>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={selectCls}
          >
            <option value="" className="bg-slate-900">All Statuses</option>
            <option value="OPEN" className="bg-slate-900">Open</option>
            <option value="RESOLVED" className="bg-slate-900">Resolved</option>
            <option value="CLOSED" className="bg-slate-900">Closed</option>
          </select>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <FilterLabel>Category</FilterLabel>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className={selectCls}
          >
            <option value="" className="bg-slate-900">All Categories</option>
            <option value="GENERAL_QUESTION" className="bg-slate-900">General Question</option>
            <option value="TECHNICAL_QUESTION" className="bg-slate-900">Technical Question</option>
            <option value="REFUND_REQUEST" className="bg-slate-900">Refund Request</option>
          </select>
        </div>

        {/* Sort */}
        <div className="space-y-1.5">
          <FilterLabel>Sort By</FilterLabel>
          <select
            value={dropdownVal}
            onChange={(e) => handleDropdownSortChange(e.target.value)}
            className={selectCls}
          >
            {dropdownVal === '' && (
              <option value="" disabled className="bg-slate-900">Custom Sort</option>
            )}
            <option value="newest" className="bg-slate-900">Newest First</option>
            <option value="oldest" className="bg-slate-900">Oldest First</option>
            <option value="updated" className="bg-slate-900">Last Updated</option>
          </select>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800/60 pt-1">
          <FilterLabel>Advanced</FilterLabel>
        </div>

        {/* Student Email */}
        <div className="space-y-1.5">
          <FilterLabel>Student Email</FilterLabel>
          <input
            id="filter-student-email"
            type="text"
            placeholder="Filter by email..."
            value={studentEmail}
            onChange={(e) => {
              setStudentEmail(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
          />
        </div>

        {/* AI Confidence */}
        <div className="space-y-1.5">
          <label htmlFor="filter-ai-confidence" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            AI Confidence
          </label>
          <select
            id="filter-ai-confidence"
            value={confidenceFilter}
            onChange={(e) => {
              setConfidenceFilter(e.target.value);
              setPage(1);
            }}
            className={selectCls}
          >
            <option value="all" className="bg-slate-900">All Confidences</option>
            <option value="high" className="bg-slate-900">High Confidence (≥ 85%)</option>
            <option value="low" className="bg-slate-900">Needs Review (&lt; 85%)</option>
          </select>
        </div>

        {/* Date Range */}
        <div className="space-y-1.5">
          <label htmlFor="filter-date-range" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Date Range
          </label>
          <select
            id="filter-date-range"
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value);
              setPage(1);
            }}
            className={selectCls}
          >
            <option value="all" className="bg-slate-900">All Time</option>
            <option value="today" className="bg-slate-900">Past 24 Hours</option>
            <option value="week" className="bg-slate-900">Past 7 Days</option>
            <option value="month" className="bg-slate-900">Past 30 Days</option>
          </select>
        </div>

        {/* Active filter count badge */}
        {hasActiveFilters && (
          <div className="pt-1">
            <button
              onClick={handleClearFilters}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-3 h-3" />
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
