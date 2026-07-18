import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type OnChangeFn,
  type TableOptions,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from './cn.js';
import { TableColumnHeader } from './table-column-header.js';
import { TablePagination } from './table-pagination.js';
import { TableToolbar, type BulkAction, type ColumnFilter } from './table-toolbar.js';

/**
 * Density modes for the data table.
 */
export type DataTableDensity = 'compact' | 'default' | 'comfortable';

/**
 * Props for the DataTable component.
 */
export interface DataTableProps<TData> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Column definitions */
  columns: ColumnDef<TData, any>[];
  /** Row data */
  data: TData[];
  /** Unique row ID accessor */
  getRowId?: (row: TData, index: number) => string;

  // Sorting
  /** Enable sorting */
  enableSorting?: boolean;
  /** Controlled sorting state */
  sorting?: SortingState;
  /** Sorting state change handler */
  onSortingChange?: OnChangeFn<SortingState>;

  // Filtering
  /** Enable per-column filtering */
  enableColumnFilters?: boolean;
  /** Controlled column filters state */
  columnFilters?: ColumnFiltersState;
  /** Column filter change handler */
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  /** Global filter value */
  globalFilter?: string;
  /** Global filter change handler */
  onGlobalFilterChange?: OnChangeFn<string>;
  /** Column filter definitions for toolbar */
  filterDefinitions?: ColumnFilter[];

  // Pagination
  /** Enable pagination */
  enablePagination?: boolean;
  /** Manual pagination (server-side) */
  manualPagination?: boolean;
  /** Page count for manual pagination */
  pageCount?: number;
  /** Controlled pagination state */
  pagination?: { pageIndex: number; pageSize: number };
  /** Pagination state change handler */
  onPaginationChange?: OnChangeFn<{ pageIndex: number; pageSize: number }>;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Total row count for server-side pagination */
  totalRows?: number;

  // Row selection
  /** Enable row selection */
  enableRowSelection?: boolean;
  /** Controlled row selection state */
  rowSelection?: RowSelectionState;
  /** Row selection change handler */
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;

  // Bulk actions
  /** Bulk action definitions */
  bulkActions?: BulkAction[];

  // Column visibility
  /** Controlled column visibility state */
  columnVisibility?: VisibilityState;
  /** Column visibility change handler */
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;

  // Density
  /** Density mode */
  density?: DataTableDensity;
  /** Density change handler */
  onDensityChange?: (density: DataTableDensity) => void;

  // Export
  /** Export CSV handler */
  onExportCSV?: () => void;
  /** Export Excel handler */
  onExportExcel?: () => void;

  // Virtualization
  /** Enable row virtualization */
  enableVirtualization?: boolean;
  /** Estimated row height for virtualization */
  estimateRowHeight?: number;
  /** Max height for virtualized container */
  virtualMaxHeight?: number;

  // Sticky header
  /** Enable sticky header */
  stickyHeader?: boolean;
  /** Max height for sticky header scroll container */
  stickyMaxHeight?: number;

  // Loading / Empty
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state component */
  emptyComponent?: React.ReactNode;

  // Responsive
  /** Enable responsive card view on mobile */
  responsive?: boolean;
  /** Breakpoint for card view (default: sm) */
  responsiveBreakpoint?: 'sm' | 'md' | 'lg';

  // Permissions
  /** Column IDs to hide based on permissions */
  hiddenColumns?: string[];

  // Dark mode
  /** Enable dark mode */
  dark?: boolean;

  // Title
  /** Table title */
  title?: string;

  // Server-side
  /** Whether to use manual mode (server-side data) */
  manual?: boolean;
}

const densityCellStyles: Record<DataTableDensity, string> = {
  compact: 'px-2 py-1.5 text-xs',
  default: 'px-3 py-2.5 text-sm',
  comfortable: 'px-4 py-3.5 text-sm',
};

const densityRowStyles: Record<DataTableDensity, string> = {
  compact: 'h-8',
  default: 'h-12',
  comfortable: 'h-16',
};

/**
 * Export data as CSV.
 */
