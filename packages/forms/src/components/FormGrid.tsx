'use client';

import React, { forwardRef } from 'react';
import { cn } from '@preone/ui';
import { spacing } from '@preone/design-tokens';

export interface FormGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns (1-4) */
  columns?: 1 | 2 | 3 | 4;
  /** Gap between grid items */
  gap?: string;
  /** Row gap override */
  rowGap?: string;
  /** Grid content */
  children: React.ReactNode;
}

const columnMap: Record<number, string> = {
  1: '1fr',
  2: 'repeat(2, 1fr)',
  3: 'repeat(3, 1fr)',
  4: 'repeat(4, 1fr)',
};

export const FormGrid = forwardRef<HTMLDivElement, FormGridProps>(
  ({ columns = 2, gap = spacing[4], rowGap, children, className, style, ...props }, ref) => {
    const rowGapValue = rowGap ?? gap;

    const gridStyle: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: columnMap[columns],
      gap: `${rowGapValue} ${gap}`,
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn('preone-form-grid', className)}
        style={gridStyle}
        {...props}
      >
        {children}
      </div>
    );
  }
);

FormGrid.displayName = 'FormGrid';

export interface FormGridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns this item spans */
  colSpan?: 1 | 2 | 3 | 4;
}

export const FormGridItem = forwardRef<HTMLDivElement, FormGridItemProps>(
  ({ colSpan, className, style, ...props }, ref) => {
    const itemStyle: React.CSSProperties = {
      gridColumn: colSpan ? `span ${colSpan} / span ${colSpan}` : undefined,
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn('preone-form-grid-item', className)}
        style={itemStyle}
        {...props}
      />
    );
  }
);

FormGridItem.displayName = 'FormGridItem';
