import * as React from 'react';
import { cn } from './cn.js';

/**
 * Props for the TablePagination component.
 */
export interface TablePaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current page (0-indexed) */
  pageIndex: number;
  /** Total number of pages */
  pageCount: number;
  /** Callback when page changes */
  onPageChange: (pageIndex: number) => void;
  /** Available page sizes */
  pageSizeOptions?: number[];
  /** Current page size */
  pageSize: number;
  /** Callback when page size changes */
  onPageSizeChange: (pageSize: number) => void;
  /** Total number of rows */
  totalRows?: number;
  /** Whether pagination is disabled */
  disabled?: boolean;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Density mode */
  density?: 'compact' | 'default' | 'comfortable';
  /** Show page size selector */
  showPageSizeSelector?: boolean;
  /** Show total rows count */
  showTotalRows?: boolean;
}

/**
 * PreOne TablePagination component with page navigation,
 * page size selector, and row count display.
 *
 * @example
 * ```tsx
 * <TablePagination
 *   pageIndex={2}
 *   pageCount={10}
 *   pageSize={25}
 *   pageSizeOptions={[10, 25, 50, 100]}
 *   onPageChange={setPage}
 *   onPageSizeChange={setPageSize}
 *   totalRows={245}
 * />
 * ```
 */
export const TablePagination = React.forwardRef<HTMLDivElement, TablePaginationProps>(
  (
    {
      pageIndex,
      pageCount,
      onPageChange,
      pageSizeOptions = [10, 25, 50, 100],
      pageSize,
      onPageSizeChange,
      totalRows,
      disabled = false,
      dark = false,
      density = 'default',
      showPageSizeSelector = true,
      showTotalRows = true,
      className,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const canPreviousPage = pageIndex > 0;
    const canNextPage = pageIndex < pageCount - 1;

    const startRow = totalRows !== undefined ? pageIndex * pageSize + 1 : undefined;
    const endRow = totalRows !== undefined
      ? Math.min((pageIndex + 1) * pageSize, totalRows)
      : undefined;

    const getPageNumbers = (): (number | '...')[] => {
      const pages: (number | '...')[] = [];
      const maxVisible = 5;

      if (pageCount <= maxVisible) {
        for (let i = 0; i < pageCount; i++) pages.push(i);
      } else {
        pages.push(0);
        if (pageIndex > 2) pages.push('...');

        const start = Math.max(1, pageIndex - 1);
        const end = Math.min(pageCount - 2, pageIndex + 1);
        for (let i = start; i <= end; i++) pages.push(i);

        if (pageIndex < pageCount - 3) pages.push('...');
        pages.push(pageCount - 1);
      }

      return pages;
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between gap-4',
          density === 'compact' ? 'py-1 px-2 text-xs' : density === 'comfortable' ? 'py-3 px-6 text-sm' : 'py-2 px-4 text-sm',
          disabled && 'opacity-60 pointer-events-none',
          dark && 'dark',
          className,
        )}
        role="navigation"
        aria-label="Table pagination"
        data-dark={dark || undefined}
        {...props}
      >
        <div className="flex items-center gap-2">
          {showPageSizeSelector && (
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--preone-text-secondary)]">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                disabled={disabled}
                className={cn(
                  'rounded border border-[var(--preone-border)] bg-[var(--preone-surface)] px-2 py-1 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--preone-color-primary)]',
                  dark && 'bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)] text-[var(--preone-text-primary-dark)]',
                )}
                aria-label="Rows per page"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showTotalRows && totalRows !== undefined && startRow !== undefined && endRow !== undefined && (
            <span className="text-[var(--preone-text-secondary)]">
              {startRow}–{endRow} of {totalRows}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(0)}
            disabled={!canPreviousPage || disabled}
            className={cn(
              'rounded p-1.5 hover:bg-[var(--preone-surface-secondary)] transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--preone-color-primary)]',
            )}
            aria-label="First page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path fillRule="evenodd" d="M14.25 3.5a.75.75 0 0 1-.75.75H4.56l5.22 5.22a.75.75 0 0 1-1.06 1.06L2.97 4.78a.75.75 0 0 1 0-1.06L8.72.22a.75.75 0 0 1 1.06 1.06L4.56 6.5h8.94a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={!canPreviousPage || disabled}
            className={cn(
              'rounded p-1.5 hover:bg-[var(--preone-surface-secondary)] transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--preone-color-primary)]',
            )}
            aria-label="Previous page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path fillRule="evenodd" d="M11.78 8.53a.75.75 0 0 0 0-1.06L6.53 2.22a.75.75 0 1 0-1.06 1.06L10.22 8l-4.75 4.72a.75.75 0 1 0 1.06 1.06l5.25-5.25Z" clipRule="evenodd" />
            </svg>
          </button>

          {getPageNumbers().map((page, i) =>
            page === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-[var(--preone-text-tertiary)]">
                …
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                disabled={disabled}
                className={cn(
                  'min-w-[32px] rounded px-2 py-1 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--preone-color-primary)]',
                  page === pageIndex
                    ? 'bg-[var(--preone-color-primary)] text-white'
                    : 'hover:bg-[var(--preone-surface-secondary)] text-[var(--preone-text-primary)]',
                  dark && page !== pageIndex && 'text-[var(--preone-text-primary-dark)]',
                )}
                aria-label={`Page ${page + 1}`}
                aria-current={page === pageIndex ? 'page' : undefined}
              >
                {page + 1}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={!canNextPage || disabled}
            className={cn(
              'rounded p-1.5 hover:bg-[var(--preone-surface-secondary)] transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--preone-color-primary)]',
            )}
            aria-label="Next page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path fillRule="evenodd" d="M4.22 7.47a.75.75 0 0 0 0 1.06l5.25 5.25a.75.75 0 1 0 1.06-1.06L5.78 8l4.75-4.72a.75.75 0 0 0-1.06-1.06L4.22 7.47Z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => onPageChange(pageCount - 1)}
            disabled={!canNextPage || disabled}
            className={cn(
              'rounded p-1.5 hover:bg-[var(--preone-surface-secondary)] transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--preone-color-primary)]',
            )}
            aria-label="Last page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path fillRule="evenodd" d="M1.75 12.5a.75.75 0 0 1 .75-.75h8.94l-5.22-5.22a.75.75 0 1 1 1.06-1.06l5.75 5.75a.75.75 0 0 1 0 1.06l-5.75 5.75a.75.75 0 1 1-1.06-1.06L11.44 12H2.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    );
  },
);

TablePagination.displayName = 'TablePagination';
