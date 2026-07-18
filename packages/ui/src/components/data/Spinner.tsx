'use client';

import React, { forwardRef, useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { colors } from '@preone/design-tokens';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface SpinnerProps extends React.HTMLAttributes<SVGSVGElement> {
  size?: SpinnerSize;
  color?: string;
  label?: string;
}

const spinnerSizes: Record<SpinnerSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 28,
  xl: 40,
};

export const Spinner = forwardRef<SVGSVGElement, SpinnerProps>(
  ({ size = 'md', color, label = 'Loading', className, style, ...props }, ref) => {
    const dimension = spinnerSizes[size];
    const strokeColor = color || colors.neutral[400];
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    return (
      <>
        <style>{`
          @keyframes preone-spinner-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        <svg
          ref={ref}
          className={cn('preone-spinner', className)}
          width={dimension}
          height={dimension}
          viewBox="0 0 24 24"
          fill="none"
          style={{
            animation: mounted ? `preone-spinner-rotate 1s linear infinite` : undefined,
            ...style,
          }}
          role="status"
          aria-label={label}
          {...props}
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.2"
          />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <title>{label}</title>
        </svg>
      </>
    );
  }
);

Spinner.displayName = 'Spinner';
