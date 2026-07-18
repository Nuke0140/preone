/**
 * @preone/tables - DataTableBody
 * Row rendering with selection, virtualization, skeleton loading, and empty state
 */

'use client';

import React, { forwardRef, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Table, Row } from '@tanstack/react-table';
import { cn, EmptyState, Skeleton } from '@preone/ui';
import { colors, fontSize, fontFamily, radius, duration, easing, borderWidth } from '@preone/design-tokens';
import type { Density } from '../types';

// ─── Props ───────────────────────────────────────────────────────────────────
export interface DataTableBodyProps<T> extends React.HTMLAttributes<HTMLTableSectionElement> {
  table: Table<T>;
  density: Density;
  enableSelection: boolean;
  enableVirtualization: boolean;
  loading: boolean;
  emptyState?: React.ReactNode;
  virtualHeight?: number;
  onRowClick?: (row: T) => void;
  rowCount?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const DataTableBody = forwardRef<HTMLTableSectionElement, DataTableBodyProps<unknown>>(
  (
    {
      table,
      density,
      enableSelection,
      enableVirtualization,
      loading,
      emptyState,
      virtualHeight = 600,
      onRowClick,
      rowCount,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const parentRef = useRef<HTMLDivElement>(null);

    const densityMap: Record<Density, { cellPadding: string; fontSize: string; rowHeight: number }> = {
      compact: { cellPadding: '6px 12px', fontSize: fontSize.xs, rowHeight: 36 },
      normal: { cellPadding: '10px 16px', fontSize: fontSize.sm, rowHeight: 44 },
      comfortable: { cellPadding: '14px 20px', fontSize: fontSize.sm, rowHeight: 56 },
    };
    const dConfig = densityMap[density];

    const rows = table.getRowModel().rows;
    const totalRows = rowCount ?? rows.length;

    // ── Virtualizer ─────────────────────────────────────────────────────────
    const virtualizer = useVirtualizer({
      count: totalRows,
      getScrollElement: () => parentRef.current,
      estimateSize: () => dConfig.rowHeight,
      overscan: 10,
      enabled: enableVirtualization && !loading,
    });

    // ── Skeleton rows ───────────────────────────────────────────────────────
    const skeletonRows = useMemo(() => {
      if (!loading) return [];
      const count = Math.min(10, table.getState().pagination.pageSize || 10);
      return Array.from({ length: count }, (_, i) => i);
    }, [loading, table]);

    // ── Row style ───────────────────────────────────────────────────────────
    const getRowStyle = (isSelected: boolean, isEven: boolean): React.CSSProperties => ({
      backgroundColor: isSelected
        ? colors.neutral[50]
        : isEven
        ? '#fff'
        : colors.neutral[50],
      borderBottom: `${borderWidth.DEFAULT} solid ${colors.neutral[100]}`,
      transition: `background-color ${duration.fast} ${easing.DEFAULT}`,
      cursor: onRowClick ? 'pointer' : 'default',
    });

    const cellStyle: React.CSSProperties = {
      padding: dConfig.cellPadding,
      fontSize: dConfig.fontSize,
      fontFamily: fontFamily.sans,
      color: colors.neutral[800],
      lineHeight: '1.5',
    };

    // ── Handle row click ────────────────────────────────────────────────────
    const handleRowClick = (row: Row<unknown>) => {
      if (onRowClick) {
        onRowClick(row.original);
      }
    };

    // ── Handle row hover ────────────────────────────────────────────────────
    const handleRowMouseEnter = (e: React.MouseEvent<HTMLTableRowElement>) => {
      const target = e.currentTarget as HTMLElement;
      if (!target.style.backgroundColor.includes('selection')) {
        target.style.backgroundColor = colors.neutral[100];
      }
    };

    const handleRowMouseLeave = (e: React.MouseEvent<HTMLTableRowElement>, isSelected: boolean, isEven: boolean) => {
      const target = e.currentTarget as HTMLElement;
      target.style.backgroundColor = isSelected
        ? colors.neutral[50]
        : isEven
        ? '#fff'
        : colors.neutral[50];
    };

    // ── Empty state default ─────────────────────────────────────────────────
    const defaultEmptyState = (
      <EmptyState
        title="No data found"
        description="There are no records to display. Try adjusting your filters or search query."
        size="md"
        icon={
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        }
      />
    );

    // ── Loading skeleton body ───────────────────────────────────────────────
    if (loading) {
      return (
        <tbody ref={ref} className={cn('preone-datatable-body', className)} style={style} {...props}>
          {skeletonRows.map((idx) => (
            <tr key={`skeleton-${idx}`} style={{ height: `${dConfig.rowHeight}px`, borderBottom: `${borderWidth.DEFAULT} solid ${colors.neutral[100]}` }}>
              {enableSelection && (
                <td style={{ ...cellStyle, textAlign: 'center', width: '48px' }}>
                  <Skeleton variant="rounded" width={20} height={20} animation="pulse" />
                </td>
              )}
              {Array.from({ length: table.getVisibleLeafColumns().length }, (_, colIdx) => (
                <td key={`skel-cell-${colIdx}`} style={cellStyle}>
                  <Skeleton
                    variant="text"
                    height={14}
                    width={`${Math.random() * 40 + 40}%`}
                    animation="wave"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      );
    }

    // ── Empty state body ────────────────────────────────────────────────────
    if (rows.length === 0 && !loading) {
      return (
        <tbody ref={ref} className={cn('preone-datatable-body', className)} style={style} {...props}>
          <tr>
            <td
              colSpan={table.getVisibleLeafColumns().length + (enableSelection ? 1 : 0)}
              style={{ padding: 0, border: 'none' }}
            >
              {emptyState || defaultEmptyState}
            </td>
          </tr>
        </tbody>
      );
    }

    // ── Virtualized body ────────────────────────────────────────────────────
    if (enableVirtualization) {
      const virtualItems = virtualizer.getVirtualItems();

      return (
        <tbody ref={ref} className={cn('preone-datatable-body', className)} style={style} {...props}>
          {virtualItems.length > 0 && (
            <tr style={{ height: `${virtualItems[0]?.start ?? 0}px` }} aria-hidden="true" />
          )}
          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;
            const isSelected = row.getIsSelected();
            const isEven = virtualRow.index % 2 === 0;

            return (
              <tr
                key={row.id}
                data-index={virtualRow.index}
                style={{
                  ...getRowStyle(isSelected, isEven),
                  height: `${dConfig.rowHeight}px`,
                }}
                onClick={() => handleRowClick(row)}
                onMouseEnter={handleRowMouseEnter}
                onMouseLeave={(e) => handleRowMouseLeave(e, isSelected, isEven)}
                aria-selected={isSelected}
                role="row"
              >
                {enableSelection && (
                  <td style={{ ...cellStyle, textAlign: 'center', width: '48px' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
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
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          row.toggleSelected();
                        }
                      }}
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={`Select row ${virtualRow.index + 1}`}
                      tabIndex={0}
                    >
                      {isSelected && (
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </td>
                )}
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} style={cellStyle}>
                    {typeof cell.column.columnDef.cell === 'function'
                      ? (cell.column.columnDef.cell as Function)(cell.getContext())
                      : cell.column.columnDef.cell}
                  </td>
                ))}
              </tr>
            );
          })}
          {virtualItems.length > 0 && (
            <tr
              style={{
                height: `${totalRows * dConfig.rowHeight - (virtualItems[virtualItems.length - 1]?.end ?? 0)}px`,
              }}
              aria-hidden="true"
            />
          )}
        </tbody>
      );
    }

    // ── Standard body (non-virtualized) ─────────────────────────────────────
    return (
      <tbody ref={ref} className={cn('preone-datatable-body', className)} style={style} {...props}>
        {rows.map((row, idx) => {
          const isSelected = row.getIsSelected();
          const isEven = idx % 2 === 0;

          return (
            <tr
              key={row.id}
              style={getRowStyle(isSelected, isEven)}
              onClick={() => handleRowClick(row)}
              onMouseEnter={handleRowMouseEnter}
              onMouseLeave={(e) => handleRowMouseLeave(e, isSelected, isEven)}
              aria-selected={isSelected}
              role="row"
            >
              {enableSelection && (
                <td style={{ ...cellStyle, textAlign: 'center', width: '48px' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
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
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        row.toggleSelected();
                      }
                    }}
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label={`Select row ${idx + 1}`}
                    tabIndex={0}
                  >
                    {isSelected && (
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </td>
              )}
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} style={cellStyle}>
                  {typeof cell.column.columnDef.cell === 'function'
                    ? (cell.column.columnDef.cell as Function)(cell.getContext())
                    : cell.column.columnDef.cell}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    );
  }
);

DataTableBody.displayName = 'DataTableBody';
