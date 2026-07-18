'use client';

import React, { forwardRef, useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { colors, radius } from '@preone/design-tokens';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ width, height, variant = 'text', animation = 'pulse', className, style, ...props }, ref) => {
    const [animClass, setAnimClass] = useState('');

    useEffect(() => {
      if (animation === 'pulse') {
        setAnimClass('preone-skeleton-pulse');
      } else if (animation === 'wave') {
        setAnimClass('preone-skeleton-wave');
      }
    }, [animation]);

    const baseStyle: React.CSSProperties = {
      backgroundColor: colors.neutral[200],
      width: width ?? (variant === 'text' ? '100%' : undefined),
      height: height ?? (variant === 'text' ? '1em' : undefined),
      borderRadius:
        variant === 'circular'
          ? radius.full
          : variant === 'rounded'
          ? radius.lg
          : variant === 'text'
          ? radius.sm
          : radius.md,
      overflow: 'hidden',
      ...style,
    };

    return (
      <>
        <style>{`
          @keyframes preone-skeleton-pulse-anim {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          @keyframes preone-skeleton-wave-anim {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .preone-skeleton-pulse {
            animation: preone-skeleton-pulse-anim 2s ease-in-out infinite;
          }
          .preone-skeleton-wave {
            position: relative;
          }
          .preone-skeleton-wave::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            animation: preone-skeleton-wave-anim 1.6s ease-in-out infinite;
          }
        `}</style>
        <div
          ref={ref}
          className={cn('preone-skeleton', animClass, className)}
          style={baseStyle}
          aria-hidden="true"
          {...props}
        />
      </>
    );
  }
);

Skeleton.displayName = 'Skeleton';
