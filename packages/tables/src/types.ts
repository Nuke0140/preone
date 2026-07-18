/**
 * @preone/tables - Type Definitions
 * Enterprise DataTable types for the PreOne Design System
 */

import React from 'react';
import type { ColumnDef, ColumnFiltersState, VisibilityState } from '@tanstack/react-table';

// ─── Density ─────────────────────────────────────────────────────────────────
export type Density = 'compact' | 'normal' | 'comfortable';

export interface DensityConfig {
  rowHeight: number;
  cellPadding: string;
  headerPadding: string;
  fontSize: string;
}

export const densityConfigs: Record<Density, DensityConfig> = {
  compact: {
    rowHeight: 36,
    cellPadding: '6px 12px',
    headerPadding: '8px 12px',
    fontSize: '0.8125rem',
  },
  normal: {
    rowHeight: 44,
    cellPadding: '10px 16px',
    headerPadding: '12px 16px',
    fontSize: '0.875rem',
  },
  comfortable: {
    rowHeight: 56,
    cellPadding: '14px 20px',
    headerPadding: '16px 20px',
    fontSize: '0.9375rem',
  },
};

// ─── Pagination ──────────────────────────────────────────────────────────────
export type PaginationMode = 'client' | 'server';

export interface ServerPagination {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

// ─── Bulk Actions ────────────────────────────────────────────────────────────
export interface BulkAction<T = unknown> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  onClick: (selectedRows: T[]) => void;
  disabled?: boolean;
}

// ─── Column Meta ─────────────────────────────────────────────────────────────
export interface DataTableColumnMeta {
  requiredPermission?: string;
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'date' | 'number';
  filterOptions?: Array<{ label: string; value: string }>;
  hiddenByDefault?: boolean;
}

// ─── Main Props ──────────────────────────────────────────────────────────────
export interface DataTableProps<T> {
  /** Array of data to display */
  data: T[];
  /** Column definitions using TanStack ColumnDef */
  columns: ColumnDef<T, unknown>[];
  /** Enable sorting */
  enableSorting?: boolean;
  /** Enable multi-column sorting */
  enableMultiSort?: boolean;
  /** Enable column-level filtering */
  enableFiltering?: boolean;
  /** Enable global search across all columns */
  enableGlobalFilter?: boolean;
  /** Enable pagination */
  enablePagination?: boolean;
  /** Enable row selection */
  enableSelection?: boolean;
  /** Enable column visibility toggle */
  enableColumnVisibility?: boolean;
  /** Enable virtualization for large datasets */
  enableVirtualization?: boolean;
  /** Enable CSV/Excel export */
  enableExport?: boolean;
  /** Row density mode */
  density?: Density;
  /** Pagination mode: client-side or server-side */
  paginationMode?: PaginationMode;
  /** Server-side pagination config */
  serverPagination?: ServerPagination;
  /** Callback when selection changes */
  onSelectionChange?: (selectedRows: T[]) => void;
  /** Bulk actions to display when rows selected */
  bulkActions?: BulkAction<T>[];
  /** Show loading state */
  loading?: boolean;
  /** Custom empty state */
  emptyState?: React.ReactNode;
  /** Enable sticky header */
  stickyHeader?: boolean;
  /** Responsive breakpoint for card view (px) */
  responsiveBreakpoint?: number;
  /** Default page size */
  defaultPageSize?: number;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Additional CSS class */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** ID attribute */
  id?: string;
  /** Row ID accessor - field name or accessor function */
  rowId?: keyof T | ((row: T) => string);
  /** Callback when row is clicked */
  onRowClick?: (row: T) => void;
  /** Max height for virtualized table (px) */
  virtualHeight?: number;
}

// ─── Sub-Component Props ─────────────────────────────────────────────────────
export interface DataTableToolbarProps {
  /** Global search value */
  globalFilter: string;
  /** Global search change handler */
  onGlobalFilterChange: (value: string) => void;
  /** Enable global search */
  enableGlobalFilter: boolean;
  /** Enable filtering */
  enableFiltering: boolean;
  /** Enable column visibility toggle */
  enableColumnVisibility: boolean;
  /** Enable export */
  enableExport: boolean;
  /** Current density */
  density: Density;
  /** Density change handler */
  onDensityChange: (density: Density) => void;
  /** Column visibility state */
  columnVisibility: VisibilityState;
  /** Column visibility change handler */
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
  /** All columns */
  columns: Array<{
    id: string;
    header: string;
    visible: boolean;
    toggle: () => void;
  }>;
  /** Table instance for export */
  tableInstance: unknown;
  /** Additional class */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

export interface DataTablePaginationProps {
  /** Current page (0-indexed) */
  pageIndex: number;
  /** Items per page */
  pageSize: number;
  /** Total row count */
  totalRows: number;
  /** Page count */
  pageCount: number;
  /** Callback to go to page */
  onPageChange: (page: number) => void;
  /** Callback to change page size */
  onPageSizeChange: (size: number) => void;
  /** Page size options */
  pageSizeOptions: number[];
  /** Pagination mode */
  mode: PaginationMode;
  /** Additional class */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

export interface BulkActionBarProps<T = unknown> {
  /** Number of selected rows */
  selectedCount: number;
  /** Total row count */
  totalCount: number;
  /** Bulk actions */
  actions: BulkAction<T>[];
  /** Selected row data */
  selectedRows: T[];
  /** Clear selection handler */
  onClearSelection: () => void;
  /** Select all handler */
  onSelectAll: () => void;
  /** Additional class */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

export interface FilterPanelProps {
  /** Column filters state */
  columnFilters: ColumnFiltersState;
  /** Column filters change handler */
  onColumnFiltersChange: (filters: ColumnFiltersState) => void;
  /** Columns that are filterable */
  filterableColumns: Array<{
    id: string;
    header: string;
    filterType?: 'text' | 'select' | 'date' | 'number';
    filterOptions?: Array<{ label: string; value: string }>;
  }>;
  /** Whether the panel is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Additional class */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

export interface ColumnVisibilityDropdownProps {
  /** Columns list */
  columns: Array<{
    id: string;
    header: string;
    visible: boolean;
    toggle: () => void;
  }>;
  /** Whether the dropdown is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Additional class */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

export interface ExportMenuProps<T = unknown> {
  /** Table data for export */
  data: T[];
  /** Column definitions */
  columns: Array<{
    id: string;
    header: string;
    accessor?: (row: T) => unknown;
  }>;
  /** Whether the menu is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** File name prefix */
  fileName?: string;
  /** Additional class */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}
