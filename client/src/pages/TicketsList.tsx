import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import type { Ticket } from '../utils/api';
import { TicketFilters } from '../components/TicketFilters';
import { Search, ArrowUpDown, RefreshCw, Calendar, Eye, Sparkles, Ticket as TicketIcon } from 'lucide-react';
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

  const fetchTickets = async () => {
    setLoading(true);
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
      setError(err.message || 'Failed to fetch tickets list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
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
              <div className="font-bold text-white">#{t.ticketNumber}</div>
              <div className="text-xs text-slate-400 max-w-[240px] truncate mt-1">
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
              <div className="text-slate-200 text-xs font-semibold">
                {t.studentEmail}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-medium">
                Assigned:{' '}
                <span className={t.assignedTo ? 'text-violet-400 font-bold' : 'text-slate-500 font-semibold'}>
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
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={t.status}
                onChange={async (e) => {
                  try {
                    await api.tickets.update(t.id, { status: e.target.value });
                    fetchTickets();
                  } catch (err: any) {
                    alert(err.message || 'Failed to update status.');
                  }
                }}
                className={`px-2 py-1 text-xs font-semibold rounded-lg bg-slate-900/50 border focus:outline-none cursor-pointer ${
                  t.status === 'OPEN'
                    ? 'text-amber-400 border-amber-500/30 hover:border-amber-500/60'
                    : t.status === 'RESOLVED'
                    ? 'text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60'
                    : 'text-slate-400 border-slate-700/50 hover:border-slate-500/60'
                }`}
              >
                <option value="OPEN" className="bg-slate-950 text-amber-400">Open</option>
                <option value="RESOLVED" className="bg-slate-950 text-emerald-400">Resolved</option>
                <option value="CLOSED" className="bg-slate-950 text-slate-400">Closed</option>
              </select>

              <select
                value={t.category}
                onChange={async (e) => {
                  try {
                    await api.tickets.update(t.id, { category: e.target.value });
                    fetchTickets();
                  } catch (err: any) {
                    alert(err.message || 'Failed to update category.');
                  }
                }}
                className={`px-2 py-1 text-xs font-semibold rounded-lg bg-slate-900/50 border focus:outline-none cursor-pointer ${
                  t.category === 'GENERAL_QUESTION'
                    ? 'text-blue-300 border-blue-500/30 hover:border-blue-500/60'
                    : t.category === 'TECHNICAL_QUESTION'
                    ? 'text-purple-300 border-purple-500/30 hover:border-purple-500/60'
                    : 'text-pink-300 border-pink-500/30 hover:border-pink-500/60'
                }`}
              >
                <option value="GENERAL_QUESTION" className="bg-slate-950 text-blue-300">General Question</option>
                <option value="TECHNICAL_QUESTION" className="bg-slate-950 text-purple-300">Technical Question</option>
                <option value="REFUND_REQUEST" className="bg-slate-950 text-pink-300">Refund Request</option>
              </select>
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
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5" />
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
              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-md transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
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
    <div className="flex gap-6 items-start animate-fadeIn">
      {/* ── Left column: Queue table ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">
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
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
          />
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <button type="submit" className="hidden" />
        </form>

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
          <div className="bg-slate-900/40 backdrop-blur-xl py-20 text-center rounded-2xl border border-slate-800/80">
            <TicketIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No tickets found</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              Try adjusting your search keywords, status filters, or topics to fetch matched items.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-2xl border border-slate-800/80 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="bg-slate-900/40 border-b border-slate-800/80 text-xs text-slate-400 uppercase font-semibold tracking-wider"
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
                                className="flex items-center gap-1.5 cursor-pointer select-none font-semibold uppercase tracking-wider text-left hover:text-slate-200 transition-colors group"
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {isSorted === 'asc' && (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-violet-400 rotate-180" />
                                )}
                                {isSorted === 'desc' && (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-violet-400" />
                                )}
                                {!isSorted && (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                <tbody className="divide-y divide-slate-800/50 text-slate-300 text-sm">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-900/20 transition-colors duration-150"
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
            <div className="bg-slate-900/40 border-t border-slate-800/80 p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 font-medium">
                Showing{' '}
                <span className="font-bold text-white">{Math.min(total, (page - 1) * limit + 1)}</span>{' '}
                to{' '}
                <span className="font-bold text-white">{Math.min(total, page * limit)}</span>{' '}
                of{' '}
                <span className="font-bold text-white">{total}</span> tickets
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Show</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                    className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-xs font-bold text-slate-300 focus:outline-none cursor-pointer focus:border-violet-500"
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
                    className="px-3 py-1.5 bg-slate-900/50 hover:bg-slate-800/80 border border-slate-700/50 rounded-lg text-xs font-semibold text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                  >
                    Previous
                  </button>

                  <span className="text-xs font-semibold text-slate-400 px-1">
                    Page <span className="text-white font-bold">{page}</span> of{' '}
                    <span className="text-white font-bold">{totalPages}</span>
                  </span>

                  <button
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages || totalPages === 0}
                    className="px-3 py-1.5 bg-slate-900/50 hover:bg-slate-800/80 border border-slate-700/50 rounded-lg text-xs font-semibold text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
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