export function exportToCSV<TData>(
  data: TData[],
  columns: ColumnDef<TData, any>[],
  filename: string = 'export.csv',
): void {
  const headers = columns
    .filter((col) => col.id || (col as any).accessorKey)
    .map((col) => col.id || (col as any).accessorKey || '');

  const rows = data.map((row) =>
    headers.map((key) => {
      const value = (row as any)[key];
      const str = String(value ?? '');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }),
  );

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export data as Excel (simple HTML table format for .xls).
 */
export function exportToExcel<TData>(
  data: TData[],
  columns: ColumnDef<TData, any>[],
  filename: string = 'export.xls',
): void {
  const headers = columns
    .filter((col) => col.id || (col as any).accessorKey)
    .map((col) => col.id || (col as any).accessorKey || '');

  const rows = data.map((row) =>
    headers.map((key) => `<td>${(row as any)[key] ?? ''}</td>`).join(''),
  );

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="utf-8"></head>
      <body>
        <table>
          <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((r) => `<tr>${r}</tr>`).join('')}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * PreOne DataTable component wrapping @tanstack/react-table with
 * sorting, filtering, pagination, row selection, bulk actions,
 * column visibility, density control, export, virtualization,
 * sticky header, loading skeleton, empty state, responsive mode,
 * and permission-based column hiding.
 *
 * @example
 * ```tsx
 * <DataTable
 *   columns={columns}
 *   data={users}
 *   enableSorting
 *   enablePagination
 *   enableRowSelection
 *   bulkActions={[{ key: 'delete', label: 'Delete', destructive: true, onClick: handleDelete }]}
 *   stickyHeader
 *   responsive
 *   title="Users"
 * />
 * ```
 */
export const DataTable = React.forwardRef<HTMLDivElement, DataTableProps<any>>(
  <TData,>(
    {
      columns: userColumns,
      data,
      getRowId,
      enableSorting = true,
      sorting: controlledSorting,
      onSortingChange,
      enableColumnFilters = false,
      columnFilters: controlledColumnFilters,
      onColumnFiltersChange,
      globalFilter: controlledGlobalFilter,
      onGlobalFilterChange,
      enablePagination = true,
      manualPagination = false,
      pageCount: manualPageCount,
      pagination: controlledPagination,
      onPaginationChange,
      pageSizeOptions = [10, 25, 50, 100],
      totalRows,
      enableRowSelection = false,
      rowSelection: controlledRowSelection,
      onRowSelectionChange,
      bulkActions,
      columnVisibility: controlledColumnVisibility,
      onColumnVisibilityChange,
      density = 'default',
      onDensityChange,
      onExportCSV,
      onExportExcel,
      enableVirtualization = false,
      estimateRowHeight = 48,
      virtualMaxHeight = 600,
      stickyHeader = false,
      stickyMaxHeight = 500,
      loading = false,
      emptyMessage = 'No data available',
      emptyComponent,
      responsive = false,
      responsiveBreakpoint = 'sm',
      hiddenColumns = [],
      dark = false,
      title,
      manual = false,
      className,
      filterDefinitions,
      ...props
    }: DataTableProps<TData>,
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
    const [internalColumnFilters, setInternalColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [internalGlobalFilter, setInternalGlobalFilter] = React.useState('');
    const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({});
    const [internalColumnVisibility, setInternalColumnVisibility] = React.useState<VisibilityState>({});
    const [internalPagination, setInternalPagination] = React.useState({ pageIndex: 0, pageSize: pageSizeOptions[0] || 10 });

    const sorting = controlledSorting ?? internalSorting;
    const columnFilters = controlledColumnFilters ?? internalColumnFilters;
    const globalFilter = controlledGlobalFilter ?? internalGlobalFilter;
    const rowSelection = controlledRowSelection ?? internalRowSelection;
    const columnVisibility = controlledColumnVisibility ?? internalColumnVisibility;
    const pagination = controlledPagination ?? internalPagination;

    // Filter out hidden columns
    const effectiveColumns = React.useMemo(() => {
      const hiddenSet = new Set(hiddenColumns);
      return userColumns.filter((col) => {
        const id = col.id || (col as any).accessorKey;
        return !hiddenSet || !hiddenSet.has(id);
      });
    }, [userColumns, hiddenColumns]);

    // Build selection column
    const columnsWithSelection = React.useMemo(() => {
      if (!enableRowSelection) return effectiveColumns;
      const selectCol: ColumnDef<TData, any> = {
        id: '__select__',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="Select all rows"
            className="rounded border-[var(--preone-border)]"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            aria-label={`Select row ${row.index + 1}`}
            className="rounded border-[var(--preone-border)]"
          />
        ),
        size: 40,
        enableSorting: false,
        enableHiding: false,
      };
      return [selectCol, ...effectiveColumns];
    }, [effectiveColumns, enableRowSelection]);

    const table = useReactTable({
      data,
      columns: columnsWithSelection,
      getRowId,
      state: {
        sorting,
        columnFilters,
        globalFilter,
        rowSelection,
        columnVisibility,
        pagination,
      },
      onSortingChange: onSortingChange ?? setInternalSorting,
      onColumnFiltersChange: onColumnFiltersChange ?? setInternalColumnFilters,
      onGlobalFilterChange: onGlobalFilterChange ?? setInternalGlobalFilter,
      onRowSelectionChange: onRowSelectionChange ?? setInternalRowSelection,
      onColumnVisibilityChange: onColumnVisibilityChange ?? setInternalColumnVisibility,
      onPaginationChange: onPaginationChange ?? setInternalPagination,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
      getFilteredRowModel: getFilteredRowModel(),
      getPaginationRowModel: enablePagination && !manualPagination ? getPaginationRowModel() : undefined,
      manualPagination: manual || manualPagination,
      pageCount: manual || manualPagination ? manualPageCount : undefined,
      enableRowSelection: enableRowSelection,
      enableSorting,
      enableColumnFilters,
    });

    // Virtualizer
    const parentRef = React.useRef<HTMLDivElement>(null);
    const { rows } = table.getRowModel();

    const virtualizer = useVirtualizer({
      count: rows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => estimateRowHeight,
      enabled: enableVirtualization,
    });

    const selectedIds = React.useMemo(
      () => Object.keys(rowSelection).filter((k) => rowSelection[k]),
      [rowSelection],
    );

    const availableColumns = React.useMemo(
      () =>
        effectiveColumns
          .filter((col) => col.id || (col as any).accessorKey)
          .map((col) => ({
            id: col.id || (col as any).accessorKey,
            label: (col as any).header?.toString() || col.id || (col as any).accessorKey || '',
          })),
      [effectiveColumns],
    );

    const handleExportCSV = React.useCallback(() => {
      if (onExportCSV) {
        onExportCSV();
      } else {
        exportToCSV(data, effectiveColumns);
      }
    }, [onExportCSV, data, effectiveColumns]);

    const handleExportExcel = React.useCallback(() => {
      if (onExportExcel) {
        onExportExcel();
      } else {
        exportToExcel(data, effectiveColumns);
      }
    }, [onExportExcel, data, effectiveColumns]);

    // Skeleton rows for loading
    const skeletonRows = React.useMemo(
      () => Array.from({ length: pagination.pageSize }, (_, i) => i),
      [pagination.pageSize],
    );

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-2',
          dark && 'dark',
          className,
        )}
        data-dark={dark || undefined}
        {...props}
      >
        {/* Toolbar */}
        <TableToolbar
          searchValue={globalFilter}
          onSearchChange={onGlobalFilterChange ?? setInternalGlobalFilter}
          selectedIds={selectedIds}
          bulkActions={bulkActions}
          filters={filterDefinitions}
          filterValues={Object.fromEntries(columnFilters.map((f) => [f.id, f.value]))}
          onFilterChange={(columnId, value) => {
            table.getColumn(columnId)?.setFilterValue(value);
          }}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={(columnId, visible) => {
            table.getColumn(columnId)?.toggleVisibility(visible);
          }}
          availableColumns={availableColumns}
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
          density={density}
          onDensityChange={onDensityChange}
          disabled={loading}
          dark={dark}
          title={title}
        />

        {/* Table container */}
        <div
          className={cn(
            'relative rounded-lg border border-[var(--preone-border)] overflow-hidden',
            dark && 'border-[var(--preone-border-dark)]',
          )}
        >
          <div
            ref={enableVirtualization ? parentRef : undefined}
            className={cn(
              'overflow-auto',
              enableVirtualization && `max-h-[${virtualMaxHeight}px]`,
              stickyHeader && !enableVirtualization && `max-h-[${stickyMaxHeight}px]`,
            )}
            role="region"
            aria-label="Data table"
          >
            <table
              className="w-full border-collapse"
              aria-label={title || 'Data table'}
            >
              <thead
                className={cn(
                  'sticky top-0 z-10',
                  dark && 'bg-[var(--preone-surface-secondary-dark)]',
                )}
              >
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableColumnHeader
                        key={header.id}
                        sortable={header.column.getCanSort()}
                        sortDirection={
                          header.column.getIsSorted() === 'asc'
                            ? 'asc'
                            : header.column.getIsSorted() === 'desc'
                              ? 'desc'
                              : false
                        }
                        onSort={header.column.getToggleSortingHandler() as (() => void) | undefined}
                        dark={dark}
                        density={density}
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableColumnHeader>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody>
                {loading ? (
                  skeletonRows.map((i) => (
                    <tr key={`skeleton-${i}`} className={densityRowStyles[density]}>
                      {table.getHeaderGroups()[0].headers.map((header) => (
                        <td
                          key={header.id}
                          className={cn(densityCellStyles[density], 'border-b border-[var(--preone-border)]')}
                        >
                          <div className="h-4 bg-[var(--preone-surface-secondary)] rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={table.getHeaderGroups()[0].headers.length}
                      className={cn(
                        'py-12 text-center text-[var(--preone-text-secondary)]',
                        dark && 'text-[var(--preone-text-secondary-dark)]',
                      )}
                    >
                      {emptyComponent || emptyMessage}
                    </td>
                  </tr>
                ) : enableVirtualization ? (
                  virtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          'border-b border-[var(--preone-border)] hover:bg-[var(--preone-surface-secondary)] transition-colors',
                          row.getIsSelected() && 'bg-[var(--preone-color-primary-soft)]',
                          densityRowStyles[density],
                          dark && 'border-[var(--preone-border-dark)] hover:bg-[var(--preone-surface-secondary-dark)]',
                        )}
                        style={{ height: `${virtualRow.size}px` }}
                        data-index={virtualRow.index}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className={cn(densityCellStyles[density])}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-[var(--preone-border)] hover:bg-[var(--preone-surface-secondary)] transition-colors',
                        row.getIsSelected() && 'bg-[var(--preone-color-primary-soft)]',
                        dark && 'border-[var(--preone-border-dark)] hover:bg-[var(--preone-surface-secondary-dark)]',
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className={cn(densityCellStyles[density])}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Responsive card view */}
        {responsive && (
          <div
            className={cn(
              responsiveBreakpoint === 'sm' ? 'sm:hidden' : responsiveBreakpoint === 'md' ? 'md:hidden' : 'lg:hidden',
              'flex flex-col gap-2',
            )}
            aria-label="Data cards view"
          >
            {loading ? (
              Array.from({ length: 3 }, (_, i) => (
                <div key={`card-skeleton-${i}`} className="rounded-lg border border-[var(--preone-border)] p-4 animate-pulse">
                  <div className="h-4 bg-[var(--preone-surface-secondary)] rounded w-1/2 mb-2" />
                  <div className="h-3 bg-[var(--preone-surface-secondary)] rounded w-3/4" />
                </div>
              ))
            ) : rows.length === 0 ? (
              <div className="py-8 text-center text-[var(--preone-text-secondary)]">
                {emptyComponent || emptyMessage}
              </div>
            ) : (
              rows.map((row) => (
                <div
                  key={row.id}
                  className={cn(
                    'rounded-lg border border-[var(--preone-border)] p-4',
                    row.getIsSelected() && 'bg-[var(--preone-color-primary-soft)] border-[var(--preone-color-primary)]',
                    dark && 'border-[var(--preone-border-dark)]',
                  )}
                  role="article"
                >
                  {row.getVisibleCells()
                    .filter((cell) => cell.column.id !== '__select__')
                    .map((cell) => (
                      <div key={cell.id} className="flex justify-between py-1">
                        <span className="text-xs font-medium text-[var(--preone-text-secondary)]">
                          {cell.column.id}
                        </span>
                        <span className="text-sm text-[var(--preone-text-primary)]">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </span>
                      </div>
                    ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        {enablePagination && (
          <TablePagination
            pageIndex={pagination.pageIndex}
            pageCount={table.getPageCount()}
            pageSize={pagination.pageSize}
            onPageChange={(pageIndex) => table.setPageIndex(pageIndex)}
            onPageSizeChange={(pageSize) => table.setPageSize(pageSize)}
            pageSizeOptions={pageSizeOptions}
            totalRows={totalRows ?? (manual ? undefined : data.length)}
            disabled={loading}
            dark={dark}
            density={density}
          />
        )}
      </div>
    );
  },
) as <TData>(
  props: DataTableProps<TData> & React.RefAttributes<HTMLDivElement>,
) => React.ReactElement | null;

(DataTable as any).displayName = 'DataTable';
