'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { spacing } from '@preone/design-tokens';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  gap?: string;
  rowGap?: string;
  alignItems?: React.CSSProperties['alignItems'];
  justifyItems?: React.CSSProperties['justifyItems'];
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ columns = 12, gap = spacing[4], rowGap, alignItems, justifyItems, className, style, ...props }, ref) => {
    const rowGapValue = rowGap || gap;

    const gridStyle: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: typeof columns === 'number' ? `repeat(${columns}, 1fr)` : undefined,
      gap: `${rowGapValue} ${gap}`,
      alignItems,
      justifyItems,
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn('preone-grid', className)}
        style={gridStyle}
        {...props}
      />
    );
  }
);

Grid.displayName = 'Grid';

export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  colSpan?: number | 'full';
  rowSpan?: number;
}

export const GridItem = forwardRef<HTMLDivElement, GridItemProps>(
  ({ colSpan, rowSpan, className, style, ...props }, ref) => {
    const itemStyle: React.CSSProperties = {
      gridColumn: colSpan === 'full' ? '1 / -1' : colSpan ? `span ${colSpan} / span ${colSpan}` : undefined,
      gridRow: rowSpan ? `span ${rowSpan} / span ${rowSpan}` : undefined,
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn('preone-grid-item', className)}
        style={itemStyle}
        {...props}
      />
    );
  }
);

GridItem.displayName = 'GridItem';
