import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import type { Ticket } from '../utils/api';
import { TicketFilters } from '../components/TicketFilters';
import { Search, ArrowUpDown, RefreshCw, Calendar, Eye, Sparkles, Ticket as TicketIcon } from 'lucide-react';
import { TICKET_CHANGED_EVENT } from '../utils/events';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import type {
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';

export const TicketsList: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters state
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  // Advanced Filters state
  const [studentEmail, setStudentEmail] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  // Sorting state for TanStack Table
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);

  const navigate = useNavigate();

  const fetchTickets = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const sortingItem = sorting[0];
      const apiSortBy = sortingItem ? sortingItem.id : 'createdAt';
      const apiSortOrder = sortingItem ? (sortingItem.desc ? 'desc' : 'asc') : 'desc';

      const minConf = confidenceFilter === 'high' ? '0.85' : undefined;
      const maxConf = confidenceFilter === 'low' ? '0.85' : undefined;

      const data = await api.tickets.list({
        status,
        category,
        search,
        sortBy: apiSortBy,
        sortOrder: apiSortOrder,
        studentEmail: studentEmail || undefined,
        minConfidence: minConf,
        maxConfidence: maxConf,
        dateRange: dateRange !== 'all' ? dateRange : undefined,
        page,
        limit,
      });
      setTickets(data.tickets || []);
      setTotal(data.total ?? data.tickets?.length ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err: any) {
      if (!isBackground) setError(err.message || 'Failed to fetch tickets list.');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(false);
    // Real-time synchronization: Poll every 15 seconds in background & listen for immediate sync
    const interval = setInterval(() => fetchTickets(true), 15000);
    const handleSync = () => fetchTickets(true);
    window.addEventListener(TICKET_CHANGED_EVENT, handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener(TICKET_CHANGED_EVENT, handleSync);
    };
  }, [status, category, sorting, studentEmail, confidenceFilter, dateRange, page, limit]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const handleClearFilters = () => {
    setStatus('');
    setCategory('');
    setSearch('');
    setStudentEmail('');
    setConfidenceFilter('all');
    setDateRange('all');
    setSorting([{ id: 'createdAt', desc: true }]);
    setPage(1);
  };

  const handleDropdownSortChange = (value: string) => {
    setPage(1);
    if (value === 'newest') {
      setSorting([{ id: 'createdAt', desc: true }]);
    } else if (value === 'oldest') {
      setSorting([{ id: 'createdAt', desc: false }]);
    } else if (value === 'updated') {
      setSorting([{ id: 'updatedAt', desc: true }]);
    }
  };

  const getDropdownValue = () => {
    if (sorting.length === 0) return 'newest';
    const item = sorting[0];
    if (item.id === 'createdAt') {
      return item.desc ? 'newest' : 'oldest';
    }
    if (item.id === 'updatedAt' && item.desc) {
      return 'updated';
    }
    return '';
  };

  const hasActiveFilters =
    status !== '' ||
    category !== '' ||
    search !== '' ||
    studentEmail !== '' ||
    confidenceFilter !== 'all' ||
    dateRange !== 'all' ||
    (sorting.length > 0 && (sorting[0].id !== 'createdAt' || !sorting[0].desc));

  // Define columns for TanStack Table
  const columns = React.useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        id: 'ticketNumber',
        accessorKey: 'ticketNumber',
        header: 'Ticket',
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div>
              <div className="font-bold text-foreground">#{t.ticketNumber}</div>
              <div className="text-xs text-muted-foreground max-w-[240px] truncate mt-1">
                {t.subject}
              </div>
            </div>
          );
        },
      },
      {
        id: 'studentEmail',
        accessorKey: 'studentEmail',
        header: 'Student',
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div>
              <div className="text-foreground text-xs font-semibold">
                {t.studentEmail}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 font-medium">
                Assigned:{' '}
                <span className={t.assignedTo ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-muted-foreground/60 font-semibold'}>
                  {t.assignedTo?.name || 'Unassigned'}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Classification',
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5">
                <span
                  className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-xl border ${
                    t.status === 'OPEN'
                      ? 'text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5'
                      : t.status === 'RESOLVED'
                      ? 'text-teal-600 dark:text-teal-400 border-teal-500/20 bg-teal-500/5'
                      : 'text-muted-foreground border-border bg-muted/30'
                  }`}
                >
                  {t.status.charAt(0).toUpperCase() + t.status.slice(1).toLowerCase()}
                </span>

                <span
                  className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-xl border ${
                    t.category === 'GENERAL_QUESTION'
                      ? 'text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/5'
                      : t.category === 'TECHNICAL_QUESTION'
                      ? 'text-purple-600 dark:text-purple-400 border-purple-500/20 bg-purple-500/5'
                      : 'text-pink-600 dark:text-pink-400 border-pink-500/20 bg-pink-500/5'
                  }`}
                >
                  {t.category === 'GENERAL_QUESTION'
                    ? 'General'
                    : t.category === 'TECHNICAL_QUESTION'
                    ? 'Technical'
                    : 'Refund'}
                </span>
              </div>

              <div className="flex gap-1.5">
                {t.priority && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-lg border ${
                      t.priority === 'URGENT'
                        ? 'text-rose-600 dark:text-rose-400 border-rose-500/20 bg-rose-500/5'
                        : t.priority === 'HIGH'
                        ? 'text-orange-600 dark:text-orange-400 border-orange-500/20 bg-orange-500/5'
                        : t.priority === 'MEDIUM'
                        ? 'text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5'
                        : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                    }`}
                  >
                    {t.priority}
                  </span>
                )}

                {t.sentiment && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-lg border ${
                      t.sentiment === 'POSITIVE'
                        ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                        : t.sentiment === 'NEGATIVE'
                        ? 'text-rose-600 dark:text-rose-400 border-rose-500/20 bg-rose-500/5'
                        : 'text-muted-foreground border-border bg-muted/30'
                    }`}
                  >
                    {t.sentiment === 'POSITIVE' ? '😊 Positive' : t.sentiment === 'NEGATIVE' ? '😠 Negative' : '😐 Neutral'}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: 'aiConfidence',
        accessorKey: 'aiConfidence',
        header: 'AI Insight',
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="max-w-xs">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">
                  AI Summary
                </span>
                {t.aiConfidence !== undefined && t.aiConfidence !== null && (
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    ({Math.round(t.aiConfidence * 100)}% conf)
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 italic font-medium leading-relaxed">
                {t.aiSummary || 'Summary pending...'}
              </p>
            </div>
          );
        },
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="flex items-center gap-1.5 font-medium text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              {new Date(t.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Action',
        cell: ({ row }) => {
          const t = row.original;
          return (
            <button
              onClick={() => navigate(`/dashboard/tickets/${t.id}`)}
              className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold py-2 px-3.5 rounded-xl shadow-md shadow-teal-500/10 hover:shadow-teal-500/25 transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </button>
          );
        },
        enableSorting: false,
      },
    ],
    [navigate, fetchTickets]
  );

  const table = useReactTable({
    data: tickets,
    columns,
    state: {
      sorting,
      pagination: {
        pageIndex: page - 1,
        pageSize: limit,
      },
    },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPage(1);
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
  });

  const dropdownVal = getDropdownValue();



  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start animate-fadeIn max-w-full">
      {/* ── Left column: Queue table ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 w-full space-y-4">
        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            placeholder="Search tickets, emails, message text..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all shadow-sm"
          />
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
          <button type="submit" className="hidden" />
        </form>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 text-red-600 dark:text-red-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="w-8 h-8 text-teal-600 dark:text-teal-400 animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-card py-20 text-center rounded-2xl border border-border shadow-sm">
            <TicketIcon className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-bold text-foreground mb-2">No tickets found</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
              Try adjusting your search keywords, status filters, or topics to fetch matched items.
            </p>
          </div>
        ) : (
          <div className="bg-card overflow-hidden rounded-2xl border border-border shadow-md">
            {/* Mobile Cards View (Screen < 768px) */}
            <div className="block md:hidden p-4 space-y-3 divide-y divide-border/40">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/dashboard/tickets/${t.id}`)}
                  className="pt-3 first:pt-0 space-y-2.5 cursor-pointer active:opacity-80"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-foreground text-sm">{`#${t.ticketNumber}`}</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-lg border ${
                          t.status === 'OPEN'
                            ? 'text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5'
                            : t.status === 'RESOLVED'
                            ? 'text-teal-600 dark:text-teal-400 border-teal-500/20 bg-teal-500/5'
                            : 'text-muted-foreground border-border bg-muted/30'
                        }`}
                      >
                        {t.status}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-lg border ${
                          t.category === 'GENERAL_QUESTION'
                            ? 'text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/5'
                            : t.category === 'TECHNICAL_QUESTION'
                            ? 'text-purple-600 dark:text-purple-400 border-purple-500/20 bg-purple-500/5'
                            : 'text-pink-600 dark:text-pink-400 border-pink-500/20 bg-pink-500/5'
                        }`}
                      >
                        {t.category === 'GENERAL_QUESTION' ? 'General' : t.category === 'TECHNICAL_QUESTION' ? 'Technical' : 'Refund'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-foreground text-sm leading-snug">{t.subject}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.studentEmail}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1.5">
                    <div className="flex items-center gap-2">
                      {t.priority && (
                        <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase">
                          {t.priority}
                        </span>
                      )}
                      {t.aiConfidence !== undefined && t.aiConfidence !== null && (
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                          {Math.round(t.aiConfidence * 100)}% AI Conf
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground truncate max-w-[140px]">
                      {t.assignedTo?.name ? `Agent: ${t.assignedTo.name}` : 'Unassigned'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (Screen >= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="bg-muted/80 border-b border-border text-xs text-muted-foreground uppercase font-bold tracking-wider"
                    >
                      {headerGroup.headers.map((header) => {
                        const isSortable = header.column.getCanSort();
                        const isSorted = header.column.getIsSorted();

                        return (
                          <th
                            key={header.id}
                            className={`px-6 py-4 ${
                              header.column.id === 'actions' ? 'text-right' : ''
                            }`}
                          >
                            {header.isPlaceholder ? null : isSortable ? (
                              <button
                                onClick={header.column.getToggleSortingHandler()}
                                className="flex items-center gap-1.5 cursor-pointer select-none font-bold uppercase tracking-wider text-left hover:text-teal-600 dark:hover:text-teal-400 transition-colors group"
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {isSorted === 'asc' && (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 rotate-180" />
                                )}
                                {isSorted === 'desc' && (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                )}
                                {!isSorted && (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </button>
                            ) : (
                              flexRender(header.column.columnDef.header, header.getContext())
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-border/60 text-foreground text-sm">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-teal-500/[0.02] dark:hover:bg-teal-500/[0.04] transition-colors duration-150"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={`px-6 py-4 whitespace-nowrap ${
                            cell.column.id === 'aiConfidence' ? 'max-w-xs !whitespace-normal' : ''
                          } ${cell.column.id === 'actions' ? 'text-right' : ''}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-card border-t border-border p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground font-semibold">
                Showing{' '}
                <span className="font-extrabold text-foreground">{Math.min(total, (page - 1) * limit + 1)}</span>{' '}
                to{' '}
                <span className="font-extrabold text-foreground">{Math.min(total, page * limit)}</span>{' '}
                of{' '}
                <span className="font-extrabold text-foreground">{total}</span> tickets
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-semibold">Show</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                    className="bg-card border border-border px-2.5 py-1.5 rounded-xl text-xs font-bold text-foreground focus:outline-none cursor-pointer focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="px-3.5 py-2 bg-secondary hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 border border-border rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                  >
                    Previous
                  </button>

                  <span className="text-xs font-semibold text-muted-foreground px-1">
                    Page <span className="text-foreground font-extrabold">{page}</span> of{' '}
                    <span className="text-foreground font-extrabold">{totalPages}</span>
                  </span>

                  <button
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages || totalPages === 0}
                    className="px-3.5 py-2 bg-secondary hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 border border-border rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Right column: Filter sidebar ─────────────────────────────────────── */}
      <TicketFilters
        status={status}
        setStatus={setStatus}
        category={category}
        setCategory={setCategory}
        studentEmail={studentEmail}
        setStudentEmail={setStudentEmail}
        confidenceFilter={confidenceFilter}
        setConfidenceFilter={setConfidenceFilter}
        dateRange={dateRange}
        setDateRange={setDateRange}
        dropdownVal={dropdownVal}
        handleDropdownSortChange={handleDropdownSortChange}
        fetchTickets={fetchTickets}
        hasActiveFilters={hasActiveFilters}
        handleClearFilters={handleClearFilters}
        setPage={setPage}
      />
    </div>
  );
};
