import * as React from 'react';
import { cn } from './cn.js';

/**
 * Column count for FormGrid.
 */
export type GridColumns = 1 | 2 | 3 | 4 | 6;

/**
 * Props for the FormGrid component.
 */
export interface FormGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns */
  columns?: GridColumns;
  /** Gap between items */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** Whether the grid is disabled */
  disabled?: boolean;
  /** Whether the grid is in loading state */
  loading?: boolean;
  /** Whether to apply dark mode */
  dark?: boolean;
}

const columnStyles: Record<GridColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
};

const gapStyles: Record<string, string> = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

/**
 * PreOne FormGrid layout component for multi-column form field layouts.
 * Responsive by default, supports column counts, gap sizes,
 * disabled/loading/dark modes, and ARIA grid role.
 *
 * @example
 * ```tsx
 * <FormGrid columns={2} gap="md">
 *   <FormField name="firstName">...</FormField>
 *   <FormField name="lastName">...</FormField>
 * </FormGrid>
 * ```
 */
export const FormGrid = React.forwardRef<HTMLDivElement, FormGridProps>(
  (
    {
      columns = 2,
      gap = 'md',
      disabled = false,
      loading = false,
      dark = false,
      className,
      children,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    return (
      <div
        ref={ref}
        role="group"
        className={cn(
          'grid',
          columnStyles[columns],
          gapStyles[gap],
          disabled && 'opacity-60 pointer-events-none',
          dark && 'dark',
          className,
        )}
        aria-busy={loading}
        aria-disabled={disabled}
        data-grid-columns={columns}
        data-dark={dark || undefined}
        {...props}
      >
        <div
          className={cn(
            'contents',
            loading && 'animate-pulse',
          )}
        >
          {children}
        </div>
      </div>
    );
  },
);

FormGrid.displayName = 'FormGrid';
