/**
 * @preone/tables - DataTablePagination
 * Page navigation with size selector and info text
 */

'use client';

import React, { forwardRef, useMemo } from 'react';
import { cn, Select, IconButton } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, borderWidth } from '@preone/design-tokens';
import type { PaginationMode } from '../types';

// ─── Icons ───────────────────────────────────────────────────────────────────
const ChevronLeftIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ChevronsLeftIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="11 17 6 12 11 7" />
    <polyline points="18 17 13 12 18 7" />
  </svg>
);

const ChevronsRightIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="13 17 18 12 13 7" />
    <polyline points="6 17 11 12 6 7" />
  </svg>
);

// ─── Props ───────────────────────────────────────────────────────────────────
export interface DataTablePaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  pageIndex: number;
  pageSize: number;
  totalRows: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions: number[];
  mode: PaginationMode;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const DataTablePagination = forwardRef<HTMLDivElement, DataTablePaginationProps>(
  (
    {
      pageIndex,
      pageSize,
      totalRows,
      pageCount,
      onPageChange,
      onPageSizeChange,
      pageSizeOptions,
      mode,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
    const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

    const pageSizeSelectOptions = useMemo(
      () => pageSizeOptions.map((size) => ({ label: String(size), value: String(size) })),
      [pageSizeOptions]
    );

    const containerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${spacing[3]} ${spacing[4]}`,
      borderTop: `${borderWidth.DEFAULT} solid ${colors.neutral[200]}`,
      fontFamily: fontFamily.sans,
      flexWrap: 'wrap',
      gap: spacing[2],
      ...style,
    };

    const infoStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      color: colors.neutral[500],
      fontFamily: fontFamily.sans,
    };

    const controlsStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
    };

    const pageIndicatorStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.neutral[700],
      fontFamily: fontFamily.sans,
      minWidth: '80px',
      textAlign: 'center',
    };

    const selectWrapperStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
    };

    const selectLabelStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      color: colors.neutral[500],
      fontFamily: fontFamily.sans,
      whiteSpace: 'nowrap',
    };

    return (
      <div ref={ref} className={cn('preone-datatable-pagination', className)} style={containerStyle} role="navigation" aria-label="Table pagination" {...props}>
        {/* Left: Info */}
        <div style={infoStyle}>
          Showing <span style={{ fontWeight: fontWeight.medium, color: colors.neutral[700] }}>{startRow}</span>
          {' – '}
          <span style={{ fontWeight: fontWeight.medium, color: colors.neutral[700] }}>{endRow}</span>
          {' of '}
          <span style={{ fontWeight: fontWeight.medium, color: colors.neutral[700] }}>{totalRows}</span>
        </div>

        {/* Center: Page navigation */}
        <div style={controlsStyle}>
          <IconButton
            variant="ghost"
            size="sm"
            label="First page"
            onClick={() => onPageChange(0)}
            disabled={pageIndex === 0}
          >
            <ChevronsLeftIcon />
          </IconButton>
          <IconButton
            variant="ghost"
            size="sm"
            label="Previous page"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={pageIndex === 0}
          >
            <ChevronLeftIcon />
          </IconButton>
          <span style={pageIndicatorStyle}>
            Page {pageIndex + 1} of {pageCount || 1}
          </span>
          <IconButton
            variant="ghost"
            size="sm"
            label="Next page"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            <ChevronRightIcon />
          </IconButton>
          <IconButton
            variant="ghost"
            size="sm"
            label="Last page"
            onClick={() => onPageChange(pageCount - 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            <ChevronsRightIcon />
          </IconButton>
        </div>

        {/* Right: Page size selector */}
        <div style={selectWrapperStyle}>
          <span style={selectLabelStyle}>Rows per page</span>
          <Select
            size="sm"
            options={pageSizeSelectOptions}
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{ minWidth: '70px' }}
          />
        </div>
      </div>
    );
  }
);

DataTablePagination.displayName = 'DataTablePagination';
