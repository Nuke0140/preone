'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, radius, fontSize, fontWeight, fontFamily, duration, easing } from '@preone/design-tokens';

export type ProgressVariant = 'default' | 'success' | 'warning' | 'danger';
export type ProgressSize = 'sm' | 'md' | 'lg';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number, max: number) => string;
  animated?: boolean;
}

const progressSizes: Record<ProgressSize, { height: number; borderRadius: string }> = {
  sm: { height: 4, borderRadius: radius.full },
  md: { height: 8, borderRadius: radius.full },
  lg: { height: 12, borderRadius: radius.full },
};

const variantColors: Record<ProgressVariant, { track: string; fill: string }> = {
  default: { track: colors.neutral[200], fill: colors.neutral[900] },
  success: { track: colors.green[100], fill: colors.green[500] },
  warning: { track: colors.amber[100], fill: colors.amber[500] },
  danger: { track: colors.red[100], fill: colors.red[500] },
};

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ value = 0, max = 100, variant = 'default', size = 'md', label, showValue = false, formatValue, animated = false, className, style, ...props }, ref) => {
    const config = progressSizes[size];
    const colorSet = variantColors[variant];
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const wrapperStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing[1.5],
      width: '100%',
    };

    const headerStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    };

    const labelStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontFamily: fontFamily.sans,
      color: colors.neutral[700],
      fontWeight: fontWeight.medium,
    };

    const valueStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontFamily: fontFamily.sans,
      color: colors.neutral[500],
      fontWeight: fontWeight.medium,
    };

    const trackStyle: React.CSSProperties = {
      width: '100%',
      height: `${config.height}px`,
      borderRadius: config.borderRadius,
      backgroundColor: colorSet.track,
      overflow: 'hidden',
    };

    const fillStyle: React.CSSProperties = {
      height: '100%',
      width: `${percentage}%`,
      borderRadius: config.borderRadius,
      backgroundColor: colorSet.fill,
      transition: animated ? `width ${duration.slow} ${easing.DEFAULT}` : undefined,
    };

    return (
      <div ref={ref} className={cn('preone-progress', className)} style={{ ...wrapperStyle, ...style }} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label} {...props}>
        {(label || showValue) && (
          <div style={headerStyle}>
            {label && <span style={labelStyle}>{label}</span>}
            {showValue && <span style={valueStyle}>{formatValue ? formatValue(value, max) : `${Math.round(percentage)}%`}</span>}
          </div>
        )}
        <div style={trackStyle}>
          <div style={fillStyle} />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';
