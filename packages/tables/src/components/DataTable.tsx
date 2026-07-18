/**
 * @preone/tables - DataTable
 * Main enterprise DataTable component with full feature set
 */

'use client';

import React, { forwardRef, useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { cn } from '@preone/ui';
import { colors, spacing, radius, shadows, duration, easing, fontFamily } from '@preone/design-tokens';
import { useDataTable } from '../hooks/useDataTable';
import type {
  DataTableProps,
  Density,
  BulkAction,
} from '../types';
import { DataTableHeader } from './DataTableHeader';
import { DataTableBody } from './DataTableBody';
import { DataTablePagination } from './DataTablePagination';
import { DataTableToolbar } from './DataTableToolbar';
import { BulkActionBar } from './BulkActionBar';

// ─── Responsive Card View ────────────────────────────────────────────────────
function MobileCardView<T>({
  table,
  density,
  enableSelection,
  onRowClick,
}: {
  table: ReturnType<typeof useDataTable<T>>['table'];
  density: Density;
  enableSelection: boolean;
  onRowClick?: (row: T) => void;
}) {
  const rows = table.getRowModel().rows;
  const densityPadding = density === 'compact' ? spacing[3] : density === 'comfortable' ? spacing[5] : spacing[4];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3], padding: densityPadding }}>
      {rows.map((row) => {
        const isSelected = row.getIsSelected();
        return (
          <div
            key={row.id}
            style={{
              backgroundColor: '#fff',
              border: `1px solid ${colors.neutral[200]}`,
              borderRadius: radius.lg,
              padding: densityPadding,
              boxShadow: shadows.sm,
              cursor: onRowClick ? 'pointer' : 'default',
              transition: `box-shadow ${duration.fast} ${easing.DEFAULT}`,
            }}
            onClick={() => onRowClick?.(row.original)}
          >
            {enableSelection && (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: radius.md,
                    border: `2px solid ${isSelected ? colors.neutral[900] : colors.neutral[300]}`,
                    backgroundColor: isSelected ? colors.neutral[900] : 'transparent',
                    cursor: 'pointer',
                    transition: `all ${duration.fast} ${easing.DEFAULT}`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    row.toggleSelected();
                  }}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                >
                  {isSelected && (
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
            )}
            {row.getVisibleCells().map((cell, idx) => {
              const headerLabel = typeof cell.column.columnDef.header === 'string'
                ? cell.column.columnDef.header
                : cell.column.id;
              return (
                <div
                  key={cell.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: idx === 0 ? 'center' : 'flex-start',
                    padding: `${spacing[1.5]} 0`,
                    ...(idx < row.getVisibleCells().length - 1 ? { borderBottom: `1px solid ${colors.neutral[100]}` } : {}),
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: colors.neutral[400], fontFamily: fontFamily.sans, fontWeight: 500 }}>
                    {headerLabel}
                  </span>
                  <span style={{ fontSize: '0.875rem', color: colors.neutral[800], fontFamily: fontFamily.sans, textAlign: 'right', maxWidth: '60%' }}>
                    {typeof cell.column.columnDef.cell === 'function'
                      ? (cell.column.columnDef.cell as Function)(cell.getContext())
                      : cell.column.columnDef.cell}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export const DataTable = forwardRef<HTMLDivElement, DataTableProps<unknown>>(
  (
    {
      data,
      columns,
      enableSorting = true,
      enableMultiSort = false,
      enableFiltering = true,
      enableGlobalFilter = true,
      enablePagination = true,
      enableSelection = false,
      enableColumnVisibility = true,
      enableVirtualization = false,
      enableExport = false,
      density: densityProp = 'normal',
      paginationMode = 'client',
      serverPagination,
      onSelectionChange,
      bulkActions = [],
      loading = false,
      emptyState,
      stickyHeader = true,
      responsiveBreakpoint = 768,
      defaultPageSize = 10,
      pageSizeOptions = [10, 20, 50, 100],
      className,
      style,
      id,
      rowId,
      onRowClick,
      virtualHeight = 600,
    },
    ref
  ) => {
    // ── Hook ──────────────────────────────────────────────────────────────
    const {
      table,
      density,
      setDensity,
      globalFilter,
      setGlobalFilter,
      columnFilters,
      setColumnFilters,
      columnVisibility,
      setColumnVisibility,
      selectedRows,
      selectedCount,
      clearSelection,
      selectAll,
      totalRows,
      pageCount,
      filterableColumns,
      visibilityColumns,
      exportColumns,
    } = useDataTable({
      data,
      columns,
      enableSorting,
      enableMultiSort,
      enableFiltering,
      enableGlobalFilter,
      enablePagination,
      enableSelection,
      enableColumnVisibility,
      density: densityProp,
      paginationMode,
      serverPagination,
      onSelectionChange,
      bulkActions: bulkActions as BulkAction<unknown>[],
      defaultPageSize,
      rowId,
    });

    // ── Responsive state ──────────────────────────────────────────────────
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
      if (!responsiveBreakpoint) return;
      const check = () => setIsMobile(window.innerWidth < responsiveBreakpoint);
      check();
      window.addEventListener('resize', check);
      return () => window.removeEventListener('resize', check);
    }, [responsiveBreakpoint]);

    // ── Selection state ───────────────────────────────────────────────────
    const allRowsSelected = table.getIsAllRowsSelected();
    const someRowsSelected = table.getIsSomeRowsSelected();

    const handleToggleAll = useCallback(() => {
      table.toggleAllRowsSelected(!allRowsSelected);
    }, [table, allRowsSelected]);

    // ── Pagination handlers ───────────────────────────────────────────────
    const handlePageChange = useCallback(
      (page: number) => {
        if (paginationMode === 'server' && serverPagination?.onPageChange) {
          serverPagination.onPageChange(page + 1);
        } else {
          table.setPageIndex(page);
        }
      },
      [paginationMode, serverPagination, table]
    );

    const handlePageSizeChange = useCallback(
      (size: number) => {
        if (paginationMode === 'server' && serverPagination?.onPageSizeChange) {
          serverPagination.onPageSizeChange(size);
        } else {
          table.setPageSize(size);
        }
      },
      [paginationMode, serverPagination, table]
    );

    const currentPageIndex = paginationMode === 'server' && serverPagination
      ? serverPagination.page - 1
      : table.getState().pagination.pageIndex;
    const currentPageSize = paginationMode === 'server' && serverPagination
      ? serverPagination.pageSize
      : table.getState().pagination.pageSize;

    // ── Export data ───────────────────────────────────────────────────────
    const exportData = useMemo(() => {
      return table.getFilteredRowModel().rows.map((row) => row.original);
    }, [table]);

    // ── Virtualization scroll container ref ───────────────────────────────
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // ── Styles ────────────────────────────────────────────────────────────
    const containerStyle: React.CSSProperties = {
      backgroundColor: '#fff',
      borderRadius: radius.xl,
      border: `1px solid ${colors.neutral[200]}`,
      boxShadow: shadows.sm,
      overflow: 'hidden',
      ...style,
    };

    const tableWrapperStyle: React.CSSProperties = {
      overflowX: 'auto',
      overflowY: enableVirtualization ? 'auto' : 'auto',
      ...(enableVirtualization ? { maxHeight: `${virtualHeight}px` } : {}),
    };

    const tableStyle: React.CSSProperties = {
      width: '100%',
      borderCollapse: 'collapse',
      tableLayout: 'auto',
      fontFamily: fontFamily.sans,
    };

    return (
      <div
        ref={ref}
        id={id}
        className={cn('preone-datatable', className)}
        style={containerStyle}
      >
        {/* Toolbar */}
        <DataTableToolbar
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          enableGlobalFilter={enableGlobalFilter}
          enableFiltering={enableFiltering}
          enableColumnVisibility={enableColumnVisibility}
          enableExport={enableExport}
          density={density}
          onDensityChange={setDensity}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          filterableColumns={filterableColumns}
          visibilityColumns={visibilityColumns}
          exportColumns={exportColumns}
          exportData={exportData}
        />

        {/* Bulk action bar */}
        {enableSelection && (
          <BulkActionBar
            selectedCount={selectedCount}
            totalCount={totalRows}
            actions={bulkActions as BulkAction<unknown>[]}
            selectedRows={selectedRows}
            onClearSelection={clearSelection}
            onSelectAll={selectAll}
          />
        )}

        {/* Table */}
        {isMobile && responsiveBreakpoint ? (
          <MobileCardView
            table={table}
            density={density}
            enableSelection={enableSelection}
            onRowClick={onRowClick}
          />
        ) : (
          <div
            ref={scrollContainerRef}
            style={tableWrapperStyle}
          >
            <table style={tableStyle} role="grid" aria-label="Data table">
              <DataTableHeader
                table={table}
                density={density}
                enableSelection={enableSelection}
                enableSorting={enableSorting}
                stickyHeader={stickyHeader}
                allRowsSelected={allRowsSelected}
                someRowsSelected={someRowsSelected}
                onToggleAll={handleToggleAll}
              />
              <DataTableBody
                table={table}
                density={density}
                enableSelection={enableSelection}
                enableVirtualization={enableVirtualization}
                loading={loading}
                emptyState={emptyState}
                virtualHeight={virtualHeight}
                onRowClick={onRowClick}
              />
            </table>
          </div>
        )}

        {/* Pagination */}
        {enablePagination && (
          <DataTablePagination
            pageIndex={currentPageIndex}
            pageSize={currentPageSize}
            totalRows={totalRows}
            pageCount={pageCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={pageSizeOptions}
            mode={paginationMode}
          />
        )}
      </div>
    );
  }
);

DataTable.displayName = 'DataTable';
