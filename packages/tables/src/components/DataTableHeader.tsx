/**
 * @preone/tables - DataTableHeader
 * Sortable column headers with select-all checkbox
 */

'use client';

import React, { forwardRef } from 'react';
import type { Header, Table } from '@tanstack/react-table';
import { cn } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, letterSpacing, radius, duration, easing, borderWidth } from '@preone/design-tokens';
import type { Density } from '../types';

// ─── Sort Icons ──────────────────────────────────────────────────────────────
const SortAscIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5v14M5 12l7-7 7 7" />
  </svg>
);

const SortDescIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 19V5M5 12l7 7 7-7" />
  </svg>
);

const SortNeutralIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.3 }}>
    <path d="M12 5v14M5 12l7-7 7 7" />
  </svg>
);

// ─── Props ───────────────────────────────────────────────────────────────────
export interface DataTableHeaderProps<T> extends React.HTMLAttributes<HTMLTableSectionElement> {
  table: Table<T>;
  density: Density;
  enableSelection: boolean;
  enableSorting: boolean;
  stickyHeader: boolean;
  allRowsSelected: boolean;
  someRowsSelected: boolean;
  onToggleAll: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const DataTableHeader = forwardRef<HTMLTableSectionElement, DataTableHeaderProps<unknown>>(
  (
    {
      table,
      density,
      enableSelection,
      enableSorting,
      stickyHeader,
      allRowsSelected,
      someRowsSelected,
      onToggleAll,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const densityMap: Record<Density, { headerPadding: string; fontSize: string; rowHeight: string }> = {
      compact: { headerPadding: '8px 12px', fontSize: fontSize.xs, rowHeight: '36px' },
      normal: { headerPadding: '12px 16px', fontSize: fontSize.sm, rowHeight: '44px' },
      comfortable: { headerPadding: '16px 20px', fontSize: fontSize.sm, rowHeight: '56px' },
    };
    const dConfig = densityMap[density];

    const headerGroupStyle: React.CSSProperties = {
      borderBottom: `${borderWidth.DEFAULT} solid ${colors.neutral[200]}`,
    };

    const headerCellStyle = (
      isSorted: false | 'asc' | 'desc',
      canSort: boolean,
      _colId?: string
    ): React.CSSProperties => ({
      padding: dConfig.headerPadding,
      fontSize: dConfig.fontSize,
      fontFamily: fontFamily.sans,
      fontWeight: fontWeight.semibold,
      color: colors.neutral[600],
      textAlign: 'left',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      cursor: canSort ? 'pointer' : 'default',
      position: 'relative',
      transition: `color ${duration.fast} ${easing.DEFAULT}, background-color ${duration.fast} ${easing.DEFAULT}`,
      letterSpacing: letterSpacing.normal,
      borderBottom: isSorted ? `2px solid ${colors.neutral[900]}` : undefined,
    });

    const renderSortIcon = (header: Header<unknown, unknown>) => {
      if (!enableSorting || !header.column.getCanSort()) return null;
      const sorted = header.column.getIsSorted();
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: spacing[1], opacity: sorted ? 1 : 0.5, color: sorted ? colors.neutral[900] : colors.neutral[400], transition: `opacity ${duration.fast} ${easing.DEFAULT}` }}>
          {sorted === 'asc' ? <SortAscIcon /> : sorted === 'desc' ? <SortDescIcon /> : <SortNeutralIcon />}
        </span>
      );
    };

    const handleHeaderClick = (header: Header<unknown, unknown>) => {
      if (enableSorting && header.column.getCanSort()) {
        header.column.toggleSorting(header.column.getIsSorted() === 'asc');
      }
    };

    const handleHeaderKeyDown = (e: React.KeyboardEvent, header: Header<unknown, unknown>) => {
      if ((e.key === 'Enter' || e.key === ' ') && enableSorting && header.column.getCanSort()) {
        e.preventDefault();
        header.column.toggleSorting(header.column.getIsSorted() === 'asc');
      }
    };

    return (
      <thead
        ref={ref}
        className={cn('preone-datatable-header', className)}
        style={{
          ...style,
          ...(stickyHeader
            ? {
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: colors.neutral[50],
              }
            : {}),
        }}
        {...props}
      >
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id} style={headerGroupStyle}>
            {enableSelection && (
              <th
                style={{
                  width: '48px',
                  minWidth: '48px',
                  padding: dConfig.headerPadding,
                  textAlign: 'center',
                  borderBottom: `${borderWidth.DEFAULT} solid ${colors.neutral[200]}`,
                }}
                aria-label="Select all rows"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: radius.md,
                    border: `2px solid ${someRowsSelected && !allRowsSelected ? colors.neutral[900] : allRowsSelected ? colors.neutral[900] : colors.neutral[300]}`,
                    backgroundColor: allRowsSelected || someRowsSelected ? colors.neutral[900] : 'transparent',
                    cursor: 'pointer',
                    transition: `all ${duration.fast} ${easing.DEFAULT}`,
                    position: 'relative',
                  }}
                  onClick={onToggleAll}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onToggleAll();
                    }
                  }}
                  role="checkbox"
                  aria-checked={someRowsSelected && !allRowsSelected ? 'mixed' : allRowsSelected}
                  tabIndex={0}
                >
                  {allRowsSelected && (
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {someRowsSelected && !allRowsSelected && (
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </div>
              </th>
            )}
            {headerGroup.headers.map((header) => {
              const sorted = header.column.getIsSorted();
              const canSort = header.column.getCanSort();

              return (
                <th
                  key={header.id}
                  style={{
                    ...headerCellStyle(sorted, canSort, header.id),
                    width: header.getSize() !== 150 ? header.getSize() : undefined,
                    minWidth: '80px',
                  }}
                  onClick={() => handleHeaderClick(header)}
                  onKeyDown={(e) => handleHeaderKeyDown(e, header)}
                  tabIndex={canSort ? 0 : -1}
                  aria-sort={
                    sorted === 'asc'
                      ? 'ascending'
                      : sorted === 'desc'
                      ? 'descending'
                      : undefined
                  }
                  role={canSort ? 'columnheader' : undefined}
                  onMouseEnter={(e) => {
                    if (canSort) {
                      (e.currentTarget as HTMLElement).style.color = colors.neutral[900];
                      (e.currentTarget as HTMLElement).style.backgroundColor = colors.neutral[50];
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = colors.neutral[600];
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                    {header.isPlaceholder
                      ? null
                      : typeof header.column.columnDef.header === 'function'
                      ? (header.column.columnDef.header as Function)(header.getContext())
                      : header.column.columnDef.header}
                    {renderSortIcon(header)}
                  </div>
                  {/* Resize handle */}
                  {header.column.getCanResize() && (
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        cursor: 'col-resize',
                        backgroundColor: 'transparent',
                        transition: `background-color ${duration.fast} ${easing.DEFAULT}`,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = colors.neutral[300];
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                      aria-hidden="true"
                    />
                  )}
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
    );
  }
);

DataTableHeader.displayName = 'DataTableHeader';
