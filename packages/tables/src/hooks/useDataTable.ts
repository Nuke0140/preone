/**
 * @preone/tables - useDataTable Hook
 * Custom hook wrapping TanStack Table's useReactTable
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type Table,
  type Row,
} from '@tanstack/react-table';
import type {
  Density,
  PaginationMode,
  ServerPagination,
  BulkAction,
  DataTableColumnMeta,
} from '../types';

// ─── Options ─────────────────────────────────────────────────────────────────
export interface UseDataTableOptions<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  enableSorting?: boolean;
  enableMultiSort?: boolean;
  enableFiltering?: boolean;
  enableGlobalFilter?: boolean;
  enablePagination?: boolean;
  enableSelection?: boolean;
  enableColumnVisibility?: boolean;
  density?: Density;
  paginationMode?: PaginationMode;
  serverPagination?: ServerPagination;
  onSelectionChange?: (selectedRows: T[]) => void;
  bulkActions?: BulkAction<T>[];
  defaultPageSize?: number;
  rowId?: keyof T | ((row: T) => string);
  permissions?: string[];
}

// ─── Return Type ─────────────────────────────────────────────────────────────
export interface UseDataTableReturn<T> {
  table: Table<T>;
  density: Density;
  setDensity: (density: Density) => void;
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
  columnFilters: ColumnFiltersState;
  setColumnFilters: (filters: ColumnFiltersState) => void;
  globalFilter: string;
  setGlobalFilter: (filter: string) => void;
  columnVisibility: VisibilityState;
  setColumnVisibility: (visibility: VisibilityState) => void;
  rowSelection: RowSelectionState;
  setRowSelection: (selection: RowSelectionState) => void;
  selectedRows: T[];
  selectedCount: number;
  clearSelection: () => void;
  selectAll: () => void;
  selectPage: () => void;
  totalRows: number;
  pageCount: number;
  filterableColumns: Array<{
    id: string;
    header: string;
    filterType?: 'text' | 'select' | 'date' | 'number';
    filterOptions?: Array<{ label: string; value: string }>;
  }>;
  visibilityColumns: Array<{
    id: string;
    header: string;
    visible: boolean;
    toggle: () => void;
  }>;
  exportColumns: Array<{
    id: string;
    header: string;
  }>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useDataTable<T>(options: UseDataTableOptions<T>): UseDataTableReturn<T> {
  const {
    data,
    columns,
    enableSorting = true,
    enableMultiSort = false,
    enableFiltering = true,
    enableGlobalFilter = true,
    enablePagination = true,
    enableSelection = false,
    enableColumnVisibility = true,
    density: initialDensity = 'normal',
    paginationMode = 'client',
    serverPagination,
    onSelectionChange,
    defaultPageSize = 10,
    rowId,
    permissions,
  } = options;

  // ── State ────────────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (!enableColumnVisibility) return {};
    const visibility: VisibilityState = {};
    for (const col of columns) {
      const meta = col.meta as DataTableColumnMeta | undefined;
      if (meta?.hiddenByDefault && col.id) {
        visibility[col.id] = false;
      }
    }
    return visibility;
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [density, setDensity] = useState<Density>(initialDensity);

  // ── Filter columns by permissions ────────────────────────────────────────
  const visibleColumns = useMemo(() => {
    if (!permissions) return columns;
    return columns.filter((col) => {
      const meta = col.meta as DataTableColumnMeta | undefined;
      if (!meta?.requiredPermission) return true;
      return permissions.includes(meta.requiredPermission);
    });
  }, [columns, permissions]);

  // ── Row ID accessor ──────────────────────────────────────────────────────
  const getRowId = useCallback(
    (row: T, _index: number) => {
      if (typeof rowId === 'function') return rowId(row);
      if (typeof rowId === 'string') return String((row as Record<string, unknown>)[rowId]);
      return String(_index);
    },
    [rowId]
  );

  // ── Pagination ───────────────────────────────────────────────────────────
  const paginationConfig = useMemo(() => {
    if (paginationMode === 'server' && serverPagination) {
      return {
        pageIndex: serverPagination.page - 1,
        pageSize: serverPagination.pageSize,
      };
    }
    return {
      pageIndex: 0,
      pageSize: defaultPageSize,
    };
  }, [paginationMode, serverPagination, defaultPageSize]);

  // ── Table Instance ───────────────────────────────────────────────────────
  const table = useReactTable({
    data,
    columns: visibleColumns,
    getRowId,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
      pagination: paginationConfig,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    ...(enableSorting ? { getSortedRowModel: getSortedRowModel() } : {}),
    ...(enableFiltering ? { getFilteredRowModel: getFilteredRowModel() } : {}),
    ...(enablePagination && paginationMode === 'client'
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
    enableSorting,
    enableMultiSort,
    enableColumnFilters: enableFiltering,
    enableGlobalFilter: enableGlobalFilter,
    enableRowSelection: enableSelection,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    manualPagination: paginationMode === 'server',
    pageCount: paginationMode === 'server' && serverPagination
      ? Math.ceil(serverPagination.totalCount / serverPagination.pageSize)
      : undefined,
    autoResetPageIndex: false,
  });

  // ── Selection helpers ────────────────────────────────────────────────────
  const selectedRows = useMemo(() => {
    if (!enableSelection) return [];
    return table.getFilteredSelectedRowModel().rows.map((row: Row<T>) => row.original);
  }, [table, enableSelection]);

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  const clearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  const selectAll = useCallback(() => {
    setRowSelection(
      Object.fromEntries(
        table.getFilteredRowModel().rows.map((row: Row<T>) => [row.id, true])
      )
    );
  }, [table]);

  const selectPage = useCallback(() => {
    setRowSelection(
      Object.fromEntries(
        table.getRowModel().rows.map((row: Row<T>) => [row.id, true])
      )
    );
  }, [table]);

  // ── Notify selection changes ─────────────────────────────────────────────
  React.useEffect(() => {
    if (onSelectionChange && enableSelection) {
      onSelectionChange(selectedRows);
    }
  }, [selectedRows, onSelectionChange, enableSelection]);

  // ── Computed values ──────────────────────────────────────────────────────
  const totalRows =
    paginationMode === 'server' && serverPagination
      ? serverPagination.totalCount
      : table.getFilteredRowModel().rows.length;

  const pageCount =
    paginationMode === 'server' && serverPagination
      ? Math.ceil(serverPagination.totalCount / serverPagination.pageSize)
      : table.getPageCount();

  // ── Filterable columns info ──────────────────────────────────────────────
  const filterableColumns = useMemo(() => {
    return visibleColumns
      .filter((col) => {
        const meta = col.meta as DataTableColumnMeta | undefined;
        return meta?.filterable !== false && col.id;
      })
      .map((col) => {
        const meta = col.meta as DataTableColumnMeta | undefined;
        return {
          id: col.id!,
          header: typeof col.header === 'string'
            ? col.header
            : col.id!,
          filterType: meta?.filterType || 'text',
          filterOptions: meta?.filterOptions,
        };
      });
  }, [visibleColumns]);

  // ── Visibility columns info ──────────────────────────────────────────────
  const visibilityColumns = useMemo(() => {
    return visibleColumns
      .filter((col) => col.id)
      .map((col) => ({
        id: col.id!,
        header: typeof col.header === 'string'
          ? col.header
          : col.id!,
        visible: table.getColumn(col.id!)?.getIsVisible() ?? true,
        toggle: () => table.getColumn(col.id!)?.toggleVisibility(),
      }));
  }, [visibleColumns, table]);

  // ── Export columns info ──────────────────────────────────────────────────
  const exportColumns = useMemo(() => {
    return visibleColumns
      .filter((col) => col.id)
      .map((col) => ({
        id: col.id!,
        header: typeof col.header === 'string'
          ? col.header
          : col.id!,
      }));
  }, [visibleColumns]);

  return {
    table,
    density,
    setDensity,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    globalFilter,
    setGlobalFilter,
    columnVisibility,
    setColumnVisibility,
    rowSelection,
    setRowSelection,
    selectedRows,
    selectedCount,
    clearSelection,
    selectAll,
    selectPage,
    totalRows,
    pageCount,
    filterableColumns,
    visibilityColumns,
    exportColumns,
  };
}
