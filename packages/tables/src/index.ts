/**
 * @preone/tables - Barrel Export
 * Enterprise DataTable for the PreOne Design System
 */

// ─── Main Component ──────────────────────────────────────────────────────────
export { DataTable } from './components/DataTable';

// ─── Sub-Components ──────────────────────────────────────────────────────────
export { DataTableHeader } from './components/DataTableHeader';
export { DataTableBody } from './components/DataTableBody';
export { DataTablePagination } from './components/DataTablePagination';
export { DataTableToolbar } from './components/DataTableToolbar';
export { BulkActionBar } from './components/BulkActionBar';
export { FilterPanel } from './components/FilterPanel';
export { ColumnVisibilityDropdown } from './components/ColumnVisibilityDropdown';
export { ExportMenu } from './components/ExportMenu';

// ─── Hooks ───────────────────────────────────────────────────────────────────
export { useDataTable } from './hooks/useDataTable';

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  Density,
  DensityConfig,
  PaginationMode,
  ServerPagination,
  BulkAction,
  DataTableColumnMeta,
  DataTableProps,
  DataTableToolbarProps,
  DataTablePaginationProps,
  BulkActionBarProps,
  FilterPanelProps,
  ColumnVisibilityDropdownProps,
  ExportMenuProps,
} from './types';

export { densityConfigs } from './types';

// ─── Hook Types ──────────────────────────────────────────────────────────────
export type {
  UseDataTableOptions,
  UseDataTableReturn,
} from './hooks/useDataTable';

// ─── Sub-Component Types ─────────────────────────────────────────────────────
export type { DataTableHeaderProps } from './components/DataTableHeader';
export type { DataTableBodyProps } from './components/DataTableBody';
