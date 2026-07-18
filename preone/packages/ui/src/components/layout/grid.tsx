/**
 * @preone/ui — Grid Component
 *
 * CSS Grid wrapper with columns prop (1-12), gap, and responsive breakpoints.
 * Includes GridItem with span support.
 *
 * @example
 * ```tsx
 * <Grid columns={3} gap="md">
 *   <GridItem span={2}>Wide item</GridItem>
 *   <GridItem>Narrow item</GridItem>
 * </GridGrid>
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Grid Variants
// ---------------------------------------------------------------------------

const gridVariants = cva('grid', {
  variants: {
    columns: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      7: 'grid-cols-7',
      8: 'grid-cols-8',
      9: 'grid-cols-9',
      10: 'grid-cols-10',
      11: 'grid-cols-11',
      12: 'grid-cols-12',
    },
    gap: {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
      '2xl': 'gap-12',
    },
  },
  defaultVariants: {
    columns: 1,
    gap: 'md',
  },
});

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

/** Props for the {@link Grid} component. */
export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {
  /** Responsive columns: { sm?: 1-12, md?: 1-12, lg?: 1-12, xl?: 1-12 } */
  responsive?: {
    sm?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    md?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    lg?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    xl?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  };
}

/**
 * CSS Grid wrapper with configurable columns and gap.
 *
 * Supports responsive column counts via the `responsive` prop.
 */
const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, columns, gap, responsive, ...props }, ref) => {
    const responsiveClasses = React.useMemo(() => {
      if (!responsive) return '';
      const classes: string[] = [];
      if (responsive.sm) classes.push(`sm:grid-cols-${responsive.sm}`);
      if (responsive.md) classes.push(`md:grid-cols-${responsive.md}`);
      if (responsive.lg) classes.push(`lg:grid-cols-${responsive.lg}`);
      if (responsive.xl) classes.push(`xl:grid-cols-${responsive.xl}`);
      return classes.join(' ');
    }, [responsive]);

    return (
      <div
        ref={ref}
        className={cn(gridVariants({ columns, gap }), responsiveClasses, className)}
        {...props}
      />
    );
  }
);
Grid.displayName = 'Grid';

// ---------------------------------------------------------------------------
// GridItem
// ---------------------------------------------------------------------------

/** Props for the {@link GridItem} component. */
export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns this item should span (1-12). */
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  /** Column start position (1-13). */
  colStart?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
  /** Row span. */
  rowSpan?: 1 | 2 | 3 | 4 | 5 | 6;
}

const spanClasses: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
};

const colStartClasses: Record<number, string> = {
  1: 'col-start-1',
  2: 'col-start-2',
  3: 'col-start-3',
  4: 'col-start-4',
  5: 'col-start-5',
  6: 'col-start-6',
  7: 'col-start-7',
  8: 'col-start-8',
  9: 'col-start-9',
  10: 'col-start-10',
  11: 'col-start-11',
  12: 'col-start-12',
  13: 'col-start-13',
};

const rowSpanClasses: Record<number, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
  4: 'row-span-4',
  5: 'row-span-5',
  6: 'row-span-6',
};

/**
 * Grid item — supports spanning multiple columns and rows.
 */
const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  ({ className, span, colStart, rowSpan, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        span && spanClasses[span],
        colStart && colStartClasses[colStart],
        rowSpan && rowSpanClasses[rowSpan],
        className
      )}
      {...props}
    />
  )
);
GridItem.displayName = 'GridItem';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Grid, GridItem, gridVariants };
