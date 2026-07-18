import * as React from 'react';
import { cn } from './cn.js';

/**
 * Variants for TableColumnHeader styling.
 */
export type TableColumnHeaderVariant = 'default' | 'ghost';

/**
 * Props for the TableColumnHeader component.
 */
export interface TableColumnHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Current sort direction */
  sortDirection?: 'asc' | 'desc' | false;
  /** Callback when sort is toggled */
  onSort?: () => void;
  /** Whether the column is being resized */
  resizing?: boolean;
  /** Visual variant */
  variant?: TableColumnHeaderVariant;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Density mode */
  density?: 'compact' | 'default' | 'comfortable';
}

const densityStyles: Record<string, string> = {
  compact: 'px-2 py-1.5 text-xs',
  default: 'px-3 py-2.5 text-sm',
  comfortable: 'px-4 py-3.5 text-sm',
};

/**
 * PreOne TableColumnHeader component with sort indicators,
 * resize handle, density modes, and ARIA sort attributes.
 *
 * @example
 * ```tsx
 * <TableColumnHeader
 *   sortable
 *   sortDirection="asc"
 *   onSort={() => toggleSort('name')}
 * >
 *   Name
 * </TableColumnHeader>
 * ```
 */
export const TableColumnHeader = React.forwardRef<
  HTMLTableCellElement,
  TableColumnHeaderProps
>(
  (
    {
      sortable = false,
      sortDirection = false,
      onSort,
      resizing = false,
      variant = 'default',
      dark = false,
      density = 'default',
      className,
      children,
      ...props
    },
    ref: React.Ref<HTMLTableCellElement>,
  ) => {
    const ariaSort = sortDirection === 'asc'
      ? 'ascending' as const
      : sortDirection === 'desc'
        ? 'descending' as const
        : 'none' as const;

    return (
      <th
        ref={ref}
        className={cn(
          'font-semibold text-left whitespace-nowrap',
          'text-[var(--preone-text-secondary)]',
          'bg-[var(--preone-surface-secondary)]',
          'border-b border-[var(--preone-border)]',
          densityStyles[density],
          sortable && 'cursor-pointer select-none hover:bg-[var(--preone-surface-tertiary)]',
          resizing && 'bg-[var(--preone-color-primary-soft)]',
          variant === 'ghost' && 'bg-transparent font-normal',
          dark && 'text-[var(--preone-text-secondary-dark)] bg-[var(--preone-surface-secondary-dark)] border-[var(--preone-border-dark)]',
          className,
        )}
        aria-sort={sortable ? ariaSort : undefined}
        data-dark={dark || undefined}
        onClick={sortable ? onSort : undefined}
        onKeyDown={sortable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSort?.();
          }
        } : undefined}
        tabIndex={sortable ? 0 : undefined}
        role={sortable ? 'button' : undefined}
        {...props}
      >
        <div className="flex items-center gap-1.5">
          <span>{children}</span>

          {sortable && (
            <span className="flex flex-col" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 12 12"
                fill="currentColor"
                className={cn(
                  'h-2.5 w-2.5',
                  sortDirection === 'asc'
                    ? 'text-[var(--preone-color-primary)]'
                    : 'text-[var(--preone-text-tertiary)]',
                )}
              >
                <path d="M6 2l4 4H2z" />
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 12 12"
                fill="currentColor"
                className={cn(
                  'h-2.5 w-2.5 -mt-0.5',
                  sortDirection === 'desc'
                    ? 'text-[var(--preone-color-primary)]'
                    : 'text-[var(--preone-text-tertiary)]',
                )}
              >
                <path d="M6 10L2 6h8z" />
              </svg>
            </span>
          )}
        </div>
      </th>
    );
  },
);

TableColumnHeader.displayName = 'TableColumnHeader';
