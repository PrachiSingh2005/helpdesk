import React from 'react';
import { SlidersHorizontal, RefreshCw, X } from 'lucide-react';

// ── Sidebar filter section label component ──────────────────────────────────
const FilterLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
    {children}
  </span>
);

const selectCls =
  'w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none cursor-pointer focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all font-semibold';

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
    <aside className="w-full lg:w-64 shrink-0 space-y-4 sticky top-6">
      {/* Sidebar header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground font-bold text-sm">
          <SlidersHorizontal className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          Filters
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTickets()}
            title="Refresh"
            className="p-1.5 bg-card hover:bg-secondary border border-border rounded-lg transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              title="Clear all filters"
              className="p-1.5 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-destructive" />
            </button>
          )}
        </div>
      </div>

      {/* Filter card */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-5 shadow-sm">
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
            <option value="" className="bg-card text-foreground">All Statuses</option>
            <option value="OPEN" className="bg-card text-foreground">Open</option>
            <option value="RESOLVED" className="bg-card text-foreground">Resolved</option>
            <option value="CLOSED" className="bg-card text-foreground">Closed</option>
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
            <option value="" className="bg-card text-foreground">All Categories</option>
            <option value="GENERAL_QUESTION" className="bg-card text-foreground">General Question</option>
            <option value="TECHNICAL_QUESTION" className="bg-card text-foreground">Technical Question</option>
            <option value="REFUND_REQUEST" className="bg-card text-foreground">Refund Request</option>
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
              <option value="" disabled className="bg-card text-foreground">Custom Sort</option>
            )}
            <option value="newest" className="bg-card text-foreground">Newest First</option>
            <option value="oldest" className="bg-card text-foreground">Oldest First</option>
            <option value="updated" className="bg-card text-foreground">Last Updated</option>
          </select>
        </div>

        {/* Divider */}
        <div className="border-t border-border/60 pt-1">
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
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all"
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
            <option value="all" className="bg-card text-foreground">All Confidences</option>
            <option value="high" className="bg-card text-foreground">High Confidence (≥ 85%)</option>
            <option value="low" className="bg-card text-foreground">Needs Review (&lt; 85%)</option>
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
            <option value="all" className="bg-card text-foreground">All Time</option>
            <option value="today" className="bg-card text-foreground">Past 24 Hours</option>
            <option value="week" className="bg-card text-foreground">Past 7 Days</option>
            <option value="month" className="bg-card text-foreground">Past 30 Days</option>
          </select>
        </div>

        {/* Active filter count badge */}
        {hasActiveFilters && (
          <div className="pt-1">
            <button
              onClick={handleClearFilters}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-destructive hover:text-white bg-destructive/10 hover:bg-destructive/80 border border-destructive/20 rounded-xl transition-all cursor-pointer"
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
