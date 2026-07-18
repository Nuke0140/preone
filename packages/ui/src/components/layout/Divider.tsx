'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing } from '@preone/design-tokens';

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
}

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  ({ orientation = 'horizontal', label, className, style, ...props }, ref) => {
    const isHorizontal = orientation === 'horizontal';

    if (label && isHorizontal) {
      return (
        <div
          ref={ref}
          className={cn('preone-divider', className)}
          role="separator"
          aria-orientation={orientation}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[4],
            width: '100%',
            ...style,
          }}
          {...props}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: colors.neutral[200] }} />
          <span style={{
            fontSize: '0.75rem',
            color: colors.neutral[400],
            whiteSpace: 'nowrap',
            fontWeight: 500,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            {label}
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: colors.neutral[200] }} />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn('preone-divider', className)}
        role="separator"
        aria-orientation={orientation}
        style={{
          ...(isHorizontal
            ? { width: '100%', height: '1px', backgroundColor: colors.neutral[200] }
            : { width: '1px', alignSelf: 'stretch', backgroundColor: colors.neutral[200] }),
          border: 'none',
          margin: '0',
          ...style,
        }}
        {...props}
      />
    );
  }
);

Divider.displayName = 'Divider';
